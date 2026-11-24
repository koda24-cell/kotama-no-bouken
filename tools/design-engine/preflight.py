import hashlib,json,sys
from pathlib import Path
from PIL import Image
REQUIRED=("reference","dimensions","front","back","left","right","top","oblique","curves","placement","ornament","materials","lighting","review")
VIEWS=("front","back","left","right","top","oblique")
def check(folder):
    root=Path(folder).resolve()
    manifest=json.loads((root/"preflight.json").read_text())
    evidence=manifest["evidence"]
    for key in REQUIRED:
        entry=evidence[key]
        p=(root/entry["path"]).resolve()
        if not p.is_relative_to(root) or not p.is_file(): raise ValueError("Invalid evidence: "+key)
        raw=p.read_bytes()
        if not raw or hashlib.sha256(raw).hexdigest()!=entry["sha256"]: raise ValueError("Evidence hash mismatch: "+key)
        if key in VIEWS:
            with Image.open(p) as im:
                if im.format!="PNG": raise ValueError("PNG required")
                im.verify()
    if manifest.get("review_status")!="DESIGN_REVIEWED": raise ValueError("Design review required")
    return {"status":"EVIDENCE_COMPLETE","revision":manifest["revision"],"artistic_approval":False}
if __name__=="__main__": print(json.dumps(check(sys.argv[1])))
