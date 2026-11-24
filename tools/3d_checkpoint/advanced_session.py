"""Atomic candidate checkpoints and bounded retry orchestration."""
import json,time,hashlib
from pathlib import Path
from advanced_recovery import recovery
def digest(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def run(root,source,reference,steps,worker,minutes=60):
    root=Path(root);root.mkdir(parents=True,exist_ok=True)
    state=root/"session.json";identity={"source":digest(source),"reference":digest(reference),"steps":list(steps)}
    data=json.loads(state.read_text()) if state.exists() else {"identity":identity,"done":{},"approval":"NOT_APPROVED"}
    if data["identity"]!=identity:raise ValueError("checkpoint input mismatch")
    deadline=time.monotonic()+minutes*60
    for step in steps:
        if step in data["done"]:
            if all(Path(p).is_file() and digest(p)==h for p,h in data["done"][step].items()):continue
            raise ValueError("checkpoint artifact mismatch")
        settings={}
        for attempt in range(4):
            if time.monotonic()>=deadline:return "PAUSED"
            result=worker(step,settings,deadline)
            if result["ok"]:
                if not result.get("scan_pass") or not result.get("files"):raise ValueError("unverified output")
                data["done"][step]={str(p):digest(p) for p in result["files"]}
                tmp=state.with_suffix(".tmp");tmp.write_text(json.dumps(data,indent=2));tmp.replace(state);break
            settings=recovery(result["error"],attempt)
            if settings is None: return "REVIEW_REQUIRED"
        else:return "REVIEW_REQUIRED"
    return "COMPLETE"
