"""
GPT承認済みの重いB4モデルを、ゲーム用の軽量版（LOD）にする。

  高ポリ（GPTのGLBそのまま）→ 複製をDecimateで目標三角形数へ → Smart UV →
  Cycles の selected-to-active ベイクで BaseColor / ORM / Normal / Emissive を1枚アトラスへ転写 →
  JPEGテクスチャのGLB。元の形・色・発光の見え方を保ったまま、描画負荷を1/20〜1/50にする。

元ファイルは変更しない（出典・sha256を manifest に記録）。出力は render-output/b4-props/<name>/。
環境変数 B4P_OPT="name=path:target_tris:tex_res,..."（未指定なら下のJOBS）。
"""
import json
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(__file__))
import common as C  # noqa: E402

JOBS = [
    # name, source glb, target tris, texture res  — 2026-11-21: GPT の溶岩の川 V16 と岸 P1〜P3（ユーザー指示：もっと使う）
    ("b4lod_magma_river_v16", "assets/models/floor4/b4-magma-river-v16.glb", 22000, 2048),
    ("b4lod_magma_bank_p1", "assets/models/floor4/b4-magma-river-p1-v4.glb", 7000, 1024),
    ("b4lod_magma_bank_p2", "assets/models/floor4/b4-magma-river-p2-v4.glb", 7000, 1024),
    ("b4lod_magma_bank_p3", "assets/models/floor4/b4-magma-river-p3-v5.glb", 7000, 1024),
]
if os.environ.get("B4P_OPT"):
    JOBS = []
    for item in os.environ["B4P_OPT"].split(","):
        n, rest = item.split("=")
        p, t, r = rest.split(":")
        JOBS.append((n, p, int(t), int(r)))


def import_high(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.abspath(path))
    objs = [o for o in bpy.data.objects if o not in before and o.type == "MESH"]
    for o in [o for o in bpy.data.objects if o not in before and o.type != "MESH"]:
        pass
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    # 親（空オブジェクト）の変換を焼き込んでから結合
    bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.join()
    hi = bpy.context.view_layer.objects.active
    hi.name = "HIGH"
    for o in list(bpy.data.objects):
        if o.type != "MESH":
            bpy.data.objects.remove(o, do_unlink=True)
    # 落下中の破片・火の粉など小さな離れた塊を除く（separate LOOSE は数万オブジェクトになり極端に遅いので bmesh で連結成分を数える）
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(hi.data)
    bm.verts.ensure_lookup_table()
    seen = set()
    comps = []
    for v in bm.verts:
        if v.index in seen:
            continue
        stack = [v]
        seen.add(v.index)
        comp = []
        while stack:
            u = stack.pop()
            comp.append(u)
            for e in u.link_edges:
                w = e.other_vert(u)
                if w.index not in seen:
                    seen.add(w.index)
                    stack.append(w)
        comps.append(comp)
    total = len(bm.verts)
    small = [c for c in comps if len(c) < max(60, total * 0.0004)]
    bmesh.ops.delete(bm, geom=[v for c in small for v in c], context="VERTS")
    bm.to_mesh(hi.data)
    bm.free()
    C.log(f"removed {len(small)}/{len(comps)} small islands")
    # 色が書き出されていない（白）の玄武岩マテリアルを、B4の配色の風化玄武岩に差し替える
    rock = basalt_material()
    for i, m in enumerate(hi.data.materials):
        if m and "Basalt" in m.name and not any(n.type == "TEX_IMAGE" for n in m.node_tree.nodes):   # 色が抜けた（画像なし）ものだけ
            hi.data.materials[i] = rock
    return hi


