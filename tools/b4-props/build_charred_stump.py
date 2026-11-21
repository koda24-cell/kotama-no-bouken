"""
b4p_charred_stump — 炭化した切り株（芯とうろの奥がまだ赤い）

物語: a4-enter「息をするだけでのどが焼けそう」／竜の痕跡のセット（爪痕の岩＋鱗＋焼け木）。竜の炎で焼かれた木

参考（Pinterest、references/b4-dragonfire-props-20261119.md）:
  #57 炭化した切り株：鋭い折れ口（細く尖った裂け木が上へ突き出す）、黒い艶消し
  #55 内部がまだ赤熱する焼け木：亀甲状の炭化割れ＋芯の発光
  #58 枯れ木の内部が燃える：うろの中の赤熱
形・寸法の要点:
  - 高さ1.2m（最も高い裂け木の先）、幹の径約0.5m、根張りを含め0.8×0.8m
  - 幹は少し傾き、上は折れて5本の裂け木が不揃いに突き出す（最長1.2m、他は0.9〜1.05m）。上面はえぐれて空洞
  - 正面やや右に縦長のうろ（焼けて開いた空洞）。反対側に縦の焼け裂け
  - 根6本が外へ張って地面に潜る。足元に燃え残りの炭塊4つ
作り方: 幹・裂け木・根の管をボクセルで1つの面に（1.5cm）→うろと上面の空洞・焼け裂けをブーリアンで引く→
  樹皮の縦の裂け目を頂点で刻む→約4.6k三角形へ
劣化（設計書3章）:
  欠け＝折れて裂けた上部・うろ・焼け裂け／角の摩耗＝裂け木の稜が少し明るい（weathered_wood の摩耗）／
  煤・炭化＝全体が炭化して亀甲状に割れる（common.weathered_wood char=1.0）／灰＝上向き面と凹み／
  熱＝うろの内側と芯に近い所だけ、亀甲割れの溝の中が赤熱（表面の炭の島は黒いまま）。点光源1つ（うろの中）
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
import common as C  # noqa: E402
import lib_dragon as D  # noqa: E402
from mathutils import Matrix, Vector, noise  # noqa: E402

NAME = "b4p_charred_stump"
VERSION = "v2"
rnd = random.Random(1212)
C.reset(1212)

pos = []
pos.append(D.tube("trunk", C.bezier((0, 0, -0.06), (0.0, 0.0, 0.4), (0.03, 0.02, 0.86), n=10), 0.27, 0.205, sides=16))
# 裂け木（上の折れ口）
SPL = [(0.0, 0.17, 1.20, 0.075), (1.3, 0.16, 0.98, 0.06), (2.4, 0.18, 1.05, 0.065), (3.6, 0.15, 0.90, 0.055), (4.9, 0.17, 0.95, 0.06)]
for k, (a, rr, top, r) in enumerate(SPL):
    p0 = Vector((math.cos(a) * rr, math.sin(a) * rr, 0.70))
    lean = Vector((math.cos(a), math.sin(a), 0)) * rnd.uniform(0.02, 0.06)
    pts = C.bezier(p0, p0 + Vector((0, 0, (top - 0.7) * 0.5)) + lean * 0.5, p0 + Vector((0, 0, top - 0.7)) + lean, n=8)
    pos.append(D.tube(f"splinter_{k}", pts, r, r * 0.1, sides=7))
# 根
for k in range(6):
    a = k / 6 * 2 * math.pi + rnd.uniform(-0.25, 0.25)
    d = Vector((math.cos(a), math.sin(a), 0))
    rl = rnd.uniform(0.38, 0.46)
    pts = C.bezier(d * 0.12 + Vector((0, 0, 0.30)), d * 0.28 + Vector((0, 0, 0.12)), d * rl + Vector((0, 0, -0.06)), n=8)
    pos.append(D.tube(f"root_{k}", pts, rnd.uniform(0.10, 0.13), 0.035, sides=9))
stump = D.voxel_union(pos, "stump", voxel=0.015)

HOLLOW = ((0.06, -0.16, 0.46), (0.13, 0.16, 0.30), (0, 0, 20))
TOP = ((0.02, 0.0, 0.98), (0.15, 0.14, 0.32), (0, 0, 0))
GASH = ((-0.24, 0.10, 0.40), (0.07, 0.10, 0.24), (0, 0, 25))
EDGE = [((0.13, -0.20, 0.66), (0.08, 0.10, 0.10), (0, 0, 40)), ((-0.02, -0.21, 0.28), (0.09, 0.09, 0.08), (0, 0, -20)),
        ((0.16, -0.17, 0.42), (0.06, 0.09, 0.12), (0, 0, 60))]   # うろの縁を不揃いに焼け欠けさせる
D.bool_diff(stump, [D.ellipsoid(f"_c{k}", c, r, rot=ro) for k, (c, r, ro) in enumerate((HOLLOW, TOP, GASH) + tuple(EDGE))])


def ell_q(p, c, r, ro):
    R = Matrix.Rotation(math.radians(ro[2]), 3, "Z")
    q = R.inverted() @ (p - Vector(c))
    return math.sqrt((q.x / r[0]) ** 2 + (q.y / r[1]) ** 2 + (q.z / r[2]) ** 2)


def bark(co, nrm):
    """樹皮の縦の裂け目（上下に長いノイズの谷）"""
    q = Vector((co.x * 22, co.y * 22, co.z * 2.5))
    rid = 1 - abs(noise.noise(q))
    d = -0.016 * max(0.0, (rid - 0.82) / 0.18) + 0.006 * noise.noise(co * 6)
    if ell_q(co, *HOLLOW) < 1.1 or ell_q(co, *TOP) < 1.1:
        d *= 0.4
    return d


D.displace_along_normal(stump, bark)
D.decimate_to(stump, 4600)
D.mesh_ground(stump, 0.0)


def glow_fn(co):
    return 1.0 if (ell_q(co, *HOLLOW) < 1.08 or any(ell_q(co, *e) < 1.08 for e in EDGE)) else 0.0


def cd_fn(co):
    rxy = Vector((co.x - 0.02, co.y)).length
    core = max(0.0, min(1.0, (0.24 - rxy) / 0.12))
    h = max(0.0, min(1.0, (co.z - 0.15) / 0.2))
    return max(core * h, 0.8 if ell_q(co, *TOP) < 1.08 else 0.0, 0.6 if ell_q(co, *GASH) < 1.08 else 0.0)


D.set_attr_fn(stump, "glow", glow_fn)
D.set_attr_fn(stump, "cd", cd_fn)
D.set_attr_fn(stump, "tip", lambda co: min(1.0, co.z / 1.2))

# ---- 足元の炭塊 ----
coals = []
for k in range(4):
    a = rnd.uniform(-2.2, -0.6)
    rr = rnd.uniform(0.32, 0.45)
    sz = rnd.uniform(0.03, 0.06)
    ob = C.rock(f"coal_{k}", sz, detail=2, rough=0.4, squash=(1, 0.8, 0.6), seed=70 + k, facet=3)
    C.xform(ob, (math.cos(a) * rr, math.sin(a) * rr, sz * 0.35), (0, 0, rnd.uniform(0, 360)))
    C.apply_xform(ob)
    D.mesh_ground(ob, 0.0)
    coals.append(ob)

allp = [stump] + coals
for o in allp:
    D.ensure_attrs(o)
off = D.recenter(allp)
wood = D.charred_wood("charred", glow_strength=5.0)
coal = C.ember_coal("coal", glow=0.35)
C.assign(stump, wood)
for o in coals:
    C.assign(o, coal)
light = (tuple(Vector(HOLLOW[0]) - off + Vector((0.0, 0.05, -0.08))), 3.5, (1.0, 0.30, 0.07))
C.finish(NAME, allp, version=VERSION, tex_res=1024, budget_tris=5000, refs=[57, 55, 58], lights=[light],
         notes="炭化した切り株。上は裂け木5本、うろの内側と芯の亀甲割れだけ赤熱。足元に燃え残りの炭。")
