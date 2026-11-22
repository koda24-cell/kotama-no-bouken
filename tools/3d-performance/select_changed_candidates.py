#!/usr/bin/env python3
"""Select changed, safe rigid GLBs for review-only Actions matrix.

This script never promotes assets. Safety is enforced once more in Blender.
"""
import argparse
import json
from pathlib import Path

def select(plan, paths, available):
    changed = set(p.strip() for p in paths if p.strip())
    candidates = []
    for record in plan["assets"]:
        if record["path"] not in changed or not record["rigid_candidate"]:
            continue
        if not (record["path"].startswith("assets/") and record["path"].endswith(".glb")):
            continue
        if not available(record["path"]):
            continue
        candidates.append({"source_glb": record["path"]})
    return {"include": sorted(candidates, key=lambda x: x["source_glb"])}

if __name__ == "__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--plan",required=True)
    p.add_argument("--changes",required=True)
    p.add_argument("--matrix-output",required=True)
    args=p.parse_args()
    plan=json.loads(Path(args.plan).read_text())
    paths=Path(args.changes).read_text().splitlines()
    matrix=select(plan,paths,lambda path: Path(path).is_file())
    Path(args.matrix_output).write_text(json.dumps(matrix,separators=(",",":")))
    print("RIGID_REVIEW_CANDIDATES",len(matrix["include"]))
