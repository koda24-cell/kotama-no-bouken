import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import common as C
"""
氷晶花（ひょうしょうか）f2_ice_crystal_bloom — 第2層「凍った水源」の幻想植物
設計図: docs/3d/F2_FLOWERS_BLUEPRINT.md §3

構成（すべて1つのbmeshに material_index で組み、最後に1オブジェクトにする）
- 岩: 半空間の交差で作る面取りの多い低い岩＋上面の割れ目、頂点色で氷の付着
- 花 3（φ90/70/50mm）＋つぼみ 1: 2層×11枚の披針形クリスタル花弁（断面ひし形・中央稜・フラットシェード）
  付け根=乳白（低透過）→中間→先端=透明淡水色 の3段材質＋頂点色グラデ
- 芯: 濃紺の萼＋発光する氷柱の雄しべ14本＋発光の雌しべ
- 茎・槍形の葉（霜で白く縁取り）、葉・花弁・岩の縁に実メッシュの霜
"""
import math
import random

import bmesh
import bpy
from mathutils import Matrix, Vector, noise

NAME = "f2_ice_crystal_bloom"
C.reset(seed=11)


# ---------------------------------------------------------------------------
# 色ユーティリティ
# ---------------------------------------------------------------------------
def srgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def _s2l(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lin(h):
    return tuple(_s2l(c) for c in srgb(h))


def mix(a, b, t):
    t = max(0.0, min(1.0, t))
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


def smooth01(x, a, b):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


# ---------------------------------------------------------------------------
# 材質（index順）
# ---------------------------------------------------------------------------
ROCK, STEM, CALYX, MILKY, MID, CLEAR, GLOW, FROST, RICE = range(9)


def vc(m):
    C._use_vcol(m, m.node_tree.nodes["Principled BSDF"])
    return m


def build_materials():
    mats = [None] * 9
    mats[ROCK] = vc(C.mat_basic("crystal_rock", lin("#2B3440"), rough=0.8, spec=0.4))
    mats[STEM] = vc(C.mat_leaf("crystal_stem_leaf", lin("#3F6B6A"), rough=0.42, sss=0.12, coat=0.3))
    mats[CALYX] = C.mat_leaf("crystal_calyx", lin("#1B2A4A"), rough=0.3, sss=0.05, coat=0.5)
    mats[MILKY] = vc(C.mat_ice("crystal_ice_milky", lin("#E4F2FF"), rough=0.3, trans=0.45,
                               emit=lin("#A6EAFF"), emit_strength=0.45))
    mats[MID] = vc(C.mat_ice("crystal_ice_mid", lin("#C8E8FF"), rough=0.1, trans=0.82,
                             emit=lin("#7FE3FF"), emit_strength=0.12))
    mats[CLEAR] = vc(C.mat_ice("crystal_ice_clear", lin("#A8DBFF"), rough=0.03, trans=0.95,
                               emit=lin("#7FE3FF"), emit_strength=0.04))
    mats[GLOW] = C.mat_emissive("crystal_core_glow", lin("#7FE3FF"), strength=4.0, base=lin("#2A7FA0"))
    mats[FROST] = C.mat_ice("crystal_frost", lin("#EAF6FF"), rough=0.3, trans=0.25,
                            emit=lin("#CFF4FF"), emit_strength=0.6)
    mats[RICE] = C.mat_ice("crystal_rock_ice", lin("#B8E2FF"), rough=0.05, trans=0.88,
                           emit=lin("#7FE3FF"), emit_strength=0.15)
    return mats


# ---------------------------------------------------------------------------
# メッシュビルダー
# ---------------------------------------------------------------------------
class MB:
    def __init__(self):
        self.bm = bmesh.new()
        self.cols = []  # 頂点ごとのsRGB色（生成順＝index）

    def v(self, co, col):
        vv = self.bm.verts.new(co)
        self.cols.append(col)
        return vv

    def f(self, verts, mat, smooth=False):
        try:
            fa = self.bm.faces.new(verts)
        except ValueError:
            return None
        fa.material_index = mat
        fa.smooth = smooth
        return fa


def frame(d, up=Vector((0, 0, 1))):
    """local x=side, y=d, z=n（dに垂直で up 側）"""
    d = d.normalized()
    side = d.cross(up)
    if side.length < 1e-5:
        side = d.cross(Vector((0, 1, 0)))
    side.normalize()
    n = side.cross(d).normalized()
    return Matrix((side, d, n)).transposed()


def to4(R, t):
    M = R.to_4x4()
    M.translation = t
    return M


# ---------------------------------------------------------------------------
# 氷晶の花弁（断面8角のひし形、中央稜＋両側の副稜、フラットシェード）
# ---------------------------------------------------------------------------
P_XS = (-1.0, -0.55, 0.0, 0.55, 1.0, 0.55, 0.0, -0.55)
P_ZS = (0.0, 0.58, 1.0, 0.58, 0.0, -0.32, -0.48, -0.32)


def lance(u, peak=0.35, base=0.28):
    if u < peak:
        return base + (1 - base) * math.sin(0.5 * math.pi * u / peak)
    t = (u - peak) / (1 - peak)
    return (1 - t) ** 1.1 * (1 + 0.18 * math.sin(math.pi * t))


def add_petal(mb, M, L, W, T, rnd, curl=0.0, nseg=7, mats=(MILKY, MID, CLEAR), tiers=(0.2, 0.5),
              base_col=srgb("#EAF5FF"), tip_col=srgb("#A8DBFF"), edge_col=srgb("#FFFFFF"),
              jitter=0.12, smooth=False):
    rings = []
    edges = []
    for i in range(nseg):
        u = i / nseg
        w = W * lance(u)
        t = T * (0.45 + 0.55 * lance(u))
        y = u * L
        zc = curl * u * u * L
        ring = []
        for k in range(8):
            jz = rnd.uniform(-jitter, jitter) * t if (i > 0 and k not in (0, 4)) else 0.0
            co = M @ Vector((P_XS[k] * w, y, zc + P_ZS[k] * t + jz))
            col = mix(base_col, tip_col, u ** 0.8)
            if k in (0, 4):
                col = mix(col, edge_col, 0.55)
            ring.append(mb.v(co, col))
        rings.append(ring)
        if u > 0.3:
            R3 = M.to_3x3()
            edges.append((ring[0].co.copy(), (R3 @ Vector((-1, 0, 0.35))).normalized()))
            edges.append((ring[4].co.copy(), (R3 @ Vector((1, 0, 0.35))).normalized()))
    tip = mb.v(M @ Vector((0, L, curl * L)), tip_col)
    for i in range(nseg - 1):
        u = (i + 0.5) / nseg
        mat = mats[0] if u < tiers[0] else (mats[1] if u < tiers[1] else mats[2])
        for k in range(8):
            mb.f((rings[i][k], rings[i][(k + 1) % 8], rings[i + 1][(k + 1) % 8], rings[i + 1][k]), mat, smooth)
    for k in range(8):
        mb.f((rings[-1][k], rings[-1][(k + 1) % 8], tip), mats[2], smooth)
    mb.f(list(reversed(rings[0])), mats[0], smooth)
    edges.append((tip.co.copy(), (M.to_3x3() @ Vector((0, 1, 0.2))).normalized()))
    return edges


# ---------------------------------------------------------------------------
# 小物: 氷柱（六角柱＋尖端）、霜（四角両錐）、管
# ---------------------------------------------------------------------------
def add_prism(mb, p, d, L, r, mat, col, rnd, sides=6, shoulder=0.72, smooth=False):
    R = d.normalized().to_track_quat("Z", "Y").to_matrix()
    off = rnd.random() * math.pi
    b = [mb.v(p + R @ Vector((math.cos(off + 2 * math.pi * s / sides) * r,
                               math.sin(off + 2 * math.pi * s / sides) * r, 0)), col) for s in range(sides)]
    m = [mb.v(p + R @ Vector((math.cos(off + 2 * math.pi * s / sides) * r * 0.88,
                               math.sin(off + 2 * math.pi * s / sides) * r * 0.88, L * shoulder)), col)
         for s in range(sides)]
    tip = mb.v(p + R @ Vector((0, 0, L)), col)
    for s in range(sides):
        mb.f((b[s], b[(s + 1) % sides], m[(s + 1) % sides], m[s]), mat, smooth)
        mb.f((m[s], m[(s + 1) % sides], tip), mat, smooth)
    mb.f(list(reversed(b)), mat, smooth)
    return tip.co.copy()


def add_frost(mb, p, d, L, rnd, mat=FROST, col=srgb("#FFFFFF")):
    d = (d.normalized() + Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-1, 1))) * 0.45).normalized()
    R = d.to_track_quat("Z", "Y").to_matrix()
    r = L * rnd.uniform(0.2, 0.3)
    top = mb.v(p + R @ Vector((0, 0, L)), col)
    bot = mb.v(p + R @ Vector((0, 0, -L * 0.2)), col)
    a0 = rnd.random()
    ring = [mb.v(p + R @ Vector((math.cos(a0 + math.pi * s / 2) * r, math.sin(a0 + math.pi * s / 2) * r, L * 0.22)), col)
            for s in range(4)]
    for s in range(4):
        mb.f((ring[s], ring[(s + 1) % 4], top), mat)
        mb.f((ring[(s + 1) % 4], ring[s], bot), mat)