def basalt_material():
    b = C.NB("b4_basalt_rebuilt")
    sc = 0.08  # 元モデルは数十m規模（最終的に約1/10へ縮める）ので大きめのスケールで投影
    diff = b.image(C.cc0("rock_face_02", "diff"), sc)
    nrm = b.image(C.cc0("rock_face_02", "nor_gl"), sc)
    n_big = b.noise(0.06, 6, 0.6)
    n_mid = b.noise(0.4, 6, 0.6)
    base = b.mix(n_mid, (0.020, 0.017, 0.016), (0.040, 0.034, 0.030))
    if diff is not None:
        hs = b.n("ShaderNodeHueSaturation")
        hs.inputs["Saturation"].default_value = 0.5
        hs.inputs["Value"].default_value = 0.42
        b.link(diff, hs.inputs["Color"])
        base = b.mix(0.55, base, hs.outputs[0], "MULTIPLY")
    # 酸化した赤茶の斑（溶岩洞の壁の焼け）
    ox = b.ramp(n_big, [(0.55, 0.0), (0.72, 1.0)])
    base = b.mix(b.math("MULTIPLY", ox, 0.7), base, (0.075, 0.030, 0.016))
    # Bevel/AO ノードは 40万面の selected-to-active ベイクで極端に遅いので使わない（形の陰影は法線ベイクで出る）
    hi_m = b.ramp(n_mid, [(0.62, 0.0), (0.8, 1.0)])
    base = b.mix(b.math("MULTIPLY", hi_m, 0.35), base, (0.075, 0.069, 0.064))
    r = b.mixf(hi_m, 0.9, 0.78)
    b.normal_from(nrm, 0.8, bump_height=n_mid, bump_strength=0.25, bump_dist=0.2)
    return b.out(base, r, 0.0)


def make_low(hi, target):
    bpy.ops.object.select_all(action="DESELECT")
    hi.select_set(True)
    bpy.context.view_layer.objects.active = hi
    bpy.ops.object.duplicate()
    lo = bpy.context.view_layer.objects.active
    lo.name = "LOW"
    n = C.tri_count(hi)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.remove_doubles(threshold=0.0005)
    bpy.ops.object.mode_set(mode="OBJECT")
    m = lo.modifiers.new("dec", "DECIMATE")
    m.decimate_type = "COLLAPSE"
    m.ratio = max(0.002, min(1.0, target / max(1, n)))
    m.use_collapse_triangulate = True
    C.apply_mods(lo)
    lo.data.materials.clear()
    for p in lo.data.polygons:
        p.use_smooth = True
    return lo, n


def bake_high_to_low(hi, lo, name, res):
    s = bpy.context.scene
    s.render.engine = "CYCLES"
    s.cycles.device = "CPU"
    dims = max(lo.dimensions)
    # UV
    bpy.ops.object.select_all(action="DESELECT")
    lo.select_set(True)
    bpy.context.view_layer.objects.active = lo
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.004)
    try:
        bpy.ops.uv.pack_islands(margin=0.004, rotate=True)
    except Exception:
        pass
    bpy.ops.object.mode_set(mode="OBJECT")
    tm = bpy.data.materials.new(f"{name}_target")
    tm.use_nodes = True
    lo.data.materials.append(tm)
    hm = [m for m in hi.data.materials if m]
    for m in hm:
        m.use_nodes = True
    bk = s.render.bake
    bk.use_selected_to_active = True
    bk.use_cage = False
    bk.cage_extrusion = dims * 0.006
    bk.max_ray_distance = dims * 0.015
    bk.margin = 8
    bk.use_clear = True
    imgs = {}

    def select_pair():
        bpy.ops.object.select_all(action="DESELECT")
        hi.select_set(True)
        lo.select_set(True)
        bpy.context.view_layer.objects.active = lo

    def target(key, non_color):
        img = C._new_img(f"{name}_{key}", res, non_color)
        C._set_active_image([tm], img)
        return img

    for key, sock, nc in (("basecolor", "Base Color", False), ("roughness", "Roughness", True), ("metallic", "Metallic", True)):
        img = target(key, nc)
        saved = C._emit_rewire(hm, sock)
        s.cycles.samples = 8
        select_pair()
        bpy.ops.object.bake(type="EMIT")
        C._emit_restore(saved)
        imgs[key] = img
    img = target("emissive", False)
    saved = C._emission_rewire(hm)
    s.cycles.samples = 8
    select_pair()
    bpy.ops.object.bake(type="EMIT")
    C._emit_restore(saved)
    imgs["emissive"] = img
    has_emit = any(v > 0.004 for v in list(img.pixels)[0::97])
    img = target("normal", True)
    s.cycles.samples = 2
    select_pair()
    bpy.ops.object.bake(type="NORMAL", normal_space="TANGENT")
    imgs["normal"] = img
    # ORM
    orm = C._new_img(f"{name}_orm", res, True)
    rp = list(imgs["roughness"].pixels)
    mp = list(imgs["metallic"].pixels)
    op = [1.0] * len(rp)
    for i in range(0, len(rp), 4):
        op[i + 1] = rp[i]
        op[i + 2] = mp[i]
    orm.pixels = op
    imgs["orm"] = orm
    out_dir = os.path.join(C.OUT_ROOT, name, "textures")
    os.makedirs(out_dir, exist_ok=True)
    for key in ("basecolor", "orm", "normal") + (("emissive",) if has_emit else ()):
        im = imgs[key]
        im.filepath_raw = os.path.join(out_dir, f"{name}_{key}.png")
        im.file_format = "PNG"
        im.save()
    # 最終マテリアル
    fm = bpy.data.materials.new(f"{name}_mat")
    fm.use_nodes = True
    nt = fm.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    t = nt.nodes.new("ShaderNodeTexImage"); t.image = imgs["basecolor"]
    nt.links.new(t.outputs["Color"], bsdf.inputs["Base Color"])
    t = nt.nodes.new("ShaderNodeTexImage"); t.image = imgs["orm"]
    sep = nt.nodes.new("ShaderNodeSeparateColor")
    nt.links.new(t.outputs["Color"], sep.inputs["Color"])
    nt.links.new(sep.outputs["Green"], bsdf.inputs["Roughness"])
    nt.links.new(sep.outputs["Blue"], bsdf.inputs["Metallic"])
    t = nt.nodes.new("ShaderNodeTexImage"); t.image = imgs["normal"]
    nm = nt.nodes.new("ShaderNodeNormalMap")
    nt.links.new(t.outputs["Color"], nm.inputs["Color"])
    nt.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
    if has_emit:
        t = nt.nodes.new("ShaderNodeTexImage"); t.image = imgs["emissive"]
        nt.links.new(t.outputs["Color"], bsdf.inputs["Emission Color"])
        bsdf.inputs["Emission Strength"].default_value = C.EMIT_SCALE
    lo.data.materials.clear()
    lo.data.materials.append(fm)
    return has_emit


