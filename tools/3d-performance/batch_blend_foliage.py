#!/usr/bin/env python3
"""Non-destructive review-only material batching of a BLEND file.

Run with: blender -b original.blend --python batch_blend_foliage.py -- --output DIR
Never writes to the input BLEND. All approved/original meshes remain untouched on disk.
"""
import argparse
import json
import os
from pathlib import Path
import bpy
import hashlib

def argv_after_dash():
    import sys
    return sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []

parser = argparse.ArgumentParser()
parser.add_argument("--output", default="render-output/3d-performance/foliage-batch")
parser.add_argument("--prefix", default="tree_mature_leaf_")
parser.add_argument("--require-min-leaves", type=int, default=500)
args = parser.parse_args(argv_after_dash())
out = Path(args.output)
out.mkdir(parents=True, exist_ok=True)

def mesh_objects():
    return [o for o in bpy.context.scene.objects if o.type == "MESH"
            and o.name.startswith("tree_mature_")]

leaves = [o for o in mesh_objects() if o.name.startswith(args.prefix)]
if len(leaves) < args.require_min_leaves:
    raise RuntimeError("unexpectedly low leaf count, refusing to optimize: " + str(len(leaves)))
source_count = len(mesh_objects())
groups = {}
for ob in leaves:
    if len(ob.data.materials) != 1 or not ob.data.materials[0]:
        raise RuntimeError("unbakeable leaf material count: " + ob.name)
    # Material pointer identity; no combining objects with different materials.
    name = ob.data.materials[0].name
    groups.setdefault(name, []).append(ob)

# All mesh objects here are Blender in-memory copies loaded from a checkpoint.
# The source .blend is not changed or saved.
joined = []
for matname, objects in sorted(groups.items()):
    bpy.ops.object.select_all(action="DESELECT")
    for ob in objects:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = "tree_mature_batched_" + matname
    ob.data.name = ob.name + "_geometry"
    joined.append(ob)

after = mesh_objects()
assert len(joined) == len(groups)
assert len(after) == source_count - len(leaves) + len(joined), (len(after), source_count, len(leaves))
assert len(groups) <= 8, "unexpected material explosion"

# Export only production meshes; review floor and light rigs must never be in GLB.
bpy.ops.object.select_all(action="DESELECT")
for ob in after:
    ob.select_set(True)
bpy.context.view_layer.objects.active = after[0]
glb = out / "tree_mature_v14_leaf_batched_NOT_APPROVED.glb"
bpy.ops.export_scene.gltf(filepath=str(glb.resolve()), export_format="GLB", use_selection=True)
if glb.stat().st_size < 5000:
    raise RuntimeError("GLB too small")

# Images are generated from exactly the source blend's render cameras.
scene = bpy.context.scene
scene.render.image_settings.file_format = "PNG"
for view in ("front", "side", "angle", "top"):
    cam = bpy.data.objects.get("review_camera_" + view)
    if cam is None:
        raise RuntimeError("missing real review camera: " + view)
    scene.camera = cam
    scene.render.filepath = str((out/(view + ".png")).resolve())
    bpy.ops.render.render(write_still=True)

summary = {
    "schema": "kotama-foliage-batch-v1",
    "approval": "NOT_APPROVED",
    "source_blend_modified": False,
    "source_leaf_meshes": len(leaves),
    "source_all_meshes": source_count,
    "leaf_material_groups": sorted(groups),
    "batched_leaf_meshes": len(joined),
    "exported_meshes": len(after),
    "removed_leaf_objects_in_in_memory_review_copy": len(leaves) - len(joined),
    "render_views": ["front", "side", "angle", "top"],
    "warning": "Structural batching result, not in-game FPS/draw calls. Visual PNG verification and author approval required.",
}
files = [glb] + [out/(view+".png") for view in ("front","side","angle","top")]
summary["files"] = [{"name":f.name,"bytes":f.stat().st_size,
                     "sha256":hashlib.sha256(f.read_bytes()).hexdigest()} for f in files]
(out/"batch_manifest.json").write_text(json.dumps(summary, indent=2)+"\n")
print("FOLIAGE_BATCH_DONE", len(leaves), len(joined), len(after))
