import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import common as C
"""
霜鈴草 f2_frost_snowdrop（スノードロップ Galanthus nivalis 基準）
設計図: docs/3d/F2_FLOWERS_BLUEPRINT.md §0 §1

構成: 雪と氷の盛り土 + 6本の花茎（直立→頂部で鉤状の花柄→緑の苞→緑の子房→
外花被3枚(深い椀・縦筋・先端の氷化)＋内花被3枚(筒・先端の緑の逆V字)）+ 各株2枚の帯状葉。
霜は外花被と葉の「縁」に沿って実メッシュの氷晶を並べる。
全形状を解析曲面 S(u,v) で作り、頂点色は UV(u,v) から塗る。
"""
import math
import random

import bmesh
import bpy
from mathutils import Matrix, Vector

C.reset(seed=11)
R = random.Random(20261116)
UP = Vector((0, 0, 1))


# ---------------------------------------------------------------------------
# 小道具
# ---------------------------------------------------------------------------
def hexlin(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def mix(a, b, t):
    t = max(0.0, min(1.0, t))
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


def sstep(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def basis(o, y, z):
    """原点 o、+Y=y、+Z≒z の正規直交フレーム行列"""
    y = y.normalized()
    x = y.cross(z).normalized()
    z = x.cross(y).normalized()
    return Matrix(((x.x, y.x, z.x, o.x), (x.y, y.y, z.y, o.y), (x.z, y.z, z.z, o.z), (0, 0, 0, 1)))


def rot_toward(a, b, ang):
    """単位ベクトル a を b の方向へ ang ラジアン回す（b は a に直交化）"""
    b = (b - a * a.dot(b)).normalized()
    return (a * math.cos(ang) + b * math.sin(ang)).normalized()


def surface(name, S, nu, nv, M, thickness=0.0, color_fn=None):
    """解析曲面 S(u in 0..1, v in -1..1) -> local Vector をグリッド化し M で配置。+Z面が表"""
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new("UVMap")
    grid = [[bm.verts.new(M @ S(i / nu, j / nv * 2 - 1)) for j in range(nv + 1)] for i in range(nu + 1)]
    for i in range(nu):
        for j in range(nv):
            f = bm.faces.new((grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]))
            f.smooth = True
            for loop, (a, c) in zip(f.loops, ((i, j), (i, j + 1), (i + 1, j + 1), (i + 1, j))):
                loop[uvl].uv = (c / nv, a / nu)
    ob = C._obj_from_bm(bm, name)
    if thickness > 0:
        mod = ob.modifiers.new("thick", "SOLIDIFY")
        mod.thickness = thickness
        mod.offset = 0
        mod.use_even_offset = True
        C.apply_mods(ob)
    if color_fn:
        paint_uv(ob, color_fn, M.col[2].xyz.normalized())
    return ob


def paint_uv(ob, fn, zdir):
    """UV(u,v) と表裏（頂点法線が曲面の+Z側か）で頂点色を塗る"""
    me = ob.data
    attr = me.color_attributes.new("Col", "BYTE_COLOR", "CORNER")
    uv = me.uv_layers["UVMap"].data
    for li in range(len(me.loops)):
        q = uv[li].uv
        side = 1 if me.vertices[me.loops[li].vertex_index].normal.dot(zdir) > 0 else -1
        attr.data[li].color = (*fn(q[1], q[0] * 2 - 1, side), 1.0)
    me.color_attributes.active_color = attr


def frame_at(S, u, v):
    e = 1e-3
    p = S(u, v)
    du = S(min(1.0, u + e), v) - S(max(0.0, u - e), v)
    dv = S(u, min(1.0, v + e)) - S(u, max(-1.0, v - e))
    if du.length < 1e-9:
        du = Vector((0, 1, 0))
    if dv.length < 1e-9:
        dv = Vector((1, 0, 0))
    n = dv.cross(du)
    n = n.normalized() if n.length > 1e-12 else Vector((0, 0, 1))
    return p, n, du.normalized(), dv.normalized()


def crystal(bm, p, d, L, r, sides=4):
    """氷晶（細長い両錐）を bm に追加"""
    d = d.normalized()
    rot = d.to_track_quat("Z", "Y").to_matrix()
    ph = R.random() * math.tau
    top = bm.verts.new(p + rot @ Vector((0, 0, L)))
    bot = bm.verts.new(p + rot @ Vector((0, 0, -L * 0.2)))
    ring = [bm.verts.new(p + rot @ Vector((math.cos(a) * r * R.uniform(0.7, 1.2), math.sin(a) * r, L * 0.28)))
            for a in (ph + math.tau * s / sides for s in range(sides))]
    for s in range(sides):
        bm.faces.new((ring[s], ring[(s + 1) % sides], top))
        bm.faces.new((ring[(s + 1) % sides], ring[s], bot))


FROST = bmesh.new()   # 縁の氷晶（全部まとめて1オブジェクト）
SHARDS = bmesh.new()  # 盛り土の氷片


def frost_edges(S, M, count, umin, size, sides=(-1, 1)):
    """曲面の左右の縁（v=±1）と先端に沿って氷晶を並べる"""
    R3 = M.to_3x3()
    for _ in range(count):
        u = umin + (1 - umin) * (R.random() ** 0.7)
        s = R.choice(sides)
        p, n, du, dv = frame_at(S, u, s * 1.0)
        out = dv * s + du * (0.9 * sstep(0.85, 1.0, u))
        flip = R.choice((-1, 1))
        # 縁に沿って寝かせる（主に縁の接線方向＋わずかに外/表裏）→ 棘ではなく粒の列に見せる
        d = du * R.choice((-1, 1)) * R.uniform(0.6, 1.0) + out * R.uniform(0.25, 0.6) + n * flip * R.uniform(0.1, 0.5)
        d += Vector((R.uniform(-1, 1), R.uniform(-1, 1), R.uniform(-1, 1))) * 0.2
        L = size * R.uniform(0.6, 1.4)
        dw = (R3 @ d).normalized()
        crystal(FROST, M @ p - dw * L * 0.35, dw, L, L * R.uniform(0.32, 0.48))


# ---------------------------------------------------------------------------
# 材質
# ---------------------------------------------------------------------------
M_OUTER = C.mat_petal("snowdrop_outer_tepal", hexlin("#F4F7FA"), rough=0.45, sss=0.5,
                      sss_radius=(1.0, 0.95, 0.9), sheen=0.15, vcol=True)
# 薄い花弁で光が抜けすぎると陰影が消えて平板に見えるため、散乱距離を厚み程度に絞る
M_OUTER.node_tree.nodes["Principled BSDF"].inputs["Subsurface Scale"].default_value = 0.0014
M_INNER = C.mat_petal("snowdrop_inner_tepal", hexlin("#F4F7FA"), rough=0.4, sss=0.45,
                      sss_radius=(0.9, 1.0, 0.8), sheen=0.15, vcol=True)
M_INNER.node_tree.nodes["Principled BSDF"].inputs["Subsurface Scale"].default_value = 0.0012
M_STEM = C.mat_leaf("snowdrop_stem", hexlin("#6E9474"), rough=0.45, sss=0.2, coat=0.15)
M_OVARY = C.mat_leaf("snowdrop_ovary", hexlin("#6FA44A"), rough=0.45, sss=0.2, coat=0.15)
M_SPATHE = C.mat_leaf("snowdrop_spathe", hexlin("#93B486"), rough=0.5, sss=0.35, coat=0.05)
M_LEAF = C.mat_leaf("snowdrop_leaf", hexlin("#5E8A7A"), rough=0.55, sss=0.15, coat=0.12, vcol=True)
M_SNOW = C.mat_petal("snowdrop_snow_mound", hexlin("#E8F0F6"), rough=0.75, sss=0.35,
                     sss_radius=(0.6, 0.8, 1.0), sheen=0.15, vcol=True)
M_ICE = C.mat_ice("snowdrop_ice_shard", rgb=(0.80, 0.92, 1.0), rough=0.05, trans=0.9)
M_FROST = C.mat_ice("snowdrop_frost_crystal", rgb=(0.90, 0.96, 1.0), rough=0.12, trans=0.4,
                    emit=(0.70, 0.88, 1.0), emit_strength=0.25)

WHITE = hexlin("#F4F7FA")
ICE_TIP = hexlin("#CFE8FF")
GROOVE = hexlin("#CCD9E4")
GREEN_V = hexlin("#5E9A3E")
LEAF = hexlin("#5E8A7A")
LEAF_GLAUC = hexlin("#8FB3AA")
LEAF_BASE = hexlin("#B4CBB0")
LEAF_FROST = hexlin("#C2D8DC")


# ---------------------------------------------------------------------------
# 盛り土（直径0.16m の雪と氷）
# ---------------------------------------------------------------------------
MR, MH = 0.08, 0.026


LUMPS = [(0.035, 0.030, 0.016, 0.006), (-0.040, 0.020, 0.018, 0.005), (0.010, -0.045, 0.015, 0.005),
         (-0.030, -0.035, 0.014, 0.004), (0.050, -0.010, 0.012, 0.004), (-0.005, 0.045, 0.016, 0.005)]


def mound_rb(a):
    return MR * (1 + 0.06 * math.sin(3 * a + 1.0) + 0.04 * math.sin(5 * a + 2.3) + 0.02 * math.sin(9 * a + 0.4))


def mound_h(x, y):
    a = math.atan2(y, x)
    r = math.hypot(x, y) / mound_rb(a)
    if r >= 1:
        return 0.0
    h = MH * (1 - r ** 2.4) ** 0.55 * (1 + 0.08 * math.sin(4 * a + r * 5))
    for lx, ly, lr, lh in LUMPS:  # 雪の塊の凹凸
        h += lh * math.exp(-((x - lx) ** 2 + (y - ly) ** 2) / (lr * lr)) * (1 - r ** 4)
    return h


def mound_color(co, n):
    a = math.atan2(co.y, co.x)
    r = min(1.0, math.hypot(co.x, co.y) / mound_rb(a))
    top = sstep(0.2, 0.95, n.z) * (1 - 0.5 * sstep(0.75, 1.0, r))
    return mix(hexlin("#8FB0CC"), hexlin("#E8F0F6"), 0.15 + 0.85 * top)


def build_mound():
    bm = bmesh.new()
    seg, rings = 36, 7
    center = bm.verts.new((0, 0, mound_h(0, 0)))
    grid = []
    for k in range(1, rings + 1):
        t = (k / rings) ** 0.62
        row = []
        for s in range(seg):
            a = math.tau * s / seg + (0.5 * math.tau / seg if k % 2 else 0)
            rr = mound_rb(a) * min(t, 0.9999 if k < rings else 1.0)
            x, y = math.cos(a) * rr, math.sin(a) * rr
            row.append(bm.verts.new((x, y, mound_h(x, y) if k < rings else 0.0)))
        grid.append(row)
    for s in range(seg):
        f = bm.faces.new((center, grid[0][s], grid[0][(s + 1) % seg]))
        f.smooth = True
    for k in range(rings - 1):
        for s in range(seg):
            f = bm.faces.new((grid[k][s], grid[k + 1][s], grid[k + 1][(s + 1) % seg], grid[k][(s + 1) % seg]))
            f.smooth = True
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = C._obj_from_bm(bm, "mound")
    ob.data.update()
    C.vcol_paint(ob, mound_color)
    C.assign(ob, M_SNOW)
    # 盛り土表面の霜（上向きの粗い結晶）と透明な氷片
    for _ in range(22):
        a, rr = R.random() * math.tau, MR * math.sqrt(R.random()) * 0.92
        x, y = math.cos(a) * rr, math.sin(a) * rr
        p = Vector((x, y, mound_h(x, y) - 0.0005))
        d = UP + Vector((x, y, 0)) * 6 + Vector((R.uniform(-1, 1), R.uniform(-1, 1), 0)) * 0.6
        L = R.uniform(0.0018, 0.0042)
        crystal(FROST, p, d, L, L * 0.22)
    for i in range(6):
        a = i / 6 * math.tau + R.uniform(-0.3, 0.3)
        rr = MR * R.uniform(0.45, 0.8)
        x, y = math.cos(a) * rr, math.sin(a) * rr
        p = Vector((x, y, mound_h(x, y) - 0.003))
        d = UP + Vector((math.cos(a), math.sin(a), 0)) * R.uniform(0.4, 1.0)
        L = R.uniform(0.012, 0.024)
        crystal(SHARDS, p, d, L, L * R.uniform(0.18, 0.26), sides=6)
    return ob


# ---------------------------------------------------------------------------
# 花被片
# ---------------------------------------------------------------------------
def outer_S(L, W, cup, curl):
    def wf(u):
        if u < 0.6:
            return 0.26 + 0.74 * math.sin(math.pi * 0.5 * u / 0.6)
        t = (u - 0.6) / 0.4
        return max(0.0, math.sqrt(max(0.0, 1 - t * t)) * 0.95 + (1 - t) * 0.05)

    def S(u, v):
        w = wf(u) * W * 0.5
        x = v * w
        y = u * L
        z = cup * v * v * w * 2 * (0.55 + 0.45 * sstep(0.0, 0.35, u))
        z += curl * u * u * L
        # 縦の細い筋（溝）
        z -= 0.00014 * abs(math.sin(v * math.pi * 2.5)) * sstep(0.1, 0.45, u) * (1 - sstep(0.85, 1, u))
        return Vector((x, y, z))
    return S


def outer_color(u, v, side=1):
    groove = abs(math.cos(v * math.pi * 2.5)) * sstep(0.1, 0.45, u) * 0.6
    c = mix(WHITE, GROOVE, groove)
    if side > 0:  # 椀の内側: 付け根ほど青灰に陰る（鐘の奥行き）
        c = mix(c, hexlin("#B9C9D8"), 0.55 * (1 - sstep(0.05, 0.7, u)) * (1 - 0.5 * abs(v)))
    c = mix(c, hexlin("#DCE8D2"), 1 - sstep(0.0, 0.14, u))   # 付け根ほんのり緑白
    edge = sstep(0.7, 1.0, abs(v)) * sstep(0.5, 0.9, u) * 0.35
    tip = sstep(0.86, 0.97, u)
    return mix(c, ICE_TIP, max(tip, edge))


def inner_S(L, W, cup, flare):
    def wf(u):
        return 0.42 + 0.58 * min(1.0, u / 0.7) ** 0.6

    def S(u, v):
        w = wf(u) * W * 0.5
        x = v * w
        y = u * L - 0.17 * L * max(0.0, 1 - abs(v) * 1.8) ** 1.5 * sstep(0.7, 1.0, u)  # 先端の切れ込み
        z = cup * v * v * w * 2 - flare * sstep(0.55, 1.0, u) ** 2 * L * 0.3
        return Vector((x, y, z))
    return S


def inner_color(u, v, side=1):
    # 先端の切れ込みにかかる緑の逆V字（中央ほど付け根側へ伸びるアーチ）
    edge = 0.54 + 0.24 * abs(v) ** 1.3
    g = sstep(edge - 0.05, edge + 0.05, u)
    g *= 1 - 0.6 * sstep(0.88, 1.0, abs(v)) * sstep(0.9, 1.0, u)
    c = mix(WHITE, hexlin("#E6F0E0"), 1 - sstep(0.0, 0.2, u))
    return mix(c, GREEN_V, g)


def build_flower(tag, d, A, Lout, alpha, spin):
    """d: 花の軸（下向き）、A: 花被の付け根。外花被3＋内花被3"""
    a = d.orthogonal().normalized()
    b = d.cross(a).normalized()
    parts = []
    for k in range(3):
        th = spin + k * math.tau / 3
        e = a * math.cos(th) + b * math.sin(th)
        al = math.radians(alpha + R.uniform(-4, 4) + 7)
        y = d * math.cos(al) + e * math.sin(al)
        z = d * math.sin(al) - e * math.cos(al)
        L = Lout * R.uniform(0.95, 1.04)
        S = outer_S(L, 0.0104, cup=0.32, curl=0.10)
        M = basis(A + e * 0.0021, y, z)
        ob = surface(f"{tag}_outer{k}", S, 12, 10, M, thickness=0.0013, color_fn=outer_color)
        C.assign(ob, M_OUTER)
        parts.append(ob)
        frost_edges(S, M, R.randint(9, 12), 0.3, 0.00085)
    for k in range(3):
        th = spin + math.pi / 3 + k * math.tau / 3
        e = a * math.cos(th) + b * math.sin(th)
        al = math.radians(4)
        y = d * math.cos(al) + e * math.sin(al)
        z = d * math.sin(al) - e * math.cos(al)
        S = inner_S(0.0120 * Lout / 0.025, 0.0080, cup=0.6, flare=0.5)
        M = basis(A + d * 0.0006 + e * 0.0019, y, z)
        ob = surface(f"{tag}_inner{k}", S, 7, 6, M, thickness=0.0009, color_fn=inner_color)
        C.assign(ob, M_INNER)
        parts.append(ob)
    return parts


def spathe_S(L, W):
    def S(u, v):
        w = (0.35 + 0.65 * math.sin(math.pi * min(1.0, u / 0.55) * 0.5)) * (1 - sstep(0.6, 1.0, u) * 0.92)
        w *= W * 0.5
        return Vector((v * w, u * L, 0.55 * v * v * w * 2 + 0.06 * u * u * L))
    return S


# ---------------------------------------------------------------------------
# 葉
# ---------------------------------------------------------------------------
def leaf_S(L, W, keel, bend, twist):
    def wf(u):
        w = 0.62 + 0.38 * math.sin(math.pi * 0.5 * min(1.0, u / 0.7))
        if u > 0.84:
            t = (u - 0.84) / 0.16
            w *= math.sqrt(max(0.0, 1 - t * t)) * 0.9 + 0.1 * (1 - t)
        return w

    def S(u, v):
        w = wf(u) * W * 0.5
        x = v * w
        y = u * L
        z = keel * abs(v) ** 1.4 * w * 2 * (1.6 - 0.6 * u)
        z -= bend * u * u * L
        a = twist * u
        x, z = x * math.cos(a) - z * math.sin(a), x * math.sin(a) + z * math.cos(a)
        return Vector((x, y, z))
    return S


def leaf_color(u, v, side=1):
    c = mix(LEAF_GLAUC, LEAF, sstep(0.05, 0.55, abs(v)))
    c = mix(c, LEAF_BASE, 1 - sstep(0.0, 0.12, u))
    return mix(c, LEAF_FROST, sstep(0.8, 1.0, abs(v)) * sstep(0.3, 0.8, u) * 0.45)


# ---------------------------------------------------------------------------
# 株（花茎1＋葉2）
# ---------------------------------------------------------------------------
def build_plant(i, x, y, H, az, beta, alpha, Lout, lean, leaf_az, leaf_len):
    parts = []
    base = Vector((x, y, mound_h(x, y) - 0.006))
    e = Vector((math.cos(math.radians(az)), math.sin(math.radians(az)), 0))
    outward = Vector((x, y, 0)).normalized() if math.hypot(x, y) > 1e-4 else e
    s = rot_toward(UP, outward + e * 0.3, math.radians(lean))
    T = base + s * (H - 0.012 - base.z)
    # 花茎（直立、上端で細くなる）
    pts = [base.lerp(T, t / 5) for t in range(6)]
    scape = C.tube_along(f"p{i}_scape", pts, 0.0022, sides=8,
                         radius_fn=lambda t: 1.0 - 0.38 * sstep(0.75, 1.0, t))
    C.assign(scape, M_STEM)
    parts.append(scape)
    # 鉤状の花柄
    eh = (e - s * s.dot(e)).normalized()
    d = rot_toward(-s, eh, math.radians(beta))
    P0 = T - s * 0.003
    P3 = T + s * 0.002 + eh * 0.019
    P1 = T + s * 0.012
    P2 = P3 - d * 0.010
    ped_pts = C.curve_points(P0, P1, P2, P3, n=12)
    ped = C.tube_along(f"p{i}_pedicel", ped_pts, 0.00095, sides=6,
                       radius_fn=lambda t: 1.15 - 0.25 * math.sin(math.pi * t) + 0.25 * sstep(0.8, 1, t))
    C.assign(ped, M_STEM)
    parts.append(ped)
    # 苞（へら状、曲がり始めから上へ、花柄側を包む）
    sy = rot_toward(s, -eh, math.radians(14))
    spa = surface(f"p{i}_spathe", spathe_S(0.016, 0.0052), 8, 4,
                  basis(T - s * 0.004 - eh * 0.0006, sy, eh), thickness=0.0005)
    C.assign(spa, M_SPATHE)
    parts.append(spa)
    # 子房（緑の小球、軸方向に少し長い）
    ov_r, ov_l = 0.0029, 0.0044
    O = P3 + d * ov_l * 0.7
    a = d.orthogonal().normalized()
    b = d.cross(a).normalized()
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=9, v_segments=7, radius=1.0)
    Mo = Matrix(((a.x * ov_r, b.x * ov_r, d.x * ov_l, O.x),
                 (a.y * ov_r, b.y * ov_r, d.y * ov_l, O.y),
                 (a.z * ov_r, b.z * ov_r, d.z * ov_l, O.z), (0, 0, 0, 1)))
    bmesh.ops.transform(bm, matrix=Mo, verts=bm.verts)
    for f in bm.faces:
        f.smooth = True
    ov = C._obj_from_bm(bm, f"p{i}_ovary")
    C.assign(ov, M_OVARY)
    parts.append(ov)
    # 花
    A = O + d * ov_l * 0.62
    parts += build_flower(f"p{i}", d, A, Lout, alpha, spin=math.radians(az) + R.uniform(0, 2))
    # 葉2枚（株元から向かい合って出て、外へ弓なり）
    for k, la in enumerate((leaf_az, leaf_az + 180 + R.uniform(-35, 35))):
        o = Vector((math.cos(math.radians(la)), math.sin(math.radians(la)), 0))
        ly = rot_toward(UP, o, math.radians(R.uniform(8, 18)))
        L = leaf_len * R.uniform(0.85, 1.05)
        S = leaf_S(L, R.uniform(0.0085, 0.0100), keel=0.28, bend=R.uniform(0.17, 0.3), twist=R.uniform(-0.5, 0.5))
        M = basis(base + o * 0.0024 + UP * 0.001, ly, -o)
        lf = surface(f"p{i}_leaf{k}", S, 12, 4, M, thickness=0.0009, color_fn=leaf_color)
        C.assign(lf, M_LEAF)
        parts.append(lf)
        frost_edges(S, M, 8, 0.3, 0.0013)
    return parts


