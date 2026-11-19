"""
b4p_brazier_cage — 鍛鉄の籠型火鉢（坑道の灯り／休憩所）

参考（Pinterest、references/b4-dragonfire-props-20261119.md）:
  #34 籠型の鉄火鉢（縦バー＋リング、三脚、錆と煤）
  #39 鍛造の籠（帯鉄・リベット・脚の巻き）
  #37 鋳鉄火鉢の炎と燠
  #103 錆：黒い地金に赤錆の島と剥離、リベット列
形・寸法の要点:
  - 全高 0.9m、籠 z=0.40〜0.86、上径 0.60 / 下径 0.44（上に開く）
  - 縦の帯鉄 12本（1本欠落、1本は途中で折れて外へ曲がる）、帯鉄の上端は外へ小さく反る
  - リング 3段（上リングは凹み）、交点にリベット
  - 三本脚は外へ開き、足先は小さく巻く。1本はわずかに曲がっている
  - 中身：灰の床＋燠火（割れ目だけ光る）＋燃え残りの薪、足元にこぼれた炭と灰
劣化（設計書3章）:
  欠け＝欠落した帯鉄・折れた帯鉄・凹んだリング／角の摩耗＝帯鉄の角で地金／
  煤＝上半分と内側／灰＝凹みと上向き面／熱変色＝燠火の周りが青黒〜紫茶
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
import common as C  # noqa: E402
from mathutils import Vector  # noqa: E402

NAME = "b4p_brazier_cage"
rnd = random.Random(41)
C.reset(41)

HEAT = (0.0, 0.0, 0.56)
iron = C.weathered_iron("iron", heat_center=HEAT, heat_r=(0.08, 0.42), soot_z=(0.55, 0.88), rust=0.55)
coal = C.ember_coal("coal", glow=1.0)
coal_dead = C.ember_coal("coal_dead", glow=0.12)
ash = C.ash_bed("ash")
wood = C.weathered_wood("wood", char=1.0, heat_center=HEAT, heat_r=(0.05, 0.3), grain_axis="X", scale=0.5)

parts = []
Z0, Z1 = 0.40, 0.86          # 籠の下端・上端
R0, R1 = 0.22, 0.30          # 下半径・上半径
STRAP = C.rect_profile(0.008, 0.030, chamfer=0.0025)  # n=半径方向の厚み、b=周方向の幅


def rad_at(z):
    t = min(1.0, max(0.0, (z - Z0) / (Z1 - Z0)))
    return R0 + (R1 - R0) * (t ** 0.85) + 0.012 * math.sin(math.pi * t)  # 少し膨らむ


def radial_up(px, py):
    def f(i, p, t):
        return Vector((p.x, p.y, 0.0)).normalized() if Vector((p.x, p.y)).length > 1e-4 else Vector((1, 0, 0))
    return f


# ---- 縦の帯鉄 ----
N = 12
missing = 7
broken = 3
for i in range(N):
    if i == missing:
        continue
    a = 2 * math.pi * i / N + rnd.uniform(-0.05, 0.05)
    ca, sa = math.cos(a), math.sin(a)
    pts = []
    steps = 9
    for k in range(steps + 1):
        z = Z0 - 0.015 + (Z1 + 0.035 - Z0) * k / steps
        r = rad_at(min(z, Z1))
        if z > Z1:  # 上端は外へ反る
            r += (z - Z1) * 2.4 + ((z - Z1) / 0.035) ** 2 * 0.012
        pts.append(Vector((r * ca, r * sa, z)))
    if i == broken:  # 途中で折れ、上側は外へねじれて曲がる（先端は欠落）
        cut = 5
        lower = pts[:cut + 1]
        p_c = lower[-1]
        out = Vector((ca, sa, 0))
        upper = [p_c + out * 0.004, p_c + out * 0.05 + Vector((0, 0, 0.07)), p_c + out * 0.13 + Vector((-sa * 0.03, ca * 0.03, 0.10))]
        ob = C.sweep(f"strap_{i}a", lower, STRAP, up_fn=radial_up(ca, sa))
        parts.append(C.assign(ob, iron))
        ob = C.sweep(f"strap_{i}b", C.bezier(upper[0], upper[1], upper[2], n=6), STRAP,
                     up_fn=lambda k, p, t, o=out: o, scale_fn=lambda u: (1.0, 1.0 - 0.35 * u))
        parts.append(C.assign(ob, iron))
        continue
    w = rnd.uniform(0.025, 0.034)
    tw = rnd.uniform(-0.15, 0.15)
    ob = C.sweep(f"strap_{i}", pts, C.rect_profile(0.008, w, chamfer=0.0025),
                 up_fn=lambda k, p, t, tw=tw: (Vector((p.x, p.y, 0)).normalized() + t.cross(Vector((p.x, p.y, 0)).normalized()) * tw * math.sin(k)),
                 scale_fn=lambda u: (1.0, 1.0 + 0.12 * math.sin(u * 7 + i)))
    C.displace_noise(ob, 0.004, 6.0, seed=i)
    C.displace_noise(ob, 0.0012, 45.0, seed=i + 100)  # 鍛造の槌目
    parts.append(C.assign(ob, iron))

# ---- リング（帯を立てて巻く） ----
BAND = C.rect_profile(0.010, 0.040, chamfer=0.002)  # n=半径方向の厚み、b=高さ


def ring(z, dent=0.0, seed=0, segs=40, band=BAND, rr=None):
    pts = []
    for k in range(segs):
        a = 2 * math.pi * k / segs
        r = (rr or rad_at(z)) + 0.009
        r -= dent * max(0.0, math.cos(a - 1.1)) ** 6  # 一か所が内へ凹む
        r += 0.003 * math.sin(a * 5 + seed)
        zz = z + 0.004 * math.sin(a * 3 + seed)
        pts.append(Vector((r * math.cos(a), r * math.sin(a), zz)))

    def up(k, p, t):
        return Vector((p.x, p.y, 0)).normalized()
    return C.sweep(f"ring_{z:.2f}", pts, band, up_fn=up, closed=True)


for z, dent in ((Z1 - 0.005, 0.035), (0.62, 0.0), (Z0 + 0.01, 0.0)):
    parts.append(C.assign(ring(z, dent, seed=int(z * 100)), iron))

# ---- 底の格子 ----
for k in range(3):
    a = math.pi * k / 3 + 0.3
    d = Vector((math.cos(a), math.sin(a), 0)) * (R0 + 0.005)
    ob = C.sweep(f"grate_{k}", [Vector((0, 0, Z0 + 0.012)) - d, Vector((0, 0, Z0 + 0.012)) + d],
                 C.rect_profile(0.008, 0.022), up_fn=lambda i, p, t: Vector((0, 0, 1)))
    parts.append(C.assign(ob, iron))

# ---- 三本脚（外へ開き、足先が巻く） ----
for k in range(3):
    a = 2 * math.pi * k / 3 + 0.45
    ca, sa = math.cos(a), math.sin(a)
    out = Vector((ca, sa, 0))
    bend = 0.03 if k == 1 else 0.0
    p0 = out * (R0 + 0.01) + Vector((0, 0, Z0 + 0.06))
    p1 = out * (R0 + 0.03) + Vector((-sa * bend, ca * bend, 0.22))
    p2 = out * (R0 + 0.13) + Vector((0, 0, 0.05))
    p3 = out * (R0 + 0.12) + Vector((0, 0, 0.012))
    leg = C.bezier(p0, p1, p2, p3, n=12)
    # 足先の巻き（小さな渦）
    c = out * (R0 + 0.155) + Vector((0, 0, 0.035))
    for j in range(1, 8):
        t = j / 7 * math.pi * 1.4
        rr = 0.028 * (1 - j / 10)
        leg.append(c + out * (-math.cos(t) * rr) + Vector((0, 0, -math.sin(t) * rr)))
    side = Vector((-sa, ca, 0))
    ob = C.sweep(f"leg_{k}", leg, C.rect_profile(0.036, 0.012, chamfer=0.003), up_fn=lambda i, p, t, s=side: s)
    parts.append(C.assign(ob, iron))

# ---- リベット（帯鉄×リングの外側） ----
for i in range(N):
    if i in (missing,):
        continue
    a = 2 * math.pi * i / N
    for z in (Z1 - 0.005, 0.62, Z0 + 0.01):
        if i == broken and z > 0.62:
            continue
        r = rad_at(z) + 0.016
        rv = C.dome(f"rivet_{i}_{z:.2f}", 0.0075, 0.005, sides=6)
        C.place_on(rv, (r * math.cos(a), r * math.sin(a), z), (math.cos(a), math.sin(a), 0))
        parts.append(C.assign(rv, iron))

# ---- 灰の床 ----
import bmesh  # noqa: E402
bm = bmesh.new()
bmesh.ops.create_circle(bm, cap_ends=True, radius=R0 + 0.02, segments=28)
bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=2, use_grid_fill=True)
for v in bm.verts:
    d = Vector((v.co.x, v.co.y)).length / (R0 + 0.02)
    v.co.z = Z0 + 0.02 + 0.09 * (1 - d * d) + 0.012 * C.noise.noise(v.co * 18)
bed = C.obj_from_bm(bm, "ash_bed")
parts.append(C.assign(bed, ash))

# ---- 燠火（山盛りの炭）：下層ほど赤く、上は灰をかぶった炭 ----
for j in range(46):
    r = (R0 - 0.025) * math.sqrt(rnd.random())
    a = rnd.uniform(0, 2 * math.pi)
    d = r / (R0 + 0.02)
    layer = rnd.random()
    z = Z0 + 0.025 + 0.085 * (1 - d * d) + layer * 0.05
    sz = rnd.uniform(0.016, 0.042) * (1.15 - 0.4 * layer)
    ob = C.rock(f"coal_{j}", sz, detail=2 if sz > 0.026 else 1, rough=0.4, squash=(1, rnd.uniform(0.7, 1), rnd.uniform(0.5, 0.8)), seed=j, facet=2)
    C.xform(ob, (r * math.cos(a), r * math.sin(a), z), (rnd.uniform(0, 360), rnd.uniform(0, 360), rnd.uniform(0, 360)))
    parts.append(C.assign(ob, coal if (layer < 0.55 and d < 0.8) else coal_dead))

# ---- 吊り輪の取っ手（左右） ----
for k, a in enumerate((0.0, math.pi)):
    ca, sa = math.cos(a + 0.26), math.sin(a + 0.26)
    out = Vector((ca, sa, 0))
    rr = rad_at(Z1) + 0.02
    eye = out * rr + Vector((0, 0, Z1 - 0.03))
    lp = C.dome(f"eye_{k}", 0.012, 0.012, sides=6)
    C.place_on(lp, eye, out)
    parts.append(C.assign(lp, iron))
    cen = eye + out * 0.03 + Vector((0, 0, -0.04))
    side = Vector((-sa, ca, 0))
    tilt = Vector((0, 0, 1)).lerp(out, 0.35).normalized()
    pts = [cen + (side * math.cos(t) + tilt * math.sin(t)) * 0.045 for t in (2 * math.pi * q / 18 for q in range(18))]
    hr = C.sweep(f"handle_{k}", pts, C.circle_profile(0.0065, 6), closed=True)
    C.displace_noise(hr, 0.002, 30, seed=k)
    parts.append(C.assign(hr, iron))

# ---- 燃え残りの薪（2本が籠の縁から突き出す） ----
for j, (a, tilt) in enumerate(((0.6, 34), (2.9, 28))):
    ca, sa = math.cos(a), math.sin(a)
    p0 = Vector((-ca * 0.08, -sa * 0.08, Z0 + 0.10))
    p1 = Vector((ca * 0.30, sa * 0.30, Z0 + 0.10 + 0.38 * math.tan(math.radians(tilt)) * 0.6))
    pts = [p0.lerp(p1, t) + Vector((0, 0, 0.01 * math.sin(t * 9))) for t in (k / 6 for k in range(7))]
    ob = C.sweep(f"log_{j}", pts, C.circle_profile(0.024, 7, jitter=0.18, seed=j), scale_fn=lambda u: 1.0 - 0.45 * u)
    parts.append(C.assign(ob, wood))

# ---- 足元にこぼれた炭（灰の板は地面と馴染まないため置かない。灰は配置側の地面で表現） ----
for j in range(4):
    ob = C.rock(f"spill_coal_{j}", rnd.uniform(0.02, 0.035), detail=1, rough=0.3, squash=(1, 0.8, 0.6), seed=50 + j, facet=3)
    C.xform(ob, (0.10 + rnd.uniform(-0.1, 0.15), -0.18 + rnd.uniform(-0.08, 0.08), 0.012), (rnd.uniform(0, 360), 0, rnd.uniform(0, 360)))
    parts.append(C.assign(ob, coal_dead))

C.finish(NAME, parts, version="v3", lights=[((0.0, 0.0, 0.58), 18.0, (1.0, 0.42, 0.14))], tex_res=1024, budget_tris=10000,
         refs=[34, 39, 37, 103],
         notes="鍛鉄の籠型火鉢。欠落1本・折損1本・凹んだ上リング・曲がった脚1本。燠火は割れ目のみ発光。")
