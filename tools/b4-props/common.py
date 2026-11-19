"""
第4層「竜炎の迷宮」小物 共通ハーネス（Claudeチーム）

各 build_<id>.py から:
    import sys, os; sys.path.insert(0, os.path.dirname(__file__)); import common as C

前提: Blender 4.2 LTS（GitHub Actions / ヘッドレス / Cycles CPU）。
設計: docs/3d/B4_PROPS_DESIGN.md（配色・劣化ルール・品質ゲート）

流れ:
  1. 形状を作る（bmesh 等で実寸 m）
  2. 劣化つきの手続き材質を割り当てる（weathered_* / ember_* ）
  3. finish(id) が:  1オブジェクトに結合 → Smart UV → Cycles で
     BaseColor / Roughness / Metallic / Normal / Emission / AO をベイク →
     画像テクスチャ1枚ずつの Principled BSDF（1マテリアル）に差し替え →
     GLB書き出し → ベイク後の見た目を volcanic / studio 照明でレンダー → manifest
  ※ 手続きノードは glTF に出ないため、必ずベイク後のもので確認・出力する。
"""
import hashlib
import json
import math
import os
import random

import bmesh
import bpy
from mathutils import Matrix, Vector, noise

OUT_ROOT = os.path.abspath(os.environ.get("B4P_OUT", "render-output/b4-props"))
TEX_DIR = os.path.abspath(os.environ.get("B4P_TEX", "/tmp/b4p-cc0"))
SAMPLES = int(os.environ.get("B4P_SAMPLES", "96"))
RES = int(os.environ.get("B4P_RES", "1024"))


def log(msg):
    print(f"[b4-props] {msg}", flush=True)


# ---------------------------------------------------------------------------
# シーン
# ---------------------------------------------------------------------------
def reset(seed=7):
    random.seed(seed)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    s.unit_settings.system = "METRIC"
    s.render.engine = "CYCLES"
    s.cycles.device = "CPU"
    bpy.context.preferences.filepaths.save_version = 0
    return s


def link(ob):
    bpy.context.scene.collection.objects.link(ob)
    return ob


def obj_from_bm(bm, name, smooth=True):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    return link(ob)


def apply_mods(ob):
    bpy.context.view_layer.objects.active = ob
    for m in list(ob.modifiers):
        with bpy.context.temp_override(object=ob, active_object=ob):
            bpy.ops.object.modifier_apply(modifier=m.name)
    return ob


def bevel(ob, width=0.003, segments=2, angle=40):
    m = ob.modifiers.new("bevel", "BEVEL")
    m.width = width
    m.segments = segments
    m.limit_method = "ANGLE"
    m.angle_limit = math.radians(angle)
    m.harden_normals = False
    return apply_mods(ob)


def subdiv(ob, levels=1):
    m = ob.modifiers.new("sub", "SUBSURF")
    m.levels = levels
    m.render_levels = levels
    return apply_mods(ob)


def weighted_normals(ob):
    m = ob.modifiers.new("wn", "WEIGHTED_NORMAL")
    m.keep_sharp = True
    return apply_mods(ob)


def xform(ob, loc=(0, 0, 0), rot_deg=(0, 0, 0), scale=1.0):
    ob.location = loc
    ob.rotation_euler = [math.radians(a) for a in rot_deg]
    ob.scale = (scale, scale, scale) if isinstance(scale, (int, float)) else scale
    return ob


def apply_xform(ob):
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return ob


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


def assign(ob, mat):
    ob.data.materials.clear()
    ob.data.materials.append(mat)
    return ob


# ---------------------------------------------------------------------------
# 形状の部品
# ---------------------------------------------------------------------------
def _frames(pts, up_fn=None):
    """折れ線に沿った (pos, tangent, normal, binormal)。up_fn(i,p,t)->望む法線方向"""
    out = []
    n_prev = None
    for k, p in enumerate(pts):
        if k == 0:
            t = (pts[1] - p)
        elif k == len(pts) - 1:
            t = (p - pts[k - 1])
        else:
            t = (pts[k + 1] - pts[k - 1])
        t = t.normalized()
        if up_fn:
            u = Vector(up_fn(k, p, t))
            n = (u - t * u.dot(t))
            if n.length < 1e-6:
                n = n_prev or Vector((0, 0, 1))
            n = n.normalized()
        else:
            ref = n_prev or (Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0)))
            n = (ref - t * ref.dot(t))
            if n.length < 1e-6:
                n = Vector((1, 0, 0))
            n = n.normalized()
        b = t.cross(n).normalized()
        out.append((p, t, n, b))
        n_prev = n
    return out


def sweep(name, points, profile, up_fn=None, scale_fn=None, cap=True, closed=False, smooth=True):
    """points に沿って 2D 断面 profile [(x_n, y_b), ...]（法線n/従法線b方向）を掃引"""
    pts = [Vector(p) for p in points]
    fr = _frames(pts, up_fn)
    bm = bmesh.new()
    rings = []
    N = len(pts)
    for k, (p, t, n, b) in enumerate(fr):
        sc = scale_fn(k / max(1, N - 1)) if scale_fn else 1.0
        if isinstance(sc, (int, float)):
            sc = (sc, sc)
        rings.append([bm.verts.new(p + n * x * sc[0] + b * y * sc[1]) for x, y in profile])
    M = len(profile)
    segs = N if closed else N - 1
    for k in range(segs):
        r0, r1 = rings[k], rings[(k + 1) % N]
        for s in range(M):
            bm.faces.new((r0[s], r0[(s + 1) % M], r1[(s + 1) % M], r1[s]))
    if cap and not closed:
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj_from_bm(bm, name, smooth)


