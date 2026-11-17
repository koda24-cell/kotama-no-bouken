"""Create 3 snow overlays on the existing unapproved B2 balanced fern GLB.
Preserves existing leaf positions and mesh faces. The source is a review GLB, not a
permanent asset in this repository. Requires numpy & trimesh.
python tools/b2-vegetation/add_fern_snow_v02.py --input /path/to/balanced.glb
"""
from pathlib import Path
import argparse, hashlib, json, math
import numpy as np
import trimesh

def build(source: Path, dest: Path):
    dest.mkdir(parents=True, exist_ok=True)
    original=trimesh.load(source, force="scene")
    variants=[("light",.36,.11),("balanced",.65,.28),("heavy",.86,.49)]
    result={"source":str(source),"source_sha256":hashlib.sha256(source.read_bytes()).hexdigest(),
            "status":"NOT_APPROVED","reference":"approved V08 leaf topology; new snow caps",
            "photographic_texture_applied":False,"variants":[]}
    for label,cover,amount in variants:
        scene=trimesh.Scene()
        shell_parts=[];face_parts=[];color_parts=[]
        coated=0
        rng=np.random.default_rng(11272026)
        count=0
        for node in original.graph.nodes_geometry:
            tf,key=original.graph[node]
            mesh=original.geometry[key].copy();mesh.apply_transform(tf)
            if "leaf" not in key:
                scene.add_geometry(mesh,geom_name="original_"+key)
                continue
            leaf_key=sum(map(ord,key))
            chosen=abs(math.sin(len(key)*15.31+leaf_key*.477))<=cover
            if not chosen:
                scene.add_geometry(mesh,geom_name="original_"+key)
                continue
            v=np.asarray(mesh.vertices)
            upper=(v[:,1]-v[:,1].min())/max(np.ptp(v[:,1]),.001)
            frost=np.clip((upper-(.63-.15*amount))*3.1,0,1)
            frost*=np.clip(.60+amount*.87+.15*np.sin(v[:,0]*156+v[:,2]*199),0,1)
            rgba=np.asarray(mesh.visual.vertex_colors).copy()
            rgba[:,:3]=np.uint8(np.clip(rgba[:,:3]*(1-frost[:,None])
                                      +np.array([228,238,242])*frost[:,None],0,255))
            mesh.visual.vertex_colors=rgba
            scene.add_geometry(mesh,geom_name="original_"+key)
            tris=np.asarray(mesh.faces)
            normals=mesh.face_normals
            centroid=v[tris].mean(axis=1)
            h=(centroid[:,1]-v[:,1].min())/max(np.ptp(v[:,1]),.001)
            wind=.20*np.maximum(-normals[:,2],0)
            phase=(centroid[:,0]*112+centroid[:,2]*96+leaf_key*.31)
            ridge=.5*np.sin(phase)+.25*np.sin(phase*.69+1.4)+.25*np.cos(phase*1.37)
            mask=(h*.28+np.clip(normals[:,1]+wind,0,1)*.60
                  +amount*.37+ridge*.16>.48+amount*.46)&(normals[:,1]>.30)
            idx=np.flatnonzero(mask)
            if not len(idx):continue
            idx=idx[::max(1,int(len(idx)/max(90,int(145+130*amount))))]
            cap=v[tris[idx]]+normals[idx,None,:]*(.00024+.00038*amount)
            shell_parts.append(cap.reshape(-1,3))
            face_parts.append(np.arange(len(cap)*3).reshape(-1,3)+count)
            count+=len(cap)*3
            shades=rng.uniform(.93,1.04,(len(cap),1))
            rgb=np.clip(np.array([221,234,238])*shades,0,255).astype(np.uint8)
            color_parts.append(np.column_stack([np.repeat(rgb,3,axis=0),
                                                np.full(len(cap)*3,255,dtype=np.uint8)]))
            coated+=1
        if shell_parts:
            snow=trimesh.Trimesh(vertices=np.vstack(shell_parts),
                faces=np.vstack(face_parts),process=False)
            snow.visual.vertex_colors=np.vstack(color_parts)
            scene.add_geometry(snow,geom_name="new_snow_cap_surface")
        path=dest/("b2_fern_snow_v02_"+label+".glb")
        scene.export(path)
        result["variants"].append({"name":label,"coated_leaves":coated,
            "cap_faces":count//3,"sha256":hashlib.sha256(path.read_bytes()).hexdigest()})
    (dest/"manifest.json").write_text(json.dumps(result,ensure_ascii=False,indent=2))
    print("V02_SNOW_VARIANTS",result["variants"])

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--input",type=Path,required=True)
    p.add_argument("--output",type=Path,default=Path("render-output/b2-fern-snow-v02"))
    a=p.parse_args()
    build(a.input,a.output)
