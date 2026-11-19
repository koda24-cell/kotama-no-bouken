"""
b4p_claw_rock — 竜の爪痕：3本の深い溝が刻まれた黒い玄武岩の板

物語: a4-boss の手前「竜の巣が近い」。看板を過ぎると骨・鱗・爪痕が主役になる（設計書1章）

参考（Pinterest、references/b4-dragonfire-props-20261119.md）:
  #40 岩面の引っかき傷：交差する線刻（溝の向きのそろい方、端のかすれ）
  #41 割れた黒岩と溶岩の亀裂：溝の底のごく細い赤熱と、縁の黒い冷却部
形・寸法の要点:
  - 立った岩板 幅2.0m×厚さ0.6m×高さ1.4m。少し後ろへ傾いた平らな正面（割れ面）に爪痕
  - 爪痕は左上→右下へ弧を描く3本（中央が最長1.25m、間隔約0.19mで先へ少し開く）。
    幅は最大約0.12m、深さは中央0.135m・外側0.105m。上の溝は板の左上の縁を切って抜ける。入りは浅く鋭く、中ほどが最も深く、抜けはかすれて欠ける
  - 溝の縁は欠けて（えぐれた小さな割れ面）ギザギザ。岩の角も大きく割れ落ちている
  - 足元に溝から削れ落ちた岩片6つ（新しい断面）
劣化（設計書3章）:
  欠け＝溝の縁の欠け・岩の角の割れ面と段差／角の摩耗＝割れ面の角に灰黒の新しい断面／
  煤＝溝のまわりを黒く（爪の熱）／灰＝上向き面と凹み・溝の中には積もらない／
  熱変色＝溝の底が赤黒く焼け、最も深い所にだけごく細い赤熱のひび（発光はそこだけ）
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
import common as C  # noqa: E402
import lib_dragon as D  # noqa: E402
from mathutils import Vector, noise  # noqa: E402

NAME = "b4p_claw_rock"
VERSION = "v4"
rnd = random.Random(1111)
C.reset(1111)

RAD = (1.18, 0.32, 1.0)
CEN = Vector((0, 0, 0.56))
NF = Vector((0, -0.96, 0.28)).normalized()      # 正面（割れ面）の外向き法線：少し上を向く＝後ろへ傾いた板
SUP = math.sqrt((NF.y * RAD[1]) ** 2 + (NF.z * RAD[2]) ** 2)
FRAC = 0.62
F0 = CEN + NF * (SUP * FRAC)
EX = Vector((1, 0, 0))
EZ = (Vector((0, 0, 1)) - NF * NF.z).normalized()


def smooth(x, a, b):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


# ---- 爪痕の溝（正面の2D座標 u=横, w=上） ----
G = []
base = C.bezier((-0.86, 0.60), (-0.12, 0.36), (0.62, -0.28), n=24)
tang = [(base[min(i + 1, 24)] - base[max(i - 1, 0)]).normalized() for i in range(25)]
for k, (lat, depth, wmax, t0, t1) in enumerate(((-0.20, 0.105, 0.048, 0.0, 0.84), (0.0, 0.135, 0.058, 0.0, 1.0),
                                                 (0.20, 0.110, 0.050, 0.08, 0.90))):
    pts = []
    for i in range(25):
        t = i / 24
        if t < t0 - 1e-6 or t > t1 + 1e-6:
            continue
        nrm = Vector((-tang[i].y, tang[i].x))
        pts.append(base[i] + nrm * lat * (0.85 + 0.35 * t) + nrm * 0.008 * math.sin(t * 11 + k))
    chips = [(rnd.uniform(0.12, 0.85), rnd.choice((-1, 1)), rnd.uniform(0.035, 0.075)) for _ in range(6)]
    chips.append((0.93, 1, 0.10))   # 爪の抜けで岩が大きくえぐれる
    chips.append((0.90, -1, 0.08))
    G.append({"pts": pts, "depth": depth, "w": wmax, "seed": k * 7.3, "chips": chips,
              "len": sum((pts[i + 1] - pts[i]).length for i in range(len(pts) - 1))})
WMAX = max(g["w"] for g in G)
DMAX = max(g["depth"] for g in G)


def local(co):
    q = co - F0
    return q.dot(NF), Vector((q.dot(EX), q.dot(EZ)))


def dist_fn(co):
    h, p2 = local(co)
    if h < -0.14:
        return 9.0
    return min(D.polyline_nearest(g["pts"], p2)[0] - g["w"] for g in G)


def carve(bm):
    L = D.bm_layers(bm)
    D.bm_refine_near(bm, dist_fn, (0.05, 0.012))
    chipped = set()
    for v in bm.verts:
        h, p2 = local(v.co)
        if h < -0.14:
            continue
        cut = 0.0
        prox = 0.0
        chip = 0.0
        for g in G:
            d, t, side = D.polyline_nearest(g["pts"], p2)
            w = g["w"] * (0.5 + 0.5 * math.sin(math.pi * min(1.0, t * 1.15)) ** 0.5)
            w *= 1.0 + 0.25 * noise.noise(Vector((t * 9 + g["seed"], side * 3.1, 0.5)))
            dep = g["depth"] * smooth(t, 0.0, 0.16) * (1 - smooth(t, 0.68, 1.0)) ** 0.8
            dep *= 0.85 + 0.3 * noise.noise(Vector((t * 5 + g["seed"], 1.7, 0.2)))
            if d < w:
                cut = max(cut, dep * (1 - (d / w) ** 2) ** 1.2)
            prox = max(prox, max(0.0, 1 - d / (g["w"] * 3.2)))
            for tc, sc, rc in g["chips"]:  # 縁の欠け：溝の片側の縁をえぐる
                if side != sc:
                    continue
                along = abs(t - tc) * g["len"]
                lat = d - w * 0.85
                rr = math.sqrt(along * along + lat * lat * 1.6)
                if rr < rc and d > w * 0.4:
                    chip = max(chip, 0.045 * (rc / 0.07) ** 0.5 * (1 - (rr / rc) ** 2))
        if chip > 0.002:
            chipped.add(v)
        v.co -= NF * (cut + chip)
        v[L["cd"]] = min(1.0, cut / DMAX * 1.15)
        v[L["tip"]] = prox
    for f in bm.faces:
        if all(v in chipped for v in f.verts):
            D.set_face_corner([f], L["fresh"], 1.0)


bm = D.basalt_bm(RAD, CEN, seed=21, subdiv=4, lumpy=0.16, facets=15, facet_depth=(0.55, 0.85), fresh_ratio=0.35,
                 up_bias=0.3, fine=(0.010, 6.0), ground=0.0, extra_planes=[(tuple(NF), FRAC, False)],
                 hook=carve, notches=8, notch_depth=(0.8, 0.93))
slab = D.sharp_by_angle(C.obj_from_bm(bm, "slab"), 40)
parts = [slab]

# ---- 足元の岩片（溝から削れ落ちた） ----
for k in range(6):
    u = rnd.uniform(-0.45, 0.75)
    y = -0.42 - rnd.uniform(0.0, 0.3)
    sz = rnd.uniform(0.06, 0.15)
    ob = D.chip_rock(f"chip_{k}", sz, (u, y), seed=60 + k, subdiv=1,
                     squash=(1.0, rnd.uniform(0.7, 0.95), rnd.uniform(0.45, 0.7)), rot_z=rnd.uniform(0, 6.28))
    parts.append(ob)

for o in parts:
    D.ensure_attrs(o)
off = D.recenter(parts)
mat = D.basalt("basalt", hairline=0.7, prox_soot=0.75, heat_range=(0.3, 0.85), heat_amt=1.0, glow_strength=4.0)
for o in parts:
    C.assign(o, mat)

C.finish(NAME, parts, version=VERSION, tex_res=1024, budget_tris=6000, refs=[40, 41],
         notes="竜の爪痕の岩板。3本の深い溝（縁の欠け、底は赤黒く焼けて最深部だけ細い赤熱）。")
