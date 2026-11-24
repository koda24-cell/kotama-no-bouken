"""Design preview from corresponding ordered XY contour points at increasing Z."""
import math,json,sys
from pathlib import Path
from loft import write_obj

def freeform(sections, steps=12):
    if len(sections)<2 or type(steps)!=int or not 1<=steps<=128: raise ValueError("Invalid sampling")
    n=len(sections[0]["xy"])
    if not 3<=n<=512: raise ValueError("Invalid contour size")
    for s in sections:
        if len(s["xy"])!=n or not math.isfinite(s["z"]) or any(len(p)!=2 or not all(math.isfinite(v) for v in p) for p in s["xy"]): raise ValueError("Invalid section")
    if any(b["z"]<=a["z"] for a,b in zip(sections,sections[1:])): raise ValueError("Z must increase")
    vertices=[]
    for a,b in zip(sections,sections[1:]):
        for i in range(steps):
            t=i/steps; u=t*t*(3-2*t)
            z=a["z"]+(b["z"]-a["z"])*t
            vertices.extend((x+(xx-x)*u,y+(yy-y)*u,z) for (x,y),(xx,yy) in zip(a["xy"],b["xy"]))
    vertices.extend((x,y,sections[-1]["z"]) for x,y in sections[-1]["xy"])
    faces=[(i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j) for i in range(len(vertices)//n-1) for j in range(n)]
    # Open ends deliberately permitted; preview only.
    return {"units":"mm","vertices":vertices,"faces":faces,"status":"DESIGN_PREVIEW"}
if __name__=="__main__":
    spec=json.loads(Path(sys.argv[1]).read_text())
    write_obj(freeform(spec["sections"],spec.get("steps",12)),sys.argv[2])
