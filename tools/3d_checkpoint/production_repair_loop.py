"""Execution adapter for repair attempts; caller supplies isolated render and QA callbacks.
No arbitrary shell commands or unreviewed AI patches are executed here.
"""
from production_diagnosis import diagnose,repair_plan
def run_loop(settings, execute, assess, checkpoint, remaining_minutes, estimate_minutes, max_retries=3):
    if not 0<=max_retries<=3 or estimate_minutes<=0:
        raise ValueError("invalid limits")
    current=dict(settings)
    best=None
    history=[]
    for attempt in range(max_retries+1):
        if remaining_minutes()<estimate_minutes+15:
            return dict(status="budget",best=best,history=history)
        result=execute(dict(current),attempt)
        outcome=result["outcome"]
        if outcome=="success":
            qa=assess(result)
            if qa["technical_pass"]:
                score=qa.get("score")
                if score is not None and (best is None or score>best["score"]):
                    best={"score":score,"artifact":result["artifact"],"settings":dict(current)}
                if qa.get("target_met"):
                    return dict(status="target_met",best=best,history=history)
                outcome="qa_failed"
            else:
                outcome="qa_failed"
        diagnosis=diagnose(result.get("log",""),outcome)
        plan=repair_plan(current,diagnosis,attempt)
        history.append(dict(attempt=attempt,outcome=outcome,diagnosis=diagnosis,plan=plan))
        checkpoint(history,best)
        if attempt>=max_retries or plan["action"] not in ("replan","resume_verified","qa_only"):
            return dict(status=plan["action"],best=best,history=history)
        if plan["action"]=="replan":
            current=plan["settings"]
        elif plan["action"]=="resume_verified":
            if not result.get("checkpoint_verified"):
                return dict(status="stop_unverified",best=best,history=history)
            current["resume_checkpoint"]=result["checkpoint"]
        elif plan["action"]=="qa_only":
            if not result.get("artifact_verified"):
                return dict(status="review",best=best,history=history)
            current["qa_only_artifact"]=result["artifact"]
    return dict(status="retry_limit",best=best,history=history)
