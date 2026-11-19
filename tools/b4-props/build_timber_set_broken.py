"""
b4p_timber_set_broken — 崩れかけた支保工（台形の枠、折れた梁、楔、落ちた岩）

参考（Pinterest、references/b4-dragonfire-props-20261119.md）:
  #5  崩落坑道の支保工：斜めに折れた丸太、割れ、荷重で潰れた継手
  #10 連続する木製支保枠：台形（脚が内へ傾く）、天井梁、足元の崩落土砂
  #9  坑道の板張りと鉄の金具、木口の風化、乾燥割れ
形・寸法の要点:
  - 全体 約2.5×0.5×2.3m。脚は手斧で削った角材（0.20×0.19、面取り8角形、曲がり）、左脚は内へ約4°傾く（台形の枠）
  - 天井梁（キャップ）は中央で折れて V 字に落ちる（#5 の斜めに折れた丸太）：左半分は左脚の上で傾いて
    折れ口が z≈1.6 に垂れ、右半分は右脚の頭から落石の山の上へ斜めに落ちる
  - 右脚は荷重で z≈1.15 で座屈して折れ（両側にささくれ）、上半分が外へ傾いて梁を受けている
  - 左の継手には楔2本（1本は抜けかけ）と鉄の鎹。楔1本は足元に落ちる。右脚の座屈部の鎹は曲がって抜けかけ
  - 矢板（横板）が梁の両半分に乗り、先の方は折れている。2枚は落石の山に刺さり、1枚は地面に
  - 落石（玄武岩）が V 字の下に山になり（高さ約0.6m）、裾に破片が散る（#10 の足元の崩落土砂）
劣化（設計書3章）:
  欠け＝折れた梁・折れた脚・折れた矢板（どれも外形の5%以上）、角の欠け（chip）、木口の割れ
  角の摩耗＝weathered_wood の edge（明るい角）、岩は割れた角が少し明るい
  煤＝上ほど黒い（天井側の煙）、炭化の亀甲割れ
  灰＝上向きの面・凹み、岩の上面
  熱変色＝木の炭化（char）、鎹は weathered_iron
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
import common as C  # noqa: E402
import lib_mine as L  # noqa: E402
from mathutils import Vector  # noqa: E402

NAME = "b4p_timber_set_broken"
VERSION = "v4"
rnd = random.Random(5)
C.reset(5)

wood_v = C.weathered_wood("wood_v", char=0.55, soot_z=(1.0, 2.4), grain_axis="Z", scale=1.0)
wood_x = C.weathered_wood("wood_x", char=0.6, soot_z=(1.0, 2.4), grain_axis="X", scale=1.0)
wood_y = C.weathered_wood("wood_y", char=0.65, soot_z=(1.0, 2.4), grain_axis="Y", scale=0.6)
iron = C.weathered_iron("iron", soot_z=(1.4, 2.4), rust=0.55, scale=0.6)
rock = L.mine_rock("rock", scale=1.0)

parts = []


def add(obs):
    if isinstance(obs, list):
        parts.extend(obs)
    else:
        parts.append(obs)


def lay_board(name, b0, b1, t, beam_half=0.12, length=0.52, width=0.12, thick=0.032, dy=0.0, spin=0.0, **kw):
    """梁 b0→b1 の位置 t に、梁に直交して乗る矢板"""
    b0, b1 = Vector(b0), Vector(b1)
    d = (b1 - b0).normalized()
    n = Vector((-d.z, 0, d.x))
    if n.z < 0:
        n = -n
    p = b0.lerp(b1, t) + n * (beam_half + thick / 2 + 0.002) + Vector((0, dy, 0))
    th = math.atan2(n.x, n.z)
    b = L.plank(name, length, width, thick, segs=4, round_edges=0.2, **kw)
    b.matrix_world = C.Matrix.Translation(p) @ C.Matrix.Rotation(th, 4, "Y") @ C.Matrix.Rotation(math.radians(90 + spin), 4, "Z")
    return C.assign(b, wood_y)


# ---- 左の脚（立っている、内へ傾く） ----
LP0, LP1 = Vector((-1.05, 0.0, 0.0)), Vector((-0.90, 0.0, 2.10))
add(L.beam_between("post_L", LP0, LP1, 0.24, 0.23, seed=1, bow=0.02, chip=0.03, segs=16, mat=wood_v))

# ---- 右の脚：荷重で z≈1.15 で座屈して折れ、上半分が外へ傾く ----
RP0, RPk = Vector((1.12, 0.02, 0.0)), Vector((1.03, 0.03, 1.15))
RPk2, RP1 = Vector((1.05, 0.05, 1.12)), Vector((1.24, 0.07, 2.00))
add(L.beam_between("post_R_low", RP0, RPk, 0.24, 0.23, split_b=0.10, seed=3, bow=0.012, chip=0.035, segs=10, roll=7, mat=wood_v))
add(L.beam_between("post_R_up", RPk2, RP1, 0.23, 0.23, split_a=0.12, seed=4, bow=0.012, chip=0.03, segs=10, roll=-5, mat=wood_v))
add(L.splinters("spl_Rk_low", RPk + Vector((0, 0, 0.01)), (0.15, 0.1, 1), 0.12, n=11, length=0.09, seed=31, mat=wood_v))
add(L.splinters("spl_Rk_up", RPk2 + Vector((0, 0, -0.01)), (-0.25, -0.1, -1), 0.12, n=9, length=0.085, seed=32, mat=wood_v))

# ---- 天井梁：中央で折れて V 字に落ちる。左半分は左脚の上で傾き、右半分は右脚の頭から落石の上へ ----
CL0, CL1 = Vector((-1.19, 0.0, 2.25)), Vector((-0.06, 0.01, 1.64))
add(L.beam_between("cap_L", CL0, CL1, 0.24, 0.24, split_b=0.12, seed=2, bow=0.012, chip=0.035, segs=12, roll=4, mat=wood_x))
d = (CL1 - CL0).normalized()
add(L.splinters("spl_capL", CL1 + d * 0.02, d + Vector((0, 0, -0.5)), 0.12, n=12, length=0.09, seed=21, mat=wood_x))
CR0, CR1 = Vector((0.22, 0.02, 0.62)), Vector((1.30, 0.07, 2.20))
add(L.beam_between("cap_R", CR0, CR1, 0.24, 0.24, split_a=0.13, seed=5, bow=0.012, chip=0.035, segs=12, roll=-6, mat=wood_x))
d = (CR0 - CR1).normalized()
add(L.splinters("spl_capR", CR0 + d * 0.02, d + Vector((0, 0, 0.3)), 0.12, n=11, length=0.085, seed=51, mat=wood_x))

# ---- 楔（左の継手に2本、1本は抜けかけ。足元に落ちた1本） ----
for j, (dx, out, tilt) in enumerate(((-0.06, 0.02, 0), (0.065, 0.08, 11))):
    w = L.wedge(f"wedge_{j}", 0.17, 0.065, 0.045, seed=60 + j)
    C.xform(w, (LP1.x + dx, -0.06 - out, LP1.z + 0.012), (tilt, 0, 90))
    add(C.assign(w, wood_y))
w = L.wedge("wedge_fallen", 0.17, 0.065, 0.045, seed=63)
C.xform(w, (-0.72, -0.18, 0.024), (0, 0, 31))
add(C.assign(w, wood_y))

# ---- 鉄の鎹（左の継手の前面、右脚の座屈部で曲がって抜けかけ） ----
sp = [Vector((-0.89, -0.04, 2.02)), Vector((-0.89, -0.112, 2.02)), Vector((-0.905, -0.112, 2.30)), Vector((-0.905, -0.04, 2.30))]
st = C.sweep("staple_L", C.bezier(sp[0], sp[1], sp[2], sp[3], n=8), C.rect_profile(0.014, 0.009, chamfer=0.002), up_fn=lambda k, p, t: (0, -1, 0))
add(C.assign(st, iron))
sp = [Vector((1.04, -0.05, 0.98)), Vector((1.04, -0.115, 0.98)), Vector((1.07, -0.16, 1.16)), Vector((1.12, -0.14, 1.26))]
st = C.sweep("staple_R", C.bezier(sp[0], sp[1], sp[2], sp[3], n=8), C.rect_profile(0.014, 0.009, chamfer=0.002), up_fn=lambda k, p, t: (0, -1, 0))
add(C.assign(st, iron))

# ---- 矢板：両半分の梁に乗る板、折れた板、落石に刺さった板 ----
# 天井の板張り：板を隙間少なく並べる（1枚欠落、先の2枚は折れ口）
ts = [0.05 + 0.125 * k for k in range(7)]
for j, t in enumerate(ts):
    if j == 4:
        continue
    sp_ = 0.06 if j >= 5 else None
    add(lay_board(f"lagL_{j}", CL0, CL1, t, width=0.14, dy=rnd.uniform(-0.03, 0.03), spin=rnd.uniform(-5, 5), seed=70 + j,
                  chip=0.012, split_b=sp_, length=0.52 if j < 5 else rnd.uniform(0.34, 0.42)))
for j, t in enumerate((0.60, 0.72, 0.84, 0.96)):
    if j == 1:
        continue
    add(lay_board(f"lagR_{j}", CR0, CR1, t, width=0.14, dy=rnd.uniform(-0.03, 0.03), spin=rnd.uniform(-6, 6), seed=80 + j,
                  chip=0.012, split_a=0.06 if j == 0 else None))
for j, (p0, p1) in enumerate((((-0.45, -0.20, 0.05), (-0.18, 0.12, 0.62)), ((0.55, 0.20, 0.10), (0.78, -0.10, 0.50)))):
    p0, p1 = Vector(p0), Vector(p1)
    b = L.plank(f"lag_fallen_{j}", (p1 - p0).length, 0.12, 0.032, segs=4, split_b=0.07, seed=90 + j, round_edges=0.2, chip=0.012)
    L.orient_between(b, p0, p1, roll_deg=rnd.uniform(20, 70))
    add(C.assign(b, wood_y))
b = L.plank("lag_ground", 0.48, 0.12, 0.032, segs=4, split_a=0.06, seed=95, round_edges=0.2, chip=0.012)
C.xform(b, (-0.62, 0.12, 0.018), (0, 4, 18))
add(C.assign(b, wood_y))

# ---- 落石（玄武岩）：V 字の下に崩れた土砂の山。大きな塊が積み重なり、破片が裾に散る ----
pile = [((0.10, 0.00, 0.0), 0.38, 3), ((-0.32, 0.05, 0.0), 0.30, 2), ((0.52, -0.05, 0.0), 0.30, 2), ((-0.66, -0.06, 0.0), 0.20, 2),
        ((0.88, 0.05, 0.0), 0.19, 2), ((0.28, 0.05, 0.38), 0.22, 2), ((-0.10, -0.08, 0.35), 0.18, 2), ((0.62, 0.10, 0.30), 0.16, 2),
        ((-0.46, 0.12, 0.25), 0.15, 2), ((0.06, 0.12, 0.55), 0.13, 2), ((-0.85, 0.10, 0.0), 0.13, 2), ((0.72, -0.14, 0.0), 0.12, 1)]
for j, ((x, y, zb), r, det) in enumerate(pile):
    sq = (1.0, rnd.uniform(0.62, 0.78), rnd.uniform(0.55, 0.72))
    ob = C.rock(f"rock_{j}", r, detail=det, rough=0.32, squash=sq, seed=100 + j, facet=5)
    z = zb + r * sq[2] * 0.7
    C.xform(ob, (x, y, z), (rnd.uniform(-20, 20), rnd.uniform(-20, 20), rnd.uniform(0, 360)))
    add(C.assign(ob, rock))
# 隙間を埋める中くらいの岩（山を一つの塊に見せる）
fill = [(-0.15, 0.12, 0.10), (0.30, -0.15, 0.12), (-0.52, -0.16, 0.11), (0.74, 0.16, 0.10), (0.42, 0.14, 0.16),
        (-0.22, -0.18, 0.09), (0.96, -0.08, 0.10), (-0.78, 0.04, 0.10), (0.18, 0.16, 0.12)]
for j, (x, y, r) in enumerate(fill):
    ob = C.rock(f"fill_{j}", r, detail=2, rough=0.3, squash=(1, 0.8, 0.62), seed=250 + j, facet=4)
    C.xform(ob, (x, y, r * 0.42), (rnd.uniform(-15, 15), rnd.uniform(-15, 15), rnd.uniform(0, 360)))
    add(C.assign(ob, rock))
# 天井の板の上に乗った土砂の岩（折れ口の近く、今にも落ちそう）
for j, t in enumerate((0.62, 0.78)):
    p = CL0.lerp(CL1, t)
    r = 0.07 + 0.02 * j
    ob = C.rock(f"onlag_{j}", r, detail=1, rough=0.3, squash=(1, 0.8, 0.6), seed=270 + j, facet=3)
    C.xform(ob, p + Vector((0.03, rnd.uniform(-0.12, 0.12), 0.12 + 0.032 + r * 0.45)), (0, 25, rnd.uniform(0, 360)))
    add(C.assign(ob, rock))
for j in range(22):
    r = rnd.uniform(0.03, 0.09)
    x = rnd.uniform(-0.95, 1.05)
    y = rnd.uniform(-0.24, 0.24)
    ob = C.rock(f"frag_{j}", r, detail=1, rough=0.3, squash=(1, 0.8, 0.6), seed=200 + j, facet=3)
    C.xform(ob, (x, y, r * 0.35), (0, 0, rnd.uniform(0, 360)))
    add(C.assign(ob, rock))
for j, (x, y, r) in enumerate(((-1.14, 0.12, 0.09), (-0.94, -0.15, 0.075), (1.20, -0.14, 0.08))):
    ob = C.rock(f"foot_{j}", r, detail=1, rough=0.3, squash=(1, 0.85, 0.65), seed=300 + j, facet=3)
    C.xform(ob, (x, y, r * 0.4), (0, 0, rnd.uniform(0, 360)))
    add(C.assign(ob, rock))

C.finish(NAME, parts, version=VERSION, tex_res=1024, budget_tris=8000, refs=[5, 10, 9],
         notes="崩れかけた支保工。天井梁が中央で折れて V 字に落ち、右脚は座屈して外へ傾く。楔・鎹・矢板・落石の山つき。")
