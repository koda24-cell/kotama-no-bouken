#!/usr/bin/env python3
"""All-floor read-only asset performance recommendations.

No model is ever promoted or silently replaced. Report intentionally separates
static structural cost from unmeasured WebGL draw calls and FPS.
"""
import argparse
import collections
import json
import re
from pathlib import Path

def floor_for_path(path):
    match = re.search(r"(?:/|^)b([1-6])(?:_|/|-)", path)
    if match:
        return f"floor{match.group(1)}"
    match = re.search(r"(?:/|^)floor[_-]?([1-6])(?:/|_|-)", path)
    if match:
        return f"floor{match.group(1)}"
    return "shared_or_unclassified"

def classify(item):
    # Restrict semantic naming to the asset/mesh/material, not the parent
    # stage folder (e.g. b1_ancient_forest contains both stone walls and trees).
    filename = Path(item["path"]).stem.lower()
    labels = " ".join([filename] + [str(x).lower() for x in item.get("material_names", [])]
                      + [str(x).lower() for x in item.get("mesh_names", [])])
    m = item.get("alpha_materials", {})
    tri = item.get("estimated_scene_triangles", 0)
    draws = item.get("scene_primitive_instances", 0)
    character = any(word in labels for word in (
        "character", "npc", "enemy", "foe", "boss", "rigged", "humanoid", "skeleton", "armature"))
    animated = (bool(item.get("skins", 0)) or bool(item.get("animations", 0))
                or bool(item.get("morph_target_meshes", 0)))
    vegetation = any(word in labels for word in (
        "tree", "leaf", "leaves", "foliage", "grass", "fern", "plant", "shrub",
        "bush", "flower", "lily", "vine", "moss", "root", "branch",
        "trunk", "canopy", "bamboo", "sprout"))
    effect = any(word in filename for word in (
        "lava", "magma", "water", "fog", "smoke", "fire", "mist",
        "vfx", "spark", "ember", "flame", "splash", "waterfall"))
    if character or animated:
        mode = "manual_animated_or_character_review"
        automatic_rigid_candidate = False
    elif effect:
        mode = "vfx_shader_manual_review"
        automatic_rigid_candidate = False
    elif vegetation:
        # Even completely OPAQUE individual leaves must not be decimated
        # as generic rocks (the V14 mature tree uses opaque leaf materials).
        mode = "foliage_or_transparency_review"
        automatic_rigid_candidate = False
    elif m.get("BLEND", 0) or m.get("MASK", 0):
        mode = "transparency_specialized_review"
        automatic_rigid_candidate = False
    else:
        mode = "rigid_geometry_review"
        automatic_rigid_candidate = bool(tri >= 1500 and draws >= 1)
    return {"mode": mode, "rigid_candidate": automatic_rigid_candidate,
            "priority": ("high" if draws >= 100 or tri >= 100000 else
                         "medium" if draws >= 20 or tri >= 12000 else "normal")}

def produce(audit):
    floor_report = collections.defaultdict(lambda: {"models": 0, "triangles": 0, "primitive_instances": 0,
                                                     "candidate_modes": collections.Counter(), "high_priority": 0})
    rows = []
    for entry in audit["models"]:
        kind = classify(entry)
        stage = floor_for_path(entry["path"])
        record = {"path":entry["path"],"floor":stage,**kind,
                  "triangles":entry.get("estimated_scene_triangles",0),
                  "primitive_instances":entry.get("scene_primitive_instances",0)}
        rows.append(record)
        block = floor_report[stage]
        block["models"] += 1
        block["triangles"] += record["triangles"]
        block["primitive_instances"] += record["primitive_instances"]
        block["candidate_modes"][kind["mode"]] += 1
        block["high_priority"] += kind["priority"] == "high"
    return {
        "schema": "kotama-all-floor-optimization-plan-v1",
        "source": "GLB structure only, not actual WebGL FPS/draw calls",
        "approved_for_game_integration": False,
        "approval_required": True,
        "scope": "all present repository GLBs, floor6 or uncommitted models are not assumed to exist",
        "floors": {floor: {**info, "candidate_modes": dict(info["candidate_modes"])}
                   for floor,info in sorted(floor_report.items())},
        "assets": rows,
        "next_steps": [
            "Keep source GLBs immutable and compare source/LOD screenshots",
            "Use rigid LOD review only for static opaque eligible assets",
            "Use leaf material batching and multiview impostors for vegetation",
            "Keep water/magma/VFX and characters out of generic geometry simplification",
            "Measure scene draw calls, frame time and visual popping in real Three.js before integration"
        ],
    }

if __name__ == "__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("audit")
    parser.add_argument("--output",required=True)
    args=parser.parse_args()
    data=json.loads(Path(args.audit).read_text())
    assert data["schema"]=="kotama-glb-audit-v1" and not data.get("errors")
    report=produce(data)
    target=Path(args.output)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n")
    print("ALL_FLOOR_OPTIMIZATION_PLAN",json.dumps(report["floors"],ensure_ascii=False))
