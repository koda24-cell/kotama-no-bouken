"""Bounded real Blender candidate queue with durable per-candidate checkpoints."""
import argparse,subprocess,time,json,hashlib,os
from pathlib import Path
from advanced_session import run,digest
from production_visual_quality import evaluate
from advanced_selection import score,select
from advanced_art_review import packet
from advanced_review_loop import read_review,decide
VIEWS=("front","side","back","angle")
def main():
    p=argparse.ArgumentParser();p.add_argument("--source",required=True);p.add_argument("--output",required=True);p.add_argument("--minutes",type=int,default=45);p.add_argument("--reference");p.add_argument("--rounds",type=int,default=2);p.add_argument("--pause-after",type=int,default=0);p.add_argument("--fault-test",action="store_true");p.add_argument("--review-dir");p.add_argument("--vision-model");a=p.parse_args()
    if not 1<=a.minutes<=360:p.error("minutes 1..360")
    root=Path(a.output).resolve();root.mkdir(parents=True,exist_ok=True);source=Path(a.source).resolve()
    worker=Path(__file__).with_name("advanced_real_worker.py")
    ref=Path(a.reference).resolve() if a.reference else source
    if not 1<=a.rounds<=4:p.error("rounds 1..4")
    current=source
    def scan(path,log,deadline):
        subprocess.run(["bash","tools/security/clamav_scan_gate.sh","scan",str(path),str(log)],check=True,timeout=max(1,deadline-time.monotonic()))
    scan(source,root/"input-scan.log",time.monotonic()+120)
    scan(worker.parent,root/"source-scan.log",time.monotonic()+120)
    completed=0
    def work(step,settings,deadline):
        nonlocal completed
        if a.pause_after and completed>=a.pause_after:return {"ok":False,"error":"planned pause"}
        if settings.get("delegate"):return {"ok":False,"error":"manual syntax review"}
        folder=root/(step+"-"+str(time.time_ns()))
        log=folder.with_suffix(".log")
        try:
            with log.open("w") as f:
                r=subprocess.run(["blender","-b","--disable-autoexec","--python-exit-code","1","--python",str(worker),"--",str(ref if step=="reference" else current),str(folder),("baseline" if step=="reference" else step),str(8 if settings.get("samples_scale")==.5 else 16)]+(["--fault-test"] if a.fault_test and step=="baseline" and not settings else []),stdout=f,stderr=subprocess.STDOUT,timeout=max(1,deadline-time.monotonic()))
        except subprocess.TimeoutExpired:return {"ok":False,"error":"deadline"}
        if r.returncode:return {"ok":False,"error":log.read_text(errors="replace")[-16000:]}
        scan(folder,folder.with_suffix(".scan.log"),deadline)
        views={v:evaluate(folder/"reimport"/(v+".png"),folder/"before_export"/(v+".png")) for v in VIEWS}
        if not all(x["technical_pass"] and x["score"]>=.95 for x in views.values()):return {"ok":False,"error":"roundtrip regression"}
        report={"roundtrip":views,"approval":"NOT_APPROVED","aesthetic":"REVIEW_REQUIRED"}
        (folder/"comparison.json").write_text(json.dumps(report,indent=2))
        completed+=1
        return {"ok":True,"scan_pass":True,"files":[x for x in folder.rglob("*") if x.is_file()]}
    deadline=time.monotonic()+a.minutes*60
    status="COMPLETE"
    history=[]
    def checkpoint(roundroot,steps):
        return run(roundroot,current,ref,steps,work,max(0,(deadline-time.monotonic())/60))
    def locate(roundroot,step):
        state=json.loads((roundroot/"session.json").read_text())
        return Path(next(p for p in state["done"][step] if p.endswith("comparison.json"))).parent
    if a.reference:
        scan(ref,root/"reference-scan.log",deadline)
        status=checkpoint(root,["reference"])
        if status!="COMPLETE":return 1
        target=locate(root,"reference")/"reimport"
    else:target=None
    vision=None
    if a.vision_model:
        from advanced_local_vision import LocalVision
        scan(Path(a.vision_model),root/"vision-model-scan.log",deadline)
        vision=LocalVision(a.vision_model)
    modes=["material","surface","chips","cracks"]
    for i in range(a.rounds):
        rr=root/("round-"+str(i))
        steps=["baseline"]+modes
        status=checkpoint(rr,steps)
        if status!="COMPLETE":break
        base=locate(rr,"baseline")
        target_view=target or base/"reimport"
        def assess(step):
            f=locate(rr,step);v=score(f/"reimport",target_view)
            review=packet(f/"reimport",target_view)
            v["art_review_packet"]=review
            v.update(path=str(f),verified=True,preserved=json.loads((f/"geometry.json").read_text())["preserved"])
            return v
        baseline=assess("baseline")
        candidates=[assess(s) for s in steps[1:]]
        best=select(baseline,candidates) if target else baseline
        review_status="NUMERIC_ONLY"
        if a.review_dir or vision:
            best,next_modes,review_status=decide(baseline,candidates,vision.review if vision else lambda item:read_review(a.review_dir,item))
        history.append({"review_status":review_status,"round":i,"selected":best,"baseline":baseline,"candidates":candidates,"approval":"NOT_APPROVED"})
        tmp=root/"selection.tmp";tmp.write_text(json.dumps(history,indent=2));tmp.replace(root/"selection.json")
        if a.review_dir or vision:
            if review_status!="REVIEWED" or not next_modes or best is baseline:break
            modes=next_modes
        elif best is baseline:break
        current=Path(best["path"])/"model.glb"
    print("ADVANCED_SESSION",status)
    return 0 if status=="COMPLETE" or (a.pause_after and completed==a.pause_after and status=="REVIEW_REQUIRED") else 1
if __name__=="__main__":raise SystemExit(main())
