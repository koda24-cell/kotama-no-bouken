"""Plan next production action from independently verified artifact evidence.
No process termination or remote upload is performed by this module.
"""
from production_budget import Budget, route
from production_progress import pending

def next_action(state, planned, verified, now, job_start, phase="idle",
                estimates=None, retries=0, cancelled=False):
    if state.get("approval") != "NOT_APPROVED":
        raise ValueError("invalid approval state")
    start = state["start_epoch"]
    deadline = state["deadline"]
    if not start <= job_start <= now or (deadline-start)%60:
        raise ValueError("invalid clock")
    budget = Budget(total_minutes=(deadline-start)//60)
    elapsed = (now-start+59)//60
    job_elapsed = (now-job_start+59)//60
    units = pending(state, planned, verified)
    unit = units[0] if units else None
    if cancelled:
        return {"action":"stop_cancelled","unit":unit}
    if not units and phase != "rendering":
        return {"action":"finish","unit":None}
    if phase == "complete" and units:
        raise ValueError("unverified remaining units")
    estimate = (estimates or {}).get(unit)
    if phase == "idle" and (not isinstance(estimate,int) or estimate <= 0):
        return {"action":"estimate_required","unit":unit}
    action = route(budget, elapsed, job_elapsed, phase, estimate or 0, retries)
    return {"action":action,"unit":unit,"pending":len(units),
            "remaining_minutes":max(0,budget.total_minutes-elapsed)}
