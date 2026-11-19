#!/usr/bin/env python3
"""Derive non-destructive cool-gray CC0 stone photo; preserve raw JPG."""
from pathlib import Path
from PIL import Image,ImageOps,ImageEnhance
import hashlib,json
root=Path("render-output/b5-knights/photo_source")
origin=root/"Color.jpg"
if origin.exists():
    with Image.open(origin) as im:
        gray=ImageOps.grayscale(im.convert("RGB"))
        gray=ImageEnhance.Contrast(gray).enhance(1.22)
        # Preserve original photographic stone shading while rejecting green moss palette.
        mapped=ImageOps.colorize(gray,black=(38,41,56),white=(166,171,188))
        path=root/"Color_ColdStone.jpg"
        mapped.save(path,quality=94,subsampling=0)
    src=root/"source.json"
    report=json.loads(src.read_text(encoding="utf-8"))
    report["derived_color"]={"file":path.name,"method":"grayscale high-contrast mapped to dark slate bluish-gray",
                             "sha256":hashlib.sha256(path.read_bytes()).hexdigest()}
    src.write_text(json.dumps(report,indent=2),encoding="utf-8")
    print("COLD_STONE_TEXTURE",report["derived_color"])
else:
    print("PHOTO_SOURCE_NOT_PRESENT: using existing procedural material")
