"""
b4p_dragon_ore_cluster — 炎竜鉱：割れた玄武岩の塊から暗赤の結晶が束で突き出す

物語: side-a4-ore-vein「岩壁の割れ目の奥で赤い光、熱を帯びた鱗のような石」

参考（Pinterest、references/b4-dragonfire-props-20261119.md）:
  #60 赤い結晶の束：鋭い面、内部の透過と明暗（束の広がり方・大中小の比）
  #61 単結晶：内部のクラックと暗赤の深み（結晶材質＝表面は暗く内側が光る）
  #64 岩に埋まった赤熱鉱：周囲の岩が割れて光が漏れる（割れ目の発光）
  #41 割れた黒岩と溶岩の亀裂：亀裂幅の変化、端の黒い冷却部
形・寸法の要点:
  - 母岩：幅約1.5m×奥行1.0m×高さ0.65mの黒い玄武岩。1つの塊を平面で割り、右側の片(B)を
    底の線を軸に約17°外へ傾けて「結晶が岩を押し割った」V字の割れ目を作る（割れ目の内側が赤く光る）
  - 結晶：割れ目の底から放射状に26本の群生。大3（1.02/0.86/0.74m、1本は先が折れる、根元で重なる）・
    中7（0.36〜0.60m）・小16（0.09〜0.26m、割れ目に沿って点々と顔を出す）。六角柱の太さ・面幅は不揃い、先端の錐面は偏る
  - 足元：割れて落ちた岩片5つ（新しい断面が多い）と、折れて転がった結晶1本
劣化（設計書3章）:
  欠け＝割れて傾いた片・角を落とす平面の割れ面・結晶の折れ口と角の欠け／
  角の摩耗＝岩の角に新しい断面の灰黒／煤＝割れ目のまわりと結晶の根元を黒く／
  灰＝上向き面と凹み（割れ面と熱い縁を除く）／熱変色＝割れ目の縁だけ赤茶に焼ける
発光: 割れ目の内側（glow 面）・縁近くの細いひび・結晶の内部（根元ほど強い）だけ。点光源2つ
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
import common as C  # noqa: E402
import lib_dragon as D  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

NAME = "b4p_dragon_ore_cluster"
VERSION = "v4"
rnd = random.Random(808)
C.reset(808)

parts = {}  # name -> (object, material key)


def add(ob, key):
    parts[ob.name] = (ob, key)
    return ob


# ---- 母岩：1つの塊を作って割る ----
full = D.basalt_bm((0.74, 0.56, 0.46), (0, 0, 0.20), seed=3, subdiv=5, lumpy=0.12, facets=22,
                   facet_depth=(0.5, 0.84), fresh_ratio=0.3, up_bias=0.2, fine=(0.014, 5.5), ground=0.0,
                   notches=7)
D.bm_vnoise(full, 0.006, 16.0, seed=9, z0=0.0)
CO = Vector((0.12, -0.04, 0.0))
N = Vector((0.80, -0.55, 0.10)).normalized()  # 割れ目は斜め：正面からも横からも V 字が見える
W = (Vector((0, 0, 1)) - N * N.z).normalized()  # 割れ目の面内の「上」
V = W.cross(N).normalized()                     # 割れ目の面内の「横」（ほぼ Y）
bmA = full.copy()
bmB = full.copy()
full.free()
D.bm_cut(bmA, CO, N, keep="inner", fresh=0.0, glow=1.0, poke=0.07, glow_rim=0.0)
D.bm_cut(bmB, CO, N, keep="outer", fresh=0.0, glow=1.0, poke=0.07, glow_rim=0.0)
for bm in (bmA, bmB):
    L = D.bm_layers(bm)
    for v in bm.verts:
        d = abs((v.co - CO).dot(N))
        v[L["cd"]] = max(0.0, 1.0 - d / 0.32)
TILT = math.radians(-17.0)
GAP0 = 0.05
MB = Matrix.Translation(N * GAP0) @ D.rot_about_line(CO, N.cross(Vector((0, 0, 1))), TILT)
D.bm_transform(bmB, MB)
D.bm_ground(bmB, 0.0, dissolve=False)
rockA = D.sharp_by_angle(C.obj_from_bm(bmA, "rock_a"), 38)
rockB = D.sharp_by_angle(C.obj_from_bm(bmB, "rock_b"), 38)
add(rockA, "basalt")
add(rockB, "basalt")


def gap_point(s, h):
    """割れ目の中央（A の断面と傾いた B の断面の間）: s=横方向, h=高さ"""
    g = GAP0 * 0.5 + h * math.sin(-TILT) * 0.5
    return CO + V * s + W * h + N * g


def gdir(a_deg, b_deg):
    """割れ目の面内で上から a 度横へ、b 度 B 側（+N）へ倒した方向"""
    a, b = math.radians(a_deg), math.radians(b_deg)
    d = W * math.cos(a) + V * math.sin(a)
    return (d * math.cos(b) + N * math.sin(b)).normalized()


# ---- 結晶 ----
# (s, h, 長さ, 半径, a, b, broken, chips)
CRY = [  # 主役の大3本（根元で重なる）
    (0.00, 0.22, 1.02, 0.130, -8, 14, None, 2),
    (0.08, 0.24, 0.86, 0.110, 22, 26, (0.8, 0.5), 1),
    (-0.09, 0.24, 0.74, 0.100, -30, 22, None, 2),
]
# 中7本：割れ目の底から放射状
for k, (s_, a_, b_) in enumerate([(0.15, 46, 8), (-0.17, -50, 30), (0.04, 4, -30), (0.22, 64, 30),
                                   (-0.05, -16, 44), (0.11, 30, -14), (-0.24, -66, 6)]):
    CRY.append((s_, 0.27 + rnd.uniform(0, 0.05), rnd.uniform(0.36, 0.60), rnd.uniform(0.055, 0.075), a_, b_,
                (rnd.uniform(0.65, 0.8), 0.5) if k in (2, 5) else None, 1))
# 小16本：割れ目に沿って点々と、根元の大結晶のまわりにも
for k in range(16):
    s_ = rnd.uniform(-0.44, 0.46)
    a_ = max(-82, min(82, s_ * 170 + rnd.uniform(-25, 25)))
    CRY.append((s_, 0.30 + rnd.uniform(0.0, 0.10) - abs(s_) * 0.15, rnd.uniform(0.09, 0.26), rnd.uniform(0.018, 0.04),
                a_, rnd.uniform(-55, 55), (0.7, 0.5) if k % 5 == 0 else None, 1 if k % 3 == 0 else 0))
for i, (s, h, ln, r, a, b, brk, ch) in enumerate(CRY):
    ob = D.crystal(f"cry_{i}", gap_point(s, h), gdir(a, b), ln, r, seed=100 + i, spin=rnd.uniform(0, 6.28),
                   embed=0.10 + r, broken=brk, chips=ch)
    add(ob, "crystal")

# 折れて転がった結晶（岩片にもたれて先が少し浮く）
shard = D.crystal("cry_fallen", (0.22, -0.74, 0.035), (0.92, 0.25, 0.16), 0.24, 0.040, seed=150, spin=0.4,
                  embed=0.0, broken=None, chips=1)
D.mesh_ground(shard, 0.0)
add(shard, "crystal")

# ---- 足元の岩片 ----
CHIPS = [((0.70, -0.55), 0.12, 1), ((0.92, 0.05), 0.15, 2), ((-0.36, -0.62), 0.08, 3),
         ((0.10, 0.66), 0.10, 4), ((-0.84, 0.22), 0.09, 5), ((0.48, -0.76), 0.05, 6)]
for k, ((x, y), sz, sd) in enumerate(CHIPS):
    ob = D.chip_rock(f"chip_{k}", sz, (x, y), seed=40 + sd, subdiv=2 if sz > 0.11 else 1,
                     squash=(1.0, rnd.uniform(0.7, 0.95), rnd.uniform(0.5, 0.75)), rot_z=rnd.uniform(0, 6.28))
    add(ob, "basalt")

# ---- 原点合わせ（材質のオブジェクト座標と最終座標を一致させる） ----
objs = [o for o, _ in parts.values()]
for o in objs:
    D.ensure_attrs(o)
off = D.recenter(objs)

mats = {"basalt": D.basalt("basalt"), "crystal": D.dragon_crystal("crystal")}
for o, key in parts.values():
    C.assign(o, mats[key])

lights = [  # 割れ目の奥（結晶の根元より下）だけに置く
    (tuple(gap_point(0.0, 0.18) - off), 11.0, (1.0, 0.20, 0.06)),
    (tuple(gap_point(0.30, 0.24) - off), 3.5, (1.0, 0.18, 0.05)),
]
C.finish(NAME, objs, version=VERSION, lights=lights, tex_res=1024, budget_tris=8000, refs=[60, 61, 64, 41],
         notes="炎竜鉱の結晶群。割れて傾いた玄武岩のV字の割れ目から14本の結晶が扇状に出る。"
               "発光は割れ目の内側・縁の細いひび・結晶の内部のみ。")
