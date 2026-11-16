"""
第2層「凍った水源」花アセット 共通ヘルパー（Claudeチーム用）

各 build_<name>.py から:
    import sys, os; sys.path.insert(0, os.path.dirname(__file__)); import common as C
で読み込む。Blender 4.2 LTS (GitHub Actions / Cycles CPU) で動作する前提。

提供機能:
- reset()                       : シーンを空にし、単位をメートルに
- 材質: mat_petal / mat_leaf / mat_ice / mat_emissive / mat_basic
- 形状: petal_surface / tube_along / strap_leaf / spike / join / set_origin_bottom
- 霜: frost_scatter(対象, 数, サイズ)  … 縁や先端に小さな氷晶を実メッシュで付ける
- 出力: finish(name) … GLB書き出し・4方向+クローズアップ実レンダー・manifest/統計
"""
import hashlib
import json
import math
import os
import random

import bmesh
import bpy
from mathutils import Matrix, Vector

OUT_ROOT = os.path.abspath(os.environ.get("F2_OUT", "render-output/f2-flowers"))
SAMPLES = int(os.environ.get("F2_SAMPLES", "64"))
RES = int(os.environ.get("F2_RES", "1024"))


def log(msg):
    print(f"[f2-flowers] {msg}", flush=True)


# ---------------------------------------------------------------------------
# シーン
# ---------------------------------------------------------------------------
def reset(seed=7):
    random.seed(seed)
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.lights, bpy.data.cameras):
        for d in list(coll):
            if d.users == 0:
                coll.remove(d)
    s = bpy.context.scene
    s.unit_settings.system = "METRIC"
    s.unit_settings.scale_length = 1.0
    return s


