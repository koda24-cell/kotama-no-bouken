"""Detailed reference drawings; source geometry is never exported as new geometry."""
import json,hashlib,sys,os
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
from reference_precision import mesh_parts,analyze
from reference_advanced import analyze as advanced
from reference_uv import material_texture_bindings,read_glb

def write(p,data): p.write_text(json.dumps(data,indent=2,allow_nan=False))
def drawing(m,row,path):
    im=Image.new("RGB",(1200,900),"white"); d=ImageDraw.Draw(im)
    d.text((20,15),str(row["node"])[:100],fill="black")
    for k,(a,b) in enumerate(((0,2),(1,2),(0,1))):
        x=20+400*k;y=65; v=m.vertices[:,[a,b]]; lo=v.min(axis=0); hi=v.max(axis=0)
        scale=320/max((hi-lo).max(),1e-9)
        q=(v-lo)*scale
        q[:,1]=320-q[:,1]; q+=np.array([x+20,y+20])
        for edge in m.edges_unique: d.line([tuple(q[j]) for j in edge],fill=(60,90,130))
        d.line((x+20,y+365,x+20+(hi[0]-lo[0])*scale,y+365),fill="black",width=2)
        d.text((x+20,y+380),f"{hi[0]-lo[0]:.2f} mm / {hi[1]-lo[1]:.2f} mm",fill="black")
        d.text((x+20,y),["FRONT XZ","SIDE YZ","TOP XY"][k],fill="black")
    for i,s in enumerate(row["sections"][:6]):
        x=20+(i%3)*400;y=480+(i//3)*190
        axes=[a for a in range(3) if a!=s["axis"]]; lines=np.asarray(s["segments_mm"])[:,:,axes]
        lo=lines.min(axis=(0,1));hi=lines.max(axis=(0,1));scale=145/max((hi-lo).max(),1e-9)
        for line in lines:
            q=(line-lo)*scale; q[:,1]=145-q[:,1];q+=np.array([x,y+20])
            d.line([tuple(p) for p in q],fill=(30,90,160),width=2)
        fit=s["circle_fit"]; label=f"Axis {s['axis']} / {s['fraction']}"
        if fit: label+=f" R~{fit['radius_mm']:.1f} err {fit['radial_rmse_mm']:.1f}"
        d.text((x,y),label,fill="black")
    im.save(path)

def run(src,root):
    precision=analyze(src); adv=advanced(src)
    version=hashlib.sha256((precision["source_sha256"]+Path(__file__).read_text()+os.environ.get("GITHUB_SHA","local")).encode()).hexdigest()[:16]
    out=root/src.stem/version;out.mkdir(parents=True,exist_ok=False)
    meshes=list(mesh_parts(src)); overall=np.max([m.bounds[1] for _,m,_ in meshes],axis=0)-np.min([m.bounds[0] for _,m,_ in meshes],axis=0)
    center=np.mean([m.bounds.mean(axis=0) for _,m,_ in meshes],axis=0)
    im=Image.new("RGB",(1200,900),"white");d=ImageDraw.Draw(im)
    exploded=[]
    for i,((node,m,t),row) in enumerate(zip(meshes,precision["parts"])):
        drawing(m,row,out/f"part-{i:03d}.png")
        c=m.bounds.mean(axis=0);offset=(c-center)*.65
        if np.linalg.norm(offset)<1e-8: offset=np.array([0,0,i*max(overall)*.15])
        exploded.append({"node":node,"offset_mm":offset.tolist(),"center_mm":c.tolist(),"dimension_ratios":(m.extents/np.maximum(overall,1e-9)).tolist(),"source_transform_gltf":t.tolist()})
    allpoints=[(m.vertices+np.array(e["offset_mm"]))[:,[0,2]] for (_,m,_),e in zip(meshes,exploded)]
    lo=np.min([v.min(axis=0) for v in allpoints],axis=0);hi=np.max([v.max(axis=0) for v in allpoints],axis=0);scale=750/max((hi-lo).max(),1e-9)
    for i,((_,m,_),v) in enumerate(zip(meshes,allpoints)):
        q=(v-lo)*scale;q[:,1]=750-q[:,1];q+=50
        for edge in m.edges_unique:d.line([tuple(q[j]) for j in edge],fill=(40,80,130))
        d.text(tuple(q.mean(axis=0)),str(i),fill="red")
    im.save(out/"exploded.png")
    _,doc,_=read_glb(src)
    bindings=[{"mesh":i,"primitive":j,"binding":material_texture_bindings(doc,p)} for i,m in enumerate(doc.get("meshes",[])) for j,p in enumerate(m["primitives"])]
    data={"version":version,"precision":precision,"advanced":adv,"assembly":exploded,"material_layout":bindings,"status":"REFERENCE_ONLY","source_commit":os.environ.get("GITHUB_SHA"),"limitations":"Section segments are sampled geometry, not original CAD control points. Exploded view is illustrative."}
    write(out/"detail.json",data)
    write(out/"manifest.json",{"version":version,"source_sha256":precision["source_sha256"],"files":{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in out.iterdir() if p.is_file()}})
    return data
if __name__=="__main__":
    root=Path(sys.argv[1]); reports=[run(Path(p),root) for p in sys.argv[2:]]
    write(root/"combined-reference-plan.json",{"status":"REFERENCE_PLAN_NOT_NEW_GEOMETRY","sources":[{"version":r["version"],"source_sha256":r["precision"]["source_sha256"],"candidate_parts":r["assembly"]} for r in reports],"selection_required":True})
