"""Consume evidence-bound reviews without executing reviewer-supplied code."""
from advanced_art_review import validate,choose_reviewed
from advanced_selection import select
from pathlib import Path
import json
MODES=("material","surface","chips","cracks")
def read_review(folder,item):
    key=item["art_review_packet"]["images"]["front"]
    p=Path(folder)/(key+".json")
    if not p.is_file():return None
    r=json.loads(p.read_text())
    return {"review":r,"summary":validate(r,item["art_review_packet"]),"item":item}
def decide(base,candidates,provider):
    b=provider(base)
    if b is None:return base,[],"AWAITING_VISUAL_REVIEW"
    reviewed=[]
    for c in candidates:
        r=provider(c)
        if r is None:return base,[],"AWAITING_VISUAL_REVIEW"
        r["technical_eligible"]=bool(c["pass"] and c.get("verified") and c.get("preserved") and all(c["views"][v]["metrics"]["silhouette"]>=.95 for v in c["views"]))
        reviewed.append(r)
    best=choose_reviewed(b,reviewed)
    actions=list(dict.fromkeys(x for x in best["summary"]["actions"] if x in MODES))
    manual=any(x not in MODES for x in best["summary"]["actions"])
    return best["item"],actions,"MANUAL_REVIEW" if manual else "REVIEWED"
