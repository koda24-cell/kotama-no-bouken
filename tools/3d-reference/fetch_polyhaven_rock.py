#!/usr/bin/env python3
"""Fetch one Poly Haven CC0 rock model as a review-only source asset."""
import hashlib
import json
import os
from pathlib import Path
from urllib.request import Request, urlopen

OUT = Path("tools/3d-reference/cc0-rocks/polyhaven")
OUT.mkdir(parents=True, exist_ok=True)

def fetch(url):
    req = Request(url, headers={"User-Agent": "Kotama-CC0-Rock-Research/1.0"})
    with urlopen(req, timeout=90) as r:
        return r.read()

catalog = json.loads(fetch("https://api.polyhaven.com/assets?t=models"))
choices = [(key, val) for key, val in catalog.items() if any(word in (key + " " + str(val.get("name", ""))).lower() for word in ("rock", "boulder", "stone"))]
print("Rock candidates:", [k for k, _ in choices[:30]])
if not choices:
    raise RuntimeError("No rock candidates in Poly Haven model catalog")
errors = []
selected = None
for asset_id, meta in choices[:35]:
    try:
        files = json.loads(fetch("https://api.polyhaven.com/files/" + asset_id))
        # Model assets normally expose gltf/1k/glb or gltf/1k/gltf.
        for category in ("gltf", "glb", "fbx", "blend"):
            resolutions = files.get(category, {})
            if not isinstance(resolutions, dict):
                continue
            for resolution in ("1k", "2k", "4k"):
                variants = resolutions.get(resolution, {})
                if not isinstance(variants, dict):
                    continue
                for fmt in ("glb", "gltf", "fbx", "blend"):
                    obj = variants.get(fmt)
                    if isinstance(obj, dict) and obj.get("url"):
                        selected = (asset_id, meta, category, resolution, fmt, obj, files)
                        break
                if selected: break
            if selected: break
        if selected: break
    except Exception as exc:
        errors.append(f"{asset_id}: {exc}")
if not selected:
    (OUT / "api-shape.json").write_text(json.dumps(files, indent=2)[:25000])
    raise RuntimeError("No supported model file: " + "; ".join(errors[:4]))
asset_id, meta, category, resolution, fmt, obj, files = selected
url = obj["url"]
data = fetch(url)
if len(data) < 1000 or len(data) > 85_000_000:
    raise RuntimeError(f"Unexpected model size {len(data)} bytes")
filename = "source_rock." + fmt
(OUT / filename).write_bytes(data)
manifest = {
    "provider": "Poly Haven",
    "asset_id": asset_id,
    "asset_name": meta.get("name", asset_id),
    "asset_page": "https://polyhaven.com/a/" + asset_id,
    "license_page": "https://polyhaven.com/license",
    "license": "CC0 (provider-wide; verify individual page before promotion)",
    "download_url": url,
    "source_category": category,
    "resolution": resolution,
    "format": fmt,
    "bytes": len(data),
    "sha256": hashlib.sha256(data).hexdigest(),
    "status": "Unapproved reference source; not integrated into game",
}
(OUT / "SOURCE.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(json.dumps(manifest, indent=2))
