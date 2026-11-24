"""Reference-only texture overlays and overlap evidence."""
import io, json, math, sys
from pathlib import Path
from PIL import Image, ImageDraw
from reference_uv import read_glb, read_uv_accessor, read_indices, material_texture_bindings, polygon_area

def evidence(uv, indices):
    groups={}
    outside=0
    for i in range(0,len(indices),3):
        tri=[uv[j] for j in indices[i:i+3]]
        outside+=any(not 0<=v<=1 for p in tri for v in p)
        if polygon_area(tri)<=1e-12: continue
        key=tuple(sorted(tuple(round(v,6) for v in p) for p in tri))
        sign=(tri[1][0]-tri[0][0])*(tri[2][1]-tri[0][1])-(tri[1][1]-tri[0][1])*(tri[2][0]-tri[0][0])
        groups.setdefault(key,[]).append(sign>0)
    return {"coincident_groups":sum(len(g)>1 for g in groups.values()),"opposite_winding_groups":sum(len(set(g))>1 for g in groups.values()),"outside_tile_triangles":outside,"intent":"UNKNOWN_REVIEW_REQUIRED"}

def run(path,out):
    raw,doc,binary=read_glb(path)
    out=Path(out); out.mkdir(parents=True,exist_ok=False)
    rows=[]
    for m,mesh in enumerate(doc.get("meshes",[])):
        for p,prim in enumerate(mesh.get("primitives",[])):
            binding=material_texture_bindings(doc,prim) or {}
            for slot,b in binding.get("texture_bindings",{}).items():
                row={"mesh":m,"primitive":p,"slot":slot,"binding":b}
                rows.append(row)
                key="TEXCOORD_"+str(b.get("tex_coord_set",0))
                if b.get("extension_overrides") or key not in prim["attributes"] or prim.get("mode",4)!=4:
                    row["status"]="UNSUPPORTED_UV_LAYOUT"; continue
                uv=read_uv_accessor(doc,binary,prim["attributes"][key])
                idx=read_indices(doc,binary,prim["indices"]) if "indices" in prim else list(range(len(uv)))
                if len(idx)%3 or any(i>=len(uv) for i in idx): raise ValueError("Invalid triangles")
                row["evidence"]=evidence(uv,idx)
                n=b.get("image_index")
                if not isinstance(n,int) or not 0<=n<len(doc.get("images",[])):
                    row["status"]="NO_IMAGE"; continue
                im=doc["images"][n]
                if "bufferView" not in im or im.get("mimeType") not in ("image/png","image/jpeg"):
                    row["status"]="UNSUPPORTED_IMAGE"; continue
                view=doc["bufferViews"][im["bufferView"]]; start=view.get("byteOffset",0); end=start+view["byteLength"]
                if view.get("buffer",0)!=0 or not 0<=start<end<=len(binary): raise ValueError("Invalid image view")
                with Image.open(io.BytesIO(binary[start:end])) as src:
                    if src.width*src.height>16777216: raise ValueError("Image too large")
                    img=src.convert("RGBA"); img.thumbnail((1024,1024))
                draw=ImageDraw.Draw(img)
                for i in range(0,len(idx),3):
                    tri=[uv[j] for j in idx[i:i+3]]
                    # Single tile review only; no wrapping simulation.
                    if any(abs(v)>100 for q in tri for v in q): continue
                    pts=[(u*(img.width-1),v*(img.height-1)) for u,v in tri]
                    draw.line(pts+[pts[0]],fill=(255,80,30,255),width=1)
                name=f"m{m}-p{p}-{slot}.png"
                img.save(out/name); row.update(status="SINGLE_TILE_OVERLAY",image=name)
    (out/"report.json").write_text(json.dumps(rows,indent=2))
if __name__=="__main__": run(*sys.argv[1:])