# ---------------------------------------------------------------------------
# 材質（glTFに出る Principled BSDF の入力だけを使う）
# ---------------------------------------------------------------------------
def _bsdf(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    return m, b


def _set(b, key, val):
    if key in b.inputs:
        b.inputs[key].default_value = val


def mat_basic(name, rgb, rough=0.6, metal=0.0, spec=0.5):
    m, b = _bsdf(name)
    _set(b, "Base Color", (*rgb, 1))
    _set(b, "Roughness", rough)
    _set(b, "Metallic", metal)
    _set(b, "Specular IOR Level", spec)
    return m


def mat_petal(name, rgb, rough=0.45, sss=0.35, sss_radius=(0.8, 0.6, 0.5), sheen=0.3, vcol=False):
    """花弁: 薄い透け感（Subsurface）と微光沢（Sheen）。vcol=True で頂点色をベースカラーに使う"""
    m, b = _bsdf(name)
    _set(b, "Base Color", (*rgb, 1))
    _set(b, "Roughness", rough)
    _set(b, "Subsurface Weight", sss)
    _set(b, "Subsurface Radius", sss_radius)
    _set(b, "Subsurface Scale", 0.004)
    _set(b, "Sheen Weight", sheen)
    _set(b, "Specular IOR Level", 0.35)
    if vcol:
        _use_vcol(m, b)
    return m


def mat_leaf(name, rgb, rough=0.4, sss=0.15, coat=0.2, vcol=False):
    m, b = _bsdf(name)
    _set(b, "Base Color", (*rgb, 1))
    _set(b, "Roughness", rough)
    _set(b, "Subsurface Weight", sss)
    _set(b, "Subsurface Radius", (0.3, 0.8, 0.2))
    _set(b, "Subsurface Scale", 0.003)
    _set(b, "Coat Weight", coat)
    _set(b, "Coat Roughness", 0.25)
    if vcol:
        _use_vcol(m, b)
    return m


def mat_ice(name, rgb=(0.80, 0.92, 1.0), rough=0.06, trans=0.9, ior=1.31, emit=None, emit_strength=0.0):
    """氷・氷晶: 透過。glTFでは KHR_materials_transmission / ior として出る"""
    m, b = _bsdf(name)
    _set(b, "Base Color", (*rgb, 1))
    _set(b, "Roughness", rough)
    _set(b, "Transmission Weight", trans)
    _set(b, "IOR", ior)
    _set(b, "Specular IOR Level", 0.6)
    if emit:
        _set(b, "Emission Color", (*emit, 1))
        _set(b, "Emission Strength", emit_strength)
    return m


def mat_emissive(name, rgb, strength=3.0, base=None, rough=0.3):
    m, b = _bsdf(name)
    _set(b, "Base Color", (*(base or rgb), 1))
    _set(b, "Emission Color", (*rgb, 1))
    _set(b, "Emission Strength", strength)
    _set(b, "Roughness", rough)
    return m


def _use_vcol(m, b):
    nt = m.node_tree
    n = nt.nodes.new("ShaderNodeVertexColor")
    n.layer_name = "Col"
    nt.links.new(n.outputs["Color"], b.inputs["Base Color"])


def vcol_paint(obj, fn, layer="Col"):
    """fn(local_co: Vector, normal: Vector) -> (r,g,b) で頂点色を塗る（CORNER/BYTE）"""
    me = obj.data
    if layer not in me.color_attributes:
        me.color_attributes.new(layer, "BYTE_COLOR", "CORNER")
    attr = me.color_attributes[layer]
    for poly in me.polygons:
        for li in poly.loop_indices:
            v = me.vertices[me.loops[li].vertex_index]
            r, g, bb = fn(v.co, v.normal)
            attr.data[li].color = (r, g, bb, 1.0)


def assign(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    return obj


# ---------------------------------------------------------------------------
# メッシュ生成
# ---------------------------------------------------------------------------
def _obj_from_bm(bm, name):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def petal_surface(name, length, width, res_u=18, res_v=10,
                  width_fn=None, cup=0.25, curl=0.15, tip_droop=0.0,
                  twist=0.0, ruffle=0.0, ruffle_freq=5.0, thickness=0.0006,
                  base_width=0.12, pointed=0.0):
    """
    花弁・苞などの曲面。原点=付け根、+Y=先端方向、+Z=表側（内側）。
    width_fn(u)->0..1 で輪郭を指定（省略時は付け根細→中央最大→先端丸）。
    cup   : 横断面の椀の深さ（幅比）
    curl  : 長手方向の反り（+で表側へ巻く、-で外へ反る）
    tip_droop: 先端付近だけの垂れ
    pointed: 先端を尖らせる(0..1)
    """
    if width_fn is None:
        def width_fn(u):
            w = base_width + (1 - base_width) * math.sin(math.pi * min(1, u * 1.15) ** 0.85)
            if pointed > 0:
                w *= (1 - pointed * u ** 3)
            return max(0.0, w)
    bm = bmesh.new()
    uv_layer = bm.loops.layers.uv.new("UVMap")
    verts = []
    for i in range(res_u + 1):
        u = i / res_u
        row = []
        w = width_fn(u) * width * 0.5
        for j in range(res_v + 1):
            v = j / res_v * 2 - 1
            x = v * w
            y = u * length
            z = cup * (v * v) * w * 2
            z += curl * (u * u) * length
            z -= tip_droop * max(0.0, u - 0.6) ** 2 * length * 2.5
            z += ruffle * math.sin(v * math.pi * ruffle_freq * 0.5 + u * 7) * w * u
            if twist:
                a = twist * u
                x, z = x * math.cos(a) - z * math.sin(a), x * math.sin(a) + z * math.cos(a)
            row.append(bm.verts.new((x, y, z)))
        verts.append(row)
    for i in range(res_u):
        for j in range(res_v):
            f = bm.faces.new((verts[i][j], verts[i][j + 1], verts[i + 1][j + 1], verts[i + 1][j]))
            f.smooth = True
            for loop, (a, c) in zip(f.loops, ((i, j), (i, j + 1), (i + 1, j + 1), (i + 1, j))):
                loop[uv_layer].uv = (c / res_v, a / res_u)
    ob = _obj_from_bm(bm, name)
    if thickness > 0:
        mod = ob.modifiers.new("thick", "SOLIDIFY")
        mod.thickness = thickness
        mod.offset = 0
        apply_mods(ob)
    return ob


def tube_along(name, points, radius, sides=8, cap=True, radius_fn=None):
    """折れ線 points に沿った管（茎・花柄）。radius_fn(t)->倍率 で太さ変化"""
    pts = [Vector(p) for p in points]
    bm = bmesh.new()
    rings = []
    # 平行移動フレーム
    t0 = (pts[1] - pts[0]).normalized()
    ref = Vector((0, 0, 1)) if abs(t0.z) < 0.9 else Vector((1, 0, 0))
    n = t0.cross(ref).normalized()
    prev_t = t0
    for k, p in enumerate(pts):
        if k < len(pts) - 1:
            t = (pts[k + 1] - p).normalized()
        else:
            t = (p - pts[k - 1]).normalized()
        axis = prev_t.cross(t)
        if axis.length > 1e-6:
            ang = prev_t.angle(t)
            n = (Matrix.Rotation(ang, 3, axis.normalized()) @ n)
        prev_t = t
        b = t.cross(n).normalized()
        r = radius * (radius_fn(k / (len(pts) - 1)) if radius_fn else 1.0)
        ring = [bm.verts.new(p + (n * math.cos(a) + b * math.sin(a)) * r)
                for a in (2 * math.pi * s / sides for s in range(sides))]
        rings.append(ring)
    for k in range(len(rings) - 1):
        for s in range(sides):
            f = bm.faces.new((rings[k][s], rings[k][(s + 1) % sides], rings[k + 1][(s + 1) % sides], rings[k + 1][s]))
            f.smooth = True
    if cap:
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _obj_from_bm(bm, name)


def curve_points(p0, p1, p2, p3=None, n=16):
    """2次/3次ベジェの点列"""
    p0, p1, p2 = Vector(p0), Vector(p1), Vector(p2)
    out = []
    for i in range(n + 1):
        t = i / n
        if p3 is None:
            out.append((1 - t) ** 2 * p0 + 2 * (1 - t) * t * p1 + t * t * p2)
        else:
            q = Vector(p3)
            out.append((1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t * t * p2 + t ** 3 * q)
    return out


def strap_leaf(name, length, width, keel=0.35, bend=0.4, twist=0.3, res_u=20, tip=0.25, thickness=0.0008):
    """細長い葉（スノードロップ等）。原点=根元、+Y方向に伸び、bendで外側へしなる"""
    def wf(u):
        w = 0.75 + 0.25 * math.sin(math.pi * u)
        if u > 1 - tip:
            w *= max(0.0, (1 - u) / tip) ** 0.7
        return w
    ob = petal_surface(name, length, width, res_u=res_u, res_v=6, width_fn=wf,
                       cup=keel, curl=-bend, twist=twist, thickness=thickness)
    return ob


def spike(name, length, radius, sides=6, facet_jitter=0.0):
    """氷晶（両錐）。原点=根元、+Z方向"""
    bm = bmesh.new()
    base = bm.verts.new((0, 0, -length * 0.08))
    top = bm.verts.new((0, 0, length))
    ring = []
    for s in range(sides):
        a = 2 * math.pi * s / sides
        r = radius * (1 + random.uniform(-facet_jitter, facet_jitter))
        ring.append(bm.verts.new((math.cos(a) * r, math.sin(a) * r, length * 0.25)))
    for s in range(sides):
        bm.faces.new((ring[s], ring[(s + 1) % sides], top))
        bm.faces.new((ring[(s + 1) % sides], ring[s], base))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _obj_from_bm(bm, name)


def frost_scatter(target, count, size=0.002, mat=None, edge_bias=True, seed=1, name=None):
    """target の頂点上（縁寄り優先）に小さな氷晶を実メッシュで付ける。1つのオブジェクトにまとめて返す"""
    rnd = random.Random(seed)
    me = target.data
    mw = target.matrix_world
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.verts.ensure_lookup_table()
    cands = [v for v in bm.verts if (not edge_bias) or v.is_boundary or len(v.link_faces) < 4] or list(bm.verts)
    picks = [rnd.choice(cands) for _ in range(count)]
    out = bmesh.new()
    for v in picks:
        nrm = (mw.to_3x3() @ v.normal).normalized()
        if nrm.length < 0.5:
            nrm = Vector((0, 0, 1))
        jitter = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-1, 1))) * 0.6
        d = (nrm + jitter).normalized()
        L = size * rnd.uniform(0.6, 1.6)
        r = L * rnd.uniform(0.18, 0.3)
        p = mw @ v.co
        rot = d.to_track_quat("Z", "Y").to_matrix()
        top = out.verts.new(p + rot @ Vector((0, 0, L)))
        bot = out.verts.new(p + rot @ Vector((0, 0, -L * 0.15)))
        ring = [out.verts.new(p + rot @ Vector((math.cos(a) * r, math.sin(a) * r, L * 0.2)))
                for a in (2 * math.pi * s / 4 + rnd.random() for s in range(4))]
        for s in range(4):
            out.faces.new((ring[s], ring[(s + 1) % 4], top))
            out.faces.new((ring[(s + 1) % 4], ring[s], bot))
    bm.free()
    bmesh.ops.recalc_face_normals(out, faces=out.faces)
    ob = _obj_from_bm(out, name or f"{target.name}_frost")
    if mat:
        assign(ob, mat)
    return ob


