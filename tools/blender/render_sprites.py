"""
コタマの冒険：Blenderヘッドレス スプライト生成スクリプト

使い方:
  blender -b --factory-startup -P tools/blender/render_sprites.py -- <job.json> [出力先の上書き]

ジョブJSONの書式は tools/blender/README.md を参照。
GPUのないGitHub Actionsランナーで動くよう、レンダーは Cycles(CPU) を使う。
"""
import json
import math
import os
import sys

import bpy
import numpy as np
from mathutils import Vector

# ---------------------------------------------------------------------------
# 引数とジョブ読み込み
# ---------------------------------------------------------------------------
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
if not argv:
    raise SystemExit("job.json を指定してください")

job_path = argv[0]
with open(job_path, encoding="utf-8") as f:
    JOB = json.load(f)

NAME = JOB.get("name", os.path.splitext(os.path.basename(job_path))[0])
OUT_DIR = os.path.abspath(argv[1] if len(argv) > 1 else JOB.get("output_dir", f"out/{NAME}"))
os.makedirs(OUT_DIR, exist_ok=True)
REPO_ROOT = os.getcwd()

RES = int(JOB.get("resolution", 512))
PIXEL = max(1, int(JOB.get("pixel_size", 1)))
SAMPLES = int(JOB.get("samples", 32))

scene = bpy.context.scene


def log(msg):
    print(f"[render_sprites] {msg}", flush=True)


# ---------------------------------------------------------------------------
# シーン準備
# ---------------------------------------------------------------------------
def clear_scene():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)


def make_material(name, rgba, roughness=0.8, metallic=0.0, emission=None):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = rgba
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if "Specular IOR Level" in bsdf.inputs:  # Blender 4.x
        bsdf.inputs["Specular IOR Level"].default_value = 0.1
    if emission:
        bsdf.inputs["Emission Color"].default_value = emission
        bsdf.inputs["Emission Strength"].default_value = 1.0
    return mat


def add_primitives(objects):
    for i, spec in enumerate(objects):
        kind = spec.get("type", "cube")
        loc = spec.get("location", [0, 0, 0])
        size = float(spec.get("size", 1.0))
        height = float(spec.get("height", size))

        if kind == "sphere":
            bpy.ops.mesh.primitive_uv_sphere_add(radius=size / 2, location=loc, segments=48, ring_count=24)
        elif kind == "cylinder":
            bpy.ops.mesh.primitive_cylinder_add(radius=size / 2, depth=height, location=loc)
        elif kind == "cone":
            bpy.ops.mesh.primitive_cone_add(radius1=size / 2, depth=height, location=loc)
        elif kind == "torus":
            bpy.ops.mesh.primitive_torus_add(major_radius=size / 2, minor_radius=spec.get("minor", size / 8), location=loc)
        else:
            bpy.ops.mesh.primitive_cube_add(size=size, location=loc)

        o = bpy.context.active_object
        o.name = spec.get("name", f"{kind}_{i}")
        o.rotation_euler = [math.radians(a) for a in spec.get("rotation_deg", [0, 0, 0])]
        if "scale" in spec:
            o.scale = spec["scale"]
        if spec.get("smooth", kind in ("sphere", "torus")):
            bpy.ops.object.shade_smooth()

        o.data.materials.append(make_material(
            f"{o.name}_mat",
            spec.get("color", [0.8, 0.8, 0.8, 1.0]),
            spec.get("roughness", 0.8),
            spec.get("metallic", 0.0),
            spec.get("emission"),
        ))


def import_model(path):
    path = path if os.path.isabs(path) else os.path.join(REPO_ROOT, path)
    ext = os.path.splitext(path)[1].lower()
    log(f"import {path}")
    if ext in (".glb", ".gltf"):
        bpy.ops.import_scene.gltf(filepath=path)
    elif ext == ".fbx":
        bpy.ops.import_scene.fbx(filepath=path)
    elif ext == ".obj":
        bpy.ops.wm.obj_import(filepath=path)
    elif ext == ".blend":
        with bpy.data.libraries.load(path, link=False) as (src, dst):
            dst.objects = list(src.objects)
        for o in dst.objects:
            if o is not None and o.type not in ("CAMERA", "LIGHT"):
                scene.collection.objects.link(o)
    else:
        raise SystemExit(f"未対応の形式: {ext}")

    # 読み込んだモデルに付いてくるカメラ・ライトは使わない
    for o in list(bpy.data.objects):
        if o.type in ("CAMERA", "LIGHT"):
            bpy.data.objects.remove(o, do_unlink=True)


def scene_bounds():
    pts = []
    for o in scene.objects:
        if o.type in ("MESH", "CURVE", "SURFACE", "META", "FONT"):
            pts += [o.matrix_world @ Vector(c) for c in o.bound_box]
    if not pts:
        raise SystemExit("描画対象のオブジェクトがありません")
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return mn, mx