# 壁のタイリング用CC0テクスチャをゲーム側へ渡す（出典・sha256つき）
_wall_dir = os.path.join(C.OUT_ROOT, "cc0_wall_textures")
os.makedirs(_wall_dir, exist_ok=True)
_wall = {}
for _f in sorted(os.listdir(C.TEX_DIR)) if os.path.isdir(C.TEX_DIR) else []:
    if _f.startswith("rock_face_02_") and _f.endswith("_2k.jpg"):
        import shutil
        shutil.copy(os.path.join(C.TEX_DIR, _f), os.path.join(_wall_dir, _f))
        _wall[_f] = {"source": "https://polyhaven.com/a/rock_face_02", "license": "CC0 (https://polyhaven.com/license)", "sha256": C._sha(os.path.join(_wall_dir, _f))}
with open(os.path.join(_wall_dir, "manifest.json"), "w", encoding="utf-8") as _fh:
    json.dump(_wall, _fh, ensure_ascii=False, indent=2)

for name, src, target_tris, res in JOBS:
    C.reset(3)
    C.log(f"optimize {name} <- {src}")
    hi = import_high(src)
    lo, n_hi = make_low(hi, target_tris)
    has_emit = bake_high_to_low(hi, lo, name, res)
    bpy.data.objects.remove(hi, do_unlink=True)
    C.set_origin_bottom(lo)
    lo.name = name
    out_dir = os.path.join(C.OUT_ROOT, name)
    glb = os.path.join(out_dir, f"{name}.glb")
    bpy.ops.object.select_all(action="DESELECT")
    lo.select_set(True)
    bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_apply=True,
                              export_yup=True, export_image_format="JPEG", export_image_quality=88)
    files = C.render_views(name, out_dir, "volcanic", views=[("front", 0, 10, 1.0), ("angle", 38, 26, 1.0), ("close", 25, 18, 2.2)], samples=64)
    mn, mx = C._bounds()
    man = {"asset": name, "source": src, "source_sha256": C._sha(src), "source_triangles": n_hi,
           "triangles": C.tri_count(lo), "bbox_m": [round(v, 3) for v in (mx - mn)], "emissive": has_emit,
           "glb_bytes": os.path.getsize(glb), "renders": [os.path.basename(f) for f in files],
           "approval": "SOURCE_USER_APPROVED (GPT); LOD derived by Claude, NOT_APPROVED"}
    with open(os.path.join(out_dir, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(man, f, ensure_ascii=False, indent=2)
    C.log(f"done {name}: {n_hi} -> {man['triangles']} tris, {man['glb_bytes']} B, bbox {man['bbox_m']}")
