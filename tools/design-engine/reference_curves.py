"""Candidate fits from tessellated geometry, never original CAD parameters."""
import numpy as np
from collections import defaultdict

def cylinder_fit(vertices):
    p=np.asarray(vertices,float)
    if len(p)<8:return []
    origin=p.mean(axis=0)
    _,_,basis=np.linalg.svd(p-origin,full_matrices=False)
    results=[]
    for axis in basis:
        helper=np.eye(3)[np.argmin(abs(axis))]
        u=np.cross(axis,helper);u/=np.linalg.norm(u);v=np.cross(axis,u)
        xy=(p-origin)@np.array([u,v]).T;x,y=xy.T
        A=np.column_stack((2*x,2*y,np.ones(len(x))))
        if np.linalg.matrix_rank(A)<3:continue
        a,b,c=np.linalg.lstsq(A,x*x+y*y,rcond=None)[0]
        r=np.sqrt(max(0,c+a*a+b*b))
        if r<=1e-9:continue
        err=np.linalg.norm(xy-[a,b],axis=1)-r
        results.append({"axis":axis.tolist(),"axis_point_mm":(origin+a*u+b*v).tolist(),"radius_mm":float(r),"radial_rmse_mm":float(np.sqrt(np.mean(err**2))),"relative_rmse":float(np.sqrt(np.mean(err**2))/r),"axial_span_mm":float(np.ptp((p-origin)@axis)),"status":"CANDIDATE"})
    return sorted(results,key=lambda x:x["relative_rmse"])

def repetition(parts):
    groups=defaultdict(list)
    for node,m,_ in parts:
        groups[tuple(np.round(np.sort(m.extents),1))].append((node,m.bounds.mean(axis=0)))
    rows=[]
    for group in groups.values():
        if len(group)<3:continue
        for axis in range(3):
            ordered=sorted(group,key=lambda x:x[1][axis])
            gaps=np.diff([p[1][axis] for p in ordered])
            if min(gaps)<=1e-6:continue
            step=float(np.median(gaps))
            transverse=np.delete(np.array([p[1] for p in ordered]),axis,axis=1)
            rows.append({"nodes":[p[0] for p in ordered],"axis":axis,"interval_mm":step,"interval_rmse_mm":float(np.sqrt(np.mean((gaps-step)**2))),"transverse_span_mm":np.ptp(transverse,axis=0).tolist(),"status":"DIMENSION_MATCH_CANDIDATE"})
    return rows

def section_controls(segments):
    # Preserve connected contour topology, without bridging disconnected loops.
    graph=defaultdict(set)
    for a,b in np.asarray(segments).round(5):
        a,b=tuple(a),tuple(b)
        if a!=b:graph[a].add(b);graph[b].add(a)
    edges={tuple(sorted((a,b))) for a,ns in graph.items() for b in ns}
    curves=[]
    while edges:
        a,b=min(edges);start=a if len(graph[a])!=2 else b if len(graph[b])!=2 else a
        chain=[start];current=start
        while True:
            candidates=sorted(n for n in graph[current] if tuple(sorted((current,n))) in edges)
            if not candidates:break
            nxt=candidates[0];edges.remove(tuple(sorted((current,nxt))));chain.append(nxt);current=nxt
            if current==start or len(graph[current])!=2:break
        curves.append({"degree":1,"control_points_mm":[list(p) for p in chain],"closed":chain[0]==chain[-1],"status":"POLYLINE_APPROXIMATION"})
    return curves

def surface_controls(mesh):
    ids=np.linspace(0,len(mesh.faces)-1,min(128,len(mesh.faces)),dtype=int)
    return {"patches":[{"degree":[1,1],"triangle_control_points_mm":mesh.vertices[mesh.faces[i]].tolist()} for i in ids],"status":"SAMPLED_LINEAR_TRIANGLE_PATCHES_NOT_CAD"}
