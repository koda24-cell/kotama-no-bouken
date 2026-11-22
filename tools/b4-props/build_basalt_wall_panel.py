"""
b4p_basalt_wall_panel_a / _b — 玄武岩の壁面パネル（設計図 docs/3d/b4-props/blueprints/b4p_basalt_wall_panel.md）

原点=底面・横中央・背面（y=0 が壁）。前（通路側）は -Y、上は +Z。
下層：崩れた岩の裾／中層：柱状節理（隙間の奥で溶岩が光る）／上層：張り出した岩棚。炎竜鉱の小結晶が隙間から突き出す。
"""
import math
import os
import random
import sys

import bmesh

sys.path.insert(0, os.path.dirname(__file__))
import common as C  # noqa: E402
from mathutils import Vector  # noqa: E402

# ---- 設計図の寸法 ----
W, H = 4.10, 4.00
EDGE = 0.25                      # 左右の絞り込み幅
LOW_Z, MID_Z0, MID_Z1, TOP_Z0 = 1.05, 1.00, 2.75, 2.70
LOW_DEPTH = (0.45, 0.85)
COL_W = (0.36, 0.52)
COL_DEPTH = (0.22, 0.45)
GAP = (0.012, 0.032)
LEDGE_LEN = (1.1, 1.6)
LEDGE_DEPTH = (0.35, 0.6)


def depth_limit(x):
    """左右の端で張り出しを 0.25m まで絞る"""
    t = max(0.0, (abs(x) - (W / 2 - EDGE - 0.35)) / (EDGE + 0.35))
    return 1.0 - 0.7 * min(1.0, t)


def basalt_rock(name):
    b = C.NB(name)
    diff = b.image(C.cc0("rock_face_02", "diff"), 0.9)
    nrm = b.image(C.cc0("rock_face_02", "nor_gl"), 0.9)
    n_big = b.noise(0.8, 6, 0.6)
    n_mid = b.noise(4.0, 6, 0.6)
    base = b.mix(n_mid, (0.024, 0.020, 0.018), (0.046, 0.039, 0.034))
    if diff is not None:
        hs = b.n("ShaderNodeHueSaturation")
        hs.inputs["Saturation"].default_value = 0.55
        hs.inputs["Value"].default_value = 0.45
        b.link(diff, hs.inputs["Color"])
        base = b.mix(0.55, base, hs.outputs[0], "MULTIPLY")
    ox = b.ramp(n_big, [(0.56, 0.0), (0.74, 1.0)])          # 熱で酸化した赤茶
    base = b.mix(b.math("MULTIPLY", ox, 0.65), base, (0.085, 0.034, 0.018))
    edge = b.edge_mask(0.02, 0.03, 0.25)                     # 欠けた角の新しい断面
    base = b.mix(b.math("MULTIPLY", edge, 0.5), base, (0.10, 0.092, 0.084))
    cav = b.math("SUBTRACT", 1.0, b.cavity(0.12))
    up = b.up_mask(0.6, 0.95)
    ash = b.math("MAXIMUM", b.math("MULTIPLY", up, 0.55), b.math("MULTIPLY", cav, 0.25))
    ash = b.math("MULTIPLY", ash, b.ramp(n_big, [(0.3, 0.3), (0.7, 1.0)]))
    base = b.mix(ash, base, (0.085, 0.080, 0.075))
    soot = b.math("MULTIPLY", cav, 0.6)
    base = b.mix(soot, base, (0.010, 0.009, 0.008))
    r = b.mixf(edge, 0.9, 0.72)
    r = b.mixf(ash, r, 0.97)
    b.normal_from(nrm, 0.9, bump_height=n_mid, bump_strength=0.3, bump_dist=0.01)
    return b.out(base, r, 0.0)


def lava_glow(name):
    """隙間の奥の溶岩：斑に光る（板全体は光らせない）"""
    b = C.NB(name)
    n = b.noise(1.6, 6, 0.6)
    n2 = b.noise(7.0, 4, 0.5)
    m = b.ramp(b.math("ADD", n, b.math("MULTIPLY", n2, 0.3)), [(0.58, 0.0), (0.7, 0.5), (0.85, 1.0)])
    col = b.mix(m, (0.03, 0.008, 0.004), (0.35, 0.06, 0.01))
    emit = b.ramp(m, [(0.0, (0, 0, 0)), (0.5, (0.6, 0.12, 0.02)), (1.0, (1.0, 0.36, 0.05))])
    return b.out(col, 0.6, 0.0, emit=emit, emit_strength=3.2)


def ore_crystal(name):
    b = C.NB(name)
    n = b.noise(12.0, 4, 0.5)
    col = b.mix(n, (0.07, 0.006, 0.006), (0.16, 0.012, 0.010))
    cr = b.ramp(b.voronoi(14.0, "DISTANCE_TO_EDGE"), [(0.0, 1.0), (0.05, 0.0)])
    cav = b.math("SUBTRACT", 1.0, b.cavity(0.05))            # 根元（岩との隙間）と内部のひびだけ光る
    e = b.math("MAXIMUM", b.math("MULTIPLY", cav, 1.2), b.math("MULTIPLY", cr, 0.6))
    emit = b.ramp(e, [(0.0, (0, 0, 0)), (0.6, (0.3, 0.03, 0.01)), (1.0, (1.0, 0.18, 0.04))])
    return b.out(col, 0.3, 0.0, emit=emit, emit_strength=3.0)


