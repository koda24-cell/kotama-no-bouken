#!/usr/bin/env python3
"""Deterministic, fail-closed multi-view render QA. Not an aesthetic judge."""
import argparse
import json
from pathlib import Path
import struct
import sys

PNG = bytes.fromhex("89504e470d0a1a0a")


def inspect(root):
    if not root.is_dir() or root.is_symlink():
        raise ValueError("Output directory invalid")
    result = {}
    for view in ("front", "side", "angle"):
        path = root / (view + ".png")
        if not path.is_file() or path.is_symlink():
            raise ValueError(f"Missing {view} PNG")
        with path.open("rb") as f:
            header = f.read(24)
        if len(header) < 24 or header[:8] != PNG or header[12:16] != b"IHDR":
            raise ValueError(f"Invalid PNG header: {view}")
        width, height = struct.unpack(">II", header[16:24])
        if not (256 <= width <= 8192 and 256 <= height <= 8192):
            raise ValueError(f"Invalid render dimensions: {view}: {width}x{height}")
        result[view] = {"width": width, "height": height, "bytes": path.stat().st_size}
    glbs = [p for p in root.rglob("*.glb") if p.is_file() and not p.is_symlink()]
    blends = [p for p in root.rglob("*.blend") if p.is_file() and not p.is_symlink()]
    if not glbs or not blends:
        raise ValueError("Missing GLB or Blend")
    for p in glbs:
        with p.open("rb") as f:
            header = f.read(12)
        if len(header) != 12 or header[:4] != b"glTF" or struct.unpack("<I", header[8:12])[0] != p.stat().st_size:
            raise ValueError(f"Invalid GLB: {p}")
    return {"status": "NOT_APPROVED", "technical_qa": "PASS", "aesthetic_qa": "NOT_TESTED",
            "views": result, "glb_count": len(glbs), "blend_count": len(blends)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--directory", required=True)
    args = parser.parse_args()
    try:
        root = Path(args.directory)
        result = inspect(root)
        (root / "technical_qa.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
        print("TECHNICAL_QA_PASS", json.dumps(result))
    except (ValueError, OSError) as exc:
        print(f"TECHNICAL_QA_REJECTED: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
