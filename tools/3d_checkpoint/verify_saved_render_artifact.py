#!/usr/bin/env python3
"""Reusable post-render artifact integrity QA. Does not invoke Blender.

Example:
 python3 tools/3d_checkpoint/verify_saved_render_artifact.py --root recovered --manifest manifest.json --glb knight.glb --width 800 --height 800
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from PIL import Image, ImageStat


def verify(root, manifest_name, glb_name, width, height):
    root = Path(root).resolve(strict=True)
    if root.is_symlink() or not root.is_dir():
        raise ValueError("Invalid artifact root")
    matches = list(root.rglob(manifest_name))
    if len(matches) != 1:
        raise ValueError(f"Expected one manifest, found {len(matches)}")
    p = matches[0].parent
    data = json.loads(matches[0].read_text(encoding="utf-8"))
    if data.get("approval") != "NOT_APPROVED" or data.get("game_integrated") is not False:
        raise ValueError("Unexpected approval or integration state")
    hashes = data.get("files_sha256")
    views = data.get("views")
    if not isinstance(hashes, dict) or not hashes or not isinstance(views, list) or not views:
        raise ValueError("Missing file hashes or view list")
    for name, expected in hashes.items():
        target = p / name
        if target.is_symlink() or not target.is_file() or not target.resolve().is_relative_to(p.resolve()):
            raise ValueError(f"Unsafe/missing file: {name}")
        if hashlib.sha256(target.read_bytes()).hexdigest() != expected:
            raise ValueError(f"SHA256 mismatch: {name}")
    glb = p / glb_name
    if glb.is_symlink() or not glb.resolve().is_relative_to(p.resolve()):
        raise ValueError("Unsafe GLB")
    payload = glb.read_bytes()
    if len(payload) < 12 or payload[:4] != b"glTF" or struct.unpack_from("<I", payload, 8)[0] != len(payload):
        raise ValueError("Invalid GLB header/size")
    for view in views:
        target = p / (view + ".png")
        if target.is_symlink() or not target.resolve().is_relative_to(p.resolve()):
            raise ValueError("Unsafe PNG")
        with Image.open(target) as im:
            im.verify()
        with Image.open(target) as im:
            rgb = im.convert("RGB")
            if rgb.size != (width, height) or max(ImageStat.Stat(rgb).stddev) <= 3:
                raise ValueError(f"Invalid PNG view: {view}")
    print(f"ARTIFACT_ONLY_QA_PASS=true files={len(hashes)} views={len(views)}")
    print("BLENDER_RERENDER=false")
    print("SOURCE_INPUT_GLBS_NOT_REVERIFIED=true")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True)
    parser.add_argument("--manifest", default="manifest.json")
    parser.add_argument("--glb", required=True)
    parser.add_argument("--width", type=int, required=True)
    parser.add_argument("--height", type=int, required=True)
    args = parser.parse_args()
    verify(args.root, args.manifest, args.glb, args.width, args.height)
