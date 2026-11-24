"""Measured samples and explicitly qualified geometric fits, in Z-up mm."""
import numpy as np
import trimesh
import json,sys,hashlib
from pathlib import Path

def circle_fit(points):
    p=np.asarray(points,float)
    if len(p)<6: return None
    center=p.mean(axis=0); _,_,basis=np.linalg.svd(p-center,full_matrices=False)
    xy=(p-center)@basis[:2].T
    x,y=xy.T
    a=np.column_stack((2*x,2*y,np.ones(len(x))))
    if np.linalg.matrix_rank(a)<3: return None
    cx,cy,k=np.linalg.lstsq(a,x*x+y*y,rcond=None)[0]
    radius=np.sqrt(max(0,k+cx*cx+cy*cy))
    residual=np.linalg.norm(xy-[cx,cy],axis=1)-radius
    return {"radius_mm":float(radius),"radial_rmse_mm":float(np.sqrt(np.mean(residual**2))),"plane_rmse_mm":float(np.sqrt(np.mean(((p-center)@basis[2])**2))),"center_mm":(center+np.array([cx,cy])@basis[:2]).tolist(),"status":"CIRCLE_CANDIDATE_NOT_CONFIRMED_BEVEL"}

def mesh_parts(path):
    scene=trimesh.load(str(path),force="scene",process=False)
    for node in sorted(scene.graph.nodes_geometry):
        transform,name=scene.graph[node]; m=scene.geometry[name].copy(); m.apply_transform(transform)
        v=np.asarray(m.vertices); m.vertices=np.column_stack((v[:,0],-v[:,2],v[:,1]))*1000
        m.merge_vertices(merge_tex=True,merge_norm=True)
        if len(m.faces): yield node,m,transform

def thickness(m):
    if not m.is_watertight or not m.is_winding_consistent: return {"status":"OPEN_OR_INCONSISTENT_MESH"}
    ids=np.linspace(0,len(m.faces)-1,min(128,len(m.faces)),dtype=int)
    normals=m.face_normals[ids]*(1 if m.volume>0 else -1)
    eps=max(m.extents.max()*1e-7,1e-6)
    origins=m.triangles_center[ids]-normals*eps
    loc,ray,_=m.ray.intersects_location(origins,-normals,multiple_hits=False)
    distances=np.linalg.norm(loc-origins[ray],axis=1)+eps
    return {"status":"SAMPLED_NORMAL_RAY_DISTANCE","samples":len(ids),"hits":len(distances),"percentiles_mm":np.percentile(distances,[10,50,90]).tolist() if len(distances) else [],"note":"Opposite surface distance along inward normal, not guaranteed minimum wall thickness."}

def analyze(path):
    parts=list(mesh_parts(path)); rows=[]; contacts=[]
    for node,m,t in parts:
        center=m.bounds.mean(axis=0); v=m.vertices
        sample=v[np.linspace(0,len(v)-1,min(256,len(v)),dtype=int)]
        symmetry=[]
        for axis in range(3):
            for n in (2,3,4,6,8):
                direction=np.eye(3)[axis]; rot=trimesh.transformations.rotation_matrix(2*np.pi/n,direction,center)
                moved=trimesh.transform_points(sample,rot)
                _,dist,_=trimesh.proximity.closest_point(m,moved)
                symmetry.append({"axis":axis,"order":n,"median_surface_error_mm":float(np.median(dist))})
        sections=[]
        for axis in range(3):
            for fraction in (.25,.5,.75):
                origin=center.copy(); origin[axis]=m.bounds[0,axis]+fraction*m.extents[axis]
                lines=trimesh.intersections.mesh_plane(m,np.eye(3)[axis],origin)
                if len(lines):
                    points=np.unique(lines.reshape(-1,3).round(6),axis=0)
                    sections.append({"axis":axis,"fraction":fraction,"segments_mm":lines.tolist(),"circle_fit":circle_fit(points)})
        rows.append({"node":node,"bounds_mm":m.bounds.tolist(),"dimensions_mm":m.extents.tolist(),"source_transform_gltf":t.tolist(),"thickness":thickness(m),"rotational_symmetry":symmetry,"sections":sections})
    for i,(a,m,_) in enumerate(parts):
        for b,n,_ in parts[:i]:
            gap=np.maximum(np.maximum(m.bounds[0]-n.bounds[1],n.bounds[0]-m.bounds[1]),0)
            if np.linalg.norm(gap)>5: continue
            sample=m.vertices[np.linspace(0,len(m.vertices)-1,min(256,len(m.vertices)),dtype=int)]
            closest,dist,_=trimesh.proximity.closest_point(n,sample)
            k=int(np.argmin(dist))
            contacts.append({"parts":[a,b],"sampled_surface_gap_mm":float(dist[k]),"points_mm":[sample[k].tolist(),closest[k].tolist()],"status":"SAMPLED_CONTACT_CANDIDATE"})
    return {"source_sha256":hashlib.sha256(Path(path).read_bytes()).hexdigest(),"parts":rows,"contacts":contacts,"status":"REFERENCE_ONLY"}
if __name__=="__main__":
    Path(sys.argv[2]).write_text(json.dumps(analyze(sys.argv[1]),indent=2,allow_nan=False))