def prism(name, cx, w, d, z0, z1, rnd, top_tilt, bot_tilt, sides=6):
    """前に張り出した不規則な六角柱。背面は y≈0.05（壁に少し埋める）"""
    bm = bmesh.new()
    prof = []
    for i in range(sides):
        a = 2 * math.pi * i / sides + rnd.uniform(-0.12, 0.12)
        prof.append((math.cos(a) * w / 2 * rnd.uniform(0.88, 1.08), math.sin(a) * d / 2 * rnd.uniform(0.88, 1.08)))
    cy = -d / 2 - 0.31
    tdx, tdy = math.tan(math.radians(top_tilt)), rnd.uniform(-0.15, 0.15)
    bdx = math.tan(math.radians(bot_tilt))
    bot = [bm.verts.new((cx + x, cy + y, z0 + x * bdx)) for x, y in prof]
    top = [bm.verts.new((cx + x, cy + y, z1 + x * tdx + y * tdy)) for x, y in prof]
    for i in range(sides):
        j = (i + 1) % sides
        bm.faces.new((bot[i], bot[j], top[j], top[i]))
    bm.faces.new(list(reversed(bot)))
    bm.faces.new(top)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    # 天端の欠け：上面の1〜2頂点を下げる
    for v in rnd.sample(top, 2):
        v.co.z -= rnd.uniform(0.03, 0.09)
    ob = C.obj_from_bm(bm, name, smooth=False)
    m = ob.modifiers.new("sub", "SUBSURF")
    m.levels = 1
    m.subdivision_type = "SIMPLE"
    C.apply_mods(ob)
    C.displace_noise(ob, 0.018, 3.5, seed=int(cx * 100))
    return C.bevel(ob, 0.012, 1, 35)


