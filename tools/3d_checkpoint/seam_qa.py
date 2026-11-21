#!/usr/bin/env python3
"""Fail-closed automatic seam QA for the Blender 5.3 half-frame experiment.

Pixel decoding reuses the strict dependency-free PNG reader used for stitching.
This is a technical image gate, NOT approval of aesthetic quality.
"""
import argparse
import json
import statistics
from pathlib import Path
from stitch_half_frame import read_rgba


def rgb_column_delta(rows, x):
    w = len(rows[0]) // 4
    if not 1 <= x < w:
        raise ValueError("Column outside image")
    total = 0
    for row in rows:
        at = x * 4
        before = at - 4
        total += sum(abs(row[at + c] - row[before + c]) for c in range(3))
    return total / (len(rows) * 3)


def image_mae(rows, other):
    if len(rows) != len(other) or any(len(a) != len(b) for a, b in zip(rows, other)):
        raise ValueError("Image size mismatch")
    total = count = 0
    for a, b in zip(rows, other):
        for i in range(0, len(a), 4):
            total += sum(abs(a[i + c] - b[i + c]) for c in range(3))
            count += 3
    return total / count


def evaluate(stitched, reference, *, max_ratio=2.5, max_mae=12.0, max_excess=8.0):
    w, h, rows = read_rgba(stitched)
    rw, rh, reference_rows = read_rgba(reference)
    if (w, h, rw, rh) != (1000, 760, 1000, 760):
        raise ValueError("Only 1000x760 front frames supported for this test")
    seam = rgb_column_delta(rows, 500)
    nearby = [rgb_column_delta(rows, x) for x in list(range(450, 495)) + list(range(506, 551))]
    normal = statistics.median(nearby)
    ref_seam = rgb_column_delta(reference_rows, 500)
    ratio = seam / max(normal, 0.25)
    excess = seam - ref_seam
    mae = image_mae(rows, reference_rows)
    checks = {
        "seam_to_nearby_ratio": ratio <= max_ratio,
        "seam_excess_over_reference": excess <= max_excess,
        "full_image_mae": mae <= max_mae,
    }
    return {
        "status": "PASS" if all(checks.values()) else "FAIL",
        "aesthetic_qa": "NOT_TESTED",
        "stitched": str(stitched),
        "reference": str(reference),
        "width": w, "height": h,
        "seam_rgb_delta": round(seam, 4),
        "nearby_median_rgb_delta": round(normal, 4),
        "reference_seam_rgb_delta": round(ref_seam, 4),
        "seam_to_nearby_ratio": round(ratio, 4),
        "seam_excess_over_reference": round(excess, 4),
        "full_image_mae": round(mae, 4),
        "limits": {"max_ratio": max_ratio, "max_mae": max_mae, "max_excess": max_excess},
        "checks": checks,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--stitched", required=True)
    parser.add_argument("--reference", required=True)
    parser.add_argument("--report", required=True)
    args = parser.parse_args()
    try:
        result = evaluate(args.stitched, args.reference)
    except (ValueError, OSError, IndexError, OverflowError) as exc:
        result = {"status": "FAIL", "reason": str(exc), "aesthetic_qa": "NOT_TESTED"}
    output = Path(args.report)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print("HALF_FRAME_SEAM_QA " + json.dumps(result, sort_keys=True))
    return 0 if result["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
