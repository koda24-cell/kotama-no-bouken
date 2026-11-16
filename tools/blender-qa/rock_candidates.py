"""Non-destructive rock-shard candidates; requires Blender Python.
Run: blender -b --python tools/blender-qa/rock_candidates.py -- --source file.blend --target Rock
Preserves the source .blend and original meshes. Does not claim artistic QA.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import random
import sys
import bpy
from mathutils import Vector

def digest(obj):
    h = hashlib.sha256()
    for v in obj.data.vertices:
        h.update((','.join(format(float(c), '.8g') for c in v.co) + ';').encode())
    for p in obj.data.polygons:
        h.update((','.join(map(str, p.vertices)) + ';').encode())
    return h.hexdigest()

def triangles(obj):
    mesh = obj.data
    mesh.calc_loop_triangles()
    result, total = [], 0.0
    for tri in mesh.loop_triangles:
        a, b, c = (obj.matrix_world @ mesh.vertices[j].co for j in tri.vertices)
        area = (b-a).cross(c-a).length / 2
        if area > 1e-9:
            total += area
            result.append((total, a, b, c))
    if not result:
        raise ValueError("Mesh has no nondegenerate triangles")
    return result, total

def build(obj, seed, number, radius_scale, iteration):
    rng = random.Random(seed)
    tris, total = triangles(obj)
    points = [obj.matrix_world @ v.co for v in obj.data.vertices]
    center = sum(points, Vector()) / len(points)
    diameter = max((p-center).length for p in points) * 2
    radius = max(0.001, diameter * radius_scale)
    created = []
    for index in range(number):
        draw = rng.random() * total
        _, a, b, c = next(t for t in tris if draw <= t[0])
        u = math.sqrt(rng.random())
        v = rng.random()
        pos = (1-u)*a + u*(1-v)*b + u*v*c
        normal = (b-a).cross(c-a).normalized()
        if normal.dot(pos-center) < 0:
            normal.negate()
        # Embed shard centers inside sampled surface; no deletion of existing geometry.
        pos -= normal * radius * rng.uniform(0.55, 0.95)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1, location=pos)
        shard = bpy.context.object
        shard.name = f"_QA_ADD_{iteration:02d}_{index:03d}"
        shard.rotation_euler = (rng.random()*0.4, rng.random()*math.tau, rng.random()*math.tau)
        shard.scale = (radius*rng.uniform(0.6, 1.3),
                       radius*rng.uniform(0.8, 1.8),
                       radius*rng.uniform(0.55, 1.25))
        if obj.data.materials:
            shard.data.materials.append(obj.data.materials[0])
        shard["qa_added_detail"] = True
        created.append(shard)
    return created

def main():
    args = sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--target", required=True)
    parser.add_argument("--out", default="rock-candidates")
    parser.add_argument("--candidates", type=int, default=4)
    opt = parser.parse_args(args)
    if not 1 <= opt.candidates <= 8:
        parser.error("Candidates must be 1..8")
    source = Path(opt.source).resolve()
    if not source.is_file() or source.suffix.lower() != ".blend":
        parser.error("Source must be an existing .blend")
    out = Path(opt.out).resolve()
    out.mkdir(parents=True, exist_ok=True)
    progress = {"source": str(source), "target": opt.target,
                "approval": "NOT_APPROVED", "candidates": []}
    for i in range(opt.candidates):
        bpy.ops.wm.open_mainfile(filepath=str(source))
        obj = bpy.data.objects.get(opt.target)
        if obj is None or obj.type != "MESH" or not obj.data.vertices:
            raise ValueError("Rock target must be a nonempty mesh")
        originals = {o.name: digest(o) for o in bpy.data.objects if o.type == "MESH"}
        count, radius = 12 + i*8, 0.035 + i*0.005
        parts = build(obj, 3021+i, count, radius, i+1)
        if not all(digest(bpy.data.objects[name]) == h for name, h in originals.items()):
            raise RuntimeError("Original mesh changed; aborting")
        folder = out / f"candidate_{i+1:02d}"
        folder.mkdir(exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=str(folder/"candidate.blend"))
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        for part in parts:
            part.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.export_scene.gltf(filepath=str(folder/"candidate_unapproved.glb"),
                                  export_format="GLB", use_selection=True)
        progress["candidates"].append({
            "index": i+1, "added_meshes": count, "radius_fraction": radius,
            "source_mesh_unchanged": True, "blend": str(folder/"candidate.blend"),
            "glb": str(folder/"candidate_unapproved.glb"),
            "artistic_quality": "UNVERIFIED"})
        (out/"progress.json").write_text(json.dumps(progress, indent=2), encoding="utf-8")
    print("Unapproved rock candidates created:", len(progress["candidates"]))

if __name__ == "__main__":
    main()
