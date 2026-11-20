"""
b4p_ore_vein_wall — 壁に貼る炎竜鉱の鉱脈の岩板（#21、ユーザー追加要望「岩・鉱石多め、前人未踏感」）

設計図: docs/3d/b4-props/blueprints/b4p_ore_vein_wall.md（数値は下の定数）

参考（Pinterest、references/b4-dragonfire-props-20261119.md）:
  #64 岩に埋まった赤熱鉱：周囲の岩が割れて光が漏れる
  #41 割れた黒岩と溶岩の亀裂：亀裂幅の変化、端の黒い冷却部（脈の溝の見え方）
  #60 / #61 赤い結晶の束・単結晶（脈から出る小結晶）
  #30 柱状節理の段差（正面の割れ面と棚の段差）
形・寸法の要点:
  - 幅2.4×高さ2.2×厚み0.5m。裏面は平ら（y=+0.25）で壁に密着。正面は26の塊に割れた崖の面
    （塊ごとに傾いた平面＝段差と棚）、外形は角の丸い四角を揺らした不揃いな輪郭、外周は裏へ回り込む
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
VERSION = "v3"
rnd = random.Random(2121)
C.reset(2121)

# 設計図の数値
RAD = (1.28, 0.36, 1.22)
CEN = Vector((0, 0, 1.12))
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


MAIN = wavy([(-0.95, 0.30), (-0.35, 0.80), (0.10, 1.30), (0.78, 1.90)], 0.05, 1.0)
BR1 = wavy([(-0.62, 0.55), (-0.80, 0.95), (-0.88, 1.30)], 0.03, 2.0, n=14)    # 下の方から左上へ短く
BR2 = wavy([(0.38, 1.55), (0.72, 1.40), (0.98, 1.10)], 0.03, 3.0, n=14)       # 上の方から右下へ短く
PATHS = [{"pts": MAIN, "depth": 0.065, "w": 0.048, "seed": 1.0},
         {"pts": BR1, "depth": 0.035, "w": 0.028, "seed": 2.0},
         {"pts": BR2, "depth": 0.035, "w": 0.028, "seed": 3.0}]

bm = D.rock_face_bm(2.4, 2.2, BACK_Y, seed=77, nx=50, nz=46, cells=26, relief=0.10, base_y=-0.20)
D.carve_paths(bm, F0, EX, EZ, NF, PATHS, refine=(0.05, 0.02, -0.02))
D.bm_vnoise(bm, 0.006, 9.0, seed=5, z0=0.0)
wall = C.obj_from_bm(bm, "wall")
for v in wall.data.vertices:  # 裏面を壁に密着する平面にそろえる
    if v.co.y > BACK_Y - 0.004:
        v.co.y = BACK_Y
D.sharp_by_angle(wall, 40)
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
for t, nb in ((0.28, 6), (0.55, 7), (0.82, 5)):
    c2 = path_point(MAIN, t)
    for k in range(nb):
        u = c2.x + rnd.uniform(-0.05, 0.05)
        w = c2.y + rnd.uniform(-0.05, 0.05)
        hit, nrm = surface(u, w)
        if hit is None:
            continue
        ln = rnd.uniform(0.22, 0.42) if k < 3 else rnd.uniform(0.10, 0.22)
        r = ln * rnd.uniform(0.15, 0.19)
        ax = (Vector((0, -1, 0)) + Vector((rnd.uniform(-0.45, 0.45), 0, rnd.uniform(0.35, 0.8)))).normalized()
        ob = D.crystal(f"cry_{cid}", hit + Vector((0, 0.03, 0)), ax, ln, r, seed=400 + cid, spin=rnd.uniform(0, 6.3),
                       embed=0.05 + r, broken=(0.7, 0.5) if cid % 5 == 2 else None, chips=1 if k < 2 else 0)
        parts[ob.name] = (ob, "crystal")
        cid += 1
for k in range(4):
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
mats = {"basalt": D.basalt("basalt", hairline=0.8, hair_cd=(0.7, 0.95), heat_range=(0.8, 1.0), glow_strength=4.0),
        "crystal": D.dragon_crystal("crystal")}
for o, key in parts.values():
    C.assign(o, mats[key])
lights = []
for t in (0.2, 0.45, 0.7, 0.92):
    c2 = path_point(MAIN, t)
    hit, nrm = surface(c2.x, c2.y)
    if hit is not None:
        lp = hit + Vector((0, -0.14, 0)) - off
        lights.append((tuple(lp), 3.5, (1.0, 0.26, 0.07)))
C.finish(NAME, objs, version=VERSION, lights=lights, tex_res=2048, budget_tris=10000, refs=[64, 41, 60, 61, 30],
         notes="壁に貼る鉱脈の岩板。裏面は平ら（y=+0.25）。脈の溝の底と結晶の根元・ひびだけ発光。")
