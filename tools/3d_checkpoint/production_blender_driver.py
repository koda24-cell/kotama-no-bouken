"""Run verified local scene tiles in isolated attempt directories.
Caller must scan and verify all input files before invoking this driver.
"""
import hashlib,json,os,subprocess,time
from pathlib import Path
from production_tiles import plan_tiles
from production_source_repair import repair_source
from production_repair_loop import run_loop
from stitch_production_tiles import assemble
from production_seam_qa import evaluate
def run(settings,source,root,reference,deadline,estimate=30):
    source=Path(source).resolve(strict=True)
    root=Path(root).resolve()
    root.mkdir(parents=True,exist_ok=False)
    if len(settings["views"])!=1 or len(settings["frames"])!=1:
        raise ValueError("one view and frame per session required")
    script=Path(__file__).with_name("render_production_tile.py").resolve()
    active_script=script
    def remaining():
        return max(0,(deadline-time.time())/60)
    def execute(s,attempt):
        nonlocal active_script
        folder=root/str(attempt)
        folder.mkdir()
        if s.get("qa_only_artifact"):
            return dict(outcome="qa_failed",log="QA review required",artifact_verified=False)
        plan=folder/"plan.json"
        plan.write_text(json.dumps(s))
        hashes={}
        for unit in plan_tiles(s["width"],s["height"],s["columns"],s["rows"],s["views"],s["frames"]):
            if remaining()<15:
                return dict(outcome="timeout",checkpoint_verified=False)
            env=dict(os.environ,RENDER_PLAN=str(plan),RENDER_UNIT=unit["id"],RESUME_BLEND=str(source),RENDER_OUTPUT=str(folder))
            with (folder/(unit["id"]+".log")).open("w") as log:
                p=subprocess.run(["blender","-b","--disable-autoexec","--python-exit-code","1","--python",str(active_script)],env=env,stdout=log,stderr=subprocess.STDOUT)
            if p.returncode:
                log_text=(folder/(unit["id"]+".log")).read_text(errors="replace")[-65536:]
                candidate=repair_source(active_script.read_text(),log_text)
                if candidate is not None:
                    # Keep the candidate for review; do not execute unscanned source.
                    (folder/"repair-candidate.py").write_text(candidate)
                return dict(outcome="render_failed",log=log_text)
            image=folder/(unit["id"]+".png")
            hashes[unit["id"]]=hashlib.sha256(image.read_bytes()).hexdigest()
        if len(s["views"])!=1 or len(s["frames"])!=1:
            raise ValueError("driver currently requires one view and frame per session")
        target=folder/"assembled.png"
        assemble(s,s["views"][0],s["frames"][0],folder,hashes,target)
        return dict(outcome="success",artifact=str(target),settings=s,artifact_verified=True)
    def assess(result):
        s=result["settings"]
        q=evaluate(result["artifact"],reference,s["columns"],s["rows"])
        passed=q["status"]=="PASS"
        return dict(technical_pass=passed,score=1-q["mae"]/255,target_met=passed)
    def checkpoint(history,best):
        temp=root/"history.tmp"
        temp.write_text(json.dumps(dict(history=history,best=best)))
        temp.replace(root/"history.json")
    result=run_loop(settings,execute,assess,checkpoint,remaining,estimate)
    (root/"result.json").write_text(json.dumps(result))
    return result
