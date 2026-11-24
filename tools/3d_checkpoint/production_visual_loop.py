"""Bounded, reference-guided candidate loop. No external API or automatic approval."""
import argparse,json,subprocess,hashlib,time,struct
from pathlib import Path
from production_visual_quality import evaluate,choose
VIEWS=("front","side","back","angle")
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def aggregate(folder,reference):
    views={v:evaluate(folder/(v+".png"),reference/(v+".png")) for v in VIEWS}
    metrics={k:sum(x["metrics"][k] for x in views.values())/4 for k in next(iter(views.values()))["metrics"]}
    glb=(folder/"model.glb").read_bytes()
    assert glb[:4]==b"glTF" and struct.unpack_from("<II",glb,4)==(2,len(glb))
    geo=json.loads((folder/"geometry.json").read_text())
    return {"score":sum(x["score"] for x in views.values())/4,"metrics":metrics,"views":views,"technical_pass":all(x["technical_pass"] for x in views.values()),"geometry_preserved":geo["geometry_preserved"],"mesh_hash":geo["original_mesh_hash"],"artifact_verified":True,"path":str(folder),"hashes":{p.name:digest(p) for p in folder.iterdir() if p.is_file()},"approval":"NOT_APPROVED"}
def main():
    p=argparse.ArgumentParser();p.add_argument("--output",required=True);p.add_argument("--rounds",type=int,default=2);p.add_argument("--minutes",type=int,default=30);a=p.parse_args()
    assert 1<=a.rounds<=4 and 1<=a.minutes<=55
    root=Path(a.output).resolve();root.mkdir(exist_ok=False); deadline=time.monotonic()+a.minutes*60
    worker=Path(__file__).with_name("production_visual_blender.py").resolve()
    def run(source,name,mode):
        folder=root/name
        subprocess.run(["blender","-b","--disable-autoexec","--python-exit-code","1","--python",str(worker),"--",str(source),str(folder),mode,"Prop"],check=True,timeout=max(1,deadline-time.monotonic()))
        subprocess.run(["bash","tools/security/clamav_scan_gate.sh","scan",str(folder),str(root/(name+"-scan.log"))],check=True,timeout=max(1,deadline-time.monotonic()))
        return folder
    ref=run("fixture","reference","bevel_medium")
    base=run("fixture","baseline","baseline")
    original=digest(base/"model.blend"); best=aggregate(base,ref); history=[]
    for i in range(a.rounds):
        candidates=[]
        for mode in ("bevel_small","bevel_medium","normals","roughness","detail"):
            folder=run(Path(best["path"])/"model.blend",f"r{i}-{mode}",mode)
            c=aggregate(folder,ref);c["geometry_preserved"] &= c["mesh_hash"]==best["mesh_hash"]
            if any(c["views"][v]["score"]<best["views"][v]["score"]-.03 for v in VIEWS): c["technical_pass"]=False
            candidates.append(c)
        selected=choose(best,candidates,minimum_gain=.0001)
        history.append({"round":i,"baseline":best,"candidates":candidates,"selected":selected,"rollback":selected is best})
        unchanged=selected is best;best=selected
        tmp=root/"progress.tmp";tmp.write_text(json.dumps({"history":history,"best":best,"approval":"NOT_APPROVED"},indent=2));tmp.replace(root/"progress.json")
        if unchanged: break
    assert digest(base/"model.blend")==original
    assert best["score"]>history[0]["baseline"]["score"],"fixture did not improve"
    print("VISUAL_LOOP_COMPLETE",best["score"],best["path"])
if __name__=="__main__":main()
