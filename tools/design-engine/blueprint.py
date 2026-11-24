"""Experimental box-part blueprint generator; no CAD solver yet."""
import json, math, hashlib, sys, re
from pathlib import Path
from xml.sax.saxutils import escape

def generate(source, output):
    raw = Path(source).read_bytes()
    d = json.loads(raw)
    if d.get("units") != "mm" or not re.fullmatch(r"V[0-9]+", d["revision"]):
        raise ValueError("Expected mm and revision Vnn")
    parts = d["parts"]
    if not parts or len({p["id"] for p in parts}) != len(parts):
        raise ValueError("Empty or duplicate parts")
    for p in parts:
        if len(p["origin"]) != 3 or len(p["size"]) != 3:
            raise ValueError("Expected XYZ")
        if not all(type(v) in (int,float) and math.isfinite(v) for v in p["origin"]+p["size"]) or min(p["size"]) <= 0:
            raise ValueError("Invalid dimensions")
    lo = [min(p["origin"][i] for p in parts) for i in range(3)]
    hi = [max(p["origin"][i]+p["size"][i] for p in parts) for i in range(3)]
    scale = 250/max(h-l for h,l in zip(hi,lo))
    svg = ['<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="450" viewBox="0 0 1200 450">','<rect width="1200" height="450" fill="#123b72"/>']
    for j,(name,a,b) in enumerate([("FRONT XZ",0,2),("SIDE YZ",1,2),("TOP XY",0,1)]):
        x=40+j*400
        svg.append(f'<text x="{x}" y="35" fill="white" font-size="20">{name}</text>')
        for p in parts:
            u=x+(p["origin"][a]-lo[a])*scale
            v=320-(p["origin"][b]+p["size"][b]-lo[b])*scale
            w=p["size"][a]*scale; h=p["size"][b]*scale
            svg.append(f'<rect x="{u}" y="{v}" width="{w}" height="{h}" fill="none" stroke="white" stroke-width="1.5"/>')
            svg.append(f'<text x="{u+3}" y="{v+14}" fill="white" font-size="12">{escape(str(p["id"]))}</text>')
        svg.append(f'<text x="{x}" y="350" fill="white" font-size="16">{hi[a]-lo[a]:g} x {hi[b]-lo[b]:g} mm</text>')
    svg.append('</svg>')
    out=Path(output)/d["revision"]
    out.mkdir(parents=True,exist_ok=False)
    files={"design.json":raw,"blueprint.svg":"\n".join(svg).encode()}
    for name,data in files.items(): (out/name).write_bytes(data)
    (out/"manifest.json").write_text(json.dumps({"status":"NOT_APPROVED","scope":"box projection prototype","sha256":{n:hashlib.sha256(v).hexdigest() for n,v in files.items()}},indent=2))
    return out

if __name__=="__main__":
    print(generate(sys.argv[1],sys.argv[2]))
