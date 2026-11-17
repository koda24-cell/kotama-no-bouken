"""Fern single pinnule V04: four silhouette options, keep V03 untouched.
Original procedural geometry, no reference photograph embedded.
Review candidates only: NOT_APPROVED.
"""
import json, math, hashlib, os
from pathlib import Path
import numpy as np
import trimesh

OUT=Path(os.environ.get("B2_LEAF_V04_OUTPUT","render-output/b2-fern-leaf-v04"))
OUT.mkdir(parents=True,exist_ok=True)
VARIANTS=[("V03_like",.05,.07,0.),("V04_soft",.095,.085,.035),
          ("V04_natural",.14,.13,.07),("V04_rugged",.21,.17,.095)]

def build_leaf(depth,uneven,flutter):
    nang,nrad,length=121,25,.121
    angles=np.linspace(-1.05,1.05,nang)
    vertices=[];colors=[];faces=[]
    for r in np.linspace(0,1,nrad):
        for a in angles:
            index=(a+1.05)/2.1
            centers=[.19,.37,.575,.79]
            deviations=[-.018,.029,-.011,.025]
            clefts=sum(np.exp(-.5*((index-(c+d))/.024)**2)*w
                       for (c,d,w) in zip(centers,deviations,[.76,1.02,.67,.90]))
            tiny=.016*np.sin(8.3*a+.7)+uneven*.16*np.sin(14*a+1.6)+flutter*.13*np.sin(25*a)
            radius=length*(1-.040*math.cos(a*2)-depth*clefts+tiny)
            x=.92*radius*np.sin(a)*r
            y=radius*np.cos(a)*r
            z=(.012*np.sin(np.pi*r)*np.cos(.7*a)+.006*r*r*np.sin(2.1*a)
               +flutter*.015*r*r*np.sin(7*a))
            vertices.append((x,y,z))
            shade=.93+.13*r+.018*np.cos(3*a)
            colors.append((int(70*shade),int(137*shade),int(78*shade),255))
    for i in range(nrad-1):
        for j in range(nang-1):
            k=i*nang+j;l=k+nang
            faces.extend(((k,k+1,l),(k+1,l+1,l),(l,k+1,k),(l,l+1,k+1)))
    mesh=trimesh.Trimesh(vertices=np.array(vertices),faces=np.array(faces),process=False)
    mesh.visual.vertex_colors=np.array(colors,dtype=np.uint8)
    mesh.apply_transform(trimesh.transformations.rotation_matrix(-np.pi/2,[1,0,0]))
    return mesh

if __name__=="__main__":
    report={"asset":"maidenhair_pinnule_v04","status":"NOT_APPROVED",
            "note":"V03 preserved; these are comparative variations, not approved assets",
            "variants":[]}
    for name,depth,uneven,flutter in VARIANTS:
        mesh=build_leaf(depth,uneven,flutter)
        output=OUT/(name+".glb");mesh.export(output)
        report["variants"].append({"name":name,"depth":depth,"uneven":uneven,
            "flutter":flutter,"glb":output.name,
            "sha256":hashlib.sha256(output.read_bytes()).hexdigest(),
            "bounds_m":mesh.bounds.tolist()})
    (OUT/"manifest.json").write_text(json.dumps(report,indent=2))
    print("B2_LEAF_V04",len(report["variants"]),"unapproved GLBs")
