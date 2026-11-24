"""Bounded real Blender candidate queue with durable per-candidate checkpoints."""
import argparse,subprocess,time,json,hashlib,os
from pathlib import Path
from advanced_session import run,digest
from production_visual_quality import evaluate
VIEWS=("front","side","back","angle")
def main():
    p=argparse.ArgumentParser();p.add_argument("--source",required=True);p.add_argument("--output",required=True);p.add_argument("--minutes",type=int,default=45);p.add_argument("--reference");a=p.parse_args()
    if not 1<=a.minutes<=360:p.error("minutes 1..360")
    root=Path(a.output).resolve();root.mkdir(parents=True,exist_ok=True);source=Path(a.source).resolve()
    worker=Path(__file__).with_name("advanced_real_worker.py")
    ref=Path(a.reference).resolve() if a.reference else source
    def scan(path,log,deadline):
        subprocess.run(["bash","tools/security/clamav_scan_gate.sh","scan",str(path),str(log)],check=True,timeout=max(1,deadline-time.monotonic()))
    scan(source,root/"input-scan.log",time.monotonic()+120)
    scan(worker.parent,root/"source-scan.log",time.monotonic()+120)
    def work(step,settings,deadline):
        if settings.get("delegate"):return {"ok":False,"error":"manual syntax review"}
        folder=root/(step+"-"+str(time.time_ns()))
        log=folder.with_suffix(".log")
        try:
            with log.open("w") as f:
                r=subprocess.run(["blender","-b","--disable-autoexec","--python-exit-code","1","--python",str(worker),"--",str(source),str(folder),step,str(8 if settings.get("samples_scale")==.5 else 16)],stdout=f,stderr=subprocess.STDOUT,timeout=max(1,deadline-time.monotonic()))
        except subprocess.TimeoutExpired:return {"ok":False,"error":"deadline"}
        if r.returncode:return {"ok":False,"error":log.read_text(errors="replace")[-16000:]}
        scan(folder,folder.with_suffix(".scan.log"),deadline)
        views={v:evaluate(folder/"reimport"/(v+".png"),folder/"before_export"/(v+".png")) for v in VIEWS}
        if not all(x["technical_pass"] and x["score"]>=.95 for x in views.values()):return {"ok":False,"error":"roundtrip regression"}
        report={"roundtrip":views,"approval":"NOT_APPROVED","aesthetic":"REVIEW_REQUIRED"}
        (folder/"comparison.json").write_text(json.dumps(report,indent=2))
        return {"ok":True,"scan_pass":True,"files":[x for x in folder.rglob("*") if x.is_file()]}
    status=run(root,source,ref,["baseline","material","surface","chips","cracks"],work,a.minutes)
    state=json.loads((root/"session.json").read_text()) if (root/"session.json").exists() else {"done":{}}
    def folder(step):return Path(next(p for p in state["done"][step] if p.endswith("comparison.json"))).parent
    if "baseline" in state["done"]:
        baseline=folder("baseline")
        scores={}
        for step in state["done"]:
            scores[step]={v:evaluate(folder(step)/"reimport"/(v+".png"),baseline/"reimport"/(v+".png")) for v in VIEWS}
        (root/"review.json").write_text(json.dumps({"status":status,"baseline_similarity":scores,"aesthetic":"HUMAN_REVIEW_REQUIRED","approval":"NOT_APPROVED"},indent=2))
    print("ADVANCED_SESSION",status)
    return 0 if status=="COMPLETE" else 1
if __name__=="__main__":raise SystemExit(main())
