"""Build a portable reference design review from analysis and render artifacts."""
import json, sys, hashlib
from pathlib import Path
from PIL import Image, ImageDraw
from reference_materials import analyze_materials
from reference_pixels import pixels
from reference_uv import draw_uv
from reference_overlay import run as overlay
from reference_mesh import analyze as geometry
from reference_report import report as geometry_report
from reference_views import views
from reference_edges import analyze_edges

def write_json(p,data): p.write_text(json.dumps(data,indent=2,allow_nan=False))
def analyze(src,out):
    out.mkdir(parents=True,exist_ok=False)
    write_json(out/"materials.json",analyze_materials(src))
    write_json(out/"pixels.json",pixels(src))
    draw_uv(src,out/"uv",512)
    overlay(src,out/"overlay")
    geometry_report(geometry(src),out/"geometry")
    views(src,out/"silhouettes")
    write_json(out/"edges.json",analyze_edges(src))
def sheet(root):
    for folder in sorted(p for p in root.iterdir() if p.is_dir()):
        images=sorted(p for p in folder.rglob("*.png") if p.name!="design-sheet.png")
        if not images: raise ValueError("No images")
        materials=json.loads((folder/"materials.json").read_text())
        uv=json.loads((folder/"uv/uv-report.json").read_text())
        render=folder/"render/render-report.json"
        if render.exists() and json.loads(render.read_text())["source_sha256"]!=materials["source_sha256"]: raise ValueError("Source mismatch")
        geom=json.loads((folder/"geometry/reference.json").read_text())
        silhouettes=json.loads((folder/"silhouettes/views.json").read_text())
        edges=json.loads((folder/"edges.json").read_text())
        pixels_data=json.loads((folder/"pixels.json").read_text())
        for data in (geom,silhouettes,edges,pixels_data,uv):
            if data["source_sha256"]!=materials["source_sha256"]: raise ValueError("Source mismatch")
        write_json(folder/"integrated-design.json",{"geometry":geom,"silhouettes":silhouettes,"edges":edges,"materials":materials,"pixels":pixels_data,"uv":uv,"overlay":json.loads((folder/"overlay/report.json").read_text()),"render":json.loads(render.read_text()) if render.exists() else None,"status":"REFERENCE_ONLY"})
        width=1200; cell=300; header=200
        canvas=Image.new("RGB",(width,header+340*((len(images)+3)//4)), "white")
        d=ImageDraw.Draw(canvas)
        d.text((20,15),folder.name,fill="black")
        d.text((20,40),f"Materials: {len(materials['materials'])} | UV primitives: {len(uv['primitives'])}",fill="black")
        d.text((20,150),"Dimensions (mm): "+" x ".join(f"{v:.2f}" for v in geom["dimensions_mm"]),fill="black")
        d.text((20,170),f"Parts: {len(geom['parts'])} | Sections: {len(geom['sections'])} | Silhouettes: {len(silhouettes['views'])}",fill="black")
        for i,m in enumerate(materials["materials"][:5]):
            d.text((20,60+i*16),f"Material {i}: metallic={m['metallic']} roughness={m['roughness']} alpha={m['alpha_mode']}",fill="black")
        for i,p in enumerate(images):
            with Image.open(p) as im:
                im=im.convert("RGB"); im.thumbnail((280,280))
                x=(i%4)*cell; y=header+(i//4)*340
                canvas.paste(im,(x+(cell-im.width)//2,y))
                d.text((x+5,y+285),str(p.relative_to(folder))[:45],fill="black")
        canvas.save(folder/"design-sheet.png")
        write_json(folder/"manifest.json",{"status":"REFERENCE_ONLY","source_sha256":materials["source_sha256"],"files":{str(p.relative_to(folder)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(folder.rglob("*")) if p.is_file() and p.name!="manifest.json"}})
if __name__=="__main__":
    root=Path(sys.argv[2])
    if sys.argv[1]=="analyze":
        base=Path("assets/3d/dungeons/b1_ancient_forest")
        for src in [base/"props/blue_wisp_torch.glb",base/"modules/mod_floor_stone_4m.glb"]: analyze(src,root/src.stem)
    elif sys.argv[1]=="sheet": sheet(root)
    else: raise ValueError("Unknown command")
