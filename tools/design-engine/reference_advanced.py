"""Reference-only geometric estimates; no source mesh modification."""
import numpy as np
import trimesh
import hashlib,json,sys
from pathlib import Path
from collections import Counter
from PIL import Image
from io import BytesIO
from reference_uv import read_glb,read_uv_accessor,read_indices,material_texture_bindings,polygon_area

def islands(uv,faces,positions):
    parent=list(range(len(faces)))
    def root(i):
        while parent[i]!=i:
            parent[i]=parent[parent[i]]; i=parent[i]
        return i
    edges={}
    for i,f in enumerate(faces):
        keys=[tuple(np.round(np.r_[positions[j],uv[j]],6)) for j in f]
        for a,b in zip(keys,keys[1:]+keys[:1]):
            k=tuple(sorted((a,b)))
            if k in edges: parent[root(i)]=root(edges[k])
            else: edges[k]=i
    groups={}
    for i in range(len(faces)): groups.setdefault(root(i),[]).append(i)
    return list(groups.values())

def uv_metrics(path):
    _,doc,bin=read_glb(path)
    rows=[]
    for mi,m in enumerate(doc.get("meshes",[])):
        for pi,p in enumerate(m["primitives"]):
            if p.get("mode",4)!=4: continue
            attrs=p["attributes"]; a=doc["accessors"][attrs["POSITION"]]; v=doc["bufferViews"][a["bufferView"]]
            if a["componentType"]!=5126 or a["type"]!="VEC3" or "sparse" in a: continue
            pos=np.ndarray((a["count"],3),dtype="<f4",buffer=bin,offset=v.get("byteOffset",0)+a.get("byteOffset",0),strides=(v.get("byteStride",12),4)).astype(float)
            faces=np.array(read_indices(doc,bin,p["indices"]) if "indices" in p else list(range(len(pos)))).reshape(-1,3)
            binding=material_texture_bindings(doc,p) or {}
            for key,accessor in attrs.items():
                if not key.startswith("TEXCOORD_"): continue
                uv=np.array(read_uv_accessor(doc,bin,accessor))
                groups=islands(uv,faces,pos)
                areas=np.array([polygon_area(uv[f]) for f in faces])
                surface=np.linalg.norm(np.cross(pos[faces[:,1]]-pos[faces[:,0]],pos[faces[:,2]]-pos[faces[:,0]]),axis=1)/2
                signatures=Counter(tuple(sorted(tuple(np.round(uv[j],6)) for j in f)) for f in faces)
                duplicates=sum(n-1 for n in signatures.values())
                density=[]
                for slot,b in binding.get("texture_bindings",{}).items():
                    if b.get("tex_coord_set")!=int(key.split("_")[-1]) or b.get("extension_overrides"): continue
                    ii=b.get("image_index")
                    if ii is None: continue
                    im=doc["images"][ii]
                    if "bufferView" not in im: continue
                    bv=doc["bufferViews"][im["bufferView"]]; start=bv.get("byteOffset",0)
                    with Image.open(BytesIO(bin[start:start+bv["byteLength"]])) as image: w,h=image.size
                    density.append({"slot":slot,"pixels_per_local_meter":float(np.sqrt(areas.sum()*w*h/surface.sum())) if surface.sum()>0 else None,"resolution":[w,h]})
                rows.append({"mesh":mi,"primitive":pi,"uv_set":key,"islands":[{"faces":g,"summed_uv_area":float(areas[g].sum()),"local_surface_m2":float(surface[g].sum())} for g in groups],"density":density,"overlap_intent":{"coincident_triangle_excess":duplicates,"outside_tile_vertices":int(np.any((uv<0)|(uv>1),axis=1).sum()),"hypothesis":"STACKING_OR_REUSE_POSSIBLE" if duplicates else "UNKNOWN","requires_review":True}})
    return rows

