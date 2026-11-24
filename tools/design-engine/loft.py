"""Design-only elliptical loft, Z-up millimetres. No topology rejection."""
import math,json,sys
from pathlib import Path

def loft(sections, sides=64, steps=8):
    if len(sections)<2 or type(sides)!=int or not 8<=sides<=256 or type(steps)!=int or not 1<=steps<=128:
        raise ValueError("Invalid sampling")
    keys=("z","cx","cy","rx","ry")
    rings=[tuple(s[k] for k in keys) for s in sections]
    if any(not all(type(v) in (int,float) and math.isfinite(v) for v in s) or min(s[3:])<=0 for s in rings):
        raise ValueError("Invalid section")
    if any(b[0]<=a[0] for a,b in zip(rings,rings[1:])): raise ValueError("Z must increase")
    samples=[]
    for a,b in zip(rings,rings[1:]):
        for i in range(steps):
            t=i/steps
            # Linear interpolation preserves specified section sizes without overshoot.
            samples.append(tuple(x+(y-x)*t for x,y in zip(a,b)))
    samples.append(rings[-1])
    vertices=[(cx+rx*math.cos(2*math.pi*j/sides),cy+ry*math.sin(2*math.pi*j/sides),z) for z,cx,cy,rx,ry in samples for j in range(sides)]
    faces=[(i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j) for i in range(len(samples)-1) for j in range(sides)]
    faces.extend([tuple(reversed(range(sides))),tuple(range(len(vertices)-sides,len(vertices)))])
    return {"units":"mm","vertices":vertices,"faces":faces,"status":"DESIGN_PREVIEW"}
def write_obj(mesh,path):
    with Path(path).open("x") as f:
        f.write("# Design preview, coordinates in mm\n")
        for v in mesh["vertices"]: f.write("v %.9g %.9g %.9g\n"%v)
        for face in mesh["faces"]: f.write("f "+" ".join(str(i+1) for i in face)+"\n")
if __name__=="__main__":
    spec=json.loads(Path(sys.argv[1]).read_text())
    write_obj(loft(spec["sections"]),sys.argv[2])
