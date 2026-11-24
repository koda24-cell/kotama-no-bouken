"""Visual design plans, not physical collision constraints or rendered PBR."""
import json, math, random, sys
from pathlib import Path
from PIL import Image, ImageDraw

def plan(spec):
    materials=spec["materials"]
    if not materials: raise ValueError("No materials")
    for name,m in materials.items():
        color=m["base_color"]
        if len(color)!=3 or any(type(v)!=int or not 0<=v<=255 for v in color): raise ValueError("RGB required")
        for k in ("roughness","metallic","alpha"):
            if not 0<=m[k]<=1: raise ValueError(k)
    rng=random.Random(spec["seed"])
    instances=[]
    for rule in spec.get("ornaments",[]):
        count=rule["count"]
        if type(count)!=int or not 1<=count<=10000 or rule["material"] not in materials: raise ValueError("Invalid ornament")
        radius=rule["radius_mm"]
        if not math.isfinite(radius) or radius<0: raise ValueError("Invalid radius")
        for i in range(count):
            angle=2*math.pi*i/count
            instances.append({"part":rule["part"],"material":rule["material"],"position_mm":[radius*math.cos(angle),radius*math.sin(angle),rule["z_mm"]],"rotation_z_rad":angle,"scale":rng.uniform(.9,1.1)})
    return {"materials":materials,"instances":instances,"seed":spec["seed"],"status":"DESIGN_ONLY"}

def save(spec,folder):
    result=plan(spec)
    p=Path(folder); p.mkdir(parents=True,exist_ok=False)
    (p/"appearance.json").write_text(json.dumps(result,indent=2,allow_nan=False))
    im=Image.new("RGB",(800,100*len(result["materials"])),(235,235,235))
    draw=ImageDraw.Draw(im)
    for i,(name,m) in enumerate(result["materials"].items()):
        y=i*100
        draw.rectangle((10,y+10,150,y+90),fill=tuple(m["base_color"]))
        draw.text((165,y+15),name,fill="black")
        draw.text((165,y+40),f'Roughness {m["roughness"]} / Metallic {m["metallic"]} / Alpha {m["alpha"]}',fill="black")
    im.save(p/"material-plan.png")
    return result
if __name__=="__main__": save(json.loads(Path(sys.argv[1]).read_text()),sys.argv[2])
