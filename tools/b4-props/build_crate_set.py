"""
b4p_crate_set — 焦げた木箱3種（無傷・蓋が割れた・潰れた）を1つのGLBに横並び

参考（Pinterest、references/b4-dragonfire-props-20261119.md、シートG/H）:
  #97  積まれたスラット箱：横板の間に隙間、外側に縦の角当てと上下の縁当て、斜めの筋交い（Z 字）、底の根太
  #98  樽と木箱：板の厚み（約20mm）、角の摩耗、蓋の板が少し反る（ラベル・瓶は採用しない）
  #100 壊れた樽：割れて外れた板、錆びた鉄、散らばる板片（壊れ方の参考）
形・寸法の要点（v2 で作り直し：v1 は「ただの箱」に見えたため、#97 の枠組みの箱にする）:
  - 枠つきスラット箱：面ごとに横板3枚（隙間28mm、中の暗さが見える）＋外側の縦の角当て（75mm）、
    前後は上下の縁当て、底に根太2本（45mm 浮く）。板厚20mm、角の欠け・反り・ささくれ
  - A 無傷：0.72×0.50×0.50。前後に筋交い、蓋の四隅に鉄の当て金、左右に鉄の取っ手、釘。
       使い古し：蓋の端の割れ、右前の角当ての頭の欠け、横板の端の割れ
  - B 蓋が割れた：0.62×0.62×0.56。蓋の中央板が折れて2片が箱の中へ落ち、奥の1枚は外れて右に立てかけ、
       手前の1枚はずれる。前の上段の横板が折れて半分失われる。中に黒い鉱石の塊
  - C 潰れた：0.90×0.60×0.55。上に落ちた岩で潰れ、前の面が外へ倒れて別の岩に寄りかかる。
       左右の横板は前半分が折れて落ち、蓋は手前が落ち、中央の板は折れてたわむ
  - 並び：x = -1.0 / 0 / +1.0、少しずつ向きを変える（底中心が原点）
劣化（設計書3章）:
  1 欠け＝折れた板（ささくれ）、失われた板、角の欠け（chip）、倒れた面
  2 角の摩耗＝weathered_wood の edge（角が丸く明るい）、鉄の当て金の角は地金
  3 煤＝上ほど黒い（soot_z）。C は岩の当たった前側が炭化
  4 灰＝蓋・縁当ての上向き面、隙間の凹み
  5 熱変色＝炭化（char、亀甲割れ）、鉄の焼け
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
import bpy  # noqa: E402
import common as C  # noqa: E402
import lib_mine as L  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

NAME = "b4p_crate_set"
VERSION = "v4"
rnd = random.Random(97)
C.reset(97)

T = 0.02      # 板厚
BAT = 0.075   # 角当ての幅
GAP = 0.028
Z0 = 0.045    # 根太の高さ


def woods(tag, char, soot, heat=None, hr=(0.1, 0.5)):
    return {k: C.weathered_wood(f"{tag}_{k}", char=char, soot_z=soot, grain_axis=k.upper(), scale=0.45,
                                heat_center=heat, heat_r=hr) for k in "xyz"}


wA = woods("A", 0.42, (0.30, 0.62))
wB = woods("B", 0.52, (0.28, 0.66))
wC = woods("C", 0.72, (0.20, 0.62), heat=(0.0, -0.75, 0.15), hr=(0.15, 0.6))
iron = C.weathered_iron("iron", soot_z=(0.3, 0.6), rust=0.6, scale=0.4)
rockm = L.mine_rock("rock", scale=0.6, ash_amt=0.45)


def place(objs, x, yaw):
    """組み立てた箱（原点まわり）を x へ置き、yaw 度回す"""
    bpy.context.view_layer.update()
    M = Matrix.Translation((x, 0, 0)) @ Matrix.Rotation(math.radians(yaw), 4, "Z")
    for o in objs:
        o.matrix_world = M @ o.matrix_world
    return objs


def slat_z(h, i, nb=3):
    H = h - Z0
    sw = (H - GAP * (nb + 1)) / nb
    return Z0 + GAP + sw / 2 + i * (sw + GAP), sw


def rock(name, r, loc, rot=(0, 0, 0), squash=(1, 0.85, 0.7), seed=0, facet=4, detail=2):
    ob = C.rock(name, r, detail=detail, rough=0.3, squash=squash, seed=seed, facet=facet)
    # 割れ面は平らに、面の間はなめらかに（三角形の段々を見せない）：35°を超える辺だけシャープ
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    for f in bm.faces:
        f.smooth = True
    L.sharpen(bm, 35)
    bm.to_mesh(ob.data)
    bm.free()
    C.xform(ob, loc, rot)
    return C.assign(ob, rockm)


parts = []

# ================= A 無傷（使い古し） =================
wA_, dA, hA = 0.72, 0.50, 0.50
A = L.framed_crate("A", wA_, dA, hA, wA, iron=iron, seed=1, brace=True,
                   splits={"T0": (0.03, None), "Fv1": (None, 0.045), "Rs0": (None, 0.04), "Bs2": (0.035, None)})
pA = L.flatten(A)
# 蓋の四隅の当て金（上面→側面へ折れる L 字の帯）
lx, ly, lz = wA_ / 2 + 2 * T + 0.005, (dA + 4 * T) / 2, hA + T
for k, (sx, sy) in enumerate(((-1, -1), (1, -1), (1, 1), (-1, 1))):
    cx, cy = sx * (lx + 0.002), sy * (ly + 0.002)
    for j, (dx, dy, upv) in enumerate(((-sx * 0.09, 0, (0, sy, 0)), (0, -sy * 0.09, (sx, 0, 0)))):
        pts = [Vector((cx + dx, cy + dy, lz + 0.002)), Vector((cx, cy, lz + 0.002)), Vector((cx, cy, lz - 0.07))]
        br = C.sweep(f"A_br{k}{j}", pts, C.rect_profile(0.004, 0.042, 0.001), up_fn=lambda i, p, t, u=upv: u)
        pA.append(C.assign(br, iron))
# 左右の鉄の取っ手（上段の横板に）
zt, _ = slat_z(hA, 2)
for k, sx in enumerate((-1, 1)):
    xf = sx * (wA_ / 2 + 0.004)
    pts = C.bezier((xf, -0.08, zt + 0.01), (xf + sx * 0.06, -0.08, zt - 0.03), (xf + sx * 0.06, 0.08, zt - 0.03), (xf, 0.08, zt + 0.01), n=8)
    hd_ = C.sweep(f"A_handle{k}", pts, C.circle_profile(0.0065, 6))
    pA.append(C.assign(hd_, iron))
    for j, yy in enumerate((-0.08, 0.08)):
        pl = L.board(f"A_hplate{k}{j}", (xf, yy, zt + 0.005), (0, 0, 1), (0, 1, 0), 0.06, 0.03, 0.005, {"x": iron, "y": iron, "z": iron}, seed=k * 3 + j, chip=0.0, segs=1)
        pA.append(pl)
parts += place(pA, -1.0, 6)

# ================= B 蓋が割れた =================
wB_, dB, hB = 0.62, 0.62, 0.56
hwB = wB_ / 2
B = L.framed_crate("B", wB_, dB, hB, wB, iron=iron, seed=2, skip=("T2",),
                   broken={"T1": dict(f=0.47, rough=0.07, rot_a=((0, 1, 0), 28, (0, 0, -0.02)), rot_b=((0, 1, 0), -34, (0, 0, -0.03))),
                           "Fs2": dict(f=0.42, rough=0.07, drop_b=True),
                           "Lv1": dict(f=0.82, rough=0.05, drop_b=True)},
                   mods={"T0": L.pivot_rot((0, 0, hB), (0, 0, 1), 7, (0.03, -0.025, 0.004))},
                   splits={"Rv0": (None, 0.05), "Bs2": (None, 0.045)})
pB = L.flatten(B)
# 外れた奥の蓋板：右の面に立てかける（下端は地面、上端は箱の縁）
p0, p1 = Vector((hwB + 0.20, 0.05, 0.012)), Vector((hwB + 0.035, 0.08, hB + 0.06))
dv = p1 - p0
pB.append(L.board("B_T2_loose", (p0 + p1) / 2, dv, (0, 1, 0), dv.length, 0.2, T, wB, seed=95, split_b=0.06, chip=0.007))
# 折れて失われた前上段の残り片：前の地面に
pB.append(L.board("B_Fs2_frag", (0.12, -dB / 2 - 0.20, 0.012), (math.cos(0.5), math.sin(0.5), 0), (-math.sin(0.5), math.cos(0.5), 0),
                  0.30, 0.13, T, wB, seed=96, split_a=0.06, split_b=0.04))
# 中身：黒い鉱石の塊（割れ目から見える）
for j in range(7):
    r = rnd.uniform(0.07, 0.11)
    pB.append(rock(f"B_ore{j}", r, (rnd.uniform(-0.18, 0.18), rnd.uniform(-0.18, 0.18), 0.30 + rnd.uniform(0, 0.10)),
                   (0, 0, rnd.uniform(0, 360)), seed=400 + j, facet=3, detail=1))
parts += place(pB, 0.0, -9)

# ================= C 潰れた =================
wC_, dC, hC = 0.90, 0.60, 0.55
hdC = dC / 2
HC = hC - Z0
front_fall = L.pivot_rot((0, -hdC - T, Z0), (1, 0, 0), 80, (0, -0.02, 0))
FALL = ("Fs0", "Fs1", "Fs2", "Fv0", "Fv1", "Fb")   # 前の面：外へ倒れて地面に（Ft は失われた）
brk = {}
mods = {}
# 倒れた前の面も壊れている：中段は半分失われ、右の角当ては折れる（倒す行列は後で掛ける）
brk["Fs1"] = dict(f=0.58, rough=0.07, drop_b=True)
brk["Fv1"] = dict(f=0.62, rough=0.06, drop_b=True)
brk["Fs2"] = dict(f=0.36, rough=0.06, rot_b=((0, 1, 0), -9, (0.03, 0, 0)))
# 左右の横板：前半分が折れ口を支点に垂れ下がる（L は b 片、R は a 片が前）。前端は地面近くまで
LEN_LR = dC + 2 * T - 2 * T
for i in range(3):
    zi, _ = slat_z(hC, i)
    fL, fR = 0.5 + 0.05 * i, 0.45 - 0.04 * i
    angL = math.degrees(math.asin(min(0.97, (zi - 0.03) / (LEN_LR * (1 - fL)))))
    angR = math.degrees(math.asin(min(0.97, (zi - 0.03) / (LEN_LR * fR))))
    brk[f"Ls{i}"] = dict(f=fL, rough=0.07, rot_b=((1, 0, 0), angL * rnd.uniform(0.8, 0.95), (0.0, 0, 0)), hinge="inner")
    brk[f"Rs{i}"] = dict(f=fR, rough=0.07, rot_a=((1, 0, 0), angR * rnd.uniform(0.8, 0.95), (0.0, 0, 0)), hinge="inner")
brk["Ls1"]["drop_b"] = True
brk["Lv1"] = dict(f=0.45, rough=0.06, drop_b=True)
brk["Rv0"] = dict(f=0.38, rough=0.06, drop_b=True)
# 蓋：手前は中へ落ち、中央と奥は折れて V 字にたわむ（岩が乗る）
ldC = dC + 4 * T
brk["T0"] = dict(f=0.48, rough=0.07, rot_a=((0, 1, 0), 52, (0.0, 0.02, -0.02)), rot_b=((0, 1, 0), -58, (0.0, 0.02, -0.02)))
brk["T1"] = dict(f=0.55, rough=0.07, rot_a=((0, 1, 0), 30, (0, -0.01, -0.03)), rot_b=((0, 1, 0), -36, (0, -0.01, -0.04)))
brk["T2"] = dict(f=0.45, rough=0.06, rot_a=((0, 1, 0), 15, (0, 0, -0.01)), rot_b=((0, 1, 0), -19, (0, 0, -0.01)))
Cc = L.framed_crate("C", wC_, dC, hC, wC, iron=iron, seed=3, broken=brk, mods=mods, skip=("Ft",), no_nails="F",
                    splits={"Bv1": (None, 0.05), "Bs2": (0.05, 0.05)})
bpy.context.view_layer.update()
for bid in FALL:
    for o in Cc.get(bid, []):
        o.matrix_world = front_fall @ o.matrix_world
pC = L.flatten(Cc)
# 上に落ちた岩（蓋を押し潰す）と、倒れた前の面を支える岩
pC.append(rock("C_rock_top", 0.22, (0.10, -0.02, 0.38), (8, -12, 30), squash=(1.0, 0.85, 0.7), seed=500, facet=5))
pC.append(rock("C_rock_prop", 0.16, (0.05, -0.62, 0.16), (0, 0, 20), squash=(1.15, 0.9, 0.75), seed=501, facet=5))
for j in range(6):
    r = rnd.uniform(0.035, 0.07)
    pC.append(rock(f"C_rubble{j}", r, (rnd.uniform(-0.5, 0.5), rnd.uniform(-0.95, -0.35), r * 0.35), (0, 0, rnd.uniform(0, 360)),
                   squash=(1, 0.8, 0.6), seed=510 + j, facet=3, detail=1))
# 折れた角当ての上半分と板片（地面）
pC.append(L.board("C_Lv1_frag", (-0.52, -0.62, 0.015), (math.cos(1.2), math.sin(1.2), 0), (-math.sin(1.2), math.cos(1.2), 0),
                  0.27, BAT, T, wC, seed=97, split_a=0.06))
pC.append(L.board("C_Fs1_frag", (0.36, -0.95, 0.02), (math.cos(-0.3), math.sin(-0.3), 0.06), (math.sin(0.3), math.cos(0.3), 0),
                  0.36, 0.13, T, wC, seed=98, split_a=0.06, split_b=0.05))
parts += place(pC, 1.02, 4)

C.finish(NAME, parts, version=VERSION, tex_res=1024, budget_tris=9000, refs=[97, 98, 100],
         notes="焦げた木箱3種（A無傷・B蓋割れ・C潰れ）。x=-1.0/0/+1.02 に並ぶ。枠つきスラット箱（#97）。ゲーム側は分割して個別に配置可（同一テクスチャ）。")
