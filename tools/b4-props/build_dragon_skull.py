"""
b4p_dragon_skull — 半分埋もれた竜の頭骨（巣の手前の見せ場）

設計図: docs/3d/b4-props/blueprints/b4p_dragon_skull.md（v7 から断面 loft 方式に作り直し。数値は下の定数）

参考（Pinterest、references/b4-dragonfire-props-20261119.md）:
  #18 半分埋もれた竜頭骨：角の折れ、眼窩の陰、風化した骨表面（主参考）
  #16 肋骨のアーチと頭骨：骨の割れ・欠け、牙の並び
  #13 竜骨格の全体プロポーション：吻が長く、後頭部に角と棘
形・寸法の要点:
  - 頭蓋は鼻先→後頭の断面10枚を補間して loft（鼻先は細く平たく、後頭は幅広）。上は丸く、口蓋は平ら。眉の稜と矢状稜を盛る
  - 眼窩（直径0.28）・前眼窩窓・側頭窓（上に頬骨弓が残る）・頭頂窓・鼻孔をブーリアンで貫通させ、黒い穴として読ませる
  - 上顎の縁に円錐の歯を片側11本（欠落4・欠け4）。下顎は別部品で口を少し開き、大半を地面に埋める
  - 角は根元が太く先が細い、ねじれた三日月形。年輪状の段。左は途中で折れる
劣化（設計書3章・2章「骨は真っ白にしない」）:
  欠け＝折れた角・欠けた歯と抜けた歯・鼻筋の欠けた穴／角の摩耗＝稜が擦れて少し明るい／
  煤＝下ほど黒く、まだらな焦げ、全体に灰と煤の膜／灰＝上向き面と凹み／風化＝乾燥割れ・穴・剥離、穴の奥は黒
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
VERSION = "v7"
rnd = random.Random(1313)
C.reset(1313)

# 設計図の断面表: (x, 半幅, 上端z, 下端z)
SECT = [(-1.20, 0.07, 0.30, 0.19), (-1.00, 0.13, 0.36, 0.15), (-0.75, 0.17, 0.42, 0.13), (-0.45, 0.22, 0.50, 0.13),
        (-0.15, 0.30, 0.60, 0.14), (0.10, 0.40, 0.72, 0.17), (0.35, 0.46, 0.78, 0.21), (0.55, 0.44, 0.77, 0.25),
        (0.72, 0.36, 0.68, 0.31), (0.84, 0.22, 0.55, 0.38)]
NR, NP = 44, 32
P_TOP, P_BOT = 2.6, 7.0


def spow(v, e):
    return math.copysign(abs(v) ** e, v)


rings = []
for k in range(NR):
    x, hw, zt, zb = D.catmull(SECT, (len(SECT) - 1) * k / (NR - 1))
    mid = (zt + zb) / 2
    hh = (zt - zb) / 2
    ring = []
    for i in range(NP):
        a = 2 * math.pi * i / NP
        ca, sa = math.cos(a), math.sin(a)
        e = 2 / P_TOP if sa >= 0 else 2 / P_BOT
        y = hw * spow(ca, 2 / P_TOP)
        z = mid + hh * spow(sa, e)
        if sa > 0:
            # 眉の稜（上側 ±55° 付近、x 0.0〜0.4）
            brow = math.exp(-((x - 0.2) / 0.16) ** 2) * math.exp(-((abs(math.degrees(math.atan2(sa, abs(ca)))) - 40) / 18) ** 2)
            z += 0.05 * brow
            y += math.copysign(0.03 * brow, ca)
            # 矢状稜（頂、x>0.15）
            crest = max(0.0, min(1.0, (x - 0.15) / 0.2)) * math.exp(-((a - math.pi / 2) / 0.18) ** 2)
            z += 0.05 * crest
            # 鼻筋の稜
            ridge = max(0.0, min(1.0, (0.0 - x) / 0.3)) * math.exp(-((a - math.pi / 2) / 0.25) ** 2)
            z += 0.025 * ridge
        # 頬の張り（横、x 0.2〜0.6）
        cheek = math.exp(-((x - 0.42) / 0.18) ** 2) * math.exp(-(sa / 0.35) ** 2)
        y += math.copysign(0.05 * cheek, ca)
        p = Vector((x, y, z))
        p += p.normalized() * 0.006 * noise.noise(p * 6.0)
        ring.append(p)
    rings.append(ring)
skull = D.loft("skull", rings)
C.subdiv(skull, 1)
# 風化の凹凸（乾燥割れの溝・穴）
def weather(co, nrm):
    rid = 1 - abs(noise.noise(co * 7.0 + Vector((3, 1, 2))))
    d = 0.004 * noise.noise(co * 4.0)
    if rid > 0.93:
        d -= 0.010 * (rid - 0.93) / 0.07
    pit = noise.noise(co * 16.0 + Vector((7, 7, 7)))
    if pit > 0.45:
        d -= 0.006 * (pit - 0.45) / 0.55
    return d


D.displace_along_normal(skull, weather)

# ---- 穴（貫通） ----
E = D.ellipsoid
HOLES = [  # (中心, 半径, 回転)
    ((0.15, 0.0, 0.53), (0.14, 0.9, 0.15), (0, 0, 0)),      # 眼窩（左右に貫通）
    ((-0.38, 0.0, 0.33), (0.13, 0.9, 0.06), (0, 8, 0)),     # 前眼窩窓
    ((0.55, 0.0, 0.40), (0.11, 0.9, 0.10), (0, 0, 0)),      # 側頭窓
    ((0.55, 0.17, 0.75), (0.08, 0.05, 0.4), (0, 0, 0)),     # 頭頂窓
    ((0.55, -0.17, 0.75), (0.08, 0.05, 0.4), (0, 0, 0)),
    ((-1.08, 0.06, 0.34), (0.045, 0.025, 0.2), (0, -35, 0)),  # 鼻孔
    ((-1.08, -0.06, 0.34), (0.045, 0.025, 0.2), (0, -35, 0)),
]
DAMAGE = [((-0.70, -0.17, 0.42), (0.07, 0.06, 0.05), (0, 0, 20))]
D.bool_diff(skull, [E(f"_h{k}", c, r, rot=ro, subdiv=3) for k, (c, r, ro) in enumerate(HOLES + DAMAGE)])
D.decimate_to(skull, 9000)


def sect_at(x):
    t = (x - SECT[0][0]) / (SECT[-1][0] - SECT[0][0]) * (len(SECT) - 1)
    return D.catmull(SECT, max(0.0, min(len(SECT) - 1, t)))


parts = [skull]
teeth = []
# ---- 上顎の歯 ----
MISSING = {(1, 2), (1, 7), (-1, 5), (-1, 9)}
BROKEN = {(1, 5), (-1, 1), (-1, 7), (1, 9)}
for s in (-1, 1):
    for i in range(11):
        if (s, i) in MISSING:
            continue
        t = i / 10
        x = -1.12 + 1.42 * t
        _, hw, zt, zb = sect_at(x)
        ln = 0.06 + 0.11 * math.sin(math.pi * min(1.0, t * 1.4)) + (0.08 if i == 3 else 0.0)
        r = 0.015 + 0.02 * math.sin(math.pi * min(1.0, t * 1.3)) + (0.006 if i == 3 else 0.0)
        if (s, i) in BROKEN:
            ln *= 0.5
        p = Vector((x, s * (hw * 0.82), zb + 0.02))
        pts = C.bezier(p, p + Vector((0.0, -s * 0.01, -ln * 0.55)), p + Vector((0.03, -s * 0.015, -ln)), n=5)
        tb = D.tube(f"tooth_{s}_{i}", pts, r, r * (0.5 if (s, i) in BROKEN else 0.1), sides=7)
        teeth.append((tb, (s, i) in BROKEN, pts[-1]))
        parts.append(tb)

# ---- 下顎（左右の板が鼻先で合わさる、口を 8° 開く） ----
jaw = []
for s in (-1, 1):
    path = [Vector((-1.12 + 1.72 * k / 14, s * (0.05 + 0.33 * (k / 14) ** 0.9), 0.07 + 0.03 * k / 14)) for k in range(15)]
    prof = C.rect_profile(0.16, 0.05, chamfer=0.015)
    jb = C.sweep(f"mandible_{s}", path, prof, up_fn=lambda i, p, t: Vector((0, 0, 1)),
                 scale_fn=lambda u: (0.8 + 0.7 * u, 1.0))
    jaw.append(jb)
    for i in range(7):
        if i in ((1, 4, 6) if s > 0 else (2, 5)):
            continue
        p = path[1 + i * 2] + Vector((0, 0, 0.08 + 0.05 * i / 6))
        ln = 0.05 + 0.05 * math.sin(math.pi * i / 6)
        tb = D.tube(f"ltooth_{s}_{i}", C.bezier(p, p + Vector((0, 0, ln * 0.6)), p + Vector((0.02, 0, ln)), n=4), 0.016, 0.003, sides=6)
        jaw.append(tb)
Mj = Matrix.Translation((-1.12, 0, 0.12)) @ Matrix.Rotation(math.radians(8), 4, "Y") @ Matrix.Translation((1.12, 0, -0.12))
for o in jaw:
    o.data.transform(Mj)
parts += jaw

# ---- 角（ねじれた三日月、年輪状の段。左は折れる） ----
HORN_BREAK = 0.5
horn_break_end = None
for s in (-1, 1):
    ctrl = C.bezier((0.62, 0.25 * s, 0.72), (0.98, 0.36 * s, 1.08), (1.30, 0.54 * s, 1.02), (1.36, 0.58 * s, 0.74), n=36)
    if s < 0:
        ctrl = ctrl[:int(len(ctrl) * HORN_BREAK)]
        horn_break_end = ctrl[-1].copy()
    full = 36
    n = len(ctrl)
    prof = [(math.cos(2 * math.pi * i / 12) * (1.0 + 0.08 * math.cos(2 * 2 * math.pi * i / 12)),
             math.sin(2 * math.pi * i / 12) * 0.86) for i in range(12)]  # わずかに扁平
    def scl(u, n=n):
        uu = u * (n - 1) / (full - 1)
        r = 0.13 * (1 - uu) ** 1.15 + 0.015
        r *= 1.0 - 0.06 * max(0.0, math.sin(uu * 14 * math.pi)) ** 4   # 年輪状の段
        return r
    twist = lambda i, p, t, s=s: (Vector((0, 0, 1)) * math.cos(i * 0.1 * s) + Vector((1, 0, 0)).cross(t).normalized() * math.sin(i * 0.1 * s))
    hb = C.sweep(f"horn_{s}", ctrl, prof, up_fn=twist, scale_fn=scl)
    parts.append(hb)
# 後頭の棘
for k, (p0, d, ln) in enumerate((((0.70, 0.0, 0.80), (0.7, 0, 0.7), 0.24), ((0.82, 0.10, 0.62), (0.9, 0.3, 0.3), 0.20),
                                 ((0.82, -0.10, 0.62), (0.9, -0.3, 0.3), 0.18))):
    p0, d = Vector(p0), Vector(d).normalized()
    parts.append(D.tube(f"spike_{k}", C.bezier(p0, p0 + d * ln * 0.5 + Vector((0, 0, 0.03)), p0 + d * ln, n=5), 0.045, 0.006, sides=7))

# ---- 回して埋める ----
M = Matrix.Translation((0, 0, -0.12)) @ Matrix.Rotation(math.radians(-30), 4, "Z") @ \
    Matrix.Rotation(math.radians(-6), 4, "Y") @ Matrix.Rotation(math.radians(-8), 4, "X")
MI = M.inverted()
for o in parts:
    o.data.transform(M)
    D.mesh_ground(o, 0.0)
ZMAX = max(v.co.z for o in parts for v in o.data.vertices)


def ell_q(p, c, r, ro):
    R = (Matrix.Rotation(math.radians(ro[2]), 3, "Z") @ Matrix.Rotation(math.radians(ro[1]), 3, "Y") @
         Matrix.Rotation(math.radians(ro[0]), 3, "X"))
    q = R.inverted() @ (p - Vector(c))
    return math.sqrt((q.x / r[0]) ** 2 + (q.y / r[1]) ** 2 + (q.z / r[2]) ** 2)


def cd_fn(co):
    p = MI @ co
    return max(min(1.0, max(0.0, (1.25 - ell_q(p, c, r, ro)) / 0.4)) for c, r, ro in HOLES)


def fresh_fn(co):
    p = MI @ co
    if any(ell_q(p, c, r, ro) < 1.08 for c, r, ro in DAMAGE):
        return 1.0
    return 0.0


for o in parts:
    D.ensure_attrs(o)
    D.set_attr_fn(o, "tip", lambda co: min(1.0, co.z / ZMAX))
D.set_attr_fn(skull, "cd", cd_fn)
D.set_attr_fn(skull, "fresh", fresh_fn)
hb_left = next(o for o in parts if o.name.startswith("horn_-1"))
e = M @ horn_break_end
D.set_attr_fn(hb_left, "fresh", lambda co: 1.0 if (co - e).length < 0.05 else 0.0)
for tb, broken, end in teeth:
    if broken:
        ee = M @ end
        D.set_attr_fn(tb, "fresh", lambda co, ee=ee: 1.0 if (co - ee).length < 0.025 else 0.0)

# ---- 接地線に沿った玄武岩 ----
rocks = []
contact = [v.co.copy() for o in [skull] + jaw for v in o.data.vertices if v.co.z < 0.02]
rnd.shuffle(contact)
picked = []
for c in contact:
    if all((c - p).length > 0.3 for p in picked):
        picked.append(c)
    if len(picked) >= 12:
        break
for k, c in enumerate(picked):
    sz = rnd.uniform(0.12, 0.28)
    ob = D.chip_rock(f"rock_{k}", sz, (c.x, c.y), seed=200 + k, subdiv=2 if sz > 0.18 else 1,
                     squash=(1.0, rnd.uniform(0.7, 0.95), rnd.uniform(0.4, 0.65)), rot_z=rnd.uniform(0, 6.28), sink=0.3)
    D.ensure_attrs(ob)
    rocks.append(ob)

allp = parts + rocks
off = D.recenter(allp)
bone = D.bone_mat("bone", soot_lo=0.0, soot_hi=0.8, grime=0.65, char_lo=0.46, ash_amt=0.9)
basalt = D.basalt("basalt", hairline=0.0)
for o in parts:
    C.assign(o, bone)
for o in rocks:
    C.assign(o, basalt)
C.finish(NAME, allp, version=VERSION, tex_res=2048, budget_tris=18000, refs=[18, 16, 13],
         notes="v7: 断面 loft の頭蓋に眼窩・窓・鼻孔を貫通、円錐の歯（欠落4・欠け4）、別部品の下顎（大半が埋まる）、"
               "ねじれた三日月の角（年輪状の段、左は折れる）。煤と灰で汚した骨。")
