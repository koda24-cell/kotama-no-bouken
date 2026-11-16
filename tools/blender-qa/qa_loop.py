"""Blender background-mode QA loop. No external pip dependencies.

Run: blender -b -t 2 --python tools/blender-qa/qa_loop.py -- --source path.blend --out qa-output
This QA improves render exposure only; it NEVER alters the source mesh.
"""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import sys
import time
import traceback

import bpy
from mathutils import Vector

def atomic_json(path, data):
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    tmp.replace(path)

def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1048576), b""):
            h.update(chunk)
    return h.hexdigest()

def mesh_objects():
    return [o for o in bpy.context.scene.objects if o.type == "MESH" and not o.hide_render]

def bounds(objects):
    points = [o.matrix_world @ Vector(corner) for o in objects for corner in o.bound_box]
    if not points:
        raise RuntimeError("No visible mesh objects to inspect")
    low = Vector([min(p[i] for p in points) for i in range(3)])
    high = Vector([max(p[i] for p in points) for i in range(3)])
    return (low + high) / 2, max((high - low).length, 0.1)

def setup_camera(center, diameter, direction):
    scene = bpy.context.scene
    cam = bpy.data.objects.get("_QA_CAMERA")
    if cam is None:
        data = bpy.data.cameras.new("_QA_CAMERA")
        cam = bpy.data.objects.new("_QA_CAMERA", data)
        scene.collection.objects.link(cam)
    cam.location = center + Vector(direction).normalized() * diameter * 1.5
    cam.rotation_euler = (center - cam.location).to_track_quat("-Z", "Y").to_euler()
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = diameter * 1.65
    scene.camera = cam
    scene.render.engine = "BLENDER_EEVEE_NEXT" if bpy.app.version >= (4, 2, 0) else "BLENDER_EEVEE"
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = True
    scene.render.image_settings.color_mode = "RGBA"

def ensure_light(center, diameter):
    if any(o.type == "LIGHT" for o in bpy.context.scene.objects):
        return
    data = bpy.data.lights.new("_QA_KEY", "AREA")
    obj = bpy.data.objects.new("_QA_KEY", data)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = center + Vector((1, -1, 2)).normalized() * diameter * 1.8
    obj.rotation_euler = (center - obj.location).to_track_quat("-Z", "Y").to_euler()
    data.energy = 850
    data.shape = "DISK"
    data.size = max(2, diameter)

def image_metrics(path):
    img = bpy.data.images.load(str(path), check_existing=False)
    try:
        pix = img.pixels
        w, h = img.size
        step = max(1, int(math.sqrt(w * h / 24000)))
        samples = 0
        covered = 0
        lum = 0.0
        clipped = 0
        for y in range(0, h, step):
            for x in range(0, w, step):
                j = (y * w + x) * 4
                a = pix[j + 3]
                samples += 1
                if a > 0.25:
                    covered += 1
                    v = 0.2126 * pix[j] + 0.7152 * pix[j + 1] + 0.0722 * pix[j + 2]
                    lum += v
                    clipped += int(v > 0.98)
        return {
            "coverage": covered / max(1, samples),
            "mean_luminance": lum / max(1, covered),
            "clipped_fraction": clipped / max(1, covered),
        }
    finally:
        bpy.data.images.remove(img)

