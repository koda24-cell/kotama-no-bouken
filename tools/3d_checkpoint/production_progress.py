"""Local atomic progress ledger. Durable status requires verified remote artifact evidence."""
import json
import os
import re
import tempfile
from pathlib import Path

def save(path, state):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent)
    try:
        with os.fdopen(fd, "w") as stream:
            json.dump(state, stream, sort_keys=True)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)

def new_session(session_id, source_sha, settings_sha, start_epoch, minutes=360):
    if not re.fullmatch(r"[0-9a-f]{40}", source_sha) or not re.fullmatch(r"[0-9a-f]{64}", settings_sha):
        raise ValueError("invalid identity")
    if not 1 <= minutes <= 360 or start_epoch <= 0 or not session_id:
        raise ValueError("invalid session")
    return dict(session_id=session_id, source_sha=source_sha, settings_sha=settings_sha,
                start_epoch=start_epoch, deadline=start_epoch+minutes*60,
                units={}, approval="NOT_APPROVED")

def record_verified(state, unit, artifact_id, digest):
    if not unit or not isinstance(artifact_id, int) or artifact_id <= 0 or not re.fullmatch(r"[0-9a-f]{64}", digest):
        raise ValueError("invalid artifact evidence")
    evidence = dict(artifact_id=artifact_id, sha256=digest)
    previous = state["units"].get(unit)
    if previous is not None and previous != evidence:
        raise ValueError("conflicting unit evidence")
    state["units"][unit] = evidence

def pending(state, planned, verified_artifacts):
    """verified_artifacts must be independently checked for provenance, hashes and expiry."""
    return [unit for unit in dict.fromkeys(planned)
            if unit not in state["units"] or
            verified_artifacts.get(unit) != state["units"][unit]]