def setup_lights():
    L = JOB.get("lights", {})
    key = bpy.data.objects.new("Key", bpy.data.lights.new("Key", "SUN"))
    key.data.energy = L.get("key", 3.5)
    key.rotation_euler = (math.radians(50), 0, math.radians(-35))
    fill = bpy.data.objects.new("Fill", bpy.data.lights.new("Fill", "SUN"))
    fill.data.energy = L.get("fill", 1.2)
    fill.rotation_euler = (math.radians(60), 0, math.radians(140))
    for o in (key, fill):
        scene.collection.objects.link(o)

    world = bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (1, 1, 1, 1)
    bg.inputs["Strength"].default_value = L.get("ambient", 0.6)


def setup_render():
    r = scene.render
    r.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = SAMPLES
    try:
        scene.cycles.use_denoising = True
    except Exception:
        pass
    r.film_transparent = True  # 背景透過
    r.image_settings.file_format = "PNG"
    r.image_settings.color_mode = "RGBA"
    r.resolution_x = RES // PIXEL
    r.resolution_y = RES // PIXEL
    r.resolution_percentage = 100
    scene.view_settings.view_transform = "Standard"  # 色をくすませない

    ol = JOB.get("outline", {"enabled": True})
    if ol.get("enabled", True):
        r.use_freestyle = True
        r.line_thickness_mode = "ABSOLUTE"
        r.line_thickness = float(ol.get("thickness", 1.5)) / PIXEL if PIXEL > 1 else float(ol.get("thickness", 1.5))
        fs = bpy.context.view_layer.freestyle_settings
        ls = fs.linesets[0] if len(fs.linesets) else fs.linesets.new("Outline")
        ls.select_by_visibility = True
        ls.select_silhouette = True
        ls.select_border = True
        ls.select_crease = ol.get("crease", False)
        ls.linestyle.color = ol.get("color", [0.1, 0.07, 0.08])


def setup_camera(center, size):
    cam_data = bpy.data.cameras.new("Cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = size * float(JOB.get("margin", 1.15))
    cam = bpy.data.objects.new("Cam", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam

    target = bpy.data.objects.new("Target", None)
    target.location = center
    scene.collection.objects.link(target)
    t = cam.constraints.new("TRACK_TO")
    t.target = target
    t.track_axis = "TRACK_NEGATIVE_Z"
    t.up_axis = "UP_Y"
    return cam


def place_camera(cam, center, size, yaw, pitch):
    dist = size * 4
    y, p = math.radians(yaw), math.radians(pitch)
    # yaw=0 で正面（-Y 側から見る）
    cam.location = center + Vector((
        dist * math.cos(p) * math.sin(y),
        -dist * math.cos(p) * math.cos(y),
        dist * math.sin(p),
    ))


def pixelate(src_path, dst_path):
    """低解像度レンダーを最近傍拡大してドット調にする"""
    img = bpy.data.images.load(src_path)
    w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(h, w, 4)
    if JOB.get("hard_alpha", True):
        px[..., 3] = (px[..., 3] > 0.5).astype(np.float32)
    big = np.repeat(np.repeat(px, PIXEL, axis=0), PIXEL, axis=1)
    out = bpy.data.images.new("pix", w * PIXEL, h * PIXEL, alpha=True)
    out.pixels.foreach_set(big.ravel())
    out.filepath_raw = dst_path
    out.file_format = "PNG"
    out.save()
    bpy.data.images.remove(img)
    bpy.data.images.remove(out)
    os.remove(src_path)


# ---------------------------------------------------------------------------
# 実行
# ---------------------------------------------------------------------------
clear_scene()
src = JOB.get("source", {})
if src.get("type") == "model":
    import_model(src["path"])
else:
    add_primitives(src.get("objects", []))

mn, mx = scene_bounds()
center = (mn + mx) / 2
size = max((mx - mn).x, (mx - mn).y, (mx - mn).z)
log(f"bounds center={tuple(round(c, 3) for c in center)} size={size:.3f}")

setup_lights()
setup_render()
cam = setup_camera(center, size)

views = JOB.get("views", [{"name": "front", "yaw": 0, "pitch": 10}])
written = []
for v in views:
    place_camera(cam, center, size, v.get("yaw", 0), v.get("pitch", 10))
    final = os.path.join(OUT_DIR, f"{NAME}_{v.get('name', 'view')}.png")
    tmp = final + ".tmp.png" if PIXEL > 1 else final
    scene.render.filepath = tmp
    log(f"render {v.get('name')} -> {final}")
    bpy.ops.render.render(write_still=True)
    if PIXEL > 1:
        pixelate(tmp, final)
    written.append(os.path.relpath(final, REPO_ROOT))

if JOB.get("save_blend", False):
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT_DIR, f"{NAME}.blend"))

with open(os.path.join(OUT_DIR, f"{NAME}_manifest.json"), "w", encoding="utf-8") as f:
    json.dump({"job": job_path, "files": written, "resolution": RES, "pixel_size": PIXEL}, f, ensure_ascii=False, indent=2)

log(f"done: {len(written)} file(s)")