def apply_mods(ob):
    bpy.context.view_layer.objects.active = ob
    for m in list(ob.modifiers):
        with bpy.context.temp_override(object=ob, active_object=ob):
            bpy.ops.object.modifier_apply(modifier=m.name)


def xform(ob, loc=(0, 0, 0), rot_deg=(0, 0, 0), scale=1.0, parent=None):
    ob.location = loc
    ob.rotation_euler = [math.radians(a) for a in rot_deg]
    ob.scale = (scale, scale, scale) if isinstance(scale, (int, float)) else scale
    if parent:
        ob.parent = parent
    return ob


def bake_transforms(objs=None):
    objs = objs or [o for o in bpy.context.scene.objects if o.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)


def join(objs, name):
    objs = [o for o in objs if o is not None]
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = name
    ob.data.name = name
    return ob


def set_origin_bottom(ob):
    """原点を底面中央へ（ゲーム配置用）"""
    pts = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
    cx = sum(p.x for p in pts) / 8
    cy = sum(p.y for p in pts) / 8
    mz = min(p.z for p in pts)
    cur = bpy.context.scene.cursor
    cur.location = (cx, cy, mz)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
    ob.location = (0, 0, 0)
    cur.location = (0, 0, 0)


# ---------------------------------------------------------------------------
# 撮影・書き出し
# ---------------------------------------------------------------------------
def _bounds():
    pts = []
    for o in bpy.context.scene.objects:
        if o.type == "MESH" and not o.name.startswith("_"):
            pts += [o.matrix_world @ Vector(c) for c in o.bound_box]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return mn, mx


