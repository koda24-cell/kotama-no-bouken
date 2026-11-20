"""
b4p_rock_rubble — 崩れた岩の山（#19、ユーザー追加要望「岩・鉱石多め、前人未踏感」）

設計図: docs/3d/b4-props/blueprints/b4p_rock_rubble.md（数値は下の定数）

参考（Pinterest、references/b4-dragonfire-props-20261119.md）:
  #30 / #33 柱状節理の割れと崩れた段（角張った岩片、割れ面の平らさ）
  #69 流動層を持つ黒い溶岩岩：薄い層の剥離（板状の岩片）
  #5 / #10 崩落坑道の足元の崩落土砂（山の形・裾の広がり）
  #64 岩に埋まった赤熱鉱（隙間から覗く鉱石の欠片）
形・寸法の要点:
  - 幅1.8×奥行1.5×高さ0.7m。大3（芯、1枚は板状に斜めに立てかける）・中8・小16の角張った玄武岩
  - 下の岩に乗るよう、レイで支えの高さを求めて積む（浮かない・めり込みは2〜3割）
  - 炎竜鉱の欠片5（隙間から3、裾に2）
劣化（設計書3章）:
  欠け＝すべての岩片が割れ面で角張る（新しい断面55%）／角の摩耗＝割れ面の角／
  煤＝割れ目を持つ玄武岩の材質で凹みを暗く／灰＝上向きの面に厚め（崩れた後に降った灰）
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
import common as C  # noqa: E402
import lib_dragon as D  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402
from mathutils.bvhtree import BVHTree  # noqa: E402

NAME = "b4p_rock_rubble"
VERSION = "v2"
rnd = random.Random(1919)
C.reset(1919)

# 設計図の数値: (群, 個数, 最大径の範囲, 置く半径の範囲, 分割)
GROUPS = [("big", 3, (0.60, 0.80), 0.18, 4), ("mid", 12, (0.24, 0.40), 0.30, 2),
          ("small", 18, (0.08, 0.18), 0.48, 2)]   # (群, 個数, 最大径, 置く位置の広がり σ, 分割)
SINK = 0.25

placed_v, placed_f = [], []


def support_z(bm, x, y):
    """足元のいくつかの点で、下にある岩の上面の高さ（なければ地面0）"""
    if not placed_f:
        return 0.0
    bvh = BVHTree.FromPolygons(placed_v, placed_f)
    xs = [v.co for v in bm.verts]
    mnx, mxx = min(p.x for p in xs), max(p.x for p in xs)
    mny, mxy = min(p.y for p in xs), max(p.y for p in xs)
    best = 0.0
    for fx in (0.3, 0.5, 0.7):
        for fy in (0.3, 0.5, 0.7):
            q = Vector((x + mnx + (mxx - mnx) * fx, y + mny + (mxy - mny) * fy, 5.0))
            hit, _, _, _ = bvh.ray_cast(q, Vector((0, 0, -1)))
            if hit is not None:
                best = max(best, hit.z)
    return best


def add_rock(name, size, x, y, seed, subdiv, tilt=None):
    sq = (1.0, rnd.uniform(0.6, 0.9), rnd.uniform(0.35, 0.6))
    if tilt is not None:
        sq = (1.0, 0.8, 0.28)  # 板状
    bm = D.basalt_bm((size * 0.5 * sq[0], size * 0.5 * sq[1], size * 0.5 * sq[2]), (0, 0, 0), seed=seed, subdiv=subdiv,
                     lumpy=0.14, facets=9 if subdiv > 2 else 6, facet_depth=(0.45, 0.8), fresh_ratio=0.55, up_bias=0.0,
                     fine=(size * 0.015, 7.0 / size), ground=None, notches=2 if subdiv > 2 else 0)
    R = Matrix.Rotation(rnd.uniform(0, 6.3), 4, "Z") @ Matrix.Rotation(math.radians(tilt if tilt is not None else rnd.uniform(-20, 20)), 4, "X")
    D.bm_transform(bm, R)
    mz = min(v.co.z for v in bm.verts)
    h = max(v.co.z for v in bm.verts) - mz
    z0 = support_z(bm, x, y)
    D.bm_transform(bm, Matrix.Translation(Vector((x, y, z0 - mz - h * SINK * (1.0 if z0 > 0 else 0.6)))))
    D.bm_ground(bm, 0.0)
    bm.verts.index_update()
    base = len(placed_v)
    placed_v.extend([v.co.copy() for v in bm.verts])
    placed_f.extend([[base + v.index for v in f.verts] for f in bm.faces])
    ob = C.obj_from_bm(bm, name)
    return D.sharp_by_angle(ob, 40)


rocks = []
for g, n, (s0, s1), sig, sub in GROUPS:
    for k in range(n):
        x, y = rnd.gauss(0, sig), rnd.gauss(0, sig * 0.8)
        x, y = max(-0.85, min(0.85, x)), max(-0.68, min(0.68, y))
        tilt = 38 if (g == "big" and k == 2) else None
        rocks.append(add_rock(f"{g}_{k}", rnd.uniform(s0, s1), x, y, seed=1000 + len(rocks), subdiv=sub if not (g == "big" and k == 2) else 3, tilt=tilt))

# ---- 炎竜鉱の欠片 ----
bvh = BVHTree.FromPolygons(placed_v, placed_f)
crys = []
shard_pos = []
for k in range(5):
    if k < 3:
        hit = None
        while hit is None:
            a = rnd.uniform(0, 6.3)
            x, y = math.cos(a) * rnd.uniform(0.15, 0.45), math.sin(a) * rnd.uniform(0.1, 0.35)
            hit, nrm, _, _ = bvh.ray_cast(Vector((x, y, 5)), Vector((0, 0, -1)))
        root = hit + Vector((0, 0, -0.04))
        ax = (Vector((0, 0, 1)) + nrm * 0.5 + Vector((rnd.uniform(-0.4, 0.4), rnd.uniform(-0.4, 0.4), 0))).normalized()
        ln = rnd.uniform(0.10, 0.16)
        ob = D.crystal(f"ore_{k}", root, ax, ln, ln * 0.2, seed=500 + k, embed=0.05, chips=1)
    else:
        a = rnd.uniform(-2.4, -0.7)
        x, y = math.cos(a) * 0.95, math.sin(a) * 0.7
        ln = rnd.uniform(0.07, 0.1)
        ob = D.crystal(f"ore_{k}", (x, y, 0.018), (math.cos(a + 1.3), math.sin(a + 1.3), 0.12), ln, 0.022, seed=500 + k,
                       embed=0.0, broken=(0.75, 0.5))
        D.mesh_ground(ob, 0.0)
        root = Vector((x, y, 0.02))
    crys.append(ob)
    shard_pos.append(root)

allp = rocks + crys
for o in allp:
    D.ensure_attrs(o)
off = D.recenter(allp)
basalt = D.basalt("basalt", hairline=0.0, ash_amt=1.3)
crystal = D.dragon_crystal("crystal")
for o in rocks:
    C.assign(o, basalt)
for o in crys:
    C.assign(o, crystal)
lights = [(tuple(shard_pos[0] - off + Vector((0, -0.08, 0.12))), 3.0, (1.0, 0.25, 0.07)),
          (tuple(shard_pos[1] - off + Vector((0, -0.08, 0.12))), 2.5, (1.0, 0.25, 0.07))]
C.finish(NAME, allp, version=VERSION, lights=lights, tex_res=1024, budget_tris=8000, refs=[30, 33, 69, 5, 10, 64],
         notes="崩れた岩の山（大3・中8・小16）と炎竜鉱の欠片5。レイで支えを求めて積んだ。")
