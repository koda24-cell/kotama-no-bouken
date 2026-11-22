#!/usr/bin/env python3
"""Compare identical-camera PNG renders after topology-only optimization."""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageStat

def compare(source, optimized):
    rows = []
    for view in ("front", "side", "angle", "top"):
        with Image.open(Path(source)/(view+".png")) as a, Image.open(Path(optimized)/(view+".png")) as b:
            if a.size != b.size:
                raise ValueError(f"camera dimensions changed for {view}: {a.size} != {b.size}")
            delta = ImageChops.difference(a.convert("RGB"), b.convert("RGB"))
            rgb_means = ImageStat.Stat(delta).mean
            rows.append({"view": view, "rgb_mae": round(sum(rgb_means) / 3, 4),
                         "normalized_rgb_mae": round(sum(rgb_means)/3/255, 6)})
    return {"source": str(source), "optimized": str(optimized), "views": rows,
            "max_normalized_rgb_mae": max(r["normalized_rgb_mae"] for r in rows),
            "note": "Pixel similarity is a technical smoke test, not aesthetic review."}

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("source")
    p.add_argument("optimized")
    p.add_argument("--out", required=True)
    p.add_argument("--max-mae", type=float, default=0.15)
    a = p.parse_args()
    result = compare(a.source,a.optimized)
    Path(a.out).write_text(json.dumps(result,indent=2)+"\n")
    print("RENDER_COMPARISON", result["views"])
    if result["max_normalized_rgb_mae"] > a.max_mae:
        raise SystemExit("RENDER_COMPARISON_MISMATCH > "+str(a.max_mae))
