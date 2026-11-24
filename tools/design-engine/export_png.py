import hashlib, json, sys
from pathlib import Path
import cairosvg
from PIL import Image

def export(folder):
    p=Path(folder)
    m=json.loads((p/"manifest.json").read_text())
    for name,digest in m["sha256"].items():
        if hashlib.sha256((p/name).read_bytes()).hexdigest()!=digest:
            raise ValueError("Hash mismatch: "+name)
    target=p/"blueprint.png"
    if target.exists(): raise FileExistsError(target)
    cairosvg.svg2png(url=str(p/"blueprint.svg"),write_to=str(target),output_width=4096,output_height=1536)
    with Image.open(target) as im:
        im.load()
        if im.size!=(4096,1536): raise ValueError("Unexpected resolution")
    m["sha256"]["blueprint.png"]=hashlib.sha256(target.read_bytes()).hexdigest()
    tmp=p/"manifest.tmp"
    tmp.write_text(json.dumps(m,indent=2))
    tmp.replace(p/"manifest.json")

if __name__=="__main__": export(sys.argv[1])
