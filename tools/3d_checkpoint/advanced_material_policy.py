"""Conservative material classification and review planning; no aesthetic approval."""
import re, math
PROFILES={
 "stone":("micro_bevel","surface_bump","raised_chips"),
 "metal":("micro_bevel","weighted_normals","surface_bump"),
 "wood":("micro_bevel","grain_bump","raised_grain"),
}
WORDS={"stone":r"stone|rock|granite|concrete|marble|石|岩","metal":r"metal|iron|steel|bronze|copper|鉄|金属","wood":r"wood|oak|timber|plank|木材"}
def classify(name, metallic=None):
    hits=[k for k,v in WORDS.items() if re.search(v,name,re.I)]
    if len(hits)==1:return hits[0],"name_hint"
    if not hits and metallic is not None and metallic>=.8:return "metal","shader_hint"
    return "unknown","manual_review"
def plan(material, metrics):
    actions=list(PROFILES.get(material,()))
    if metrics.get("silhouette",1)<.95:return {"actions":[],"instruction":"Inspect silhouette and camera alignment before changing geometry"}
    return {"actions":actions,"instruction":"Compare small isolated candidates; preserve original mesh and reject regressions"}
def compare_geometry(a,b):
    keys=("aspect_x","aspect_y","aspect_z","surface_density")
    return {k:1-min(1,abs(a[k]-b[k])/max(abs(b[k]),1e-9)) for k in keys}
def review(views, geometry):
    if not views or not geometry:raise ValueError("missing evidence")
    scores=[v["score"] for v in views.values()]
    if not all(math.isfinite(x) for x in scores):raise ValueError("nonfinite score")
    return {"reference_similarity":sum(scores)/len(scores),"worst_view":min(scores),"geometry_comparison":geometry,"technical_pass":all(v["technical_pass"] for v in views.values()),"aesthetic_status":"HUMAN_OR_VISION_REVIEW_REQUIRED","approval":"NOT_APPROVED"}
