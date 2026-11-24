"""Compare independently measured candidates without promoting assets."""
import math
def select_candidate(baseline,candidates,minimum_gain=0.01):
    if not math.isfinite(minimum_gain) or minimum_gain<0:
        raise ValueError("invalid improvement threshold")
    if not baseline.get("technical_pass") or not math.isfinite(baseline["score"]):
        raise ValueError("verified baseline required")
    best=baseline
    for c in candidates:
        if not c.get("technical_pass") or not c.get("geometry_preserved") or not c.get("artifact_verified"):
            continue
        if math.isfinite(c["score"]) and c["score"]>best["score"] and c["score"]-baseline["score"]>=minimum_gain:
            best=c
    return {"selected":best,"rollback":best is baseline,"approval":"NOT_APPROVED"}
