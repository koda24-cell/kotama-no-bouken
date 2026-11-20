"""
b4p_ore_vein_wall — 壁に貼る炎竜鉱の鉱脈の岩板（#21、ユーザー追加要望「岩・鉱石多め、前人未踏感」）

設計図: docs/3d/b4-props/blueprints/b4p_ore_vein_wall.md（数値は下の定数）

参考（Pinterest、references/b4-dragonfire-props-20261119.md）:
  #64 岩に埋まった赤熱鉱：周囲の岩が割れて光が漏れる
  #41 割れた黒岩と溶岩の亀裂：亀裂幅の変化、端の黒い冷却部（脈の溝の見え方）
  #60 / #61 赤い結晶の束・単結晶（脈から出る小結晶）
  #30 柱状節理の段差（正面の割れ面と棚の段差）
形・寸法の要点:
  - 幅2.4×高さ2.2×厚み0.5m。裏面は平ら（y=+0.25）で壁に密着、正面は割れ面と段差でごつごつ
  - 左下から右上へ波打つ主脈と2本の枝。溝の底が赤橙に光り、縁は黒く冷えている
  - 主脈の3か所に結晶の束（4〜6本）、脈に沿って小結晶が点在
劣化（設計書3章）:
  欠け＝右上・左下の角の割れ落ち、正面の割れ面と段差／角の摩耗＝割れ面の角／煤＝脈から±0.25m／
  灰＝上向きの棚と凹み／熱変色＝脈の縁±0.06mが赤茶に焼ける。発光は溝の底と結晶の根元・内部のひびだけ
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
import common as C  # noqa: E402
import lib_dragon as D  # noqa: E402
from mathutils import Vector  # noqa: E402
from mathutils.bvhtree import BVHTree  # noqa: E402

NAME = "b4p_ore_vein_wall"
VERSION = "v1"
rnd = random.Random(2121)
C.reset(2121)

# 設計図の数値
RAD = (1.25, 0.34, 1.15)
CEN = Vector((0, 0, 1.08))
BACK_Y = 0.25
NF = Vector((0, -1, 0))
F0 = Vector((0, -0.2, 0))
EX = Vector((1, 0, 0))
EZ = Vector((0, 0, 1))


def wavy(pts, amp, seed, n=28):
    """制御点を通る折れ線を細かくし、横に揺らす"""
    out = []
    P = [Vector(p) for p in pts]
    for i in range(len(P) - 1):
        for k in range(n // (len(P) - 1)):
            t = k / (n // (len(P) - 1))
            p = P[i].lerp(P[i + 1], t)
            d = (P[i + 1] - P[i]).normalized()
            nrm = Vector((-d.y, d.x))
            out.append(p + nrm * amp * math.sin(t * 6.3 + i * 1.7 + seed) * (0.6 + 0.4 * math.sin(t * 17 + seed)))
    out.append(P[-1])
    return out


MAIN = wavy([(-0.95, 0.25), (-0.30, 0.90), (0.15, 1.25), (0.85, 1.95)], 0.05, 1.0)
BR1 = wavy([(-0.36, 0.86), (-0.55, 1.20), (-0.75, 1.55)], 0.035, 2.0, n=14)
BR2 = wavy([(0.12, 1.22), (0.45, 1.00), (0.75, 0.75)], 0.035, 3.0, n=14)
PATHS = [{"pts": MAIN, "depth": 0.065, "w": 0.048, "seed": 1.0},
         {"pts": BR1, "depth": 0.035, "w": 0.028, "seed": 2.0},
         {"pts": BR2, "depth": 0.035, "w": 0.028, "seed": 3.0}]

bm = D.basalt_bm(RAD, CEN, seed=77, subdiv=4, lumpy=0.12, facets=13, facet_depth=(0.6, 0.88), fresh_ratio=0.35,
                 up_bias=0.0, fine=(0.012, 5.0), ground=0.0, notches=6, notch_depth=(0.78, 0.92),
                 extra_planes=[((0, 1, 0), BACK_Y / RAD[1], False), ((0.7, 0, 0.7), 0.83, True), ((-0.75, -0.2, -0.6), 0.86, True)],
                 hook=lambda b: D.carve_paths(b, F0, EX, EZ, NF, PATHS, refine=(0.06, 0.025, -0.015)))
wall = D.sharp_by_angle(C.obj_from_bm(bm, "wall"), 40)
parts = {"wall": (wall, "basalt")}

# ---- 結晶：主脈の3か所に束、点在 ----
dg = C.bpy.context.evaluated_depsgraph_get()
bvh = BVHTree.FromObject(wall, dg)


def path_point(pts, t):
    n = len(pts) - 1
    i = min(n - 1, int(t * n))
    return pts[i].lerp(pts[i + 1], t * n - i)


def surface(u, w):
    hit, nrm, _, _ = bvh.ray_cast(Vector((u, -2.0, w)), Vector((0, 1, 0)))
    return hit, nrm


cid = 0
for t, nb in ((0.30, 5), (0.55, 6), (0.80, 4)):
    c2 = path_point(MAIN, t)
    for k in range(nb):
        u = c2.x + rnd.uniform(-0.05, 0.05)
        w = c2.y + rnd.uniform(-0.05, 0.05)
        hit, nrm = surface(u, w)
        if hit is None:
            continue
        ln = rnd.uniform(0.10, 0.38) if k < 3 else rnd.uniform(0.08, 0.18)
        r = ln * rnd.uniform(0.13, 0.17)
        ax = (Vector((0, -1, 0)) + Vector((rnd.uniform(-0.45, 0.45), 0, rnd.uniform(0.35, 0.8)))).normalized()
        ob = D.crystal(f"cry_{cid}", hit + Vector((0, 0.03, 0)), ax, ln, r, seed=400 + cid, spin=rnd.uniform(0, 6.3),
                       embed=0.05 + r, broken=(0.7, 0.5) if cid % 5 == 2 else None, chips=1 if k < 2 else 0)
        parts[ob.name] = (ob, "crystal")
        cid += 1
for k in range(8):
    pts = (MAIN, BR1, BR2)[k % 3]
    c2 = path_point(pts, rnd.uniform(0.1, 0.9))
    hit, nrm = surface(c2.x, c2.y)
    if hit is None:
        continue
    ln = rnd.uniform(0.06, 0.16)
    ax = (Vector((0, -1, 0)) + Vector((rnd.uniform(-0.5, 0.5), 0, rnd.uniform(0.2, 0.7)))).normalized()
    ob = D.crystal(f"cry_{cid}", hit + Vector((0, 0.025, 0)), ax, ln, ln * 0.18, seed=400 + cid, spin=rnd.uniform(0, 6.3),
                   embed=0.04 + ln * 0.18)
    parts[ob.name] = (ob, "crystal")
    cid += 1

objs = [o for o, _ in parts.values()]
for o in objs:
    D.ensure_attrs(o)
off = D.recenter(objs)
mats = {"basalt": D.basalt("basalt", hairline=1.0, hair_cd=(0.55, 0.9), heat_range=(0.75, 1.0)),
        "crystal": D.dragon_crystal("crystal")}
for o, key in parts.values():
    C.assign(o, mats[key])
lights = []
for t in (0.2, 0.45, 0.7, 0.92):
    c2 = path_point(MAIN, t)
    lights.append(((c2.x - off.x, -0.42 - off.y, c2.y - off.z), 4.5, (1.0, 0.26, 0.07)))
C.finish(NAME, objs, version=VERSION, lights=lights, tex_res=2048, budget_tris=10000, refs=[64, 41, 60, 61, 30],
         notes="壁に貼る鉱脈の岩板。裏面は平ら（y=+0.25）。脈の溝の底と結晶の根元・ひびだけ発光。")