# x, y, 高さ, 花の向き(deg), 下向きからの傾き β, 開き角 α, 外花被長, 茎の傾き, 葉の向き, 葉長
PLANTS = [
    (0.004, 0.003, 0.335, 20, 16, 26, 0.028, 2, 110, 0.18),
    (-0.027, 0.015, 0.290, 150, 28, 34, 0.026, 4, 60, 0.16),
    (0.025, -0.020, 0.268, -40, 12, 18, 0.025, 3, 20, 0.155),
    (-0.011, -0.030, 0.246, -115, 34, 35, 0.024, 5, -160, 0.145),
    (0.031, 0.023, 0.306, 65, 22, 30, 0.027, 3, 150, 0.17),
    (-0.035, -0.007, 0.222, 205, 30, 24, 0.023, 6, -80, 0.14),
]

objs = [build_mound()]
for i, p in enumerate(PLANTS):
    objs += build_plant(i, *p)

bmesh.ops.recalc_face_normals(FROST, faces=FROST.faces)
fr = C._obj_from_bm(FROST, "frost")
C.assign(fr, M_FROST)
bmesh.ops.recalc_face_normals(SHARDS, faces=SHARDS.faces)
sh = C._obj_from_bm(SHARDS, "ice_shards")
C.assign(sh, M_ICE)
objs += [fr, sh]

ob = C.join(objs, "f2_frost_snowdrop")
C.set_origin_bottom(ob)

C.finish("f2_frost_snowdrop", notes=(
    "霜鈴草 v1: スノードロップ基準。6花茎（0.22-0.34m）、鉤状花柄・苞・子房、外花被3（椀状・縦筋・先端氷化の頂点色）、"
    "内花被3（筒・緑の逆V字の頂点色）、各株2枚の帯状葉（粉白の中央帯）、盛り土φ0.16m、縁に沿った氷晶。画像テクスチャなし"))
