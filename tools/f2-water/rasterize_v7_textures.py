#!/usr/bin/env python3
"""Rasterize repository-owned V7 water overlay and foam SVG into alpha PNG.
Only fixed local files; external image downloads are forbidden.
"""
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET

import cairosvg
from PIL import Image, ImageFilter

ROOT = Path("tools/f2-water/textures")
DEST = Path("out/f2-water")
DEST.mkdir(parents=True, exist_ok=True)
OUT = {}
for basename in ("v7_water_surface_color_alpha", "v7_shore_foam_alpha"):
    source = ROOT / (basename + ".svg")
    svg = source.read_bytes()
    tree = ET.fromstring(svg)
    # No external network/file URLs or embedded scripting.
    for element in tree.iter():
        tag = element.tag.split("}")[-1].lower()
        if tag in ("script", "foreignobject", "image", "iframe", "useforeign"):
            raise RuntimeError("Unsupported potentially unsafe SVG element " + tag)
        for key, value in element.attrib.items():
            local_key = key.split("}")[-1].lower()
            if local_key in ("href", "src") and not value.startswith("#"):
                raise RuntimeError("Only local fragment links are allowed")
            if "url(" in value.lower() and not ("url(#" in value.lower()):
                raise RuntimeError("External CSS references are not allowed")
    filename = DEST / (basename + ".png")
    cairosvg.svg2png(bytestring=svg, write_to=str(filename), output_width=1024, output_height=1024)
    data = filename.read_bytes()
    if data[:8] != bytes.fromhex("89504e470d0a1a0a"):
        raise RuntimeError("PNG header invalid: " + str(filename))
    OUT[basename] = {
        "svg_sha256": hashlib.sha256(svg).hexdigest(),
        "png_sha256": hashlib.sha256(data).hexdigest(),
        "png_bytes": len(data),
        "png_path": str(filename),
    }
# The actual AI-generated preview PNG is also stored as a binary Git blob.
# Upscale for texture sampling and soften palette discontinuities;
# the original 96px source is retained unchanged in Git.
ai_source=ROOT/"v7_ai_generated_water_surface_96.png"
with Image.open(ai_source) as raw:
    assert raw.size==(96,96), "AI PNG source dimensions differ"
    ai_image=raw.convert("RGBA").resize((1024,1024),Image.Resampling.BICUBIC)
    ai_image=ai_image.filter(ImageFilter.GaussianBlur(radius=1.2))
    assert ai_image.getchannel("A").getextrema()[0] < 255, "AI texture alpha lost"
    ai_output=DEST/"v7_ai_water_surface_color_alpha_1024.png"
    ai_image.save(ai_output,optimize=True)
    imagebytes=ai_output.read_bytes()
    OUT["v7_ai_water_surface_color_alpha_1024"]={
        "source_sha256":hashlib.sha256(ai_source.read_bytes()).hexdigest(),
        "png_sha256":hashlib.sha256(imagebytes).hexdigest(),
        "png_bytes":len(imagebytes),
        "png_path":str(ai_output),
        "dimensions":[1024,1024],
        "note":"upscaled from Git-tracked 96px AI preview; original 1254px is not stored"
    }
(DEST / "v7_texture_manifest.json").write_text(json.dumps(OUT, indent=2), encoding="utf-8")
print(json.dumps(OUT, indent=2), flush=True)
