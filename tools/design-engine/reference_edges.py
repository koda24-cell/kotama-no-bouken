"""Geometry diagnostics only; no rejection for intersections or open edges."""
import json,sys,hashlib
from pathlib import Path
import numpy as np
import trimesh

def analyze_edges(path):
    scene=trimesh.load(str(path),force="scene",process=False)
    parts=[]
    for node in sorted(scene.graph.nodes_geometry):
        transform,name=scene.graph[node]
        mesh=scene.geometry[name].copy()
        mesh.apply_transform(transform)
        mesh.merge_vertices(merge_tex=True,merge_norm=True)
        angles=np.degrees(mesh.face_adjacency_angles)
        edges=mesh.face_adjacency_edges
        lengths=np.linalg.norm(mesh.vertices[edges[:,0]]-mesh.vertices[edges[:,1]],axis=1)*1000
        valid=np.isfinite(angles)&np.isfinite(lengths)
        angles=angles[valid]; lengths=lengths[valid]
        convex=mesh.face_adjacency_convex[valid]
        parts.append({"node":node,"adjacent_edges":int(len(angles)),"angle_percentiles_deg":np.percentile(angles,[25,50,75,90,95]).tolist() if len(angles) else [],"sharp_edge_length_mm":float(lengths[angles>=45].sum()),"concave_sharp_length_mm":float(lengths[(angles>=45)&~convex].sum()),"convex_sharp_length_mm":float(lengths[(angles>=45)&convex].sum())})
    return {"source_sha256":hashlib.sha256(Path(path).read_bytes()).hexdigest(),"parts":parts,"status":"REFERENCE_ONLY","limitations":"Dihedral proxy, not continuous curvature; concavity assumes consistent face winding. Boundary and nonmanifold edges are not rejection criteria."}
if __name__=="__main__":
    with Path(sys.argv[2]).open("x") as f: json.dump(analyze_edges(sys.argv[1]),f,indent=2,allow_nan=False)
