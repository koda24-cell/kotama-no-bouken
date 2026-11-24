"""Read static GLB reference geometry; glTF Y-up metres converted to Z-up mm."""
import hashlib,json,sys
from pathlib import Path
import numpy as np
import trimesh

def analyze(path):
    p=Path(path)
    scene=trimesh.load(str(p),force="scene",process=False)
    meshes=[]
    parts=[]
    for node in sorted(scene.graph.nodes_geometry):
        transform,name=scene.graph[node]
        mesh=scene.geometry[name].copy()
        mesh.apply_transform(transform)
        v=np.asarray(mesh.vertices).copy()
        mesh.vertices=np.column_stack((v[:,0],-v[:,2],v[:,1]))*1000
        if not len(mesh.faces): continue
        if not np.isfinite(mesh.vertices).all(): raise ValueError("Nonfinite geometry")
        meshes.append(mesh)
        parts.append({"node":node,"bounds_mm":mesh.bounds.tolist(),"dimensions_mm":mesh.extents.tolist(),"triangles":len(mesh.faces)})
    if not meshes: raise ValueError("No triangle meshes")
    combined=trimesh.util.concatenate(meshes)
    bounds=combined.bounds
    sections=[]
    for fraction in (.1,.25,.5,.75,.9):
        z=float(bounds[0,2]+fraction*combined.extents[2])
        lines=trimesh.intersections.mesh_plane(combined,[0,0,1],[0,0,z])
        sections.append({"z_mm":z,"segments_mm":lines.tolist()})
    return {"source_sha256":hashlib.sha256(p.read_bytes()).hexdigest(),"units":"mm","axes":"Z-up","bounds_mm":bounds.tolist(),"dimensions_mm":combined.extents.tolist(),"parts":parts,"sections":sections,"status":"REFERENCE_ONLY"}
if __name__=="__main__":
    with Path(sys.argv[2]).open("x") as f: json.dump(analyze(sys.argv[1]),f,indent=2,allow_nan=False)
