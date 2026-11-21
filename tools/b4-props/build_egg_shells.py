"""
b4p_egg_shells — 割れた竜の卵殻と破片（#15）

設計図: docs/3d/b4-props/blueprints/b4p_egg_shells.md（数値は下の定数）

参考（Pinterest、references/b4-dragonfire-props-20261119.md）:
  #86 黒い殻に赤熱亀裂の竜卵：亀裂の発光、殻の厚み
  #88 竜卵の亀裂パターン（黒×溶岩）
  #89 割れた卵殻と破片（巣の残骸）
形・寸法の要点:
  - 高さ0.82・最大半径0.31の卵が、高さ約0.52で三角の歯7枚のぎざぎざに割れた下半分（殻の厚み1.6cm）
  - 頂部の大きな破片（凸面を上）、側面の大きな破片（凹面を上、内側の赤を見せる）、小さな破片5
劣化（設計書3章）:
  欠け＝のこぎり状の割れ口と破片／角の摩耗＝割れ口の層の断面／煤＝殻の黒・焦げた内膜／
  灰＝上向き面と凹み／熱＝外の細い亀裂と内側の底だけ赤熱。点光源1（卵の中）
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
import common as C  # noqa: E402
import lib_dragon as D  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

NAME = "b4p_egg_shells"
VERSION = "v1"
rnd = random.Random(1515)
C.reset(1515)

H, R, TH = 0.82, 0.31, 0.016


def finish_shell(bm, name):
    """厚みを付け、局所座標で属性（内側 cd、割れ口 fresh、高さ tip）を入れる"""
    ob = C.obj_from_bm(bm, name)
    D.solidify(ob, TH)
    D.ensure_attrs(ob)
    me = ob.data
    a_cd, a_fr, a_tip = me.attributes["cd"], me.attributes["fresh"], me.attributes["tip"]
    for p in me.polygons:
        c = p.center
        rad = Vector((c.x, c.y, (c.z - H * 0.45) * 0.6))
        rad = rad.normalized() if rad.length > 1e-5 else Vector((0, 0, 1))
        d = p.normal.dot(rad)
        rim = 1.0 if abs(d) < 0.45 else 0.0
        for li in p.loop_indices:
            a_fr.data[li].value = rim
    for i, v in enumerate(me.vertices):  # cd（POINT）= 内側の面の頂点
        c = v.co
        rad = Vector((c.x, c.y, (c.z - H * 0.45) * 0.6))
        rad = rad.normalized() if rad.length > 1e-5 else Vector((0, 0, 1))
        a_cd.data[i].value = 1.0 if v.normal.dot(rad) < -0.3 else 0.0
        a_tip.data[i].value = max(0.0, min(1.0, v.co.z / H))
    return ob


def place(ob, M, sink=0.0):
    ob.data.transform(M)
    mz = min(v.co.z for v in ob.data.vertices)
    ob.data.transform(Matrix.Translation((0, 0, -mz - sink)))
    D.mesh_ground(ob, 0.0)
    return ob


parts = []
# ---- 割れた卵（下半分） ----
cup = finish_shell(D.egg_patch_bm(H, R, seed=1, z_hi_fn=D.jagged(2, 0.52, 0.16, teeth=7), nseg=34, nring=18), "egg_cup")
place(cup, Matrix.Rotation(math.radians(8), 4, "X") @ Matrix.Rotation(0.4, 4, "Z"), sink=0.04)
parts.append(cup)
# ---- 頂部の破片（凸面を上） ----
top = finish_shell(D.egg_patch_bm(H, R, seed=3, th_range=(0.0, 1.4), z_lo_fn=D.jagged(4, 0.56, 0.08, teeth=3),
                                  z_hi_fn=lambda th: H - 0.002, nseg=12, nring=9), "frag_top")
place(top, Matrix.Translation((0.55, 0.10, 0)) @ Matrix.Rotation(math.radians(100), 4, "Y") @ Matrix.Translation((0, 0, -0.66)))
parts.append(top)
# ---- 側面の破片（凹面を上：内側の赤） ----
side = finish_shell(D.egg_patch_bm(H, R, seed=5, th_range=(0.0, 1.1), z_lo_fn=D.jagged(6, 0.24, 0.06, teeth=3),
                                   z_hi_fn=D.jagged(7, 0.56, 0.06, teeth=3), nseg=12, nring=9), "frag_side")
place(side, Matrix.Translation((-0.45, -0.30, 0)) @ Matrix.Rotation(math.radians(-92), 4, "Y") @
      Matrix.Rotation(-0.55, 4, "Z") @ Matrix.Translation((-R * 0.85, 0, -0.40)))
parts.append(side)
# ---- 小さな破片 ----
for k in range(5):
    th0 = rnd.uniform(0, 6)
    z0 = rnd.uniform(0.2, 0.6)
    w = rnd.uniform(0.3, 0.5)
    hz = rnd.uniform(0.10, 0.16)
    fr = finish_shell(D.egg_patch_bm(H, R, seed=20 + k, th_range=(th0, th0 + w), z_lo_fn=D.jagged(30 + k, z0, 0.04, teeth=2),
                                     z_hi_fn=D.jagged(40 + k, z0 + hz, 0.04, teeth=2), nseg=6, nring=5), f"frag_{k}")
    a = rnd.uniform(0, 6.3)
    rr = rnd.uniform(0.45, 0.75)
    up = rnd.random() < 0.5
    M = (Matrix.Translation((math.cos(a) * rr, math.sin(a) * rr, 0)) @ Matrix.Rotation(rnd.uniform(0, 6.3), 4, "Z") @
         Matrix.Rotation(math.radians(90 if up else -90), 4, "Y") @ Matrix.Translation((-math.cos(th0 + w / 2) * R, -math.sin(th0 + w / 2) * R, -z0)))
    place(fr, M)
    parts.append(fr)

off = D.recenter(parts)
mat = D.egg_mat("egg")
for o in parts:
    C.assign(o, mat)
light = (tuple(Vector((0, 0, 0.16)) + (Vector((sum(v.co.x for v in cup.data.vertices), sum(v.co.y for v in cup.data.vertices), 0)) / len(cup.data.vertices))), 4.0, (1.0, 0.28, 0.07))
C.finish(NAME, parts, version=VERSION, tex_res=1024, budget_tris=6000, refs=[86, 88, 89], lights=[light],
         notes="割れた竜の卵（下半分）と破片7。外は黒い殻に細い赤熱の亀裂、内側は焦げた赤で底ほど燠。")
