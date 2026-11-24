"""Opaque triangle silhouettes, not material-aware rendering."""
import json,sys,hashlib
from pathlib import Path
import numpy as np
import trimesh
from PIL import Image,ImageDraw
VIEWS={"front":(0,2,1),"back":(0,2,-1),"left":(1,2,-1),"right":(1,2,1),"top":(0,1,1)}
def views(path,folder,size=512):
    if type(size)!=int or not 64<=size<=2048: raise ValueError("Invalid image size")
    scene=trimesh.load(str(path),force="scene",process=False)
    triangles=[]
    for node in scene.graph.nodes_geometry:
        transform,name=scene.graph[node]
        mesh=scene.geometry[name].copy()
        mesh.apply_transform(transform)
        v=np.asarray(mesh.vertices)
        v=np.column_stack((v[:,0],-v[:,2],v[:,1]))*1000
        if len(mesh.faces): triangles.append(v[mesh.faces])
    if not triangles: raise ValueError("No triangles")
    t=np.concatenate(triangles)
    if not np.isfinite(t).all(): raise ValueError("Nonfinite geometry")
    lo=t.min(axis=(0,1)); hi=t.max(axis=(0,1)); center=(lo+hi)/2
    scale=(size-32)/max(float(max(hi-lo)),1e-9)
    p=Path(folder); p.mkdir(parents=True,exist_ok=False)
    result={"source_sha256":hashlib.sha256(Path(path).read_bytes()).hexdigest(),"px_per_mm":scale,"views":{},"limitations":"Opaque static geometry; no alpha, skinning or lighting"}
    for name,(x,y,sign) in VIEWS.items():
        im=Image.new("L",(size,size)); d=ImageDraw.Draw(im)
        for tri in t:
            d.polygon([(float(size/2+sign*(v[x]-center[x])*scale),float(size/2-(v[y]-center[y])*scale)) for v in tri],fill=255)
        f=p/(name+".png"); im.save(f)
        result["views"][name]={"bounds_px":im.getbbox(),"area_px":im.histogram()[255],"sha256":hashlib.sha256(f.read_bytes()).hexdigest()}
    (p/"views.json").write_text(json.dumps(result,indent=2,allow_nan=False))
    return result
if __name__=="__main__": views(sys.argv[1],sys.argv[2])