def build(variant, seed):
    C.reset(seed)
    rnd = random.Random(seed)
    rock = basalt_rock("basalt")
    lava = lava_glow("lava")
    ore = ore_crystal("ore")
    parts = []
    # 背面の岩肌：隙間から向こうが抜けないよう、全面に起伏のある岩の面を張る（大きなうねり＋割れの段差）
    bm = bmesh.new()
    NX, NZ = 34, 32
    grid = []
    off = Vector((seed * 1.7, seed * 0.3, 0))
    for j in range(NZ + 1):
        row = []
        for i in range(NX + 1):
            x = -W / 2 + W * i / NX
            z = H * j / NZ
            n1 = C.noise.fractal(Vector((x * 0.7, z * 0.7, 0)) + off, 0.6, 2.0, 4)
            n2 = C.noise.noise(Vector((x * 2.6, z * 2.2, 3.0)) + off)
            step = 0.06 if C.noise.noise(Vector((x * 1.3, z * 0.9, 7.0)) + off) > 0.25 else 0.0   # 割れの段差
            band = 1.0 if MID_Z0 - 0.1 < z < MID_Z1 + 0.05 and abs(x) < W / 2 - 0.2 else 0.0
            y = -(0.10 + 0.16 * (n1 + 0.5) + 0.05 * n2 + step) * depth_limit(x) * (1.0 - 0.75 * band)   # 柱の帯は奥へ凹ませる
            row.append(bm.verts.new((x, y, z)))
        grid.append(row)
    for j in range(NZ):
        for i in range(NX):
            bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:                       # 法線を通路側（-Y）へ
        if f.normal.y > 0:
            f.normal_flip()
    back = C.obj_from_bm(bm, "backing", smooth=True)
    parts.append(C.assign(back, rock))
    # 中層：柱状節理
    x = -W / 2 + 0.2
    cols = []
    while x < W / 2 - 0.25:
        w = rnd.uniform(*COL_W)
        if x + w > W / 2:
            w = W / 2 - x
        cx = x + w / 2
        d = rnd.uniform(*COL_DEPTH) * depth_limit(cx)
        z0 = MID_Z0 + rnd.uniform(-0.05, 0.12)
        z1 = MID_Z1 + rnd.uniform(-0.25, 0.08) if rnd.random() > 0.25 else rnd.uniform(1.55, 2.2)   # 4本に1本は折れて短い
        ob = prism(f"col_{len(cols)}", cx, w, max(0.18, d), z0, z1, rnd, rnd.uniform(-25, 25), rnd.uniform(-8, 8))
        parts.append(C.assign(ob, rock))
        cols.append((cx, w, d, z1))
        x += w + rnd.uniform(*GAP)
    # 柱の隙間の奥だけ溶岩が光る：隙間ごとに細い発光帯（4割の隙間）。柱の背面(-0.28)と凹ませた岩肌(約-0.08)の間
    for k in range(len(cols) - 1):
        if rnd.random() > 0.45:
            continue
        cx, w, d, z1 = cols[k]
        gx = cx + w / 2 + 0.012
        zt = min(z1, cols[k + 1][3]) - rnd.uniform(0.1, 0.5)
        zb = MID_Z0 + rnd.uniform(0.0, 0.3)
        bm = bmesh.new()
        vs = [bm.verts.new(p) for p in ((gx - 0.05, -0.2, zb), (gx + 0.05, -0.2, zb), (gx + 0.05, -0.2, zt), (gx - 0.05, -0.2, zt))]
        bm.faces.new(list(reversed(vs)))
        st = C.obj_from_bm(bm, f"joint_glow_{k}", smooth=False)
        parts.append(C.assign(st, lava))
    # 斜めの割れ目：2本の柱を途中で切って段差（割れた位置に発光）
    for k in rnd.sample(range(len(cols)), min(2, len(cols))):
        cx, w, d, z1 = cols[k]
        zc = rnd.uniform(1.5, 2.2)
        sl = C.rock(f"crack_glow_{k}", 0.05, detail=1, rough=0.2, squash=(w * 9, 0.6, 0.35), seed=k + seed)
        C.xform(sl, (cx, -0.31 - d * 1.0, zc), (0, rnd.uniform(-20, 20), 0))
        parts.append(C.assign(sl, lava))
    # 下層：崩れた岩の裾
    for i in range(rnd.randint(13, 17)):
        rx = rnd.uniform(-W / 2 + 0.25, W / 2 - 0.25)
        r = rnd.uniform(0.18, 0.42)
        dlim = depth_limit(rx)
        sq = (1.0, rnd.uniform(0.7, 1.0) * dlim, rnd.uniform(0.55, 0.85))
        ob = C.rock(f"rubble_{i}", r, detail=2, rough=0.28, squash=sq, seed=seed * 10 + i, facet=4)
        # 地面に載せる（底を z≈0 に）。奥の岩ほど高く積む
        yy = -0.3 - rnd.uniform(0.0, min(0.5, 0.55 * dlim))
        zz = r * sq[2] * 0.75 + (0.35 if yy > -0.5 and rnd.random() < 0.4 else 0.0)
        C.xform(ob, (rx, yy, zz), (rnd.uniform(-20, 20), rnd.uniform(-20, 20), rnd.uniform(0, 360)))
        parts.append(C.assign(ob, rock))
    # 上層：張り出した岩棚
    x = -W / 2 + 0.1
    i = 0
    while x < W / 2 - 0.3:
        L = min(rnd.uniform(*LEDGE_LEN), W / 2 - x)
        cx = x + L / 2
        d = rnd.uniform(*LEDGE_DEPTH) * depth_limit(cx)
        th = rnd.uniform(0.45, 0.8)
        ob = C.rock(f"ledge_{i}", 0.5, detail=2, rough=0.22, squash=(L, d * 1.6, th * 1.3), seed=seed * 20 + i, facet=5)
        C.xform(ob, (cx, -0.18 - d * 0.35, rnd.uniform(TOP_Z0 + th * 0.4, H - th * 0.35)), (rnd.uniform(-6, 6), rnd.uniform(-5, 5), rnd.uniform(-4, 4)))
        parts.append(C.assign(ob, rock))
        x += L * rnd.uniform(0.82, 0.95)
        i += 1
    # 炎竜鉱の小結晶群（隙間から突き出す）
    for (zz, n) in ((0.7, 5), (1.9, 4)):
        k = rnd.randrange(len(cols) - 1)
        cx, w, d, _ = cols[k]
        gx = cx + w / 2 + 0.02
        for j in range(n):
            L = rnd.uniform(0.12, 0.32)
            bm = bmesh.new()
            ring = [bm.verts.new((math.cos(a) * L * 0.18, math.sin(a) * L * 0.18, 0)) for a in (2 * math.pi * q / 6 for q in range(6))]
            tip = bm.verts.new((0, 0, L))
            for q in range(6):
                bm.faces.new((ring[q], ring[(q + 1) % 6], tip))
            bm.faces.new(list(reversed(ring)))
            cr = C.obj_from_bm(bm, f"ore_{zz}_{j}", smooth=False)
            dirv = Vector((rnd.uniform(-0.6, 0.6), -1.0, rnd.uniform(-0.2, 0.9))).normalized()
            C.place_on(cr, (gx + rnd.uniform(-0.05, 0.05), -0.31 - d * rnd.uniform(0.3, 0.8), zz + rnd.uniform(-0.12, 0.12)), dirv, rnd.uniform(0, 6.28))
            parts.append(C.assign(cr, ore))
    name = f"b4p_basalt_wall_panel_{variant}"
    return C.finish(name, parts, version="v3", tex_res=1024, budget_tris=9000, refs=[30, 31, 33, 41],
                    lights=[((0.0, -0.9, 1.6), 30.0, (1.0, 0.35, 0.1))],
                    notes="壁面パネル。中層の柱の隙間の奥で溶岩が光る。左右の端は張り出しを絞って隣とつなぐ。")


build("a", 404)
build("b", 515)