def add_octa(mb, p, r, mat, col):
    vs = [mb.v(p + Vector(o) * r, col) for o in ((1, 0, 0), (0, 1, 0), (-1, 0, 0), (0, -1, 0))]
    top = mb.v(p + Vector((0, 0, r * 1.3)), col)
    bot = mb.v(p + Vector((0, 0, -r * 1.0)), col)
    for s in range(4):
        mb.f((vs[s], vs[(s + 1) % 4], top), mat)
        mb.f((vs[(s + 1) % 4], vs[s], bot), mat)


def add_tube(mb, pts, radius, mat, col_fn, sides=8, radius_fn=None, cap=True):
    pts = [Vector(p) for p in pts]
    t0 = (pts[1] - pts[0]).normalized()
    ref = Vector((0, 0, 1)) if abs(t0.z) < 0.9 else Vector((1, 0, 0))
    n = t0.cross(ref).normalized()
    prev_t = t0
    rings = []
    N = len(pts)
    for k, p in enumerate(pts):
        t = (pts[k + 1] - p).normalized() if k < N - 1 else (p - pts[k - 1]).normalized()
        axis = prev_t.cross(t)
        if axis.length > 1e-6:
            n = Matrix.Rotation(prev_t.angle(t), 3, axis.normalized()) @ n
        prev_t = t
        b = t.cross(n).normalized()
        u = k / (N - 1)
        r = radius * (radius_fn(u) if radius_fn else 1.0)
        col = col_fn(u)
        rings.append([mb.v(p + (n * math.cos(a) + b * math.sin(a)) * r, col)
                      for a in (2 * math.pi * s / sides for s in range(sides))])
    for k in range(N - 1):
        for s in range(sides):
            mb.f((rings[k][s], rings[k][(s + 1) % sides], rings[k + 1][(s + 1) % sides], rings[k + 1][s]), mat, True)
    if cap:
        mb.f(list(reversed(rings[0])), mat, True)
        mb.f(rings[-1], mat, True)


