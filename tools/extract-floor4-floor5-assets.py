#!/usr/bin/env python3
"""Extract reviewed B4/B5 GLB packs without changing original ZIPs.

Run from repository root after PR #124 and #122 source ZIPs are present:
  python tools/extract-floor4-floor5-assets.py
No third-party dependencies. Rejects path traversal and ignores unrelated files.
"""
from pathlib import Path
from zipfile import ZipFile
import sys

ROOT = Path(__file__).resolve().parents[1]
PACKS = [
    (ROOT / "assets/3d/dungeons/b4_dragonfire/models/floor4_Part1_Models.zip",
     ROOT / "assets/3d/dungeons/b4_dragonfire/models"),
    (ROOT / "assets/3d/dungeons/b4_dragonfire/textures/floor4_Part2_Textures.zip",
     ROOT / "assets/3d/dungeons/b4_dragonfire/textures"),
    (ROOT / "assets/3d/dungeons/b5_abyssal_star_realm/models/floor5_abyss_throne_refined_v2.zip",
     ROOT / "assets/3d/dungeons/b5_abyssal_star_realm/models"),
]
EXTENSIONS = {".glb", ".png", ".jpg", ".jpeg", ".webp", ".json", ".md"}
MAX_UNCOMPRESSED = 300 * 1024 * 1024

def extract(source, dest):
    if not source.exists():
        print(f"MISSING {source.relative_to(ROOT)}", file=sys.stderr)
        return False
    total = 0
    count = 0
    with ZipFile(source) as z:
        for entry in z.infolist():
            if entry.is_dir():
                continue
            name = Path(entry.filename.replace("\\", "/"))
            if name.is_absolute() or ".." in name.parts:
                raise ValueError(f"Unsafe archive entry: {entry.filename}")
            if name.suffix.lower() not in EXTENSIONS:
                continue
            total += entry.file_size
            if total > MAX_UNCOMPRESSED:
                raise ValueError(f"Archive too large: {source}")
            # Flatten archive wrappers; files must be unambiguous.
            target = dest / name.name
            if target.exists() and target.stat().st_size == entry.file_size:
                continue
            dest.mkdir(parents=True, exist_ok=True)
            with z.open(entry) as stream, target.open("wb") as output:
                import shutil
                shutil.copyfileobj(stream, output)
            print(f"EXTRACTED {target.relative_to(ROOT)} ({entry.file_size} bytes)")
            count += 1
    print(f"Pack {source.name}: {count} files extracted")
    return True

if __name__ == "__main__":
    found = [extract(source, dest) for source, dest in PACKS]
    if not all(found):
        sys.exit(1)