def _stage(mn, mx, mood):
    s = bpy.context.scene
    size = max((mx - mn).length, 0.05)
    c = (mn + mx) / 2

    def sun(name, energy, rot, color):
        L = bpy.data.lights.new(name, "SUN")
        L.energy = energy
        L.color = color
        L.angle = math.radians(8)
        o = bpy.data.objects.new("_" + name, L)
        o.rotation_euler = [math.radians(a) for a in rot]
        s.collection.objects.link(o)

    def area(name, energy, loc, color, sz):
        L = bpy.data.lights.new(name, "AREA")
        L.energy = energy * size * size * 40
        L.color = color
        L.size = sz * size
        o = bpy.data.objects.new("_" + name, L)
        o.location = c + Vector(loc) * size
        s.collection.objects.link(o)
        t = o.constraints.new("TRACK_TO")
        tgt = bpy.data.objects.get("_target")
        t.target = tgt
        t.track_axis = "TRACK_NEGATIVE_Z"
        t.up_axis = "UP_Y"

    tgt = bpy.data.objects.new("_target", None)
    tgt.location = c
    s.collection.objects.link(tgt)

    world = bpy.data.worlds.new("World")
    s.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    if mood == "cave":
        bg.inputs["Color"].default_value = (0.010, 0.020, 0.035, 1)
        bg.inputs["Strength"].default_value = 1.0
        area("Key", 22, (-1.2, -1.6, 1.8), (0.85, 0.93, 1.0), 1.2)
        area("Rim", 30, (1.4, 1.6, 1.0), (0.45, 0.75, 1.0), 1.0)
        area("Fill", 5, (1.8, -1.2, 0.4), (0.70, 0.80, 1.0), 1.5)
    else:  # studio: 形状確認用のニュートラル
        bg.inputs["Color"].default_value = (0.18, 0.19, 0.2, 1)
        bg.inputs["Strength"].default_value = 1.0
        sun("Sun", 3.0, (55, 0, -40), (1, 0.98, 0.95))
        area("Fill", 8, (1.6, -1.0, 0.8), (1, 1, 1), 1.5)
    return c, size


