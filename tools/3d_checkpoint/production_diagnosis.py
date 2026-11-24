"""Conservative repair plans. Never execute commands extracted from logs."""
import re
def diagnose(log, outcome):
    if outcome in ("cancelled","security_failed","invalid_input"):
        return "stop"
    if outcome=="qa_failed":
        return "inspect_saved_output"
    if re.search(r"out of memory|cuda_error_out_of_memory|cannot allocate memory",log,re.I):
        return "increase_tiles"
    if re.search(r"gh: (not found|command not found)",log,re.I):
        return "missing_dependency"
    if re.search(r"texture.*(not found|missing)|missing.*texture",log,re.I):
        return "inspect_texture_paths"
    if outcome=="timeout":
        return "resume_checkpoint"
    return "human_or_agent_review"

def repair_plan(settings, diagnosis, attempts):
    if attempts>=3:
        return {"action":"stop_retry_limit"}
    if diagnosis=="increase_tiles":
        c,r=settings["columns"],settings["rows"]
        if c*r>=16:
            return {"action":"review"}
        if c<=r: c*=2
        else: r*=2
        if c*r>16 or c>settings["width"] or r>settings["height"]:
            return {"action":"review"}
        return {"action":"replan","settings":dict(settings,columns=c,rows=r),"invalidate_tile_evidence":True}
    if diagnosis=="resume_checkpoint":
        return {"action":"resume_verified"}
    if diagnosis=="inspect_saved_output":
        return {"action":"qa_only"}
    return {"action":"stop" if diagnosis=="stop" else "review","reason":diagnosis}
