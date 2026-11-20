"""
b4p_dragon_skull — 半分埋もれた竜の頭骨（巣の手前の見せ場）

物語: a4-boss「巨大な翼が天井を覆った」の手前。骨・爪痕・卵殻が増えていく（設計書1章）

参考（Pinterest、references/b4-dragonfire-props-20261119.md）:
  #18 半分埋もれた竜頭骨：角の折れ、眼窩の陰、風化した骨表面（主参考。構図・埋まり方）
  #16 肋骨のアーチと頭骨：骨の割れ・欠け、牙の並び
  #13 竜骨格の全体プロポーション：頭骨の長さ（吻が長く、後頭部に角と棘）
形・寸法の要点（局所座標で組み、最後に回して埋める）:
  - 全長約2.4m（吻端〜角の先）×幅1.0m×高さ1.2m。吻は長く先細り、眼窩は大きく前向きやや横、
    眼窩の前に前眼窩窓、後ろに側頭窓と頭頂の小窓、鼻孔は吻端に2つ
  - 眉の張り出し・頬骨弓（側頭窓の下の骨の棒）・上顎の歯列の稜
  - 後頭部から大きな角2本が後ろ上へ反る（左は途中で折れる）。頭頂と後頭に小さな棘4本
  - 牙：上顎に左右9本ずつ（欠落4、先の欠け3）。下顎は大半が灰と岩に埋まり、片側だけ覗く
  - 全体を約30°回し、吻を少し上げ、横に12°傾けて地面へ0.10m沈め（吻を15°上げて上顎の牙列を見せる）。接地線に沿って岩14個。まわりに玄武岩の欠片
作り方: 楕円体と管の和をボクセルで1つの面にし（2cm）、窓・眼窩・欠けた穴をブーリアンで引き、
  風化の凹凸（ひび・穴）を頂点で入れてから約13k三角形へ減らす
劣化（設計書3章・2章「骨は真っ白にしない」）:
  欠け＝折れた角（新しい断面）・吻の横の欠けた穴・欠けた牙と抜けた牙／角の摩耗＝稜が擦れて少し明るい／
  煤＝下ほど黒く（埋もれていた所）、まだらな焦げ／灰＝上向き面と凹みに積もる／
  風化＝乾燥割れ・剥離・小さな穴、眼窩と窓の奥は黒
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
import common as C  # noqa: E402
import lib_dragon as D  # noqa: E402
from mathutils import Matrix, Vector, noise  # noqa: E402

NAME = "b4p_dragon_skull"
VERSION = "v6"
rnd = random.Random(1313)
C.reset(1313)

pos = []   # 骨の和（ボクセル化）
late = []  # 後頭を平らにした後で足す部品（角・棘・フリルの角）
E = D.ellipsoid
# 頭蓋と後頭
pos += [E("cranium", (0.42, 0, 0.50), (0.50, 0.30, 0.30)), E("occiput", (0.80, 0, 0.54), (0.16, 0.30, 0.22))]
for s_ in (-1, 1):  # 後頭の張り出し（フリルの角）: 丸い後頭部をやめて角ばった骨の板に
    late.append(D.tube(f"flange_{s_}", C.bezier((0.62, 0.26 * s_, 0.66), (0.86, 0.40 * s_, 0.58), (1.04, 0.50 * s_, 0.44), n=8), 0.075, 0.03))
# 頭頂の稜（矢状稜）: 丸い頭蓋を骨らしく引き締める
pos.append(D.tube("crest", C.bezier((0.15, 0, 0.80), (0.55, 0, 0.90), (0.98, 0, 0.74), n=10), 0.06, 0.05))
# 吻（先細り）
for k, (x, ry, rz, z) in enumerate(((0.0, 0.36, 0.30, 0.42), (-0.45, 0.28, 0.22, 0.36), (-0.88, 0.20, 0.17, 0.31),
                                     (-1.14, 0.13, 0.12, 0.27))):
    pos.append(E(f"snout_{k}", (x, 0, z), (0.42 if k < 3 else 0.15, ry, rz)))
# 鼻筋（上の稜）
pos.append(D.tube("nasal", C.bezier((-1.18, 0, 0.36), (-0.5, 0, 0.56), (0.25, 0, 0.82), n=10), 0.05, 0.09))
for s in (-1, 1):
    pos.append(E(f"brow_{s}", (0.22, 0.31 * s, 0.70), (0.27, 0.13, 0.10), rot=(0, -8, 14 * s)))
    pos.append(D.tube(f"cheek_{s}", C.bezier((-0.08, 0.34 * s, 0.27), (0.45, 0.54 * s, 0.25), (0.92, 0.42 * s, 0.38), n=10), 0.09, 0.07))
    pos.append(D.tube(f"maxilla_{s}", C.bezier((-1.16, 0.09 * s, 0.17), (-0.55, 0.22 * s, 0.17), (0.05, 0.33 * s, 0.22), n=10), 0.055, 0.085))
    # 下顎（大半が埋まる）
    pos.append(D.tube(f"mandible_{s}", C.bezier((-1.02, 0.13 * s, 0.06), (0.15, 0.38 * s, 0.00), (0.72, 0.42 * s, 0.16), n=10), 0.06, 0.09))
# 角：右は完全、左は途中で折れる
HORN_BREAK = 0.48
horn_tips = {}
for s in (-1, 1):
    pts = C.bezier((0.72, 0.25 * s, 0.76), (1.02, 0.36 * s, 1.12), (1.40, 0.44 * s, 1.14), (1.58, 0.40 * s, 0.96), n=16)
    if s < 0:
        pts = pts[:int(16 * HORN_BREAK) + 1]
        horn_tips[s] = (pts[-1], (pts[-1] - pts[-2]).normalized())
    rr = (0.125, 0.125 - (0.125 - 0.022) * HORN_BREAK) if s < 0 else (0.125, 0.022)
    late.append(D.tube(f"horn_{s}", pts, rr[0], rr[1], sides=12, pw=0.9))
# 小さな棘（頭頂・後頭）
for k, (p0, d, ln, r) in enumerate((((0.55, 0.0, 0.86), (0.6, 0, 0.8), 0.30, 0.06), ((0.85, 0.0, 0.80), (0.8, 0, 0.6), 0.34, 0.06),
                                    ((1.02, 0.18, 0.66), (0.9, 0.3, 0.3), 0.28, 0.05), ((1.02, -0.18, 0.66), (0.9, -0.3, 0.3), 0.24, 0.05))):
    p0 = Vector(p0)
    d = Vector(d).normalized()
    pts = C.bezier(p0, p0 + d * ln * 0.5 + Vector((0, 0, 0.04)), p0 + d * ln, n=6)
    late.append(D.tube(f"spike_{k}", pts, r, r * 0.18, sides=8))

REAR = [((1.20, 0.0, 0.50), (0.40, 0.75, 0.75), (0, 18, 0))]   # 後ろを斜めに落として平らな後頭面に（x>0.8）
body = D.voxel_union(pos, "skull_body", voxel=0.022)
D.bool_diff(body, [E(f"_r{k}", c, r, rot=ro, subdiv=3) for k, (c, r, ro) in enumerate(REAR)])
skull = D.voxel_union([body] + late, "skull", voxel=0.016)

# 穴：眼窩・前眼窩窓・側頭窓・頭頂窓・鼻孔・欠けた穴
CUT = []
for s in (-1, 1):
    CUT += [((0.20, 0.37 * s, 0.53), (0.19, 0.17, 0.17), (0, 0, 18 * s)),
            ((-0.33, 0.29 * s, 0.37), (0.21, 0.10, 0.085), (0, 6, 8 * s)),
            ((0.60, 0.40 * s, 0.42), (0.21, 0.14, 0.14), (0, 0, 0)),
            ((0.66, 0.17 * s, 0.84), (0.13, 0.075, 0.09), (0, 0, 0)),
            ((-1.12, 0.075 * s, 0.33), (0.085, 0.045, 0.05), (0, -20, 0))]
CUT += [((0.82, 0.0, 0.34), (0.12, 0.085, 0.085), (0, 0, 0))]   # 大後頭孔
DAMAGE = [((-0.72, -0.27, 0.40), (0.17, 0.10, 0.12), (0, 0, -10)), ((0.40, 0.18, 0.92), (0.16, 0.14, 0.08), (0, 10, 0))]
cutters = [E(f"_c{k}", c, r, rot=ro, subdiv=3) for k, (c, r, ro) in enumerate(CUT + DAMAGE)]
D.bool_diff(skull, cutters)
# 口の隙間（上顎と下顎のあいだ）
D.bool_diff(skull, [E("_mouth", (-0.45, 0, 0.115), (0.80, 0.30, 0.045), subdiv=3)])
# 折れた角の断面（折れ口をさらに斜めに割る）
tip, tdir = horn_tips[-1]
cutp = D.ellipsoid("_hornbreak", tip + tdir * 0.05, (0.16, 0.16, 0.16), subdiv=2)
D.bool_diff(skull, [cutp])


def ell_q(p, c, r, ro):
    R = (Matrix.Rotation(math.radians(ro[2]), 3, "Z") @ Matrix.Rotation(math.radians(ro[1]), 3, "Y") @
         Matrix.Rotation(math.radians(ro[0]), 3, "X"))
    q = R.inverted() @ (p - Vector(c))
    return math.sqrt((q.x / r[0]) ** 2 + (q.y / r[1]) ** 2 + (q.z / r[2]) ** 2)


# 風化の凹凸（密なボクセル面のうちに入れる）: 乾燥割れの溝・小さな穴・剥離の段差
def weather(co, nrm):
    n1 = noise.noise(co * 3.0)
    rid = 1 - abs(noise.noise(co * 7.0 + Vector((3, 1, 2))))
    d = 0.012 * n1
    if rid > 0.92:
        d -= 0.020 * (rid - 0.92) / 0.08          # 乾燥割れの溝
    pit = noise.noise(co * 14.0 + Vector((7, 7, 7)))
    if pit > 0.4:
        d -= 0.010 * (pit - 0.4) / 0.6             # 風化の穴
    if noise.noise(co * 4.0 + Vector((2, 9, 4))) > 0.45:
        d -= 0.006                                 # 剥離した段
    return d


D.displace_along_normal(skull, weather)
D.decimate_to(skull, 13000)

# ---- 牙 ----
parts = [skull]
teeth = []
MISSING = {(1, 2), (1, 6), (-1, 4), (-1, 8)}
BROKEN = {(1, 4), (-1, 1), (-1, 6)}
for s in (-1, 1):
    for i in range(9):
        if (s, i) in MISSING:
            continue
        t = i / 8
        p = Vector((-1.10 + 1.08 * t, (0.095 + 0.22 * t) * s, 0.14 + 0.04 * t))
        ln = 0.12 + 0.13 * math.sin(math.pi * min(1.0, t * 1.6)) + (0.08 if i == 2 else 0.0)
        if (s, i) in BROKEN:
            ln *= 0.55
        r = 0.022 + 0.018 * math.sin(math.pi * min(1.0, t * 1.4)) + (0.008 if i == 2 else 0.0)
        pts = C.bezier(p + Vector((0, 0, 0.05)), p + Vector((-0.01, 0.0, -ln * 0.5)), p + Vector((-0.04, -0.01 * s, -ln)), n=5)
        tb = D.tube(f"tooth_{s}_{i}", pts, r, r * (0.55 if (s, i) in BROKEN else 0.12), sides=7)
        teeth.append((tb, (s, i) in BROKEN, pts[-1]))
        parts.append(tb)

# ---- 回して埋める ----
M = Matrix.Translation((0, 0, -0.10)) @ Matrix.Rotation(math.radians(-30), 4, "Z") @ \
    Matrix.Rotation(math.radians(-15), 4, "Y") @ Matrix.Rotation(math.radians(-10), 4, "X")
MI = M.inverted()
for o in parts:
    o.data.transform(M)
    D.mesh_ground(o, 0.0)

# 属性（位置から）: tip=高さ比、cd=穴の奥への近さ、fresh=欠けた穴・折れた角・欠けた牙の断面
ZMAX = max(v.co.z for v in skull.data.vertices)


def cd_fn(co):
    p = MI @ co
    best = 0.0
    for c, r, ro in CUT:
        if max(r) > 0.3:  # 後頭を平らにする大きな切り抜きは「穴の奥」ではない
            continue
        q = ell_q(p, c, r, ro)
        best = max(best, min(1.0, max(0.0, (1.3 - q) / 0.45)))
    return best


def fresh_fn(co):
    p = MI @ co
    for c, r, ro in DAMAGE:
        if ell_q(p, c, r, ro) < 1.06:
            return 1.0
    if (p - (tip + tdir * 0.05)).length < 0.175:
        return 1.0
    return 0.0


D.set_attr_fn(skull, "tip", lambda co: min(1.0, co.z / ZMAX))
D.set_attr_fn(skull, "cd", cd_fn)
D.set_attr_fn(skull, "fresh", fresh_fn)
for tb, broken, end in teeth:
    D.set_attr_fn(tb, "tip", lambda co: min(1.0, co.z / ZMAX) * 0.6 + 0.4)
    if broken:
        e = M @ end
        D.set_attr_fn(tb, "fresh", lambda co, e=e: 1.0 if (co - e).length < 0.02 else 0.0)

# ---- まわりの玄武岩の欠片（頭骨の根元を埋める） ----
rocks = []
# 頭骨が地面に沈む線（z≈0 の頂点）に沿って岩を寄せ、埋もれた感じを出す
contact = [v.co.copy() for v in skull.data.vertices if v.co.z < 0.02]
rnd.shuffle(contact)
picked = []
for c in contact:
    if all((c - p).length > 0.28 for p in picked):
        picked.append(c)
    if len(picked) >= 14:
        break
for k, c in enumerate(picked):
    cen = Vector((0.1, 0, 0))
    d = Vector((c.x, c.y, 0)) - (M @ cen).to_2d().to_3d()
    d = d.normalized() if d.length > 1e-4 else Vector((1, 0, 0))
    sz = rnd.uniform(0.12, 0.30)
    loc = c + d * sz * 0.25
    ob = D.chip_rock(f"rock_{k}", sz, (loc.x, loc.y), seed=200 + k, subdiv=2 if sz > 0.18 else 1,
                     squash=(1.0, rnd.uniform(0.7, 0.95), rnd.uniform(0.4, 0.65)), rot_z=rnd.uniform(0, 6.28), sink=0.3)
    D.ensure_attrs(ob)
    rocks.append(ob)

allp = parts + rocks
for o in allp:
    D.ensure_attrs(o)
off = D.recenter(allp)
bone = D.bone_mat("bone", soot_lo=0.05, soot_hi=0.9)
basalt = D.basalt("basalt", hairline=0.0)
for o in parts:
    C.assign(o, bone)
for o in rocks:
    C.assign(o, basalt)
C.finish(NAME, allp, version=VERSION, tex_res=2048, budget_tris=18000, refs=[18, 16, 13],
         notes="半分埋もれた竜の頭骨。左の角は折れ、牙は欠落4・欠け3。眼窩・窓の奥は黒、下ほど煤、上向き面と凹みに灰。")