def main():
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--out", default="qa-output")
    parser.add_argument("--max-iterations", type=int, default=4)
    parser.add_argument("--max-seconds", type=int, default=2400)
    opt = parser.parse_args(args)
    if not (1 <= opt.max_iterations <= 20 and 30 <= opt.max_seconds <= 3000):
        raise ValueError("Iteration/time limits out of safe range")
    source = Path(opt.source).resolve()
    out = Path(opt.out).resolve()
    out.mkdir(parents=True, exist_ok=True)
    progress_path = out / "progress.json"
    checkpoint = out / "checkpoint.blend"
    progress = {"status": "running", "source": str(source), "iterations": [], "approval": "NOT_APPROVED"}
    if progress_path.exists():
        progress = json.loads(progress_path.read_text(encoding="utf-8"))
        if progress.get("approval") != "NOT_APPROVED":
            raise RuntimeError("Unexpected approval state")
        if progress.get("status") == "awaiting_user_approval":
            print("Already passed automatic QA; user approval required")
            return
    starting_iteration = len(progress["iterations"])
    # Resuming from a saved .blend is preferred. Never modify the input .blend.
    if checkpoint.exists():
        bpy.ops.wm.open_mainfile(filepath=str(checkpoint))
    elif source.is_file() and source.suffix.lower() == ".blend":
        bpy.ops.wm.open_mainfile(filepath=str(source))
    else:
        raise FileNotFoundError("Provide an existing .blend source in the checked-out repository")
    objects = mesh_objects()
    center, diameter = bounds(objects)
    ensure_light(center, diameter)
    scene = bpy.context.scene
    deadline = time.monotonic() + opt.max_seconds
    directions = {"front": (0, -1, 0.5), "side": (1, 0, 0.5), "angle": (1, -1, 0.9)}
    try:
        for i in range(starting_iteration, opt.max_iterations):
            if time.monotonic() >= deadline - 120:
                progress["status"] = "time_limit"
                break
            folder = out / ("iteration_%02d" % (i + 1))
            folder.mkdir(exist_ok=True)
            metrics = {}
            for label, direction in directions.items():
                setup_camera(center, diameter, direction)
                path = folder / (label + ".png")
                scene.render.filepath = str(path)
                bpy.ops.render.render(write_still=True)
                metrics[label] = image_metrics(path)
            # All angles must be visible, non-black and not blown out.
            checks = {
                label: (0.025 <= m["coverage"] <= 0.95
                        and 0.10 <= m["mean_luminance"] <= 0.85
                        and m["clipped_fraction"] <= 0.15)
                for label, m in metrics.items()
            }
            passed = all(checks.values())
            record = {"iteration": i + 1, "metrics": metrics, "checks": checks,
                      "passed": passed, "exposure": scene.view_settings.view_settings_exposure if hasattr(scene.view_settings, "view_settings_exposure") else scene.view_settings.exposure}
            progress["iterations"].append(record)
            if not passed:
                vals = [m["mean_luminance"] for m in metrics.values()]
                avg = sum(vals) / len(vals)
                if avg < 0.10:
                    scene.view_settings.exposure = min(3.0, scene.view_settings.exposure + 0.6)
                elif avg > 0.85:
                    scene.view_settings.exposure = max(-3.0, scene.view_settings.exposure - 0.6)
                else:
                    # Defects such as coverage/camera occlusion need manual fixes, no unsafe mesh mutation.
                    progress["status"] = "needs_manual_fix"
            # Save actual Blender scene and a resumable JSON record each iteration.
            bpy.ops.wm.save_as_mainfile(filepath=str(checkpoint))
            progress["status"] = "awaiting_user_approval" if passed else progress.get("status", "running")
            atomic_json(progress_path, progress)
            if passed or progress["status"] == "needs_manual_fix":
                break
        if progress["status"] == "running":
            progress["status"] = "iteration_limit"
        # Export the current candidate, not an approved game asset.
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        if objects:
            bpy.context.view_layer.objects.active = objects[0]
        glb = out / "candidate_unapproved.glb"
        bpy.ops.export_scene.gltf(filepath=str(glb), export_format="GLB", use_selection=True)
        progress["files"] = {p.relative_to(out).as_posix(): sha256(p)
                             for p in out.rglob("*") if p.is_file() and p != progress_path}
        atomic_json(progress_path, progress)
        print("QA status:", progress["status"])
    except Exception:
        progress["status"] = "error"
        progress["error"] = traceback.format_exc()
        atomic_json(progress_path, progress)
        raise

if __name__ == "__main__":
    main()
