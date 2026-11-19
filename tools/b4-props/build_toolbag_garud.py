"""
b4p_toolbag_garud — ガルドの道具袋（物語の重要アイテム side-a4-toolbag「すすだらけの道具袋。ガルドと縫い取り」）

参考（Pinterest、references/b4-dragonfire-props-20261119.md）:
  #82 つるはし頭の鍛造形状と柄の楔（頭の目に柄が通り、楔で留まる）
  #83 スコップとつるはし：柄の摩耗（手の当たる所が艶）、金属の錆
形・寸法の要点:
  - 全体 約0.6×0.4×0.45m。帆布の袋（0.46×0.28×0.30、角の丸い箱がくたっと潰れた形、口は絞られて波打つ）
  - 袋の中につるはし：頭は袋の中で横向き、片方の尖りが前面の帆布を突き破って外へ出る（物語：無理に詰めた）
    柄は口から斜め上へ突き出し、袋の端を越える（z≈0.45）。柄の上の方が手垢で艶
  - 革の手袋が前の口の縁に掛かり、指が外へ垂れる
  - 前面に革の名札（縫い取りの代わりに、縁の縫い目と焼き印の丸）。革の持ち手1本が前へ垂れる
  - 口の縁は折り返しの縁（ヘム）、ほつれてギザギザ
劣化（設計書3章）:
  欠け＝焼け穴（左下の角）と突き破られた穴、ほつれた口、袋のへたり（シルエットが崩れる）
  角の摩耗＝帆布の角の擦れ（明るい）、革の角の艶、つるはしの尖りの地金
  煤＝袋の下ほど黒い、焼け穴の周りは炭化
  灰＝上向きの面・しわの凹み
  熱変色＝焼け穴の縁、つるはしの頭の焼け
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
import bmesh  # noqa: E402
import common as C  # noqa: E402
import lib_mine as L  # noqa: E402
from mathutils import Vector, noise  # noqa: E402

NAME = "b4p_toolbag_garud"
VERSION = "v1"
rnd = random.Random(82)
C.reset(82)

BURN = Vector((-0.20, -0.12, 0.06))
PIERCE = Vector((-0.115, -0.15, 0.115))
cloth = L.canvas("canvas", soot_z=(0.16, 0.0), scale=0.6, heat_center=tuple(BURN), heat_r=(0.035, 0.10))
hide = L.leather("leather", scale=0.5, soot_z=(0.25, 0.0))
glove_m = L.leather("glove", scale=0.4, base=(0.050, 0.034, 0.020))
iron = C.weathered_iron("iron", heat_center=(-0.1, -0.05, 0.12), heat_r=(0.03, 0.2), rust=0.5, scale=0.4, wear=1.2)
wood = C.weathered_wood("wood", char=0.15, grain_axis="X", scale=0.4)

parts = []

# ---- 帆布の袋 ----
HX, HY, HZ = 0.23, 0.14, 0.155
bm = L.soft_box_bm(HX, HY, HZ, cuts=8, n=3.2)
for v in bm.verts:
    v.co.z += HZ
# 口を開ける（上面を消す）
top = [f for f in bm.faces if f.calc_center_median().z > 2 * HZ - 0.012 and f.normal.z > 0.6]
bmesh.ops.delete(bm, geom=top, context="FACES")
# 焼け穴と突き破られた穴
L.punch_holes(bm, [(BURN, 0.045), (PIERCE, 0.022)], seed=4)
# へたり：口を絞り、上が中央で垂れ、底が広がる、しわ
for v in bm.verts:
    x, y, z = v.co
    t = z / (2 * HZ)
    gather = 1.0 - 0.28 * t ** 2.2
    sag = 0.05 * t ** 2 * math.exp(-((x + 0.02) / 0.16) ** 2)      # 中央が落ちる
    lean = 0.025 * t ** 2                                            # 柄の重みで右へ寄る
    bulge = 1.0 + 0.10 * math.sin(math.pi * min(1.0, t * 1.3)) * (1 - t)
    x2 = x * gather * bulge + lean
    y2 = y * gather * bulge
    z2 = z - sag
    # 口の波（布のたるみ）
    if t > 0.85:
        z2 += 0.012 * math.sin(math.atan2(y, x) * 5.0 + 1.0)
    v.co = Vector((x2, y2, max(0.0, z2)))
# しわ：縦方向に長いノイズで法線方向へ
bm.normal_update()
for v in bm.verts:
    if v.co.z < 0.002:
        continue
    p = v.co
    n = noise.noise(Vector((p.x * 22, p.y * 22, p.z * 7)) + Vector((3, 1, 7)))
    n2 = noise.noise(p * 60 + Vector((9, 2, 4)))
    v.co = p + v.normal * (0.009 * n + 0.0025 * n2)
L.jag_boundary(bm, 0.004, seed=6)
bag = C.obj_from_bm(bm, "bag", smooth=True)
bag.data.materials.append(cloth)
m = bag.modifiers.new("solid", "SOLIDIFY")
m.thickness = 0.005
m.offset = -1.0
m.use_rim = True
C.apply_mods(bag)
parts.append(bag)

# 口の縁の位置（ヘム・手袋・持ち手の基準）を取り出す
rim = [v.co.copy() for v in bag.data.vertices if v.co.z > 0.16]


def rim_at(angle):
    """その方角で一番高い頂点（＝口の縁）。外側の殻を選ぶため、同じ高さなら中心から遠い方"""
    def da(p):
        return abs(math.atan2(math.sin(math.atan2(p.y, p.x) - angle), math.cos(math.atan2(p.y, p.x) - angle)))
    cand = [p for p in rim if da(p) < 0.18] or rim
    return max(cand, key=lambda p: p.z + 0.2 * Vector((p.x, p.y)).length)


def surface_point(x, z, side=-1):
    """前面（side=-1）/背面の、x・z に近い袋の外面の点と外向き"""
    cand = [v for v in bag.data.vertices if side * v.co.y > 0 and abs(v.co.x - x) < 0.03 and abs(v.co.z - z) < 0.03]
    v = min(cand, key=lambda v: side * -v.co.y) if cand else None
    if v is None:
        return Vector((x, side * HY, z)), Vector((0, side, 0))
    return v.co.copy(), Vector((0, side, 0))


# ---- 口の縁の折り返し（ヘム） ----
ring = []
for k in range(26):
    a = -math.pi + 2 * math.pi * k / 26
    p = rim_at(a)
    ring.append(p + Vector((math.cos(a), math.sin(a), 0)) * 0.002 + Vector((0, 0, -0.004)))
hem = C.sweep("hem", ring, C.circle_profile(0.007, 5, jitter=0.2, seed=2), closed=True)
C.displace_noise(hem, 0.002, 40, seed=3)
parts.append(C.assign(hem, cloth))

# ---- つるはし：頭は袋の中で横向き、尖りが前面を突き破る。柄は口から斜め上へ ----
EYE = Vector((-0.10, 0.02, 0.13))
tipA = Vector((-0.12, -0.235, 0.10))
tipB = Vector((-0.085, 0.115, 0.165))
head_pts = C.bezier(tipA, EYE + Vector((0, -0.06, 0.012)), EYE + Vector((0, 0.06, 0.012)), tipB, n=10)
head = C.sweep("pick_head", head_pts, C.rect_profile(0.032, 0.026, chamfer=0.006),
               up_fn=lambda k, p, t: (1, 0, 0),
               scale_fn=lambda u: (max(0.12, 1 - abs(u - 0.5) * 1.75) ** 0.8, max(0.15, 1 - abs(u - 0.5) * 1.6) ** 0.7))
C.displace_noise(head, 0.0015, 40, seed=8)
parts.append(C.assign(head, iron))
eye_c = C.sweep("pick_eye", [EYE + Vector((-0.004, 0, -0.03)), EYE + Vector((0.004, 0, 0.03))], C.circle_profile(0.024, 8), smooth=False)
parts.append(C.assign(eye_c, iron))
H0 = EYE + Vector((-0.02, 0, -0.035))
H1 = Vector((0.31, 0.04, 0.445))
hpts = [H0.lerp(H1, t) + Vector((0, 0.004 * math.sin(t * 5), 0)) for t in (k / 8 for k in range(9))]
handle = C.sweep("pick_handle", hpts, [(x * 1.0, y * 0.78) for x, y in C.circle_profile(0.017, 8)],
                 scale_fn=lambda u: 1.0 + 0.25 * max(0.0, u - 0.75) / 0.25, up_fn=lambda k, p, t: (0, 1, 0))
C.displace_noise(handle, 0.0015, 15, seed=9)
parts.append(C.assign(handle, wood))
# 柄の楔（目の上に頭を出す）
wd = L.wedge("pick_wedge", 0.03, 0.012, 0.03, seed=3)
C.xform(wd, EYE + Vector((0.006, 0, 0.034)), (0, -30, 0))
parts.append(C.assign(wd, wood))

# ---- 革の手袋（前の口の縁に掛かり、指が外へ垂れる） ----
GA = -1.05
gp = rim_at(GA)
palm = C.rock("glove_palm", 0.05, detail=2, rough=0.12, squash=(1.1, 0.9, 0.28), seed=11)
C.xform(palm, gp + Vector((0.0, 0.03, 0.012)), (0, -8, math.degrees(GA) + 90))
parts.append(C.assign(palm, glove_m))
cuff = C.sweep("glove_cuff", [gp + Vector((-0.01, 0.07, 0.0)), gp + Vector((-0.012, 0.11, -0.02))],
               C.circle_profile(0.034, 8), scale_fn=lambda u: (1.0, 0.45))
parts.append(C.assign(cuff, glove_m))
for f in range(4):
    dx = -0.033 + f * 0.022
    L0 = 0.055 + (0.012 if f in (1, 2) else 0.0)
    base = gp + Vector((dx, -0.005, 0.014))
    out = Vector((0, -1, 0))
    pts = [base, base + out * 0.025 + Vector((0, 0, -0.004)), base + out * 0.035 + Vector((dx * 0.1, 0, -L0 * 0.55)),
           base + out * 0.03 + Vector((dx * 0.2 + rnd.uniform(-0.005, 0.005), 0.01, -L0))]
    fg = C.sweep(f"glove_f{f}", C.bezier(*pts, n=6), C.circle_profile(0.0095, 6), scale_fn=lambda u: 1.0 - 0.3 * u)
    C.displace_noise(fg, 0.002, 50, seed=20 + f)
    parts.append(C.assign(fg, glove_m))
th = C.sweep("glove_thumb", C.bezier(gp + Vector((0.045, 0.02, 0.012)), gp + Vector((0.08, 0.0, 0.01)), gp + Vector((0.09, -0.03, -0.03)), n=5),
             C.circle_profile(0.011, 6), scale_fn=lambda u: 1.0 - 0.3 * u)
parts.append(C.assign(th, glove_m))

# ---- 前面の革の名札（縫い取りの代わり） ----
pc, pn = surface_point(0.07, 0.13, -1)
patch = L.plank("name_patch", 0.12, 0.075, 0.006, segs=3, seed=31, round_edges=0.3, chip=0.004)
C.xform(patch, pc + Vector((0, -0.004, 0)), (90 + rnd.uniform(-4, 4), 0, rnd.uniform(-6, 6)))
parts.append(C.assign(patch, hide))
for k, (x, z) in enumerate(((0.03, 0.17), (0.11, 0.17), (0.03, 0.09), (0.11, 0.09))):
    rv = C.dome(f"patch_rivet_{k}", 0.004, 0.003, sides=5)
    sp, sn = surface_point(x, z, -1)
    C.place_on(rv, sp + Vector((0, -0.006, 0)), (0, -1, 0))
    parts.append(C.assign(rv, iron))

# ---- 革の持ち手（前の縁から垂れる）と後ろの持ち手（倒れて背面へ） ----
for k, (a0, a1, side, drop) in enumerate(((-1.95, -1.45, -1, 0.10), (1.25, 1.95, 1, 0.08))):
    p0, p1 = rim_at(a0), rim_at(a1)
    mid = (p0 + p1) / 2 + Vector((0, side * 0.05, -drop))
    pts = C.bezier(p0 + Vector((0, side * 0.006, -0.01)), p0.lerp(mid, 0.7) + Vector((0, side * 0.02, 0)), p1.lerp(mid, 0.7) + Vector((0, side * 0.02, 0)), p1 + Vector((0, side * 0.006, -0.01)), n=10)
    st = C.sweep(f"strap_{k}", pts, C.rect_profile(0.024, 0.005, chamfer=0.001), up_fn=lambda i, p, t, s=side: (0, s, 0.3))
    parts.append(C.assign(st, hide))

C.finish(NAME, parts, version=VERSION, tex_res=1024, budget_tris=5000, refs=[82, 83],
         notes="ガルドの道具袋。煤けた帆布、焼け穴、つるはしの尖りが前面を突き破り、柄が口から突き出す。革の手袋と名札（縫い取りの代わり）。")
