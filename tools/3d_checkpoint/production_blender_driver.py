"""Run verified local scene tiles in isolated attempt directories."""
import hashlib,json,os,subprocess,time
from pathlib import Path
from production_tiles import plan_tiles
from production_source_repair import repair_source
from production_safe_repair import validate_candidate_file
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
        plan=folder/"plan.json"
        plan.write_text(json.dumps(s))
        hashes={}
        for unit in plan_tiles(s["width"],s["height"],s["columns"],s["rows"],s["views"],s["frames"]):
            if remaining()<15:
                return dict(outcome="timeout",checkpoint_verified=False)
            env=dict(os.environ,RENDER_PLAN=str(plan),RENDER_UNIT=unit["id"],RESUME_BLEND=str(source),RENDER_OUTPUT=str(folder))
            image=folder/(unit["id"]+".png")
            log_path=folder/(unit["id"]+".log")
            p=subprocess.run(["blender","-b","--disable-autoexec","--python-exit-code","1","--python",str(active_script)],env=env,stdout=log_path.open("w"),stderr=subprocess.STDOUT)
            if p.returncode:
                log_text=log_path.read_text(errors="replace")[-65536:]
                candidate=repair_source(active_script.read_text(),log_text)
                if candidate is not None and attempt<3:
                    candidate_path=folder/"repair-candidate.py"
                    candidate_path.write_text(candidate)
                    scan_log=folder/"repair-candidate-scan.log"
                    scan=subprocess.run(["bash","tools/security/clamav_scan_gate.sh","scan",str(candidate_path),str(scan_log)],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
                    verdict=validate_candidate_file(active_script,candidate_path,log_text,scan_pass=scan.returncode==0 and "SCAN_PASS:" in scan.stdout,attempt=attempt)
                    (folder/"repair-safety.json").write_text(json.dumps(verdict))
                    if verdict["accepted"]:
                        active_script=candidate_path
                        if remaining()>=15:
                            retry=subprocess.run(["blender","-b","--disable-autoexec","--python-exit-code","1","--python",str(active_script)],env=env,stdout=log_path.open("a"),stderr=subprocess.STDOUT)
                            if retry.returncode==0 and image.is_file():
                                hashes[unit["id"]]=hashlib.sha256(image.read_bytes()).hexdigest()
                                continue
                return dict(outcome="render_failed",log=log_text,repair_candidate=str(candidate_path) if candidate is not None else None)
            if not image.is_file():
                return dict(outcome="render_failed",log="renderer returned success without tile output")
            hashes[unit["id"]]=hashlib.sha256(image.read_bytes()).hexdigest()
        target=folder/"assembled.png"
        assemble(s,s["views"][0],s["frames"][0],folder,hashes,target)
        return dict(outcome="success",artifact=str(target),settings=s,artifact_verified=True)
    def assess(result):
        s=result["settings"]
        q=evaluate(result["artifact"],reference,s["columns"],s["rows"])
        passed=q["status"]=="PASS"
        return dict(technical_pass=passed,score=1-q["mae"]/255,target_met=passed,comparison=q)
    def checkpoint(history,best):
        temp=root/"history.tmp"
        temp.write_text(json.dumps(dict(history=history,best=best),default=str))
        temp.replace(root/"history.json")
    result=run_loop(settings,execute,assess,checkpoint,remaining,estimate)
    comparison={"status":"NOT_COMPARED","baseline_score":None,"best_score":None,"improvement":None,"selection":"NOT_APPROVED"}
    if result.get("best"):
        best_score=result["best"]["score"]
        comparison.update(status="COMPARED_TO_REFERENCE",baseline_score=None,best_score=best_score,improvement=None,selection="BEST_TECHNICAL_CANDIDATE_NOT_APPROVED")
    (root/"comparison.json").write_text(json.dumps(comparison))
    (root/"result.json").write_text(json.dumps(result,default=str))
    return result
