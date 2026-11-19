"""
b4p_timber_set_broken — 崩れかけた支保工（台形の枠、折れた梁、楔、落ちた岩）

参考（Pinterest、references/b4-dragonfire-props-20261119.md）:
  #5  崩落坑道の支保工：斜めに折れた丸太、割れ、荷重で潰れた継手
  #10 連続する木製支保枠：台形（脚が内へ傾く）、天井梁、足元の崩落土砂
  #9  坑道の板張りと鉄の金具、木口の風化、乾燥割れ
形・寸法の要点:
  - 全体 約2.5×0.5×2.4m。脚は手斧で削った角材（0.20×0.19、面取り8角形）、内へ約4°傾く台形の枠
  - 左の脚は立っていて、天井梁（キャップ）の左半分を支える。梁は x≈-0.35 で折れ、折れ口が垂れ下がる
  - 右の脚は z≈1.0 で折れ（上はささくれ）、上半分は手前の地面に転がる
  - 梁の右半分は斜めに落ち、片端が地面（落石の中）、もう片端が右脚の折れた頭に乗る（#5 の斜めの丸太）
  - 左の継手には楔2本（1本は抜けかけ）と鉄の鎹。楔1本は足元に落ちている
  - 梁の上に矢板（横板）3枚、1枚は折れて垂れ下がり、1枚は斜めの梁に寄りかかる
  - 落石（玄武岩）が斜めの梁の根元に山になり、小さな破片が散る
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
VERSION = "v1"
rnd = random.Random(5)
C.reset(5)

wood_v = C.weathered_wood("wood_v", char=0.35, soot_z=(1.3, 2.5), grain_axis="Z", scale=1.0)
wood_x = C.weathered_wood("wood_x", char=0.45, soot_z=(1.3, 2.5), grain_axis="X", scale=1.0)
wood_y = C.weathered_wood("wood_y", char=0.5, soot_z=(1.3, 2.5), grain_axis="Y", scale=0.6)
iron = C.weathered_iron("iron", soot_z=(1.6, 2.4), rust=0.55, scale=0.6)
rock = L.mine_rock("rock", scale=1.0)

parts = []


def add(obs):
    if isinstance(obs, list):
        parts.extend(obs)
    else:
        parts.append(obs)


# ---- 左の脚（立っている） ----
LP0, LP1 = Vector((-1.02, 0.0, 0.0)), Vector((-0.87, 0.0, 2.12))
add(L.beam_between("post_L", LP0, LP1, 0.20, 0.19, seed=1, bow=0.018, chip=0.025, segs=14, mat=wood_v))

# ---- 梁の左半分（左脚に乗り、x≈-0.35 で折れて垂れる） ----
CL0, CL1 = Vector((-1.13, 0.0, 2.235)), Vector((-0.36, 0.01, 2.16))
add(L.beam_between("cap_L", CL0, CL1, 0.20, 0.20, split_b=0.11, seed=2, bow=0.012, chip=0.03, segs=10, roll=4, mat=wood_x))
d = (CL1 - CL0).normalized()
add(L.splinters("spl_capL", CL1 + d * 0.02, d + Vector((0, 0, -0.35)), 0.10, n=5, length=0.16, seed=21, mat=wood_x))

# ---- 右の脚（z≈1.0 で折れた切り株） ----
RP0, RP1 = Vector((1.10, 0.03, 0.0)), Vector((1.045, 0.04, 1.00))
add(L.beam_between("post_R", RP0, RP1, 0.20, 0.19, split_b=0.13, seed=3, bow=0.012, chip=0.03, segs=9, roll=7, mat=wood_v))
add(L.splinters("spl_postR", RP1 + Vector((0, 0, 0.02)), (0.05, 0.05, 1), 0.10, n=5, length=0.18, seed=31, mat=wood_v))

# ---- 右の脚の上半分（手前に転がる） ----
RT0, RT1 = Vector((0.30, -0.13, 0.097)), Vector((1.38, -0.05, 0.093))
add(L.beam_between("post_R_top", RT0, RT1, 0.19, 0.19, split_a=0.12, seed=4, bow=0.014, chip=0.03, segs=11, roll=23, mat=wood_x))
add(L.splinters("spl_postRtop", RT0 + Vector((-0.02, 0, 0)), (-1, -0.05, 0.05), 0.095, n=4, length=0.15, seed=41, mat=wood_x))

# ---- 梁の右半分（地面の落石から右脚の折れた頭へ斜めに） ----
CR0 = Vector((-0.22, 0.07, 0.13))
rest = Vector((1.04, 0.04, 1.00 + 0.13 + 0.10))  # 切り株の頭に梁の下面が乗る
dirc = (rest - CR0).normalized()
CR1 = rest + dirc * 0.20
add(L.beam_between("cap_R", CR0, CR1, 0.20, 0.20, split_a=0.12, seed=5, bow=0.012, chip=0.03, segs=12, roll=-6, mat=wood_x))
add(L.splinters("spl_capR", CR0 - dirc * 0.02, -dirc + Vector((0, 0, 0.2)), 0.10, n=5, length=0.15, seed=51, mat=wood_x))

# ---- 楔（左の継手に2本、1本は抜けかけ。足元に落ちた1本） ----
for j, (dx, out, tilt) in enumerate(((-0.06, 0.02, 0), (0.065, 0.07, 9))):
    w = L.wedge(f"wedge_{j}", 0.17, 0.065, 0.045, seed=60 + j)
    C.xform(w, (LP1.x + dx, -0.06 - out, LP1.z + 0.012), (tilt, 0, 90))
    add(C.assign(w, wood_y))
w = L.wedge("wedge_fallen", 0.17, 0.065, 0.045, seed=63)
C.xform(w, (-0.72, -0.16, 0.024), (0, 0, 31))
add(C.assign(w, wood_y))

# ---- 鉄の鎹（左の継手の前面に1つ、右の切り株に曲がって抜けかけた1つ） ----
sp = [Vector((-0.86, -0.04, 2.03)), Vector((-0.86, -0.112, 2.03)), Vector((-0.865, -0.112, 2.31)), Vector((-0.865, -0.04, 2.31))]
st = C.sweep("staple_L", C.bezier(sp[0], sp[1], sp[2], sp[3], n=8), C.rect_profile(0.014, 0.009, chamfer=0.002), up_fn=lambda k, p, t: (0, -1, 0))
add(C.assign(st, iron))
sp = [Vector((1.03, -0.05, 0.86)), Vector((1.035, -0.11, 0.86)), Vector((1.06, -0.15, 1.02)), Vector((1.10, -0.13, 1.12))]
st = C.sweep("staple_R", C.bezier(sp[0], sp[1], sp[2], sp[3], n=8), C.rect_profile(0.014, 0.009, chamfer=0.002), up_fn=lambda k, p, t: (0, -1, 0))
add(C.assign(st, iron))

# ---- 矢板（梁の上の横板。1枚は折れて垂れ、1枚は斜めの梁に寄りかかる） ----
for j, x in enumerate((-1.04, -0.80, -0.55)):
    z = 2.235 + (x - CL0.x) * (CL1.z - CL0.z) / (CL1.x - CL0.x) + 0.115
    b = L.plank(f"lag_{j}", 0.50, 0.12, 0.032, segs=4, seed=70 + j, round_edges=0.2, chip=0.01,
                split_b=0.05 if j == 2 else None)
    C.xform(b, (x + rnd.uniform(-0.02, 0.02), rnd.uniform(-0.02, 0.02), z), (rnd.uniform(-3, 3), rnd.uniform(-4, 4), 90 + rnd.uniform(-5, 5)))
    add(C.assign(b, wood_y))
b = L.plank("lag_hang", 0.34, 0.12, 0.032, segs=4, split_a=0.06, seed=74, round_edges=0.2)
C.xform(b, (-0.30, 0.02, 2.17), (0, 62, 84))
add(C.assign(b, wood_y))
# 壁の板張り（#9）から外れた長い板が、斜めの梁の背に寄りかかる
LB0, LB1 = Vector((0.98, 0.19, 0.02)), Vector((0.50, 0.175, 0.86))
b = L.plank("lag_lean", (LB1 - LB0).length, 0.13, 0.03, segs=6, split_b=0.08, seed=75, round_edges=0.2, chip=0.012)
L.orient_between(b, LB0, LB1, roll_deg=90)
add(C.assign(b, wood_v))

# ---- 落石（玄武岩）：斜めの梁の根元に山、小さな破片が散る ----
pile = [((-0.05, 0.04), 0.26, 2), ((0.30, 0.10), 0.22, 2), ((-0.40, -0.04), 0.17, 2), ((0.12, -0.12), 0.15, 2),
        ((0.55, 0.02), 0.14, 2), ((-0.18, 0.15), 0.12, 1), ((0.05, 0.10), 0.13, 2)]
for j, ((x, y), r, det) in enumerate(pile):
    sq = (1.0, rnd.uniform(0.75, 0.95), rnd.uniform(0.55, 0.75))
    ob = C.rock(f"rock_{j}", r, detail=det, rough=0.3, squash=sq, seed=100 + j, facet=4)
    z = r * sq[2] * 0.62 + (0.12 if j == 6 else 0.0)
    C.xform(ob, (x, y, z), (rnd.uniform(-15, 15), rnd.uniform(-15, 15), rnd.uniform(0, 360)))
    add(C.assign(ob, rock))
for j in range(10):
    r = rnd.uniform(0.035, 0.075)
    x = rnd.choice((rnd.uniform(-0.75, 0.85), rnd.uniform(0.85, 1.3)))
    y = rnd.uniform(-0.2, 0.2)
    ob = C.rock(f"frag_{j}", r, detail=1, rough=0.3, squash=(1, 0.8, 0.6), seed=200 + j, facet=3)
    C.xform(ob, (x, y, r * 0.35), (0, 0, rnd.uniform(0, 360)))
    add(C.assign(ob, rock))
# 左脚の根元を押さえる石
for j, (x, y, r) in enumerate(((-1.12, 0.12, 0.09), (-0.92, -0.14, 0.07))):
    ob = C.rock(f"foot_{j}", r, detail=1, rough=0.3, squash=(1, 0.85, 0.65), seed=300 + j, facet=3)
    C.xform(ob, (x, y, r * 0.4), (0, 0, rnd.uniform(0, 360)))
    add(C.assign(ob, rock))

C.finish(NAME, parts, version=VERSION, tex_res=1024, budget_tris=8000, refs=[5, 10, 9],
         notes="崩れかけた支保工。梁が折れて右半分が斜めに落ち、右脚は折れて上半分が転がる。楔・鎹・矢板・落石つき。")
