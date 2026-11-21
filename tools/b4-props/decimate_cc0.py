"""
Poly Haven（CC0）のスキャン岩モデルを、ゲームで大量に並べられる軽量 GLB にする（2026-11-22 ユーザー指摘：
手作りの岩は質が悪い→本物らしく）。セット（rock_moss_set_*）は1個ずつ別の GLB に分ける。
Decimate（COLLAPSE）で目標三角形数へ。UV と元の 1K テクスチャ（diff/nor/arm or rough）はそのまま使う。
出力：render-output/b4-props/cc0rocks/<id>_<k>.glb と manifest.json（元の出典・三角形数・寸法）。
"""
import json, os, glob
import bpy

SRC = "assets/models/floor4/cc0"
OUT = os.path.join(os.environ.get("B4P_OUT", "render-output/b4-props"), "cc0rocks")
os.makedirs(OUT, exist_ok=True)
TARGET = {"rock_07": 900, "rock_09": 700}
DEFAULT = 2200
manifest = {}

def tris(o):
    return sum(len(p.vertices) - 2 for p in o.data.polygons)

for d in sorted(glob.glob(os.path.join(SRC, "*"))):
    gl = glob.glob(os.path.join(d, "*.gltf"))
    if not gl: continue
    rid = os.path.basename(d)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.abspath(gl[0]))
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    for o in bpy.context.scene.objects: o.select_set(False)
    for k, o in enumerate(sorted(meshes, key=lambda m: -tris(m))):
        bpy.context.view_layer.objects.active = o
        o.select_set(True)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        t0 = tris(o)
        target = TARGET.get(rid, DEFAULT)
        if t0 > target:
            m = o.modifiers.new("dec", "DECIMATE"); m.decimate_type = "COLLAPSE"; m.ratio = max(0.005, target / t0); m.use_collapse_triangulate = True
            bpy.ops.object.modifier_apply(modifier="dec")
        # 原点を底面中央に
        import mathutils
        bb = [o.matrix_world @ mathutils.Vector(c) for c in o.bound_box]
        cx = sum(v.x for v in bb) / 8; cy = sum(v.y for v in bb) / 8; mz = min(v.z for v in bb)
        o.location -= mathutils.Vector((cx, cy, mz))
        bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
        name = f"{rid}_{k}"
        path = os.path.join(OUT, name + ".glb")
        bpy.ops.export_scene.gltf(filepath=os.path.abspath(path), export_format="GLB", use_selection=True, export_image_format="JPEG", export_apply=True)
        dims = [round(x, 3) for x in o.dimensions]
        manifest[name] = {"source": f"https://polyhaven.com/a/{rid}", "license": "CC0", "tris_src": t0, "tris": tris(o), "dims_m": dims, "bytes": os.path.getsize(path)}
        print(name, t0, "->", tris(o), dims, flush=True)
        o.select_set(False)
json.dump(manifest, open(os.path.join(OUT, "manifest.json"), "w"), indent=1)
print("done", len(manifest))
