"""
b4p_dragon_scale — 抜け落ちた竜の鱗 3枚（大・中・小）

物語: side-a4-ore-vein「熱を帯びた鱗のような石」／竜の痕跡のセット（爪痕の岩＋鱗＋焼け木）

参考（Pinterest、references/b4-dragonfire-props-20261119.md）:
  #43 黒い竜鱗：重なり、鈍い艶、鱗の端の欠け（抜け落ちた鱗の形と質感）
  #50 竜レリーフ：浅浮彫りの鱗の段差と摩耗ハイライト（縁の摩耗の入れ方）
形・寸法の要点:
  - 涙形の盾のような鱗。大0.60m・中0.44m・小0.30m（幅は長さの約0.6）。中央厚み 大5cm・中4cm・小3cm、縁4〜6mm
  - 表は中央に竜骨（キール、高さ1.8〜3cm）、縁へ下がる盾形のふくらみ。先端は鋭く尖る。根元は体から裂けて不揃い
  - 大：縁の一部が直線に割れ落ちる＋欠け2か所。中：欠け3か所、大の縁にもたれる。小：裏返しで凹面を見せる
劣化（設計書3章）:
  欠け＝縁の欠け・直線の割れ・裂けた根元（断面は層状の暗い赤茶）／角の摩耗＝縁が灰黒に擦れる／
  煤＝全体が黒く、成長線の山だけ赤茶が残る／灰＝成長線の溝・凹み・上向き面／
  傷＝細かい引っかき傷が2方向に（鈍い艶の中で白っぽく）
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
import common as C  # noqa: E402
import lib_dragon as D  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

NAME = "b4p_dragon_scale"
VERSION = "v2"
rnd = random.Random(909)
C.reset(909)


def place(bm, loc, rz=0.0, rx=0.0, ry=0.0):
    M = Matrix.Translation(Vector(loc)) @ Matrix.Rotation(math.radians(rz), 4, "Z") @ \
        Matrix.Rotation(math.radians(ry), 4, "Y") @ Matrix.Rotation(math.radians(rx), 4, "X")
    D.bm_transform(bm, M)
    mz = min(v.co.z for v in bm.verts)
    D.bm_transform(bm, Matrix.Translation(Vector((0, 0, -mz))))
    return bm


parts = []
bmA = D.scale_plate_bm(0.60, seed=1, notches=2, chord=(2.3, 0.72), thick=0.05, keel=0.03, cup=-0.03, tip_amp=1.0, tip_w=0.38, edge=0.006)
place(bmA, (0.0, 0.0, 0.0), rz=18, rx=3)
parts.append(C.obj_from_bm(bmA, "scale_big"))

bmB = D.scale_plate_bm(0.44, seed=2, notches=3, thick=0.04, keel=0.024, cup=-0.024, tip_amp=1.0, tip_w=0.38, edge=0.005)
place(bmB, (0.30, -0.06, 0.0), rz=-32, ry=16)
obB = C.obj_from_bm(bmB, "scale_mid")
for v in obB.data.vertices:  # 大の縁にもたれる分だけ持ち上げる（片側の縁は地面に接したまま）
    v.co.z += 0.012 * max(0.0, (0.34 - v.co.x) / 0.2)
parts.append(obB)

bmC = D.scale_plate_bm(0.30, seed=3, notches=1, chord=(-0.6, 0.8), thick=0.03, keel=0.018, cup=-0.018, tip_amp=1.0, tip_w=0.38, edge=0.004)
place(bmC, (-0.40, -0.26, 0.0), rz=130, rx=180)
parts.append(C.obj_from_bm(bmC, "scale_small"))

for o in parts:
    D.ensure_attrs(o)
off = D.recenter(parts)
mat = D.dragon_scale_mat("scale")
for o in parts:
    C.assign(o, mat)
C.finish(NAME, parts, version=VERSION, tex_res=512, budget_tris=3000, refs=[43, 50],
         notes="抜け落ちた竜の鱗3枚（大0.60・中0.44・小0.30m）。黒い鈍い艶、縁の欠けと直線の割れ、成長線と細かい傷、灰。")
