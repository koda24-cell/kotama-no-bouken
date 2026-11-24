"""Compare explicitly prepared, camera-aligned binary silhouette masks."""
from PIL import Image, ImageChops
import json, sys
from pathlib import Path

def compare(reference, candidate, output):
    with Image.open(reference) as im: a=im.convert("L")
    with Image.open(candidate) as im: b=im.convert("L")
    if a.size!=b.size: raise ValueError("Mask dimensions differ")
    if any(a.histogram()[1:255]) or any(b.histogram()[1:255]):
        raise ValueError("Use binary masks (0 or 255)")
    common=ImageChops.multiply(a,b)
    union=ImageChops.lighter(a,b)
    missing=ImageChops.subtract(a,b)
    excess=ImageChops.subtract(b,a)
    n=union.histogram()[255]
    if not n: raise ValueError("Both silhouettes empty")
    result={"iou":common.histogram()[255]/n,"missing_pixels":missing.histogram()[255],"excess_pixels":excess.histogram()[255],"status":"REVIEW_ONLY"}
    p=Path(output); p.mkdir(parents=True,exist_ok=False)
    Image.merge("RGB",(missing,a.point(lambda x:0),excess)).save(p/"difference.png")
    (p/"metrics.json").write_text(json.dumps(result,indent=2))
    return result

if __name__=="__main__": print(compare(*sys.argv[1:]))
