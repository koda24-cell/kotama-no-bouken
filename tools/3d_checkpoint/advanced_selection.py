"""Reference-guided selection, never final artistic approval."""
from production_visual_quality import evaluate
from pathlib import Path
VIEWS=("front","side","back","angle")
def score(folder,reference):
    views={v:evaluate(Path(folder)/(v+".png"),Path(reference)/(v+".png")) for v in VIEWS}
    return {"views":views,"score":sum(v["score"] for v in views.values())/4,"pass":all(v["technical_pass"] for v in views.values()),"approval":"NOT_APPROVED"}
def select(base,candidates,gain=.005):
    best=base
    for c in candidates:
        if not c["pass"] or not c.get("verified") or not c.get("preserved"):continue
        if c["score"]<base["score"]+gain or c["score"]<=best["score"]:continue
        if any(c["views"][v]["score"]<base["views"][v]["score"]-.02 for v in VIEWS):continue
        best=c
    return best
