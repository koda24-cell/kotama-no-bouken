"""
b4p_dragon_ribs — 肋骨のアーチと椎骨（#14、通路をまたぐ巣の手前の門）

設計図: docs/3d/b4-props/blueprints/b4p_dragon_ribs.md（数値は下の定数）

参考（Pinterest、references/b4-dragonfire-props-20261119.md）:
  #16 肋骨のアーチを通路として使う構図。骨の割れ・欠け（主参考）
  #13 竜骨格の全体プロポーション：肋骨・椎骨の連なり
  #15 洞窟内の巨大竜骨：人と骨のスケール感
形・寸法の要点:
  - 地面に横たわる背骨（椎骨6、X=−1.85）から6本の肋骨が高さ3.2mまで弧を描き、反対側（X=+1.95）で地面に刺さる
  - 肋骨は扁平な断面で根元が太く先が細い。2本は途中で折れて先が地面に転がる
劣化（設計書3章・2章「骨は真っ白にしない」）:
  欠け＝折れた肋骨（多孔質の断面）・椎骨の欠け／角の摩耗＝稜が擦れて明るい／
  煤＝下ほど黒く／灰＝上向き面／風化＝乾燥割れ・穴・剥離
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
import common as C  # noqa: E402
import lib_dragon as D  # noqa: E402
from mathutils import Matrix, Vector, noise  # noqa: E402

NAME = "b4p_dragon_ribs"
VERSION = "v1"
rnd = random.Random(1414)
C.reset(1414)

SPINE_X = -1.85
N_VERT = 6
YS = [-0.95 + 1.9 * k / (N_VERT - 1) for k in range(N_VERT)]
TOP_Z = 3.2
TIP_X = 1.95
BROKEN = {1: 0.55, 4: 0.62}


def weather(co, nrm):
    rid = 1 - abs(noise.noise(co * 6.0 + Vector((3, 1, 2))))
    d = 0.008 * noise.noise(co * 3.0)
    if rid > 0.92:
        d -= 0.014 * (rid - 0.92) / 0.08
    pit = noise.noise(co * 13.0 + Vector((7, 7, 7)))
    if pit > 0.45:
        d -= 0.008 * (pit - 0.45) / 0.55
    return d


# ---- 背骨（椎骨） ----
E = D.ellipsoid
vparts = []
for k, y in enumerate(YS):
    yy = y + rnd.uniform(-0.03, 0.03)
    z = 0.12 + rnd.uniform(-0.03, 0.03)
    vparts.append(E(f"vb_{k}", (SPINE_X, yy, z), (0.20, 0.15, 0.19), rot=(rnd.uniform(-8, 8), 0, rnd.uniform(-10, 10))))
    vparts.append(E(f"vd_{k}", (SPINE_X, yy - 0.16, z), (0.17, 0.05, 0.17)))  # 椎間の円盤の縁
    ln = rnd.uniform(0.38, 0.5) if k != 3 else 0.22  # 1本は棘突起が折れている
    vparts.append(D.tube(f"vs_{k}", C.bezier((SPINE_X, yy, z + 0.12), (SPINE_X - 0.03, yy + 0.06, z + 0.12 + ln * 0.6),
                                             (SPINE_X - 0.08, yy + 0.12, z + 0.12 + ln), n=6), 0.075, 0.03 if k != 3 else 0.06, sides=8))
    for s in (-1, 1):
        vparts.append(D.tube(f"vt_{k}_{s}", C.bezier((SPINE_X, yy, z + 0.05), (SPINE_X + 0.13 * s, yy, z + 0.08),
                                                       (SPINE_X + 0.26 * s, yy + 0.03, z + 0.02), n=5), 0.05, 0.025, sides=7))
spine = D.voxel_union(vparts, "spine", voxel=0.018)
D.displace_along_normal(spine, weather)
D.decimate_to(spine, 7000)

# ---- 肋骨 ----
ribs = []
frags = []
for k, y in enumerate(YS):
    yy = y + rnd.uniform(-0.04, 0.04)
    top = TOP_Z * rnd.uniform(0.93, 1.0) * (1 - 0.06 * abs(y))
    p0 = Vector((SPINE_X + 0.08, yy, 0.30))
    p1 = Vector((SPINE_X + 0.35, yy, top * 0.85))
    p2 = Vector((0.4, yy + rnd.uniform(-0.05, 0.05), top * 1.1))
    p3 = Vector((TIP_X + rnd.uniform(-0.1, 0.1), yy + rnd.uniform(-0.08, 0.08), -0.15))
    pts = C.bezier(p0, p1, p2, p3, n=34)
    cut = BROKEN.get(k)
    keep = pts[:int(len(pts) * cut)] if cut else pts

    def up(i, p, t):
        return Vector((0, 1, 0)).cross(t)

    prof = [(0.09 * math.cos(2 * math.pi * i / 10), 0.05 * math.sin(2 * math.pi * i / 10)) for i in range(10)]
    n = len(keep)
    ob = C.sweep(f"rib_{k}", keep, prof, up_fn=up, scale_fn=lambda u, n=n, full=len(pts): 1.0 - 0.5 * (u * n / full))
    D.displace_along_normal(ob, lambda co, nr: 0.5 * weather(co, nr))
    D.mesh_ground(ob, 0.0)
    ribs.append(ob)
    if cut:  # 折れた先が地面に転がる
        rest = pts[int(len(pts) * cut) + 1:]
        L = sum((rest[i + 1] - rest[i]).length for i in range(len(rest) - 1))
        a = rnd.uniform(0, 6.3)
        start = Vector((0.6 + rnd.uniform(-0.3, 0.3), yy + rnd.uniform(-0.5, 0.5), 0.07))
        d = Vector((math.cos(a), math.sin(a), 0))
        seg = [start + d * (L * 0.5) * i / 8 + Vector((0, 0, 0.05 * math.sin(math.pi * i / 8))) for i in range(9)]
        fr = C.sweep(f"rib_frag_{k}", seg, [(0.06 * math.cos(2 * math.pi * i / 8), 0.04 * math.sin(2 * math.pi * i / 8)) for i in range(8)],
                     up_fn=lambda i, p, t: Vector((0, 0, 1)), scale_fn=lambda u: 1.0 - 0.4 * u)
        D.mesh_ground(fr, 0.0)
        frags.append((fr, start))

bones = [spine] + ribs + [f for f, _ in frags]
for o in bones:
    D.ensure_attrs(o)
    D.set_attr_fn(o, "tip", lambda co: max(0.0, min(1.0, co.z / TOP_Z)))
# 折れ口: 折れた肋骨の先端の断面と、転がった先の両端
for k, ob in enumerate(ribs):
    if k in BROKEN:
        end = max(ob.data.vertices, key=lambda v: (v.co - Vector((SPINE_X, 0, 0))).length).co.copy()
        last = ob.data.vertices[-1].co.copy()
        D.set_attr_fn(ob, "fresh", lambda co, e=last: 1.0 if (co - e).length < 0.12 else 0.0)

# ---- まわりの岩 ----
rocks = []
for k in range(12):
    if k < 6:
        x, y = SPINE_X + rnd.uniform(-0.35, 0.4), rnd.uniform(-1.1, 1.1)
    else:
        x, y = TIP_X + rnd.uniform(-0.3, 0.3), rnd.uniform(-1.1, 1.1)
    sz = rnd.uniform(0.12, 0.30)
    ob = D.chip_rock(f"rock_{k}", sz, (x, y), seed=600 + k, subdiv=2 if sz > 0.2 else 1,
                     squash=(1.0, rnd.uniform(0.7, 0.95), rnd.uniform(0.4, 0.65)), rot_z=rnd.uniform(0, 6.3), sink=0.3)
    D.ensure_attrs(ob)
    rocks.append(ob)

allp = bones + rocks
off = D.recenter(allp)
bone = D.bone_mat("bone", soot_lo=0.0, soot_hi=0.4, scale=1.4)
basalt = D.basalt("basalt", hairline=0.0)
for o in bones:
    C.assign(o, bone)
for o in rocks:
    C.assign(o, basalt)
C.finish(NAME, allp, version=VERSION, tex_res=2048, budget_tris=20000, refs=[16, 13, 15],
         notes="肋骨6本のアーチ（2本は折れて先が転がる）と地面の背骨（椎骨6）。通路は Y 方向。")
