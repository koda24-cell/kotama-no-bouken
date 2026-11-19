"""
b4p_toolbag_garud — ガルドの道具袋（物語の重要アイテム side-a4-toolbag「すすだらけの道具袋。ガルドと縫い取り」）

参考（Pinterest、references/b4-dragonfire-props-20261119.md、シートG）:
  #82 つるはし頭の鍛造形状と柄の楔（頭の目に柄が通り、楔で留まる）
  #83 スコップとつるはし：柄の摩耗（手の当たる所が艶）、金属の錆
形・寸法の要点（v2 で作り直し：v1 は明るい丸い袋で「芋・かぼちゃ」に見え、手袋が蜘蛛に見えたため）:
  - 全体 約0.6×0.38×0.46m。帆布の道具袋 0.48×0.29×0.30：底は平ら、胴は中身で膨らみ、口は前後に絞られる。
    下 55mm は革の底（縫い目の玉縁つき）、両端に縦の縫い目、口は折り返しのヘム
  - 革の持ち手2本：奥は立ったアーチ、手前は前へ倒れて垂れる。付け根は革のタブ＋鋲
  - つるはし：頭は袋の中で横向き、片方の尖りが前面の帆布を突き破って外へ出る（無理に詰めた）。
    柄（φ40mm）は口から斜め上へ突き出し z≈0.46。柄の上の方は手垢で黒く艶
  - 革の手袋：口の縁に掛かり、平たい指4本＋親指が前面へ垂れる（布に沿って曲がる）
  - 前面に革の名札：縁の縫い目と、糸で刺したつるはしの印（「ガルド」の縫い取りの代わり。文字は使わない）
劣化（設計書3章）:
  1 欠け＝左下の大きな焼け穴（縁は炭化・ほつれ）、突き破られた穴、ほつれた口、へたり（シルエットが崩れる）
  2 角の摩耗＝帆布の角の擦れ、革の角の艶、つるはしの尖りの地金
  3 煤＝袋の下ほど黒い、焼け穴の周りは炭化（明度は煤けた木と同じ 0.30 以下）
  4 灰＝上向きの面・しわの凹み
  5 熱変色＝焼け穴の縁、つるはしの頭の焼け
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
import bmesh  # noqa: E402
import bpy  # noqa: E402
import common as C  # noqa: E402
import lib_mine as L  # noqa: E402
from mathutils import Vector, noise  # noqa: E402

NAME = "b4p_toolbag_garud"
VERSION = "v2"
rnd = random.Random(82)
C.reset(82)

BURN = Vector((-0.21, -0.11, 0.075))
PIERCE = Vector((-0.165, -0.145, 0.115))
cloth = L.canvas("canvas", soot_z=(0.20, 0.0), scale=0.6, base=(0.040, 0.032, 0.024), heat_center=tuple(BURN), heat_r=(0.06, 0.15))
hide = L.leather("leather", scale=0.5, soot_z=(0.25, 0.0))
glove_m = L.leather("glove", scale=0.4, base=(0.048, 0.032, 0.019), soot_z=(0.30, 0.15))
thread = L.canvas("thread", scale=0.3, base=(0.075, 0.062, 0.045))
iron = C.weathered_iron("iron", heat_center=(-0.12, -0.10, 0.12), heat_r=(0.03, 0.2), rust=0.5, scale=0.4, wear=1.2)
wood = C.weathered_wood("wood", char=0.3, soot_z=(0.30, 0.48), grain_axis="X", scale=0.4)

parts = []

# ---- 帆布の袋（革の底つき） ----
HX, HY, HZ = 0.24, 0.13, 0.15
bm = L.soft_box_bm(HX, HY, HZ, cuts=9, n=4.0)
for v in bm.verts:
    v.co.z += HZ
top = [f for f in bm.faces if f.calc_center_median().z > 2 * HZ - 0.014 and f.normal.z > 0.6]
bmesh.ops.delete(bm, geom=top, context="FACES")
L.punch_holes(bm, [(BURN, 0.06), (BURN + Vector((0.05, -0.01, 0.045)), 0.022), (PIERCE, 0.024)], seed=4)
for v in bm.verts:
    x, y, z = v.co
    t = z / (2 * HZ)
    bulge = 1.0 + 0.13 * math.sin(math.pi * min(1.0, t * 1.15))
    pinch = 1.0 - 0.34 * t ** 2.4              # 口は前後に絞られる
    xg = 1.0 - 0.08 * t ** 2
    sag = 0.035 * t ** 3 * math.exp(-((x + 0.03) / 0.14) ** 2)
    x2 = x * xg * (1.0 + 0.05 * math.sin(math.pi * t)) + 0.018 * t ** 2
    y2 = y * bulge * pinch
    z2 = z - sag
    if t > 0.85:
        z2 += 0.010 * math.sin(math.atan2(y, x) * 5.0 + 1.0)
    v.co = Vector((x2, y2, max(0.0, z2)))
bm.normal_update()
for v in bm.verts:
    if v.co.z < 0.003:
        continue
    p = v.co
    fold = noise.noise(Vector((p.x * 14, p.y * 14, p.z * 4.5)) + Vector((3, 1, 7)))          # 大きな縦じわ
    crease = noise.noise(Vector((p.x * 34, p.y * 34, p.z * 10)) + Vector((9, 5, 2)))
    k = 1.0 if p.z > 0.06 else 0.35        # 革の底はしわが少ない
    v.co = p + v.normal * k * (0.011 * fold + 0.004 * crease)
L.jag_boundary(bm, 0.005, seed=6, zmin=0.2)
# 革の底（下 55mm）を材質 1 に
for f in bm.faces:
    f.material_index = 1 if f.calc_center_median().z < 0.055 else 0
bag = C.obj_from_bm(bm, "bag", smooth=True)
bag.data.materials.append(cloth)
bag.data.materials.append(hide)
m = bag.modifiers.new("solid", "SOLIDIFY")
m.thickness = 0.004
m.offset = -1.0
m.use_rim = True
C.apply_mods(bag)
parts.append(bag)

verts = [v.co.copy() for v in bag.data.vertices]


def contour(z, tol=0.014, bins=36, push=0.003):
    """高さ z 付近の外周（角度ごとに一番外側の頂点）→ 閉じた輪"""
    pts = []
    for k in range(bins):
        a = -math.pi + 2 * math.pi * (k + 0.5) / bins
        cand = [p for p in verts if abs(p.z - z) < tol and abs(math.atan2(math.sin(math.atan2(p.y, p.x) - a), math.cos(math.atan2(p.y, p.x) - a))) < math.pi / bins * 1.6]
        if not cand:
            continue
        q = max(cand, key=lambda p: Vector((p.x, p.y)).length)
        r = Vector((q.x, q.y)).length + push
        pts.append(Vector((r * math.cos(a), r * math.sin(a), z)))
    return pts


def rim_at(angle):
    def da(p):
        return abs(math.atan2(math.sin(math.atan2(p.y, p.x) - angle), math.cos(math.atan2(p.y, p.x) - angle)))
    rim = [p for p in verts if p.z > 0.2]
    cand = [p for p in rim if da(p) < 0.15] or rim
    return max(cand, key=lambda p: p.z + 0.2 * Vector((p.x, p.y)).length)


def surface_point(x, z, side=-1):
    cand = [p for p in verts if side * p.y > 0 and abs(p.x - x) < 0.025 and abs(p.z - z) < 0.025]
    if not cand:
        return Vector((x, side * HY, z))
    return max(cand, key=lambda p: side * p.y).copy()


# 革の底の縁の玉縁（縫い目）
bead = contour(0.056)
if len(bead) > 8:
    sb = C.sweep("bottom_bead", bead, C.circle_profile(0.0045, 5), closed=True)
    parts.append(C.assign(sb, hide))
# 両端の縦の縫い目（帆布の継ぎ目）
for k, sx in enumerate((-1, 1)):
    sp = []
    for j in range(9):
        z = 0.06 + j * 0.026
        cand = [p for p in verts if abs(p.z - z) < 0.012 and sx * p.x > 0 and abs(p.y) < 0.03]
        if cand:
            q = max(cand, key=lambda p: sx * p.x)
            sp.append(q + Vector((sx * 0.003, 0, 0)))
    if len(sp) > 3:
        parts.append(C.assign(C.sweep(f"side_seam{k}", sp, C.circle_profile(0.004, 5)), cloth))

# ---- 口の縁の折り返し（ヘム） ----
ring = []
for k in range(28):
    a = -math.pi + 2 * math.pi * k / 28
    p = rim_at(a)
    ring.append(p + Vector((math.cos(a), math.sin(a), 0)) * 0.002 + Vector((0, 0, -0.005)))
hem = C.sweep("hem", ring, C.circle_profile(0.008, 5, jitter=0.25, seed=2), closed=True)
C.displace_noise(hem, 0.0025, 40, seed=3)
parts.append(C.assign(hem, cloth))

# ---- つるはし：頭は袋の中で横向き、尖りが前面を突き破る。柄は口から斜め上へ ----
EYE = Vector((-0.115, -0.005, 0.15))
tipA = PIERCE + Vector((-0.012, -0.075, -0.012))
tipB = Vector((-0.075, 0.10, 0.20))
head_pts = C.bezier(tipA, EYE + Vector((0, -0.07, 0.012)), EYE + Vector((0, 0.07, 0.012)), tipB, n=12)
head = C.sweep("pick_head", head_pts, C.rect_profile(0.036, 0.028, chamfer=0.007),
               up_fn=lambda k, p, t: (1, 0, 0),
               scale_fn=lambda u: (max(0.10, 1 - abs(u - 0.5) * 1.8) ** 0.8, max(0.14, 1 - abs(u - 0.5) * 1.65) ** 0.7))
C.displace_noise(head, 0.0015, 40, seed=8)
parts.append(C.assign(head, iron))
eye_c = C.sweep("pick_eye", [EYE + Vector((-0.004, 0, -0.032)), EYE + Vector((0.004, 0, 0.032))], C.circle_profile(0.027, 8), smooth=False)
parts.append(C.assign(eye_c, iron))
H0 = EYE + Vector((-0.02, 0, -0.035))
H1 = Vector((0.30, 0.035, 0.455))
hpts = [H0.lerp(H1, t) + Vector((0, 0.004 * math.sin(t * 5), 0)) for t in (k / 9 for k in range(10))]
handle = C.sweep("pick_handle", hpts, [(x, y * 0.8) for x, y in C.circle_profile(0.020, 10)],
                 scale_fn=lambda u: 1.0 + 0.22 * max(0.0, u - 0.8) / 0.2, up_fn=lambda k, p, t: (0, 1, 0))
C.displace_noise(handle, 0.0012, 15, seed=9)
parts.append(C.assign(handle, wood))
wd = L.wedge("pick_wedge", 0.032, 0.013, 0.032, seed=3)
C.xform(wd, EYE + Vector((0.006, 0, 0.036)), (0, -30, 0))
parts.append(C.assign(wd, wood))
# 突き破られた穴の縁の裂けた帆布（尖りに引っかかってめくれた布片）
for k in range(4):
    a = 2 * math.pi * k / 4 + 0.4
    base = PIERCE + Vector((math.cos(a) * 0.022, -0.004, math.sin(a) * 0.022))
    tip = base + Vector((math.cos(a) * 0.012, -0.022, math.sin(a) * 0.012))
    fl = C.sweep(f"tear_{k}", [base, base.lerp(tip, 0.5) + Vector((0, 0, -0.003)), tip], C.rect_profile(0.016, 0.003), scale_fn=lambda u: (max(0.15, 1 - u), 1.0),
                 up_fn=lambda i, p, t, aa=a: (-math.sin(aa), 0, math.cos(aa)))
    parts.append(C.assign(fl, cloth))

# ---- 革の手袋（口の縁に掛かり、平たい指が前面へ垂れる） ----
gp = rim_at(-2.05) + Vector((0, 0, 0.006))
T_ = Vector((1, -0.25, 0)).normalized()          # 縁に沿った向き
IN_ = Vector((0.15, 1, 0)).normalized()          # 袋の内側
DOWN = Vector((0, -0.32, -1)).normalized()       # 前面に沿って下へ（胴の膨らみの分だけ前へ）


def gpath(s, v):
    """手袋の中心線：s<0 は口の内側（少し下がる）、s>0 は前面を垂れる。縁の上は半径 r の弧で曲がる"""
    r = 0.016
    if s < 0:
        p = gp + IN_ * (-s) + Vector((0, 0, 0.35 * s)) + Vector((0, 0, r))
    elif s < r * math.pi / 2:
        th = s / r
        p = gp + Vector((0, -1, 0)) * (r * math.sin(th)) + Vector((0, 0, r * math.cos(th)))
    else:
        p = gp + Vector((0, -r, 0)) + DOWN * (s - r * math.pi / 2)
    return p + T_ * v


def finger(name, v, s0, s1, w, h, curl=0.0, n=7):
    pts = [gpath(s0 + (s1 - s0) * i / n, v + curl * (i / n) ** 2) for i in range(n + 1)]
    ob = C.sweep(name, pts, [(x * w / 0.01, y * h / 0.01) for x, y in C.circle_profile(0.01, 8)],
                 up_fn=lambda k, p, t: tuple(T_), scale_fn=lambda u: max(0.55, 1.0 - 0.35 * u ** 2))
    C.displace_noise(ob, 0.0015, 60, seed=int(v * 1000) % 97)
    return C.assign(ob, glove_m)


# 手のひら（平たい帯）と袖口（口の中へ）
parts.append(finger("glove_palm", 0.0, -0.075, 0.04, 0.046, 0.011, n=8))
cuff = C.sweep("glove_cuff", [gpath(-0.14, 0.004), gpath(-0.10, 0.002), gpath(-0.07, 0.0)],
               [(x * 5.0, y * 2.2) for x, y in C.circle_profile(0.01, 10)], up_fn=lambda k, p, t: tuple(T_),
               scale_fn=lambda u: 1.0 + 0.15 * (1 - u))
parts.append(C.assign(cuff, glove_m))
for f in range(4):
    v = -0.033 + f * 0.022
    L0 = 0.07 + (0.012 if f in (1, 2) else 0.0) + rnd.uniform(-0.004, 0.004)
    parts.append(finger(f"glove_f{f}", v, 0.032, 0.032 + L0, 0.0105, 0.0075, curl=rnd.uniform(-0.006, 0.006)))
th = C.sweep("glove_thumb", [gpath(0.0, 0.045), gpath(0.012, 0.062), gpath(0.04, 0.072), gpath(0.06, 0.07)],
             [(x * 1.1, y * 0.8) for x, y in C.circle_profile(0.011, 8)], up_fn=lambda k, p, t: tuple(T_),
             scale_fn=lambda u: 1.0 - 0.3 * u)
parts.append(C.assign(th, glove_m))

# ---- 前面の革の名札＋縫い取り ----
pc = surface_point(0.085, 0.145, -1)
patch = L.plank("name_patch", 0.12, 0.075, 0.006, segs=3, seed=31, round_edges=0.3, chip=0.004)
C.xform(patch, pc + Vector((0, -0.002, 0)), (90 + rnd.uniform(-4, 4), 0, rnd.uniform(-6, 6)))
parts.append(C.assign(patch, hide))
bpy.context.view_layer.update()
pm = patch.matrix_world.copy()


def on_patch(u, v, lift=0.0042):
    """名札ローカル（u: -0.06..0.06, v: -0.037..0.037）→ 世界。表（ローカル +Z＝世界 -Y 側）に少し浮かせる"""
    return pm @ Vector((u, v, lift))


k = 0
for side in range(4):
    for j in range(5 if side % 2 == 0 else 3):
        if side == 0:
            a, b_ = (-0.05 + j * 0.021, -0.028), (-0.05 + j * 0.021 + 0.012, -0.028)
        elif side == 2:
            a, b_ = (-0.05 + j * 0.021, 0.028), (-0.05 + j * 0.021 + 0.012, 0.028)
        elif side == 1:
            a, b_ = (0.051, -0.02 + j * 0.017), (0.051, -0.02 + j * 0.017 + 0.01)
        else:
            a, b_ = (-0.051, -0.02 + j * 0.017), (-0.051, -0.02 + j * 0.017 + 0.01)
        st = C.sweep(f"stitch_{k}", [on_patch(*a), on_patch(*b_)], C.circle_profile(0.0014, 4), smooth=False)
        parts.append(C.assign(st, thread))
        k += 1
arc = [on_patch(-0.032 + 0.064 * t, 0.014 - 0.022 * (2 * t - 1) ** 2 + 0.004) for t in (i / 8 for i in range(9))]
parts.append(C.assign(C.sweep("emblem_head", arc, C.circle_profile(0.0019, 4)), thread))
parts.append(C.assign(C.sweep("emblem_handle", [on_patch(0.0, 0.016), on_patch(0.004, -0.022)], C.circle_profile(0.0019, 4)), thread))
for k, (u, v) in enumerate(((-0.05, -0.03), (0.05, -0.03), (-0.05, 0.03), (0.05, 0.03))):
    rv = C.dome(f"patch_rivet_{k}", 0.0042, 0.003, sides=6)
    C.place_on(rv, on_patch(u, v, 0.003), (0, -1, 0))
    parts.append(C.assign(rv, iron))

# ---- 革の持ち手：奥は立ったアーチ、手前は前へ倒れて垂れる。付け根に革のタブと鋲 ----
for k, (a0, a1, side, lift, fwd) in enumerate(((1.95, 1.2, 1, 0.13, 0.02), (-1.92, -1.22, -1, -0.07, 0.07))):
    p0, p1 = rim_at(a0), rim_at(a1)
    mid = (p0 + p1) / 2 + Vector((0, side * fwd, lift))
    q0 = p0 + Vector((0, side * 0.008, -0.03))
    q1 = p1 + Vector((0, side * 0.008, -0.03))
    pts = C.bezier(q0, q0 + (mid - q0) * 0.55 + Vector((0, 0, abs(lift) * 0.6 + 0.03)), q1 + (mid - q1) * 0.55 + Vector((0, 0, abs(lift) * 0.6 + 0.03)), q1, n=14)
    st = C.sweep(f"strap_{k}", pts, C.rect_profile(0.030, 0.007, chamfer=0.0015), up_fn=lambda i, p, t, s=side: (0, s, 0.2))
    C.displace_noise(st, 0.002, 20, seed=40 + k)
    parts.append(C.assign(st, hide))
    for j, q in enumerate((q0, q1)):
        tab = L.plank(f"tab_{k}{j}", 0.05, 0.04, 0.005, segs=2, seed=50 + k * 2 + j, round_edges=0.3)
        C.place_on(tab, q + Vector((0, side * 0.003, -0.012)), (0, side, 0), spin=math.pi / 2)
        parts.append(C.assign(tab, hide))
        rv = C.dome(f"tab_rivet_{k}{j}", 0.005, 0.0035, sides=6)
        C.place_on(rv, q + Vector((0, side * 0.0065, -0.018)), (0, side, 0))
        parts.append(C.assign(rv, iron))

C.finish(NAME, parts, version=VERSION, tex_res=1024, budget_tris=5000, refs=[82, 83],
         notes="ガルドの道具袋。煤けた帆布＋革の底、焼け穴、つるはしの尖りが前面を突き破り、柄が口から突き出す。革の持ち手2本、口に掛かった手袋、名札（縫い目と糸のつるはし印＝縫い取りの代わり、文字なし）。")
