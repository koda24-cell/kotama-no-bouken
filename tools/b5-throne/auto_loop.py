#!/usr/bin/env python3
"""Bounded, resumable GitHub Actions controller for B5 throne candidates.

Automated checks are technical, NOT aesthetic approval. No game asset promotion.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import struct
import subprocess
import sys
import time
from PIL import Image, ImageStat

ROOT = Path("render-output/b5-throne-auto")
VIEWS = ("front", "side", "angle")
REQUIRED = ("b5-ruined-throne-v2.blend", "b5-ruined-throne-v2.glb", "geometry.json")
SOURCE = Path("tools/b5-throne/build_v2.py")
ORIGINAL = Path("tools/b5-throne/build_v1.py")

def digest(p):
    h = hashlib.sha256()
    with p.open("rb") as file:
        for chunk in iter(lambda: file.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()

def write_json(p, data):
    p.parent.mkdir(parents=True, exist_ok=True)
    temp = p.with_suffix(".tmp")
    temp.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    os.replace(temp, p)

def read_progress(source_hash, max_iterations):
    p = ROOT / "progress.json"
    if not p.is_file():
        return {"status": "running", "approval": "NOT_APPROVED", "source_hash": source_hash,
                "history": [], "best": None}
    state = json.loads(p.read_text(encoding="utf-8"))
    if state.get("source_hash") != source_hash or state.get("approval") != "NOT_APPROVED":
        raise ValueError("Unsafe checkpoint: source code changed or approval state invalid")
    if len(state.get("history", [])) > max_iterations:
        raise ValueError("Checkpoint iteration count exceeds configured cap")
    return state

def image_metrics(p):
    with Image.open(p) as im:
        im.verify()
    with Image.open(p) as im:
        im = im.convert("RGBA")
        im.thumbnail((256, 256))
        data = list(im.getdata())
    count = sum(a > 64 for _, _, _, a in data)
    if not count:
        return {"coverage": 0, "brightness": 0, "clipped": 0}
    lum = [(0.2126*r+0.7152*g+0.0722*b)/255 for r,g,b,a in data if a > 64]
    return {"coverage": count / len(data), "brightness": sum(lum)/len(lum),
            "clipped": sum(v > .98 for v in lum)/count}

def inspect(directory, baseline):
    files = list(REQUIRED) + [name+".png" for name in VIEWS]
    for f in files:
        p = directory/f
        if not p.is_file() or p.stat().st_size < 64:
            raise RuntimeError("Missing or empty output: " + str(p))
    glb = directory/"b5-ruined-throne-v2.glb"
    with glb.open("rb") as f:
        magic, version, length = struct.unpack("<4sII", f.read(12))
    if magic != b"glTF" or version != 2 or length != glb.stat().st_size:
        raise RuntimeError("Invalid GLB header/length")
    geometry = json.loads((directory/"geometry.json").read_text(encoding="utf-8"))
    if geometry["mesh_count"] < baseline["mesh_count"] or not set(baseline["object_names"]).issubset(set(geometry["object_names"])):
        raise RuntimeError("Baseline V1 mesh objects were lost")
    views = {view: image_metrics(directory/(view+".png")) for view in VIEWS}
    valid = all(.025 <= m["coverage"] <= .94 and .08 <= m["brightness"] <= .9
                and m["clipped"] <= .18 for m in views.values())
    # Quality score compares framing and clipping only; NEVER interpreted as artistic quality.
    score = sum(max(0,1-abs(m["brightness"]-.47)*1.7)
                + max(0,1-abs(m["coverage"]-.36)*2)
                - m["clipped"]*4 for m in views.values())
    return {"valid":valid, "score":round(score,4), "views":views, "geometry": {
        "mesh_count":geometry["mesh_count"], "vertex_count":geometry["vertex_count"]},
        "sha256":{f:digest(directory/f) for f in files}}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--iterations", type=int, default=4)
    parser.add_argument("--minutes", type=int, default=35)
    parser.add_argument("--blender", default="blender")
    args = parser.parse_args()
    if not 1 <= args.iterations <= 8 or not 5 <= args.minutes <= 45:
        parser.error("Limits must be 1..8 iterations and 5..45 minutes")
    ROOT.mkdir(parents=True, exist_ok=True)
    source_hash = hashlib.sha256((digest(SOURCE) + digest(ORIGINAL)).encode()).hexdigest()
    state = read_progress(source_hash, args.iterations)
    if state["status"] == "awaiting_user_approval":
        print("Already passed; user approval required; no more iterations")
        return
    started = time.monotonic()
    deadline = started + args.minutes * 60
    # Baseline reference is saved in each candidate's V1-origin object names.
    for index in range(len(state["history"]), args.iterations):
        if time.monotonic() > deadline - 180:
            state["status"] = "time_limit"
            break
        output = ROOT/("iteration_%02d" % (index+1))
        output.mkdir(exist_ok=True)
        env = dict(os.environ, THRONE_OUTPUT=str(output), THRONE_VARIANT=str(index),
                   THRONE_EXPOSURE="0")
        log = output/"blender.log"
        try:
            with log.open("w", encoding="utf-8") as f:
                subprocess.run([args.blender, "-b", "-t", "2", "--python-exit-code", "1",
                                "--python", str(SOURCE)], env=env, stdout=f,
                               stderr=subprocess.STDOUT, check=True,
                               timeout=max(60,int(deadline-time.monotonic()-90)))
            geo = json.loads((output/"geometry.json").read_text(encoding="utf-8"))
            if index == 0 and "baseline" not in state:
                # The V1 script creates objects before V2 additions, marked by absence of V2 prefix.
                names = [name for name in geo["object_names"] if not name.startswith("V2 ")]
                state["baseline"] = {"object_names":names, "mesh_count":len(names)}
            report = inspect(output, state["baseline"])
            rec = {"iteration":index+1,"status":"passed" if report["valid"] else "qa_failed",
                   **report}
            state["history"].append(rec)
            if report["valid"] and (not state["best"] or report["score"] > state["best"]["score"]):
                state["best"] = {"iteration":index+1, "score":report["score"]}
            # Stop early on 2 technically sound candidates; perceptual approval still required.
            if sum(r["status"]=="passed" for r in state["history"]) >= 2:
                state["status"] = "awaiting_user_approval"
            else:
                state["status"] = "running"
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired, Exception) as exc:
            state["history"].append({"iteration":index+1,"status":"error","reason":str(exc)})
            state["status"] = "needs_manual_fix"
        finally:
            write_json(ROOT/"progress.json", state)
        if state["status"] != "running":
            break
    if state["status"] == "running":
        state["status"] = "iteration_limit"
    state["approval"] = "NOT_APPROVED"
    write_json(ROOT/"progress.json",state)
    summary = {"status":state["status"],"approval":state["approval"],
               "best_technical_candidate":state["best"],"iterations":len(state["history"]),
               "warning":"Automated metrics do not assess visual craft or game performance"}
    write_json(ROOT/"summary.json", summary)
    print(json.dumps(summary, ensure_ascii=False))
    if state["status"] == "needs_manual_fix":
        raise SystemExit(1)

if __name__ == "__main__":
    main()