def _camera(c, size, yaw, pitch, lens=85, zoom=1.0):
    s = bpy.context.scene
    cd = bpy.data.cameras.new("_cam")
    cd.lens = lens
    cd.clip_start = 0.001
    cam = bpy.data.objects.new("_cam", cd)
    s.collection.objects.link(cam)
    s.camera = cam
    fov = 2 * math.atan(36 / 2 / lens)
    dist = (size * 0.62 / zoom) / math.tan(fov / 2)
    y, p = math.radians(yaw), math.radians(pitch)
    cam.location = c + Vector((dist * math.cos(p) * math.sin(y), -dist * math.cos(p) * math.cos(y), dist * math.sin(p)))
    t = cam.constraints.new("TRACK_TO")
    t.target = bpy.data.objects["_target"]
    t.track_axis = "TRACK_NEGATIVE_Z"
    t.up_axis = "UP_Y"
    return cam


def _clear_stage():
    for o in list(bpy.context.scene.objects):
        if o.name.startswith("_"):
            bpy.data.objects.remove(o, do_unlink=True)


def render_views(name, out_dir, views=None, mood="cave", samples=None, res=None):
    s = bpy.context.scene
    s.render.engine = "CYCLES"
    s.cycles.device = "CPU"
    s.cycles.samples = samples or SAMPLES
    s.cycles.use_denoising = True
    s.cycles.max_bounces = 12
    s.cycles.transmission_bounces = 12
    s.cycles.transparent_max_bounces = 12
    s.render.resolution_x = res or RES
    s.render.resolution_y = res or RES
    s.render.film_transparent = False
    s.view_settings.view_transform = "AgX"
    try:
        s.view_settings.look = "AgX - Medium High Contrast"
    except Exception:
        pass
    s.render.image_settings.file_format = "PNG"
    views = views or [
        ("front", 0, 8, 1.0), ("side", 90, 8, 1.0), ("angle", 35, 28, 1.0), ("top", 0, 80, 1.0), ("close", 25, 20, 2.2)
    ]
    files = []
    for vname, yaw, pitch, zoom in views:
        _clear_stage()
        mn, mx = _bounds()
        c, size = _stage(mn, mx, mood)
        if vname == "close":
            c = Vector((c.x, c.y, mn.z + (mx.z - mn.z) * 0.72))
            bpy.data.objects["_target"].location = c
        _camera(c, size, yaw, pitch, zoom=zoom)
        path = os.path.join(out_dir, f"{name}_{mood}_{vname}.png")
        s.render.filepath = path
        log(f"render {os.path.basename(path)}")
        bpy.ops.render.render(write_still=True)
        files.append(path)
    _clear_stage()
    return files


def _sha(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        h.update(f.read())
    return h.hexdigest()


def finish(name, notes="", studio=True):
    """GLB書き出し → cave照明5枚 + studio照明2枚 → stats/manifest"""
    out_dir = os.path.join(OUT_ROOT, name)
    os.makedirs(out_dir, exist_ok=True)
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    tris = 0
    for o in meshes:
        dg = o.evaluated_get(bpy.context.evaluated_depsgraph_get())
        me = dg.to_mesh()
        me.calc_loop_triangles()
        tris += len(me.loop_triangles)
        dg.to_mesh_clear()
    mn, mx = _bounds()
    glb = os.path.join(out_dir, f"{name}.glb")
    bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", export_apply=True, export_yup=True)
    blend = os.path.join(out_dir, f"{name}.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend, compress=True)
    files = render_views(name, out_dir, mood="cave")
    if studio:
        files += render_views(name, out_dir, mood="studio",
                              views=[("front", 0, 8, 1.0), ("angle", 35, 28, 1.0)], samples=32)
    manifest = {
        "asset": name,
        "blender": bpy.app.version_string,
        "triangles": tris,
        "objects": [o.name for o in meshes],
        "materials": sorted({m.name for o in meshes for m in o.data.materials if m}),
        "bbox_m": [round(v, 4) for v in (mx - mn)],
        "origin": "bottom-center",
        "glb": os.path.basename(glb),
        "glb_bytes": os.path.getsize(glb),
        "sha256": {os.path.basename(p): _sha(p) for p in [glb] + files},
        "renders": [os.path.basename(p) for p in files],
        "samples": SAMPLES,
        "notes": notes,
        "approval": "NOT_APPROVED",
    }
    with open(os.path.join(out_dir, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    log(f"done {name}: tris={tris} bbox={manifest['bbox_m']} glb={manifest['glb_bytes']}B")
    return manifest