def bezier(p0, p1, p2, p3, n):
    p0, p1, p2, p3 = map(Vector, (p0, p1, p2, p3))
    return [(1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t * t * p2 + t ** 3 * p3
            for t in (i / n for i in range(n + 1))]


# ---------------------------------------------------------------------------
# 岩
# ---------------------------------------------------------------------------
def crack_y(x):
    return 0.006 * math.sin(x * 55 + 0.7) + 0.004 * math.sin(x * 130)


CRACK_HALF = 0.014


def build_rock(mb, rnd):
    tmp = bmesh.new()
    bmesh.ops.create_icosphere(tmp, subdivisions=4, radius=1.0)
    rr = random.Random(5)
    planes = [(Vector((0, 0, 1)), 0.6), (Vector((0.2, -0.1, 1)).normalized(), 0.62)]
    for i in range(16):
        az = 2 * math.pi * i / 16 + rr.uniform(-0.18, 0.18)
        el = rr.uniform(-0.15, 1.0)
        planes.append((Vector((math.cos(el) * math.cos(az), math.cos(el) * math.sin(az), math.sin(el))),
                       rr.uniform(0.66, 0.84)))
    crack = {}
    for v in tmp.verts:
        d = v.co.normalized()
        r = 1.0
        for n, dist in planes:
            k = n.dot(d)
            if k > 1e-3:
                r = min(r, dist / k)
        p = d * r
        p += Vector(noise.noise_vector(p * 2.2)) * 0.03 + Vector(noise.noise_vector(p * 9.0 + Vector((3, 1, 2)))) * 0.008
        x, y, z = p.x * 0.125, p.y * 0.09, p.z * 0.07 + 0.028
        z = max(z, 0.0)
        c = 0.0
        if z > 0.045 and abs(x) < 0.08:
            dist = abs(y - crack_y(x))
            if dist < CRACK_HALF:
                c = (1 - (dist / CRACK_HALF) ** 2) * math.sqrt(max(0.0, 1 - (x / 0.08) ** 2))
                z -= 0.024 * c
        v.co = (x, y, z)
        crack[v] = c
    tmp.normal_update()
    vmap = {}
    tops = []
    for v in tmp.verts:
        nz = v.normal.z
        n1 = noise.noise(v.co * 60.0)
        col = mix(srgb("#1E252F"), srgb("#2F3A48"), 0.5 + 0.5 * n1)
        col = mix(col, srgb("#6F88A0"), smooth01(nz, 0.6, 0.95) * 0.4 * max(0.0, 0.5 + noise.noise(v.co * 25.0 + Vector((5, 5, 5)))))
        col = mix(col, srgb("#0B0F15"), crack[v] * 1.3)
        if v.co.z < 0.004:
            col = mix(col, srgb("#151A21"), 0.7)
        vmap[v] = mb.v(v.co.copy(), col)
        if 0.15 < nz < 0.85 and v.co.z > 0.03 and crack[v] == 0:
            tops.append((v.co.copy(), v.normal.copy()))
    for f in tmp.faces:
        mb.f([vmap[v] for v in f.verts], ROCK, True)
    tmp.free()
    return tops


def rock_ice(mb, tops, rnd):
    """岩の肩から生える透明な氷柱の群れ＋霜"""
    for az_deg in (205, 335, 75):
        az = math.radians(az_deg)
        want = Vector((math.cos(az), math.sin(az), 0))
        best = max(tops, key=lambda t: Vector((t[0].x, t[0].y, 0)).normalized().dot(want) + 0.3 * t[1].z)
        p, n = best
        k = rnd.randint(3, 5)
        for j in range(k):
            d = (n * 0.8 + Vector((0, 0, 0.6)) + Vector((rnd.uniform(-0.5, 0.5), rnd.uniform(-0.5, 0.5), rnd.uniform(0, 0.4)))).normalized()
            q = p + Vector((rnd.uniform(-0.008, 0.008), rnd.uniform(-0.008, 0.008), 0)) - n * 0.004
            L = rnd.uniform(0.016, 0.042) * (1.0 if j else 1.25)
            add_prism(mb, q, d, L, L * rnd.uniform(0.13, 0.18), RICE, srgb("#FFFFFF"), rnd)
    hi = sorted(tops, key=lambda t: -t[0].z)[:max(8, len(tops) // 3)]
    for _ in range(7):
        p0, n0 = rnd.choice(hi)
        near = [t for t in tops if (t[0] - p0).length < 0.014]
        for _ in range(8):
            p, n = rnd.choice(near)
            add_frost(mb, p, n + Vector((0, 0, 0.6)), rnd.uniform(0.002, 0.0045), rnd)


# ---------------------------------------------------------------------------
# 花・つぼみ・茎・葉
# ---------------------------------------------------------------------------
def head_matrix(pos, axis, spin):
    R = Vector(axis).normalized().to_track_quat("Z", "Y").to_matrix() @ Matrix.Rotation(spin, 3, "Z")
    return to4(R, Vector(pos))


def build_flower(mb, H, D, rnd, frost_n=3):
    s = D / 0.09
    edges_out = []
    # 萼（濃紺のカップ）
    cup = []
    for zz, rr in ((-0.010, 0.0030), (-0.006, 0.0050), (-0.002, 0.0068), (0.0012, 0.0074)):
        cup.append([mb.v(H @ Vector((math.cos(a) * rr * s, math.sin(a) * rr * s, zz * s)), srgb("#1B2A4A"))
                    for a in (2 * math.pi * k / 12 for k in range(12))])
    for i in range(len(cup) - 1):
        for k in range(12):
            mb.f((cup[i][k], cup[i][(k + 1) % 12], cup[i + 1][(k + 1) % 12], cup[i + 1][k]), CALYX, True)
    ctr = mb.v(H @ Vector((0, 0, 0.0022 * s)), srgb("#1B2A4A"))
    for k in range(12):
        mb.f((cup[-1][k], cup[-1][(k + 1) % 12], ctr), CALYX, True)
    mb.f(list(reversed(cup[0])), CALYX, True)
    # 萼片（濃紺の小さな尖り、外層花弁の下）
    for k in range(6):
        phi = 2 * math.pi * (k + 0.25) / 6
        e = math.radians(-38)
        d = Vector((math.cos(e) * math.cos(phi), math.cos(e) * math.sin(phi), math.sin(e)))
        M = H @ to4(frame(d), Vector((math.cos(phi) * 0.004 * s, math.sin(phi) * 0.004 * s, -0.004 * s)))
        add_petal(mb, M, 0.013 * s, 0.0028 * s, 0.0011 * s, rnd, curl=0.08, nseg=4,
                  mats=(CALYX, CALYX, CALYX), base_col=srgb("#1B2A4A"), tip_col=srgb("#1B2A4A"), edge_col=srgb("#1B2A4A"))
    # 花弁 2層×11
    n = 11
    off = rnd.uniform(0, 2 * math.pi)
    for layer in (0, 1):
        for k in range(n):
            phi = off + 2 * math.pi * (k + 0.5 * layer) / n + rnd.uniform(-0.05, 0.05)
            if layer == 0:
                e = math.radians(rnd.uniform(-8, 3))
                L = rnd.uniform(0.040, 0.044) * s
                W, T, curl, r0, z0 = 0.0056 * s, 0.0021 * s, -0.07, 0.0052 * s, 0.0
            else:
                e = math.radians(rnd.uniform(34, 44))
                L = rnd.uniform(0.030, 0.034) * s
                W, T, curl, r0, z0 = 0.0047 * s, 0.0019 * s, 0.10, 0.0034 * s, 0.0012 * s
            d = Vector((math.cos(e) * math.cos(phi), math.cos(e) * math.sin(phi), math.sin(e)))
            R = frame(d) @ Matrix.Rotation(rnd.uniform(-0.12, 0.12), 3, "Y")
            M = H @ to4(R, Vector((math.cos(phi) * r0, math.sin(phi) * r0, z0)))
            ed = add_petal(mb, M, L, W, T, rnd, curl=curl)
            if layer == 0:
                edges_out += ed
            else:
                edges_out += ed[-3:]
    for _ in range(frost_n * n):
        p, dd = rnd.choice(edges_out)
        add_frost(mb, p, dd, rnd.uniform(0.0011, 0.0019) * s, rnd)
    # 芯: 雄しべ状の発光氷柱
    ns = 14
    for k in range(ns):
        phi = 2 * math.pi * k / ns + rnd.uniform(-0.1, 0.1)
        rr = rnd.uniform(0.0018, 0.0036) * s
        tilt = math.radians(rnd.uniform(14, 34))
        d = Vector((math.sin(tilt) * math.cos(phi), math.sin(tilt) * math.sin(phi), math.cos(tilt)))
        p = H @ Vector((math.cos(phi) * rr, math.sin(phi) * rr, 0.0015 * s))
        dw = (H.to_3x3() @ d).normalized()
        tip = add_prism(mb, p, dw, rnd.uniform(0.0075, 0.011) * s, 0.00055 * s, GLOW, srgb("#C4F4FF"), rnd, sides=5)
        add_octa(mb, tip, 0.0010 * s, GLOW, srgb("#C4F4FF"))
    add_prism(mb, H @ Vector((0, 0, 0.001 * s)), (H.to_3x3() @ Vector((0, 0, 1))).normalized(),
              0.0065 * s, 0.0016 * s, GLOW, srgb("#C4F4FF"), rnd, sides=6, shoulder=0.55)


def build_bud(mb, H, rnd):
    s = 1.0
    for k in range(6):
        phi = 2 * math.pi * (k + 0.3) / 6
        e = math.radians(48)
        d = Vector((math.cos(e) * math.cos(phi), math.cos(e) * math.sin(phi), math.sin(e)))
        M = H @ to4(frame(d), Vector((math.cos(phi) * 0.003, math.sin(phi) * 0.003, -0.003)))
        add_petal(mb, M, 0.012, 0.0028, 0.0011, rnd, curl=0.12, nseg=4,
                  mats=(CALYX, CALYX, CALYX), base_col=srgb("#1B2A4A"), tip_col=srgb("#1B2A4A"), edge_col=srgb("#1B2A4A"))
    edges = []
    for layer in (0, 1):
        for k in range(6):
            phi = 2 * math.pi * (k + 0.5 * layer) / 6
            e = math.radians(70 if layer == 0 else 78)
            d = Vector((math.cos(e) * math.cos(phi), math.cos(e) * math.sin(phi), math.sin(e)))
            R = frame(d)
            r0 = 0.0035 if layer == 0 else 0.0018
            M = H @ to4(R, Vector((math.cos(phi) * r0, math.sin(phi) * r0, 0.0)))
            edges += add_petal(mb, M, 0.024 if layer == 0 else 0.022, 0.0052, 0.002, rnd, curl=0.22 if layer == 0 else 0.15,
                               tiers=(0.35, 0.7))
    for _ in range(10):
        p, dd = rnd.choice(edges)
        add_frost(mb, p, dd, rnd.uniform(0.0011, 0.0017), rnd)
    add_octa(mb, H @ Vector((0, 0, 0.012)), 0.0028, GLOW, srgb("#C4F4FF"))
    # 萼のふくらみ
    cup = []
    for zz, rr in ((-0.012, 0.0028), (-0.007, 0.0045), (-0.002, 0.0055), (0.002, 0.004)):
        cup.append([mb.v(H @ Vector((math.cos(a) * rr, math.sin(a) * rr, zz)), srgb("#1B2A4A"))
                    for a in (2 * math.pi * k / 10 for k in range(10))])
    for i in range(len(cup) - 1):
        for k in range(10):
            mb.f((cup[i][k], cup[i][(k + 1) % 10], cup[i + 1][(k + 1) % 10], cup[i + 1][k]), CALYX, True)
    mb.f(list(reversed(cup[0])), CALYX, True)
    mb.f(cup[-1], CALYX, True)


def stem_col(u):
    return mix(srgb("#2E4F50"), srgb("#4B7C7A"), u)


def build_stem(mb, base, H, radius):
    top = H @ Vector((0, 0, -0.003))
    a = (H.to_3x3() @ Vector((0, 0, 1))).normalized()
    b = Vector(base)
    h = top.z - b.z
    pts = bezier(b, b + Vector((0, 0, h * 0.45)), top - a * h * 0.4, top, 18)
    add_tube(mb, pts, radius, STEM, stem_col, sides=8, radius_fn=lambda u: 1.15 - 0.3 * u)


def build_leaf(mb, base, direction, L, W, rnd, frost_n=14):
    """槍形の葉: 断面6角（中肋の稜＋下の竜骨）、縁を頂点色と霜で白く"""
    xs = (-1.0, -0.72, 0.0, 0.72, 1.0, 0.0)
    T = 0.0021
    zs = (0.0, 0.32, 0.12, 0.32, 0.0, -0.7)
    M = to4(frame(Vector(direction)) @ Matrix.Rotation(rnd.uniform(-0.3, 0.3), 3, "Y"), Vector(base))
    nseg = 10
    rings, edges = [], []
    for i in range(nseg):
        u = i / nseg
        w = W * lance(u, peak=0.32, base=0.22)
        zc = -0.22 * u * u * L
        ring = []
        for k in range(6):
            col = srgb("#33595A") if k not in (0, 4) else srgb("#E8F2F8")
            if k == 2:
                col = srgb("#5A8C88")
            if k == 5:
                col = srgb("#2A4A4C")
            ring.append(mb.v(M @ Vector((xs[k] * w, u * L, zc + zs[k] * T)), col))
        rings.append(ring)
        if i > 1:
            R3 = M.to_3x3()
            edges.append((ring[0].co.copy(), (R3 @ Vector((-1, 0, 0.5))).normalized()))
            edges.append((ring[4].co.copy(), (R3 @ Vector((1, 0, 0.5))).normalized()))
    tip = mb.v(M @ Vector((0, L, -0.22 * L)), srgb("#E2EEF4"))
    for i in range(nseg - 1):
        for k in range(6):
            mb.f((rings[i][k], rings[i][(k + 1) % 6], rings[i + 1][(k + 1) % 6], rings[i + 1][k]), STEM, True)
    for k in range(6):
        mb.f((rings[-1][k], rings[-1][(k + 1) % 6], tip), STEM, True)
    mb.f(list(reversed(rings[0])), STEM, True)
    for _ in range(frost_n):
        p, dd = rnd.choice(edges)
        add_frost(mb, p, dd, rnd.uniform(0.0014, 0.0024), rnd)


# ---------------------------------------------------------------------------
# 組み立て
# ---------------------------------------------------------------------------
def main():
    rnd = random.Random(2611)
    mats = build_materials()
    mb = MB()
    tops = build_rock(mb, rnd)
    rock_ice(mb, tops, rnd)

    def cb(x, z=0.040):
        return Vector((x, crack_y(x), z))

    heads = [
        # (base, pos, axis, D)
        (cb(-0.010), (-0.012, 0.006, 0.172), (-0.15, -0.45, 1.0), 0.090),
        (cb(0.018), (0.054, -0.014, 0.134), (0.45, -0.40, 1.0), 0.070),
        (cb(-0.030), (-0.068, -0.030, 0.104), (-0.50, -0.45, 1.0), 0.050),
    ]
    for base, pos, axis, D in heads:
        H = head_matrix(pos, axis, rnd.uniform(0, 6.28))
        build_stem(mb, base, H, 0.0034 * (D / 0.09) ** 0.5)
        build_flower(mb, H, D, rnd)
    Hb = head_matrix((0.018, 0.036, 0.150), (0.18, 0.25, 1.0), 0.4)
    build_stem(mb, cb(0.004), Hb, 0.0025)
    build_bud(mb, Hb, rnd)

    leaves = [
        (cb(-0.022, 0.050), (-0.5, -0.45, 0.85), 0.090, 0.0120),
        (cb(0.010, 0.050), (0.55, -0.35, 0.85), 0.082, 0.0115),
        (cb(-0.006, 0.050), (-0.15, 0.6, 0.85), 0.076, 0.0110),
        (cb(0.032, 0.050), (0.55, 0.4, 0.8), 0.066, 0.0100),
    ]
    for base, d, L, W in leaves:
        build_leaf(mb, base, d, L, W, rnd)

    bm = mb.bm
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.verts.index_update()
    me = bpy.data.meshes.new(NAME)
    bm.to_mesh(me)
    bm.free()
    attr = me.color_attributes.new("Col", "BYTE_COLOR", "CORNER")
    cols = mb.cols
    use_srgb = hasattr(attr.data[0], "color_srgb")
    for li, loop in enumerate(me.loops):
        c = cols[loop.vertex_index]
        if use_srgb:
            attr.data[li].color_srgb = (c[0], c[1], c[2], 1.0)
        else:
            attr.data[li].color = (_s2l(c[0]), _s2l(c[1]), _s2l(c[2]), 1.0)
    ob = bpy.data.objects.new(NAME, me)
    bpy.context.scene.collection.objects.link(ob)
    for m in mats:
        me.materials.append(m)
    C.set_origin_bottom(ob)
    C.log(f"verts={len(me.vertices)} faces={len(me.polygons)}")


main()
C.finish(NAME, notes=(
    "氷晶花: 低い岩の割れ目から花3（φ90/70/50mm）＋つぼみ1。花弁は2層×11枚の披針形クリスタル"
    "（断面8角ひし形・中央稜・フラットシェード）、付け根乳白→先端透明の3段材質＋頂点色。"
    "芯は濃紺の萼＋発光氷柱14本（#7FE3FF）。葉・花弁・岩の縁に実メッシュの霜。画像テクスチャなし"))
