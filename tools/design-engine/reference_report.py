"""Reference-only report; does not copy source geometry into production."""
import json,sys,hashlib
from pathlib import Path
from PIL import Image,ImageDraw
from reference_mesh import analyze

def report(data,folder):
    p=Path(folder); p.mkdir(parents=True,exist_ok=False)
    lo,hi=data["bounds_mm"]; dims=data["dimensions_mm"]
    scale=280/max(dims[0],dims[1],1e-9)
    im=Image.new("RGB",(1080,760),(18,53,104)); d=ImageDraw.Draw(im)
    for i,s in enumerate(data["sections"]):
        ox=180+(i%3)*360; oy=180+(i//3)*360
        def xy(v): return (ox+(v[0]-(lo[0]+hi[0])/2)*scale,oy-(v[1]-(lo[1]+hi[1])/2)*scale)
        d.line((ox-150,oy,ox+150,oy),fill=(70,100,140))
        d.line((ox,oy-150,ox,oy+150),fill=(70,100,140))
        for a,b in s["segments_mm"]: d.line([xy(a),xy(b)],fill=(225,240,255),width=2)
        d.text((ox-150,oy+155),f'Z = {s["z_mm"]:.2f} mm',fill="white")
    d.text((20,735),f'Same scale: {scale:.4g} px/mm | reference only',fill="white")
    im.save(p/"sections.png")
    data=dict(data)
    data["part_ratios"]=[{"node":part["node"],"dimension_ratios":[v/t if t else None for v,t in zip(part["dimensions_mm"],dims)]} for part in data["parts"]]
    (p/"reference.json").write_text(json.dumps(data,indent=2,allow_nan=False))
    (p/"manifest.json").write_text(json.dumps({"status":"REFERENCE_ONLY","source_sha256":data["source_sha256"],"files":{n:hashlib.sha256((p/n).read_bytes()).hexdigest() for n in ("sections.png","reference.json")}},indent=2))
    return data
if __name__=="__main__": report(analyze(sys.argv[1]),sys.argv[2])