def geometry_metrics(path):
    scene=trimesh.load(str(path),force="scene",process=False)
    parts=[]; bounds=[]
    for node in sorted(scene.graph.nodes_geometry):
        transform,name=scene.graph[node]; m=scene.geometry[name].copy(); m.apply_transform(transform); m.merge_vertices(merge_tex=True,merge_norm=True)
        if not len(m.faces): continue
        v=np.asarray(m.vertices); lo,hi=m.bounds; extent=hi-lo; center=(lo+hi)/2
        lengths=np.linalg.norm(v[m.face_adjacency_edges[:,0]]-v[m.face_adjacency_edges[:,1]],axis=1)
        angles=m.face_adjacency_angles; valid=(angles>1e-4)&(angles<np.pi/2)&(lengths>0)
        # Normal change over adjacent face-centroid distance: curvature proxy, not fitted bevel.
        delta=np.linalg.norm(m.triangles_center[m.face_adjacency[:,0]]-m.triangles_center[m.face_adjacency[:,1]],axis=1)
        radius=delta[valid]/angles[valid]
        # Bounded nearest-vertex reflection test.
        sample=v[np.linspace(0,len(v)-1,min(len(v),512),dtype=int)]
        sym=[]
        for axis in range(3):
            reflected=sample.copy(); reflected[:,axis]=2*center[axis]-reflected[:,axis]
            dist=np.sqrt(((reflected[:,None,:]-sample[None,:,:])**2).sum(axis=2)).min(axis=1)
            sym.append(float(np.median(dist)/max(np.linalg.norm(extent),1e-12)))
        ratios=np.sort(extent)/max(extent.max(),1e-12)
        shape="PLATE_LIKE" if ratios[0]<.15 and ratios[1]>.4 else "ROD_LIKE" if ratios[1]<.3 else "VOLUMETRIC"
        parts.append({"node":node,"dimensions_mm":(extent*1000).tolist(),"center_mm":(center*1000).tolist(),"minimum_bbox_extent_mm":float(extent.min()*1000),"shape_hint":shape,"symmetry_sample_normalized_error":sym,"curvature_radius_proxy_mm":np.percentile(radius*1000,[10,50,90]).tolist() if len(radius) else [],"triangle_count":len(m.faces),"surface_mm2":float(m.area*1e6)})
        bounds.append((lo,hi))
    contacts=[]
    for i,(a,b) in enumerate(bounds):
        for j,(c,d) in enumerate(bounds[:i]):
            gap=np.maximum(np.maximum(a-d,c-b),0)
            if np.linalg.norm(gap)<=.002:
                contacts.append({"parts":[j,i],"bbox_gap_mm":float(np.linalg.norm(gap)*1000),"candidate_location_mm":((np.maximum(a,c)+np.minimum(b,d))/2*1000).tolist()})
    repeat={}
    for i,p in enumerate(parts): repeat.setdefault(tuple(round(x,1) for x in sorted(p["dimensions_mm"])),[]).append(i)
    return {"parts":parts,"bbox_contact_candidates":contacts,"repeated_dimension_groups":[g for g in repeat.values() if len(g)>1],"limitations":"Bounding-box thickness/contact proxies, sampled symmetry, local curvature proxy; not true wall thickness, exact bevel radius or proven repeated geometry."}

def analyze(path):
    return {"source_sha256":hashlib.sha256(Path(path).read_bytes()).hexdigest(),"uv":uv_metrics(path),"geometry":geometry_metrics(path),"status":"REFERENCE_ONLY"}

def compare(reports):
    return {"models":[{"source_sha256":r["source_sha256"],"parts":len(r["geometry"]["parts"]),"shape_counts":dict(Counter(p["shape_hint"] for p in r["geometry"]["parts"])),"surface_mm2":sum(p["surface_mm2"] for p in r["geometry"]["parts"]),"uv_islands":sum(len(u["islands"]) for u in r["uv"])} for r in reports],"shared_shape_hints":sorted(set.intersection(*(set(p["shape_hint"] for p in r["geometry"]["parts"]) for r in reports))) if reports else [],"status":"REFERENCE_ONLY"}
if __name__=="__main__":
    out=Path(sys.argv[1]); reports=[analyze(p) for p in sys.argv[2:]]
    out.mkdir(parents=True,exist_ok=True)
    for p,r in zip(sys.argv[2:],reports): (out/(Path(p).stem+".json")).write_text(json.dumps(r,indent=2,allow_nan=False))
    (out/"comparison.json").write_text(json.dumps(compare(reports),indent=2,allow_nan=False))
