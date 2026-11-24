"""Run verified local scene tiles in isolated attempt directories."""
import hashlib,json,os,shutil,subprocess,time
from pathlib import Path
from production_tiles import plan_tiles
from production_source_repair import repair_source
from production_safe_repair import validate_candidate_file
from production_repair_loop import run_loop
from stitch_production_tiles import assemble
from production_seam_qa import evaluate
from production_image_score import score

def run(settings,source,root,reference,deadline,estimate=30):
    source=Path(source).resolve(strict=True)
    root=Path(root).resolve()
    root.mkdir(parents=True,exist_ok=False)
    if len(settings["views"])!=1 or len(settings["frames"])!=1:
        raise ValueError("one view and frame per session required")
    script=Path(__file__).with_name("render_production_tile.py").resolve()
    active_script=script
    fault_injected=False
    def remaining():
        return max(0,(deadline-time.time())/60)
    def execute(s,attempt):
        nonlocal active_script,fault_injected
        folder=root/str(attempt)
        folder.mkdir()
        plan=folder/"plan.json"
        plan.write_text(json.dumps(s))
        hashes={}
        if os.environ.get("PRODUCTION_FAULT_INJECT")=="indentation_once" and not fault_injected:
            broken=folder/"fault-injected-render.py"
            broken.write_text(script.read_text()+"\n# isolated, deliberate syntax fault for recovery verification\ndef _injected_syntax_fault():\n\\treturn 1\n        return 2\n")
            active_script=broken
            fault_injected=True
            print("FAULT_INJECTION_ARMED=indentation_once",flush=True)
        for unit in plan_tiles(s["width"],s["height"],s["columns"],s["rows"],s["views"],s["frames"]):
            if remaining()<15:
                return dict(outcome="timeout",checkpoint_verified=False)
            env=dict(os.environ,RENDER_PLAN=str(plan),RENDER_UNIT=unit["id"],RESUME_BLEND=str(source),RENDER_OUTPUT=str(folder))
            image=folder/(unit["id"]+".png")
            log_path=folder/(unit["id"]+".log")
            with log_path.open("w") as log:
                p=subprocess.run(["blender","-b","--disable-autoexec","--python-exit-code","1","--python",str(active_script)],env=env,stdout=log,stderr=subprocess.STDOUT)
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
                        print("REPAIR_CANDIDATE_ACCEPTED="+verdict["reason"],flush=True)
                        if remaining()>=15:
                            with log_path.open("a") as log:
                                retry=subprocess.run(["blender","-b","--disable-autoexec","--python-exit-code","1","--python",str(active_script)],env=env,stdout=log,stderr=subprocess.STDOUT)
                            if retry.returncode==0 and image.is_file():
                                print("AUTOMATIC_RETRY_SUCCEEDED="+unit["id"],flush=True)
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
        similarity=score(result["artifact"],reference)
        passed=q["status"]=="PASS" and similarity["technical_pass"]
        return dict(technical_pass=passed,score=similarity["score"],target_met=passed,comparison={**q,**similarity})
    def checkpoint(history,best):
        temp=root/"history.tmp"
        temp.write_text(json.dumps(dict(history=history,best=best),default=str))
        temp.replace(root/"history.json")
    result=run_loop(settings,execute,assess,checkpoint,remaining,estimate)
    comparison={"status":"NOT_COMPARED","reference_score":None,"recovered_score":None,"score_delta":None,"selection":"NOT_APPROVED"}
    if result.get("best"):
        recovered=result["best"]["score"]
        baseline=score(reference,reference)["score"]
        comparison.update(status="REFERENCE_COMPARED",reference_score=baseline,recovered_score=recovered,score_delta=recovered-baseline,selection="TECHNICAL_CANDIDATE_NOT_APPROVED")
    (root/"comparison.json").write_text(json.dumps(comparison))
    (root/"result.json").write_text(json.dumps(result,default=str))
    return result