def rect_profile(w, t, chamfer=0.0):
    """幅w（n方向）×厚さt（b方向）の帯。chamferで角を落とす（8角形）"""
    hw, ht = w / 2, t / 2
    if chamfer <= 0:
        return [(-hw, -ht), (hw, -ht), (hw, ht), (-hw, ht)]
    c = min(chamfer, hw * 0.45, ht * 0.45)
    return [(-hw + c, -ht), (hw - c, -ht), (hw, -ht + c), (hw, ht - c),
            (hw - c, ht), (-hw + c, ht), (-hw, ht - c), (-hw, -ht + c)]


def circle_profile(r, sides=8, jitter=0.0, seed=0):
    rnd = random.Random(seed)
    return [((r * (1 + rnd.uniform(-jitter, jitter))) * math.cos(2 * math.pi * i / sides),
             (r * (1 + rnd.uniform(-jitter, jitter))) * math.sin(2 * math.pi * i / sides)) for i in range(sides)]


def bezier(p0, p1, p2, p3=None, n=16):
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


def rock(name, radius, detail=3, rough=0.35, squash=(1, 1, 1), seed=0, facet=0.0):
    """不規則な塊（石炭・岩片・燠）。facet>0 で平面的な割れ面を作る"""
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=detail, radius=radius)
    off = Vector((seed * 13.1, seed * 7.7, seed * 3.3))
    planes = []
    rnd = random.Random(seed)
    for _ in range(int(facet)):
        d = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-1, 1))).normalized()
        planes.append((d, radius * rnd.uniform(0.55, 0.85)))
    for v in bm.verts:
        p = v.co.copy()
        n = noise.fractal(p * (2.2 / radius) + off, 0.6, 2.0, 4)
        p *= 1 + rough * n
        for d, dist in planes:  # 割れ面でクリップ
            h = p.dot(d)
            if h > dist:
                p -= d * (h - dist)
        v.co = Vector((p.x * squash[0], p.y * squash[1], p.z * squash[2]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj_from_bm(bm, name, smooth=facet == 0)


def dome(name, r, h=None, sides=8):
    """リベット頭（半球）。原点=底、+Z"""
    h = h or r * 0.6
    bm = bmesh.new()
    rings = []
    for j in range(4):
        a = (math.pi / 2) * j / 4
        rr, zz = r * math.cos(a), h * math.sin(a)
        rings.append([bm.verts.new((rr * math.cos(2 * math.pi * i / sides), rr * math.sin(2 * math.pi * i / sides), zz)) for i in range(sides)])
    top = bm.verts.new((0, 0, h))
    for j in range(3):
        for i in range(sides):
            bm.faces.new((rings[j][i], rings[j][(i + 1) % sides], rings[j + 1][(i + 1) % sides], rings[j + 1][i]))
    for i in range(sides):
        bm.faces.new((rings[3][i], rings[3][(i + 1) % sides], top))
    bm.faces.new(list(reversed(rings[0])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj_from_bm(bm, name)


def place_on(ob, pos, normal, spin=0.0):
    """+Z を normal に向けて pos に置く"""
    q = Vector(normal).normalized().to_track_quat("Z", "Y")
    ob.matrix_world = Matrix.Translation(Vector(pos)) @ q.to_matrix().to_4x4() @ Matrix.Rotation(spin, 4, "Z")
    return ob


def displace_noise(ob, amount, scale, seed=0, axis_mask=(1, 1, 1)):
    """頂点を低周波ノイズで歪める（曲がり・凹み）"""
    off = Vector((seed * 5.3, seed * 2.1, seed * 9.7))
    for v in ob.data.vertices:
        p = v.co
        d = Vector((noise.noise(p * scale + off), noise.noise(p * scale + off + Vector((31, 0, 0))),
                    noise.noise(p * scale + off + Vector((0, 47, 0)))))
        v.co = p + Vector((d.x * axis_mask[0], d.y * axis_mask[1], d.z * axis_mask[2])) * amount
    return ob


# ---------------------------------------------------------------------------
# CC0 テクスチャ（Actions で Poly Haven から取得済みのものを読む）
# ---------------------------------------------------------------------------
_TEX_USED = {}


def cc0(asset, kind):
    """kind: diff / rough / nor_gl。無ければ None（手続きにフォールバック）"""
    path = os.path.join(TEX_DIR, f"{asset}_{kind}_1k.jpg")
    if not os.path.exists(path):
        log(f"WARN cc0 missing {path}")
        return None
    img = bpy.data.images.get(os.path.basename(path)) or bpy.data.images.load(path)
    if kind != "diff":
        img.colorspace_settings.name = "Non-Color"
    _TEX_USED[os.path.basename(path)] = {
        "source": f"https://polyhaven.com/a/{asset}", "license": "CC0 (https://polyhaven.com/license)",
        "sha256": _sha(path)}
    return img


# ---------------------------------------------------------------------------
# 手続き材質（劣化つき）。ノードを組み立てる小さなDSL
# ---------------------------------------------------------------------------
class NB:
    def __init__(self, name):
        self.m = bpy.data.materials.new(name)
        self.m.use_nodes = True
        self.nt = self.m.node_tree
        self.bsdf = self.nt.nodes["Principled BSDF"]
        self.x = -1400

    def n(self, kind, **props):
        node = self.nt.nodes.new(kind)
        node.location = (self.x, random.randint(-600, 600))
        self.x += 40
        for k, v in props.items():
            setattr(node, k, v)
        return node

    def link(self, a, b):
        self.nt.links.new(a, b)

    def val(self, v):
        nd = self.n("ShaderNodeValue")
        nd.outputs[0].default_value = v
        return nd.outputs[0]

    def rgb(self, c):
        nd = self.n("ShaderNodeRGB")
        nd.outputs[0].default_value = (*c, 1)
        return nd.outputs[0]

    def math(self, op, a, b=None, clamp=False):
        nd = self.n("ShaderNodeMath", operation=op, use_clamp=clamp)
        self._in(nd.inputs[0], a)
        if b is not None:
            self._in(nd.inputs[1], b)
        return nd.outputs[0]

    def _in(self, sock, v):
        if isinstance(v, (int, float)):
            sock.default_value = v
        elif isinstance(v, tuple):
            sock.default_value = (*v, 1) if len(v) == 3 else v
        else:
            self.link(v, sock)

    def mix(self, fac, a, b, blend="MIX"):
        nd = self.n("ShaderNodeMix", data_type="RGBA", blend_type=blend, clamp_result=True)
        self._in(nd.inputs[0], fac)
        self._in(nd.inputs[6], a)
        self._in(nd.inputs[7], b)
        return nd.outputs[2]

    def mixf(self, fac, a, b):
        nd = self.n("ShaderNodeMix", data_type="FLOAT", clamp_result=True)
        self._in(nd.inputs[0], fac)
        self._in(nd.inputs[2], a)
        self._in(nd.inputs[3], b)
        return nd.outputs[0]

    def ramp(self, fac, stops):
        """stops: [(pos, (r,g,b) or float)]。float は灰色"""
        nd = self.n("ShaderNodeValToRGB")
        self._in(nd.inputs[0], fac)
        cr = nd.color_ramp
        while len(cr.elements) > 1:
            cr.elements.remove(cr.elements[-1])
        for i, (p, c) in enumerate(stops):
            e = cr.elements[0] if i == 0 else cr.elements.new(p)
            e.position = p
            c = (c, c, c) if isinstance(c, (int, float)) else c
            e.color = (*c, 1)
        return nd.outputs[0]

    def coord(self, kind="Object"):
        if not hasattr(self, "_tc"):
            self._tc = self.n("ShaderNodeTexCoord")
        return self._tc.outputs[kind]

    def geo(self, out):
        if not hasattr(self, "_geo"):
            self._geo = self.n("ShaderNodeNewGeometry")
        return self._geo.outputs[out]

    def noise(self, scale, detail=6, rough=0.55, vec=None, dim="3D", out="Fac"):
        nd = self.n("ShaderNodeTexNoise", noise_dimensions=dim)
        nd.inputs["Scale"].default_value = scale
        nd.inputs["Detail"].default_value = detail
        nd.inputs["Roughness"].default_value = rough
        self.link(vec or self.coord(), nd.inputs["Vector"])
        return nd.outputs[out]

    def voronoi(self, scale, feature="F1", out="Distance", vec=None, rand=1.0):
        nd = self.n("ShaderNodeTexVoronoi", feature=feature)
        nd.inputs["Scale"].default_value = scale
        nd.inputs["Randomness"].default_value = rand
        self.link(vec or self.coord(), nd.inputs["Vector"])
        return nd.outputs[out]

    def image(self, img, scale=1.0, box=True):
        """オブジェクト座標の箱投影（UVに依存しない＝ベイクで綺麗に転写できる）"""
        if img is None:
            return None
        mp = self.n("ShaderNodeMapping")
        mp.inputs["Scale"].default_value = (scale, scale, scale)
        self.link(self.coord(), mp.inputs["Vector"])
        nd = self.n("ShaderNodeTexImage", projection="BOX" if box else "FLAT", projection_blend=0.25)
        nd.image = img
        self.link(mp.outputs[0], nd.inputs["Vector"])
        return nd.outputs["Color"]

    def edge_mask(self, radius=0.004, lo=0.02, hi=0.22):
        """角の摩耗マスク: Bevelノードの法線と面法線のずれ（Cycles専用→ベイクで固定）"""
        bv = self.n("ShaderNodeBevel", samples=8)
        bv.inputs["Radius"].default_value = radius
        dot = self.n("ShaderNodeVectorMath", operation="DOT_PRODUCT")
        self.link(bv.outputs[0], dot.inputs[0])
        self.link(self.geo("Normal"), dot.inputs[1])
        inv = self.math("SUBTRACT", 1.0, dot.outputs["Value"])
        return self._map(inv, lo, hi)

    def _map(self, v, lo, hi, tlo=0.0, thi=1.0):
        nd = self.n("ShaderNodeMapRange", clamp=True)
        self._in(nd.inputs[0], v)
        nd.inputs[1].default_value = lo
        nd.inputs[2].default_value = hi
        nd.inputs[3].default_value = tlo
        nd.inputs[4].default_value = thi
        return nd.outputs[0]

    def cavity(self, dist=0.03):
        """凹み（AO）: 0=奥まり 1=開けた面"""
        ao = self.n("ShaderNodeAmbientOcclusion", samples=12, only_local=True)
        ao.inputs["Distance"].default_value = dist
        return ao.outputs["AO"]

    def up_mask(self, lo=0.55, hi=0.9):
        sep = self.n("ShaderNodeSeparateXYZ")
        self.link(self.geo("Normal"), sep.inputs[0])
        return self._map(sep.outputs["Z"], lo, hi)

    def height_mask(self, z0, z1):
        """オブジェクト座標Zで z0→0, z1→1"""
        sep = self.n("ShaderNodeSeparateXYZ")
        self.link(self.coord("Object"), sep.inputs[0])
        return self._map(sep.outputs["Z"], z0, z1)

    def dist_mask(self, center, r0, r1):
        """center からの距離で r0→1, r1→0（熱源の近さ）"""
        vm = self.n("ShaderNodeVectorMath", operation="DISTANCE")
        self.link(self.coord("Object"), vm.inputs[0])
        vm.inputs[1].default_value = center
        return self._map(vm.outputs["Value"], r0, r1, 1.0, 0.0)

    def normal_from(self, img_color, strength=1.0, bump_height=None, bump_strength=0.0, bump_dist=0.002):
        nrm = None
        if img_color is not None:
            nm = self.n("ShaderNodeNormalMap", space="TANGENT")  # 箱投影なのでタンジェントは近似→弱く使う
            nm.inputs["Strength"].default_value = strength
            self.link(img_color, nm.inputs["Color"])
            nrm = nm.outputs[0]
        if bump_height is not None and bump_strength > 0:
            bp = self.n("ShaderNodeBump")
            bp.inputs["Strength"].default_value = bump_strength
            bp.inputs["Distance"].default_value = bump_dist
            self.link(bump_height, bp.inputs["Height"])
            if nrm is not None:
                self.link(nrm, bp.inputs["Normal"])
            nrm = bp.outputs[0]
        if nrm is not None:
            self.link(nrm, self.bsdf.inputs["Normal"])

    def out(self, base, rough, metal=0.0, emit=None, emit_strength=0.0):
        self._in(self.bsdf.inputs["Base Color"], base)
        self._in(self.bsdf.inputs["Roughness"], rough)
        self._in(self.bsdf.inputs["Metallic"], metal)
        if emit is not None:
            self._in(self.bsdf.inputs["Emission Color"], emit)
            self.bsdf.inputs["Emission Strength"].default_value = emit_strength
        return self.m


def weathered_iron(name, heat_center=None, heat_r=(0.05, 0.5), soot_z=None, rust=0.55, scale=1.0, wear=1.0):
    """鍛鉄: 黒い地金＋赤錆の島＋角の摩耗（地金が光る）＋煤＋熱変色＋凹みの灰"""
    b = NB(name)
    diff = b.image(cc0("rusty_metal_03", "diff"), scale * 1.6)
    rgh = b.image(cc0("rusty_metal_03", "rough"), scale * 1.6)
    nrm = b.image(cc0("rusty_metal_03", "nor_gl"), scale * 1.6)
    coarse = b.image(cc0("rust_coarse_01", "diff"), scale * 1.1)
    n_big = b.noise(3.0 / scale, 8, 0.6)
    n_fine = b.noise(40.0 / scale, 4, 0.5)
    # 錆の島マスク
    n_mid = b.noise(11.0 / scale, 6, 0.6)
    rust_m = b.ramp(b.math("ADD", b.math("MULTIPLY", n_big, 0.7), b.math("MULTIPLY", n_mid, 0.45)),
                    [(0.0, 0.0), (max(0.05, 0.66 - rust * 0.3), 0.0), (min(0.97, 0.72 - rust * 0.22), 1.0), (1.0, 1.0)])
    iron = b.mix(n_fine, (0.016, 0.015, 0.014), (0.034, 0.031, 0.028))
    rust_col = b.mix(n_big, (0.075, 0.030, 0.013), (0.15, 0.058, 0.024))
    if diff is not None:  # 実写錆を暗く・彩度を抑えて重ねる
        hs = b.n("ShaderNodeHueSaturation")
        hs.inputs["Saturation"].default_value = 0.75
        hs.inputs["Value"].default_value = 0.55
        b.link(diff, hs.inputs["Color"])
        rust_col = b.mix(0.6, rust_col, hs.outputs[0], "MULTIPLY")
        rust_col = b.mix(0.35, rust_col, hs.outputs[0])
    if coarse is not None:
        rust_col = b.mix(b.math("MULTIPLY", n_fine, 0.6), rust_col, coarse, "MULTIPLY")
    col = b.mix(rust_m, iron, rust_col)
    # 角の摩耗（地金）
    edge = b.math("MULTIPLY", b.edge_mask(0.004, 0.03, 0.2), wear)
    edge = b.math("MULTIPLY", edge, b.ramp(n_fine, [(0.0, 0.3), (0.6, 1.0)]), clamp=True)
    col = b.mix(edge, col, (0.10, 0.095, 0.09))
    # 熱変色（青黒〜紫茶）と煤
    heat = None
    if heat_center is not None:
        heat = b.dist_mask(heat_center, heat_r[0], heat_r[1])
        tint = b.mix(n_big, (0.030, 0.026, 0.040), (0.070, 0.032, 0.020))
        col = b.mix(b.math("MULTIPLY", heat, 0.8), col, tint)
    if soot_z is not None:
        soot = b.math("MULTIPLY", b.height_mask(*soot_z), b.ramp(n_big, [(0.2, 0.5), (0.8, 1.0)]))
        col = b.mix(b.math("MULTIPLY", soot, 0.75), col, (0.012, 0.011, 0.010))
    # 凹みと上向き面の灰
    cav = b.math("SUBTRACT", 1.0, b.cavity(0.025))
    ash = b.math("MAXIMUM", b.math("MULTIPLY", cav, 0.7), b.math("MULTIPLY", b.up_mask(0.6, 0.95), 0.35))
    ash = b.math("MULTIPLY", ash, b.ramp(n_big, [(0.25, 0.0), (0.75, 1.0)]))
    col = b.mix(b.math("MULTIPLY", ash, 0.8), col, (0.075, 0.07, 0.066))
    # 粗さ・金属度
    r = b.mixf(rust_m, 0.42, 0.88)
    if rgh is not None:
        r = b.mixf(0.35, r, b.math("ADD", rgh, 0.1))
    r = b.mixf(edge, r, 0.32)
    r = b.mixf(ash, r, 0.95)
    metal = b.mixf(rust_m, 0.85, 0.08)
    metal = b.mixf(edge, metal, 1.0)
    metal = b.mixf(ash, metal, 0.0)
    b.normal_from(nrm, 0.6, bump_height=b.math("ADD", n_fine, rust_m), bump_strength=0.35)
    return b.out(col, r, metal)


def weathered_wood(name, char=0.3, soot_z=None, heat_center=None, heat_r=(0.1, 0.6), grain_axis="Z", scale=1.0):
    """煤けた古材: 木目＋乾燥割れ＋角の摩耗（明るく）＋炭化（亀甲割れ・黒）＋灰"""
    b = NB(name)
    diff = b.image(cc0("wood_planks", "diff"), scale * 1.2)
    nrm = b.image(cc0("wood_planks", "nor_gl"), scale * 1.2)
    # 木目：軸方向に伸ばしたノイズ
    mp = b.n("ShaderNodeMapping")
    sc = {"X": (0.15, 4, 4), "Y": (4, 0.15, 4), "Z": (4, 4, 0.15)}[grain_axis]
    mp.inputs["Scale"].default_value = sc
    b.link(b.coord(), mp.inputs["Vector"])
    grain = b.noise(9.0 / scale, 10, 0.65, vec=mp.outputs[0])
    n_big = b.noise(2.5 / scale, 6, 0.55)
    base = b.ramp(grain, [(0.3, (0.050, 0.032, 0.020)), (0.55, (0.085, 0.058, 0.036)), (0.8, (0.060, 0.040, 0.026))])
    if diff is not None:
        hs = b.n("ShaderNodeHueSaturation")
        hs.inputs["Saturation"].default_value = 0.6
        hs.inputs["Value"].default_value = 0.5
        b.link(diff, hs.inputs["Color"])
        base = b.mix(0.45, base, hs.outputs[0], "MULTIPLY")
    # 乾燥割れ（木目方向に細い暗線）
    crack = b.ramp(b.voronoi(14.0 / scale, "DISTANCE_TO_EDGE", vec=mp.outputs[0]), [(0.0, 1.0), (0.04, 0.0)])
    base = b.mix(b.math("MULTIPLY", crack, 0.8), base, (0.012, 0.008, 0.006))
    # 角の摩耗
    edge = b.edge_mask(0.006, 0.03, 0.25)
    base = b.mix(b.math("MULTIPLY", edge, 0.55), base, (0.13, 0.095, 0.065))
    # 炭化：亀甲割れ（ボロノイの縁）＋黒
    charm = b.ramp(n_big, [(max(0.0, 0.62 - char * 0.5), 0.0), (min(1.0, 0.70 - char * 0.3), 1.0)])
    if soot_z is not None:
        charm = b.math("MAXIMUM", charm, b.math("MULTIPLY", b.height_mask(*soot_z), char))
    if heat_center is not None:
        charm = b.math("MAXIMUM", charm, b.math("MULTIPLY", b.dist_mask(heat_center, *heat_r), 1.0))
    alli = b.ramp(b.voronoi(26.0 / scale, "DISTANCE_TO_EDGE"), [(0.0, 1.0), (0.06, 0.0)])
    charcol = b.mix(alli, (0.020, 0.016, 0.014), (0.004, 0.003, 0.003))
    col = b.mix(charm, base, charcol)
    cav = b.math("SUBTRACT", 1.0, b.cavity(0.03))
    ash = b.math("MAXIMUM", b.math("MULTIPLY", cav, 0.6), b.math("MULTIPLY", b.up_mask(0.65, 0.95), 0.4))
    ash = b.math("MULTIPLY", ash, b.ramp(n_big, [(0.3, 0.0), (0.7, 1.0)]))
    col = b.mix(b.math("MULTIPLY", ash, 0.85), col, (0.07, 0.066, 0.062))
    r = b.mixf(charm, 0.82, 0.68)
    r = b.mixf(ash, r, 0.96)
    b.normal_from(nrm, 0.5, bump_height=b.math("ADD", b.math("MULTIPLY", grain, 0.6), b.math("MULTIPLY", alli, b.math("MULTIPLY", charm, -1.5))), bump_strength=0.5)
    return b.out(col, r, 0.0)


def ember_coal(name, glow=1.0, scale=1.0, hot=(1.0, 0.22, 0.03)):
    """燠火・炭: 黒い炭の表面＋割れ目の中だけ発光（BotW の溶岩岩と同じ考え方）"""
    b = NB(name)
    n_big = b.noise(6.0 / scale, 6, 0.6)
    cracks = b.voronoi(18.0 / scale, "DISTANCE_TO_EDGE")
    crack_m = b.ramp(b.math("ADD", cracks, b.math("MULTIPLY", n_big, 0.05)), [(0.0, 1.0), (0.05, 0.0)])
    cav = b.math("SUBTRACT", 1.0, b.cavity(0.02))
    glow_m = b.math("MAXIMUM", crack_m, b.math("MULTIPLY", cav, 0.6))
    glow_m = b.math("MULTIPLY", glow_m, b.ramp(n_big, [(0.25, 0.15), (0.65, 1.0)]))
    col = b.mix(n_big, (0.010, 0.009, 0.008), (0.035, 0.030, 0.027))
    ashm = b.math("MULTIPLY", b.up_mask(0.5, 0.9), b.ramp(n_big, [(0.55, 0.0), (0.8, 1.0)]))
    col = b.mix(ashm, col, (0.07, 0.065, 0.06))
    emit = b.ramp(glow_m, [(0.0, (0, 0, 0)), (0.35, (hot[0] * 0.5, hot[1] * 0.3, hot[2] * 0.2)), (1.0, hot)])
    r = b.mixf(ashm, 0.75, 0.95)
    b.normal_from(None, bump_height=b.math("SUBTRACT", 1.0, crack_m), bump_strength=0.6, bump_dist=0.004)
    return b.out(col, r, 0.0, emit=emit, emit_strength=6.0 * glow)


def ash_bed(name, scale=1.0):
    b = NB(name)
    n1 = b.noise(14.0 / scale, 6, 0.6)
    n2 = b.noise(3.0 / scale, 4, 0.5)
    col = b.ramp(b.math("ADD", n1, b.math("MULTIPLY", n2, 0.4)), [(0.25, (0.022, 0.020, 0.019)), (0.55, (0.055, 0.051, 0.048)), (0.85, (0.10, 0.095, 0.09))])
    b.normal_from(None, bump_height=n1, bump_strength=0.4)
    return b.out(col, 0.97, 0.0)


# ---------------------------------------------------------------------------
# ベイク → 1マテリアル
# ---------------------------------------------------------------------------
def _new_img(name, res, non_color, float_buf=False):
    img = bpy.data.images.new(name, res, res, alpha=False, float_buffer=float_buf)
    img.colorspace_settings.name = "Non-Color" if non_color else "sRGB"
    return img


def _set_active_image(mats, img):
    for m in mats:
        nt = m.node_tree
        nd = nt.nodes.get("_bake_target") or nt.nodes.new("ShaderNodeTexImage")
        nd.name = "_bake_target"
        nd.image = img
        nd.select = True
        nt.nodes.active = nd


def _emit_rewire(mats, socket_name):
    """各マテリアルの Principled の socket_name の値を Emission として出す（EMITベイクで取り出す）"""
    saved = []
    for m in mats:
        nt = m.node_tree
        bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
        outn = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL")
        em = nt.nodes.new("ShaderNodeEmission")
        em.name = "_bake_emit"
        em.inputs["Strength"].default_value = 1.0
        src = bsdf.inputs[socket_name]
        if src.is_linked:
            nt.links.new(src.links[0].from_socket, em.inputs["Color"])
        else:
            dv = src.default_value
            em.inputs["Color"].default_value = (dv, dv, dv, 1) if isinstance(dv, float) else tuple(dv)
        old = outn.inputs["Surface"].links[0].from_socket
        nt.links.new(em.outputs[0], outn.inputs["Surface"])
        saved.append((m, old, em, outn))
    return saved


def _emit_restore(saved):
    for m, old, em, outn in saved:
        nt = m.node_tree
        nt.links.new(old, outn.inputs["Surface"])
        nt.nodes.remove(em)


def _emission_rewire(mats):
    """本物の発光（色×強さ）を EMIT で取り出す（強さは EMIT_SCALE で割って 0..1 に収める）"""
    saved = []
    for m in mats:
        nt = m.node_tree
        bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
        outn = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL")
        em = nt.nodes.new("ShaderNodeEmission")
        em.name = "_bake_emit"
        strength = bsdf.inputs["Emission Strength"].default_value
        em.inputs["Strength"].default_value = strength / EMIT_SCALE
        src = bsdf.inputs["Emission Color"]
        if src.is_linked and strength > 0:
            nt.links.new(src.links[0].from_socket, em.inputs["Color"])
        else:
            em.inputs["Color"].default_value = (0, 0, 0, 1)
        old = outn.inputs["Surface"].links[0].from_socket
        nt.links.new(em.outputs[0], outn.inputs["Surface"])
        saved.append((m, old, em, outn))
    return saved


EMIT_SCALE = 8.0


def bake_to_single_material(ob, name, res=1024, margin=8, ao_strength=0.55):
    """ob（結合済み・複数マテリアル）を1枚アトラスへベイクして1マテリアルに置き換える"""
    s = bpy.context.scene
    s.render.engine = "CYCLES"
    s.cycles.device = "CPU"
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    # UV
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.006, area_weight=0.0, scale_to_bounds=False)
    try:
        bpy.ops.uv.pack_islands(margin=0.006, rotate=True)
    except Exception as e:  # noqa
        log(f"pack_islands skipped: {e}")
    bpy.ops.object.mode_set(mode="OBJECT")
    mats = [m for m in ob.data.materials if m]
    bk = s.render.bake
    bk.margin = margin
    bk.use_selected_to_active = False
    bk.use_clear = True
    imgs = {}

    def emit_bake(key, sock, non_color, samples=8):
        img = _new_img(f"{name}_{key}", res, non_color)
        _set_active_image(mats, img)
        saved = _emit_rewire(mats, sock)
        s.cycles.samples = samples
        bpy.ops.object.bake(type="EMIT")
        _emit_restore(saved)
        imgs[key] = img

    emit_bake("basecolor", "Base Color", False, 16)
    emit_bake("roughness", "Roughness", True)
    emit_bake("metallic", "Metallic", True)
    # 発光
    img = _new_img(f"{name}_emissive", res, False)
    _set_active_image(mats, img)
    saved = _emission_rewire(mats)
    s.cycles.samples = 16
    bpy.ops.object.bake(type="EMIT")
    _emit_restore(saved)
    imgs["emissive"] = img
    has_emit = any(v > 0.004 for v in list(img.pixels)[0::97])
    # 法線（タンジェント）
    img = _new_img(f"{name}_normal", res, True)
    _set_active_image(mats, img)
    s.cycles.samples = 4
    bpy.ops.object.bake(type="NORMAL", normal_space="TANGENT")
    imgs["normal"] = img
    # AO → ベースカラーへ乗算
    img = _new_img(f"{name}_ao", res, True)
    _set_active_image(mats, img)
    s.cycles.samples = 48
    bpy.ops.object.bake(type="AO")
    imgs["ao"] = img
    bc = imgs["basecolor"]
    px = list(bc.pixels)
    ao = list(img.pixels)
    for i in range(0, len(px), 4):
        a = 1.0 - ao_strength * (1.0 - ao[i])
        px[i] *= a
        px[i + 1] *= a
        px[i + 2] *= a
    bc.pixels = px
    # ORM（glTF: R=AO G=Rough B=Metal）
    orm = _new_img(f"{name}_orm", res, True)
    rp = list(imgs["roughness"].pixels)
    mp = list(imgs["metallic"].pixels)
    op = [0.0] * len(rp)
    for i in range(0, len(rp), 4):
        op[i] = 1.0
        op[i + 1] = rp[i]
        op[i + 2] = mp[i]
        op[i + 3] = 1.0
    orm.pixels = op
    imgs["orm"] = orm
    # 保存
    out_dir = os.path.join(OUT_ROOT, name, "textures")
    os.makedirs(out_dir, exist_ok=True)
    for key in ("basecolor", "orm", "normal") + (("emissive",) if has_emit else ()):
        im = imgs[key]
        im.filepath_raw = os.path.join(out_dir, f"{name}_{key}.png")
        im.file_format = "PNG"
        im.save()
    # 1マテリアルに差し替え
    fm = bpy.data.materials.new(f"{name}_mat")
    fm.use_nodes = True
    nt = fm.node_tree
    bsdf = nt.nodes["Principled BSDF"]

    def tex(img, non_color):
        nd = nt.nodes.new("ShaderNodeTexImage")
        nd.image = img
        if non_color:
            img.colorspace_settings.name = "Non-Color"
        return nd

    t_bc = tex(imgs["basecolor"], False)
    nt.links.new(t_bc.outputs["Color"], bsdf.inputs["Base Color"])
    t_orm = tex(imgs["orm"], True)
    sep = nt.nodes.new("ShaderNodeSeparateColor")
    nt.links.new(t_orm.outputs["Color"], sep.inputs["Color"])
    nt.links.new(sep.outputs["Green"], bsdf.inputs["Roughness"])
    nt.links.new(sep.outputs["Blue"], bsdf.inputs["Metallic"])
    t_n = tex(imgs["normal"], True)
    nm = nt.nodes.new("ShaderNodeNormalMap")
    nt.links.new(t_n.outputs["Color"], nm.inputs["Color"])
    nt.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
    if has_emit:
        t_e = tex(imgs["emissive"], False)
        nt.links.new(t_e.outputs["Color"], bsdf.inputs["Emission Color"])
        bsdf.inputs["Emission Strength"].default_value = EMIT_SCALE
    ob.data.materials.clear()
    ob.data.materials.append(fm)
    for m in mats:
        bpy.data.materials.remove(m)
    return {"res": res, "emissive": has_emit, "maps": ["basecolor", "orm", "normal"] + (["emissive"] if has_emit else [])}


# ---------------------------------------------------------------------------
# 撮影
# ---------------------------------------------------------------------------
def _bounds(include_helpers=False):
    pts = []
    for o in bpy.context.scene.objects:
        if o.type == "MESH" and (include_helpers or not o.name.startswith("_")):
            pts += [o.matrix_world @ Vector(c) for c in o.bound_box]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return mn, mx


def _clear_stage():
    for o in list(bpy.context.scene.objects):
        if o.name.startswith("_"):
            bpy.data.objects.remove(o, do_unlink=True)


def _light(kind, name, energy, color, loc=None, rot=None, size=1.0, target=None):
    L = bpy.data.lights.new(name, kind)
    L.energy = energy
    L.color = color
    if kind == "AREA":
        L.size = size
    if kind == "POINT":
        L.shadow_soft_size = size
    if kind == "SUN":
        L.angle = math.radians(size)
    o = bpy.data.objects.new("_" + name, L)
    link(o)
    if loc is not None:
        o.location = loc
    if rot is not None:
        o.rotation_euler = [math.radians(a) for a in rot]
    if target is not None:
        t = o.constraints.new("TRACK_TO")
        t.target = target
        t.track_axis = "TRACK_NEGATIVE_Z"
        t.up_axis = "UP_Y"
    return o


def _ground(mn, mx, mood):
    size = max(mx.x - mn.x, mx.y - mn.y) * 6 + 2
    bpy.ops.mesh.primitive_plane_add(size=size, location=((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z - 0.0005))
    g = bpy.context.active_object
    g.name = "_ground"
    m = bpy.data.materials.new("_ground_mat")
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    if mood == "volcanic":
        nt = m.node_tree
        nz = nt.nodes.new("ShaderNodeTexNoise")
        nz.inputs["Scale"].default_value = 3.0
        cr = nt.nodes.new("ShaderNodeValToRGB")
        cr.color_ramp.elements[0].color = (0.012, 0.011, 0.010, 1)
        cr.color_ramp.elements[1].color = (0.040, 0.036, 0.033, 1)
        nt.links.new(nz.outputs["Fac"], cr.inputs[0])
        nt.links.new(cr.outputs[0], b.inputs["Base Color"])
        b.inputs["Roughness"].default_value = 0.9
    else:
        b.inputs["Base Color"].default_value = (0.16, 0.16, 0.16, 1)
        b.inputs["Roughness"].default_value = 0.8
    g.data.materials.append(m)
    return g


def _stage(mn, mx, mood):
    s = bpy.context.scene
    size = max((mx - mn).length, 0.1)
    c = (mn + mx) / 2
    tgt = bpy.data.objects.new("_target", None)
    tgt.location = c
    link(tgt)
    world = bpy.data.worlds.new("World")
    s.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    _ground(mn, mx, mood)
    if mood == "volcanic":
        # 暗い洞窟：溶岩の赤い照り返し（下・横から）＋弱い冷たい環境光＋上からの鈍い光
        bg.inputs["Color"].default_value = (0.006, 0.004, 0.004, 1)
        bg.inputs["Strength"].default_value = 1.0
        _light("AREA", "LavaBounce", 70 * size * size, (1.0, 0.36, 0.10), loc=c + Vector((1.4, -1.0, -0.1)) * size + Vector((0, 0, size * 0.15)), size=size * 1.6, target=tgt)
        _light("AREA", "Key", 28 * size * size, (1.0, 0.72, 0.48), loc=c + Vector((-1.2, -1.5, 1.6)) * size, size=size * 0.9, target=tgt)
        _light("AREA", "CoolFill", 7 * size * size, (0.55, 0.62, 0.8), loc=c + Vector((-1.6, 1.4, 0.8)) * size, size=size * 2.0, target=tgt)
    else:
        bg.inputs["Color"].default_value = (0.20, 0.205, 0.21, 1)
        bg.inputs["Strength"].default_value = 1.0
        _light("SUN", "Sun", 3.2, (1, 0.98, 0.95), rot=(52, 0, -38), size=6)
        _light("AREA", "Fill", 60 * size * size, (1, 1, 1), loc=c + Vector((1.6, -1.0, 0.8)) * size, size=size * 1.5, target=tgt)
    return c, size, tgt


def _camera(c, size, yaw, pitch, lens=70, zoom=1.0, tgt=None):
    s = bpy.context.scene
    cd = bpy.data.cameras.new("_cam")
    cd.lens = lens
    cd.clip_start = 0.005
    cam = bpy.data.objects.new("_cam", cd)
    link(cam)
    s.camera = cam
    fov = 2 * math.atan(36 / 2 / lens)
    dist = (size * 0.6 / zoom) / math.tan(fov / 2)
    y, p = math.radians(yaw), math.radians(pitch)
    cam.location = c + Vector((dist * math.cos(p) * math.sin(y), -dist * math.cos(p) * math.cos(y), dist * math.sin(p)))
    t = cam.constraints.new("TRACK_TO")
    t.target = tgt
    t.track_axis = "TRACK_NEGATIVE_Z"
    t.up_axis = "UP_Y"
    return cam


def _scale_figure(mn, mx):
    """1.6m の人型の目安（灰色のカプセル）を横に置く"""
    x = mx.x + max(0.4, (mx.x - mn.x) * 0.6)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.18, depth=1.24, location=(x, (mn.y + mx.y) / 2, mn.z + 0.62))
    body = bpy.context.active_object
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.16, location=(x, (mn.y + mx.y) / 2, mn.z + 1.42))
    head = bpy.context.active_object
    m = bpy.data.materials.new("_fig")
    m.use_nodes = True
    m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.35, 0.35, 0.37, 1)
    for o in (body, head):
        o.data.materials.append(m)
    body.name, head.name = "_fig_body", "_fig_head"


def render_views(name, out_dir, mood="volcanic", views=None, samples=None, res=None):
    s = bpy.context.scene
    s.render.engine = "CYCLES"
    s.cycles.device = "CPU"
    s.cycles.samples = samples or SAMPLES
    s.cycles.use_denoising = True
    s.cycles.max_bounces = 8
    s.render.resolution_x = res or RES
    s.render.resolution_y = res or RES
    s.view_settings.view_transform = "AgX"
    try:
        s.view_settings.look = "AgX - Medium High Contrast"
    except Exception:
        pass
    s.render.image_settings.file_format = "PNG"
    views = views or [("front", 0, 10, 1.0), ("side", 90, 10, 1.0), ("angle", 38, 26, 1.0),
                      ("top", 0, 78, 1.0), ("close", 25, 22, 2.4), ("back", 180, 14, 1.0)]
    files = []
    for vname, yaw, pitch, zoom in views:
        _clear_stage()
        mn, mx = _bounds()
        if vname == "scale":
            _scale_figure(mn, mx)
            mn, mx = _bounds(include_helpers=True)
        c, size, tgt = _stage(mn, mx, mood)
        if vname == "close":
            c2 = Vector((c.x, c.y, mn.z + (mx.z - mn.z) * 0.7))
            tgt.location = c2
            c = c2
        _camera(c, size, yaw, pitch, zoom=zoom, tgt=tgt)
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


def tri_count(ob):
    dg = bpy.context.evaluated_depsgraph_get()
    me = ob.evaluated_get(dg).to_mesh()
    me.calc_loop_triangles()
    n = len(me.loop_triangles)
    ob.evaluated_get(dg).to_mesh_clear()
    return n


def set_origin_bottom(ob):
    pts = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
    cx = sum(p.x for p in pts) / 8
    cy = sum(p.y for p in pts) / 8
    mz = min(p.z for p in pts)
    me = ob.data
    off = Vector((cx, cy, mz))
    mw_inv = ob.matrix_world.inverted()
    ob.data.transform(Matrix.Translation(-(mw_inv @ off)))
    ob.matrix_world = Matrix.Identity(4)


def finish(name, parts, notes="", tex_res=1024, budget_tris=None, version="v1", refs=None):
    """parts: 形状オブジェクト群（手続き材質つき）。結合→ベイク→GLB→レンダー→manifest"""
    out_dir = os.path.join(OUT_ROOT, name)
    os.makedirs(out_dir, exist_ok=True)
    for o in parts:
        bpy.ops.object.select_all(action="DESELECT")
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    ob = join(parts, name)
    set_origin_bottom(ob)
    tris = tri_count(ob)
    log(f"{name}: tris={tris} materials={len(ob.data.materials)}")
    bake = bake_to_single_material(ob, name, res=tex_res)
    glb = os.path.join(out_dir, f"{name}.glb")
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_apply=True,
                              export_yup=True, export_image_format="JPEG", export_image_quality=88)
    blend = os.path.join(out_dir, f"{name}.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend, compress=True)
    files = render_views(name, out_dir, "volcanic")
    files += render_views(name, out_dir, "studio", views=[("front", 0, 10, 1.0), ("angle", 38, 26, 1.0), ("scale", 30, 12, 1.0)], samples=48)
    mn, mx = _bounds()
    manifest = {
        "asset": name, "version": version, "blender": bpy.app.version_string,
        "triangles": tris, "budget_triangles": budget_tris,
        "materials": [m.name for m in ob.data.materials], "bake": bake,
        "bbox_m": [round(v, 3) for v in (mx - mn)], "origin": "bottom-center", "up": "+Y (glTF)",
        "glb": os.path.basename(glb), "glb_bytes": os.path.getsize(glb),
        "cc0_textures": _TEX_USED, "pinterest_refs": refs or [],
        "sha256": {os.path.basename(p): _sha(p) for p in [glb] + files},
        "renders": [os.path.basename(p) for p in files],
        "samples": SAMPLES, "notes": notes,
        "approval": "NOT_APPROVED",
        "design": "docs/3d/B4_PROPS_DESIGN.md",
    }
    with open(os.path.join(out_dir, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    log(f"done {name}: tris={tris} bbox={manifest['bbox_m']} glb={manifest['glb_bytes']}B")
    if budget_tris and tris > budget_tris:
        log(f"WARN over budget: {tris} > {budget_tris}")
    return manifest
