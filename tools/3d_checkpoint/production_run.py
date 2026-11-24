import argparse,json,time
from pathlib import Path
from production_blender_driver import run

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--plan",required=True)
    p.add_argument("--source",required=True)
    p.add_argument("--references",required=True)
    p.add_argument("--output",required=True)
    p.add_argument("--minutes",type=int,default=360)
    a=p.parse_args()
    if not 1<=a.minutes<=360: p.error("minutes must be 1..360")
    settings=json.loads(Path(a.plan).read_text())
    deadline=time.time()+a.minutes*60
    root=Path(a.output)
    root.mkdir(parents=True,exist_ok=False)
    results={}
    for view in settings["views"]:
        for frame in settings["frames"]:
            if view not in ("front","side","back","angle") or type(frame) is not int or frame<0:
                raise ValueError("invalid view/frame")
            key=f"{view}-{frame}"
            result=run(dict(settings,views=[view],frames=[frame]),a.source,root/key,Path(a.references)/(key+".png"),deadline)
            results[key]=result
            (root/"summary.json").write_text(json.dumps(results,default=str))
            if result["status"]!="target_met":
                print("PRODUCTION_STOP",key,result.get("status"),flush=True)
                return 1
    print("PRODUCTION_TARGET_MET",flush=True)
    return 0
if __name__=="__main__": raise SystemExit(main())
