"""Human/GPT visual review exchange; never claims unattended semantic vision."""
import hashlib,json
from pathlib import Path
VIEWS=("front","side","back","angle")
CRITERIA=("material_identity","natural_form","style_coherence","readability","detail_hierarchy","craftsmanship")
ACTIONS=("material","surface","chips","cracks","manual_geometry_review","manual_lighting_review")
def digest(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def evidence(folder):
    folder=Path(folder)
    return {v:digest(folder/(v+".png")) for v in VIEWS}
def packet(folder,reference=None):
    return {"schema":1,"images":evidence(folder),"reference":evidence(reference) if reference else None,"criteria":list(CRITERIA),"allowed_actions":list(ACTIONS),"status":"AWAITING_VISUAL_REVIEW","approval":"NOT_APPROVED"}
def validate(review,expected):
    if review.get("images")!=expected["images"] or review.get("reference")!=expected["reference"]:raise ValueError("stale visual evidence")
    if review.get("reviewer") not in ("GPT","HUMAN","LOCAL_CLIP"):raise ValueError("unknown reviewer")
    views=review.get("views",{})
    if set(views)!=set(VIEWS):raise ValueError("missing views")
    for v in views.values():
        scores=v.get("scores",{})
        if set(scores)!=set(CRITERIA) or any(type(x)!=int or not 1<=x<=5 for x in scores.values()):raise ValueError("invalid scores")
        if not isinstance(v.get("observation"),str) or not v["observation"].strip():raise ValueError("missing observation")
    actions=review.get("actions",[])
    if not isinstance(actions,list) or any(x not in ACTIONS for x in actions):raise ValueError("unsupported action")
    if review.get("approval")!="NOT_APPROVED":raise ValueError("approval forbidden")
    return {"mean":sum(x for v in views.values() for x in v["scores"].values())/24,"worst":min(x for v in views.values() for x in v["scores"].values()),"actions":actions,"approval":"NOT_APPROVED"}
def choose_reviewed(base,candidates):
    """Only technically eligible candidates may be supplied; require no criterion regression."""
    best=base
    for c in candidates:
        if not c.get("technical_eligible"):continue
        if c["summary"]["mean"]<=best["summary"]["mean"] or c["summary"]["worst"]<3:continue
        if any(c["review"]["views"][v]["scores"][k]<base["review"]["views"][v]["scores"][k] for v in VIEWS for k in CRITERIA):continue
        best=c
    return best
