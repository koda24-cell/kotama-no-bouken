"""
b4p_crate_set — 焦げた木箱3種（無傷・蓋が割れた・潰れた）を1つのGLBに横並び

参考（Pinterest、references/b4-dragonfire-props-20261119.md）:
  #97  積まれた木箱・スラット箱：角柱＋横板、隙間のある板、蓋の桟
  #98  樽と木箱の組み合わせ：板の厚み、角の摩耗（ラベル・瓶は採用しない）
  #100 壊れた樽：割れて外れた板、錆びた帯鉄、散らばる板片（壊れ方の参考）
形・寸法の要点:
  - A 無傷：0.70×0.50×0.50（蓋込み約0.55）。角に鉄の当て金、板3段＋蓋3枚＋桟
  - B 蓋が割れた：0.60×0.60×0.55。蓋の中央板が割れて2片が箱の中へ落ち、1枚は外れて箱に立てかけ。
       中に鉱石の塊が見える。前の上段の板が1枚欠け、右の角柱の頭が欠ける
  - C 潰れた：0.90×0.60×0.55 の箱が上から潰れて右へ傾き（高さは右端で約半分）、蓋が V 字に凹む。
       前の中段は中央で折れて内へ、右の板は1枚外れて地面に。上に落ちた岩が乗る
  - 並び：x = -1.05 / 0 / +1.15（底中心が原点）
劣化（設計書3章）:
  欠け＝割れた蓋・欠けた板・折れた板・潰れ、板の角の欠け（chip）
  角の摩耗＝weathered_wood の edge、鉄の当て金は角で地金
  煤＝上ほど黒い。C は右下（熱源側）が炭化
  灰＝蓋の上・板の段の上向き面
  熱変色＝炭化（char）、当て金の焼け
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
import common as C  # noqa: E402
import lib_mine as L  # noqa: E402
from mathutils import Vector  # noqa: E402

NAME = "b4p_crate_set"
VERSION = "v1"
rnd = random.Random(97)
C.reset(97)


def woods(tag, char, soot, heat=None):
    return {"x": C.weathered_wood(f"{tag}_x", char=char, soot_z=soot, grain_axis="X", scale=0.5, heat_center=heat, heat_r=(0.1, 0.5)),
            "y": C.weathered_wood(f"{tag}_y", char=char, soot_z=soot, grain_axis="Y", scale=0.5, heat_center=heat, heat_r=(0.1, 0.5)),
            "z": C.weathered_wood(f"{tag}_z", char=char, soot_z=soot, grain_axis="Z", scale=0.5, heat_center=heat, heat_r=(0.1, 0.5))}


XA, XB, XC = -1.05, 0.0, 1.15
wA = woods("A", 0.30, (0.35, 0.60))
wB = woods("B", 0.40, (0.35, 0.62))
wC = woods("C", 0.55, (0.25, 0.60), heat=(XC + 0.45, -0.3, 0.0))
iron = C.weathered_iron("iron", soot_z=(0.4, 0.6), rust=0.6, scale=0.5)
rock = L.mine_rock("rock", scale=0.6)
parts = []


def move(objs, dx):
    for o in objs:
        o.location.x += dx
    return objs


# ================= A 無傷 =================
A = L.crate("A", 0.70, 0.50, 0.50, wA, seed=1)
partsA = move(L.flatten(A), XA)
# 角の当て金（蓋の四隅に L 字の鉄板）
for k, (sx, sy) in enumerate(((-1, -1), (1, -1), (1, 1), (-1, 1))):
    cx, cy, cz = XA + sx * (0.35 + 0.023), sy * (0.25 + 0.023), 0.50 + 0.022
    pts = [Vector((cx - sx * 0.075, cy, cz)), Vector((cx, cy, cz)), Vector((cx, cy, cz - 0.075))]
    br = C.sweep(f"bracket_{k}", pts, C.rect_profile(0.004, 0.045), up_fn=lambda i, p, t, sy=sy: (0, sy, 0))
    partsA.append(C.assign(br, iron))
    pts = [Vector((cx, cy - sy * 0.075, cz)), Vector((cx, cy, cz)), Vector((cx, cy, cz - 0.075))]
    br = C.sweep(f"bracket2_{k}", pts, C.rect_profile(0.004, 0.045), up_fn=lambda i, p, t, sx=sx: (sx, 0, 0))
    partsA.append(C.assign(br, iron))
parts += partsA

# ================= B 蓋が割れた =================
B = L.crate("B", 0.60, 0.60, 0.55, wB, seed=2, skip=("T2", "F2"), broken={"T1": ("mid", 0.06), "P1": ("a", 0.05)})
partsB = move(L.flatten(B), XB)
# 外れた蓋板：箱の右側面に立てかける
tb = L.plank("B_T2_loose", 0.66, 0.19, 0.022, segs=3, seed=95, split_b=0.05, chip=0.006)
L.orient_between(tb, (XB + 0.40, -0.05, 0.0), (XB + 0.336, -0.03, 0.62), roll_deg=90)
partsB.append(C.assign(tb, wB["z"]))
# 欠けた前上段の板：折れた短い残り（左の角柱に釘で残る）
st = L.plank("B_F2_stub", 0.17, 0.155, 0.022, segs=2, seed=96, split_b=0.05)
C.xform(st, (XB - 0.30 + 0.085, -0.311, 0.01 + 0.18 * 2 + 0.09), (90, 0, -4))
partsB.append(C.assign(st, wB["x"]))
# 中身：鉱石の塊（蓋の割れ目から見える）
for j in range(6):
    r = rnd.uniform(0.06, 0.10)
    ob = C.rock(f"B_ore_{j}", r, detail=1, rough=0.3, squash=(1, 0.85, 0.7), seed=400 + j, facet=3)
    C.xform(ob, (XB + rnd.uniform(-0.18, 0.18), rnd.uniform(-0.18, 0.18), 0.30 + rnd.uniform(0, 0.08)), (0, 0, rnd.uniform(0, 360)))
    partsB.append(C.assign(ob, rock))
parts += partsB

# ================= C 潰れた =================
Cc = L.crate("C", 0.90, 0.60, 0.55, wC, seed=3, segs=5, skip=("R1",),
             broken={"F1": ("mid", 0.07), "T1": ("mid", 0.05), "R2": ("a", 0.08), "P2": ("a", 0.06)})
partsC = L.flatten(Cc)
# 潰す：右ほど低く（高さ×(1-0.48*s)）、上ほど右へずれる、蓋は V 字にたわむ、側面は膨らむ
for o in partsC:
    C.apply_xform(o)
    for v in o.data.vertices:
        x, y, z = v.co
        s = min(1.0, max(0.0, (x + 0.45) / 0.9)) ** 1.3
        zf = z / 0.58
        z2 = z * (1.0 - 0.48 * s)
        z2 -= 0.09 * math.exp(-((x - 0.05) / 0.22) ** 2) * zf ** 2      # 蓋の V 字
        y2 = y * (1.0 + 0.10 * math.sin(math.pi * min(1.0, zf)) * (0.5 + s))  # 膨らみ
        x2 = x + 0.07 * zf * (0.5 + s)
        v.co = (x2, y2, max(0.0, z2))
move(partsC, XC)
# 外れた右の板（地面に）と、蓋から落ちた板片
lb = L.plank("C_R1_loose", 0.62, 0.16, 0.022, segs=3, seed=97, split_a=0.06, chip=0.008)
C.xform(lb, (XC + 0.62, -0.08, 0.012), (0, 0, 74))
partsC.append(C.assign(lb, wC["y"]))
fb = L.plank("C_frag", 0.28, 0.14, 0.022, segs=2, seed=98, split_a=0.05, split_b=0.05)
C.xform(fb, (XC - 0.18, -0.42, 0.05), (0, 18, 25))
partsC.append(C.assign(fb, wC["x"]))
# 潰した岩
ob = C.rock("C_rock", 0.20, detail=2, rough=0.3, squash=(1.0, 0.85, 0.65), seed=500, facet=4)
C.xform(ob, (XC + 0.12, 0.05, 0.47), (8, -12, 30))
partsC.append(C.assign(ob, rock))
for j in range(3):
    r = rnd.uniform(0.04, 0.07)
    ob = C.rock(f"C_frag_rock_{j}", r, detail=1, rough=0.3, squash=(1, 0.8, 0.6), seed=510 + j, facet=3)
    C.xform(ob, (XC + rnd.uniform(-0.5, 0.6), rnd.uniform(-0.42, -0.35), r * 0.35), (0, 0, rnd.uniform(0, 360)))
    partsC.append(C.assign(ob, rock))
parts += partsC

C.finish(NAME, parts, version=VERSION, tex_res=1024, budget_tris=9000, refs=[97, 98, 100],
         notes="焦げた木箱3種（A無傷・B蓋割れ・C潰れ）。x=-1.05/0/+1.15 に並ぶ。ゲーム側は分割して個別に配置可（同一テクスチャ）。")
