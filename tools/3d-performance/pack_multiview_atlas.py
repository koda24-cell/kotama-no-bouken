#!/usr/bin/env python3
"""Pack transparent 8-direction impostor frames in a 4x2 atlas with 4px gutters."""
import json
import hashlib
from pathlib import Path
import sys
from PIL import Image

root=Path(sys.argv[1])
manifest=json.loads((root/"impostor_manifest.json").read_text())
frames=manifest["frames"]
assert len(frames)==8
size=manifest["image_size_px"]
pad=4
cols=4;rows=2
pitch=size+pad*2
atlas=Image.new("RGBA",(cols*pitch,rows*pitch),(0,0,0,0))
for idx,entry in enumerate(frames):
    image=Image.open(root/entry["name"]).convert("RGBA")
    assert image.size==(size,size)
    alpha=image.getchannel("A")
    coverage=sum(n for value,n in enumerate(alpha.histogram()) if value>0)/(size*size)
    transparent=alpha.getextrema()[0]
    if not (0.005 < coverage < 0.93 and transparent == 0):
        raise RuntimeError("Unexpected alpha image coverage on "+entry["name"]+": "+str(coverage))
    x=(idx%cols)*pitch+pad;y=(idx//cols)*pitch+pad
    atlas.paste(image,(x,y))
    # Use transparent gutters; tile mapping must clamp to interior rect at runtime.
    entry["atlas_rect_px"]=[x,y,size,size]
    entry["alpha_coverage_fraction"]=round(coverage,4)
atlas.save(root/"tree_multiview_atlas_RGBA.png")
raw=(root/"tree_multiview_atlas_RGBA.png").read_bytes()
manifest["atlas"]={"name":"tree_multiview_atlas_RGBA.png","size_px":[cols*pitch,rows*pitch],
                   "tile_pitch_px":pitch,"padding_px":pad,
                   "bytes":len(raw),"sha256":hashlib.sha256(raw).hexdigest()}
(root/"impostor_manifest.json").write_text(json.dumps(manifest,indent=2)+"\n")
print("IMPOSTOR_ATLAS_QA_PASS",manifest["atlas"]["size_px"])
