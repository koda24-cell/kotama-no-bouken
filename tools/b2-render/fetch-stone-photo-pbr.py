#!/usr/bin/env python3
"""Fetch documented CC0 photographed rock PBR from Poly Haven for B2 arch.

Only official HTTPS API and downloads. Fail closed: a missing photo texture is
never reported as a successful phototexture render. Files stay in render-output
and GitHub Actions Artifacts until the owner approves promotion.
"""
import hashlib
import json
import os
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlparse

ASSET = os.getenv("B2_PBR_ASSET", "rock_surface")
ROOT = Path("render-output/b2-ruined-stone-arch-v1/photo_pbr")
ROOT.mkdir(parents=True, exist_ok=True)
BASE = "https://api.polyhaven.com/files/"
MAPS = (("diff", ("Diffuse", "diff", "albedo", "basecolor")),
        ("nor_gl", ("nor_gl", "Normal (GL)", "normal", "Normal")),
        ("rough", ("Rough", "rough", "Roughness")))
def load(url):
    req = Request(url, headers={"User-Agent": "kotama-b2-asset-research/1.0"})
    with urlopen(req, timeout=65) as result:
        return result.read()
def select(node, aliases):
    # API exposes map -> resolution -> file extension, with .url leaves.
    if not isinstance(node, dict): return None
    for alias in aliases:
        for key, val in node.items():
            if key.lower().replace("_","") == alias.lower().replace("_",""):
                if isinstance(val, dict):
                    for res in ("1k","2k"):
                        entry = val.get(res) or val.get(res.upper())
                        if isinstance(entry, dict):
                            for fmt in ("jpg","png","jpeg"):
                                file = entry.get(fmt)
                                if isinstance(file,dict) and file.get("url"): return file["url"]
                if isinstance(val,str) and val.startswith("https://"):return val
    return None
meta=json.loads(load(BASE+ASSET))
received={}
for suffix, aliases in MAPS:
    url=select(meta,aliases)
    if not url: raise RuntimeError(f"Official API lacks {suffix} 1K/2K jpg/png for {ASSET}")
    host=urlparse(url)
    if host.scheme != "https" or not host.netloc:raise RuntimeError("non-HTTPS download URL")
    payload=load(url)
    if len(payload)<2048 or not (payload[:3]==bytes.fromhex("ffd8ff") or payload[:8]==bytes.fromhex("89504e470d0a1a0a")):
        raise RuntimeError(f"invalid image data {suffix} ({len(payload)} bytes)")
    ext = ".png" if payload[:8]==bytes.fromhex("89504e470d0a1a0a") else ".jpg"
    path=ROOT/(suffix+ext)
    path.write_bytes(payload)
    received[suffix]={"file":str(path), "url":url,"sha256":hashlib.sha256(payload).hexdigest(),"bytes":len(payload)}
manifest={"asset":ASSET,"original_page":f"https://polyhaven.com/a/{ASSET}",
          "license":"CC0 per Poly Haven asset page","source":"Poly Haven photographed material",
          "status":"DOWNLOADED_NOT_APPROVED", "maps":received}
(ROOT/"source_manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print("B2_PHOTO_TEXTURES_DOWNLOADED",json.dumps({k:v["bytes"] for k,v in received.items()}))
