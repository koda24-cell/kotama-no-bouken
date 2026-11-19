"""
b4p_barrel_broken — 樽2種（立った樽／壊れて板が散った樽）を1つのGLBに横並び

参考（Pinterest、references/b4-dragonfire-props-20261119.md）:
  #100 壊れた樽：たが（帯鉄）が外れ、板（側板）がばらけて倒れ、錆びた帯鉄が歪んで転がる
  #101 地下倉庫の樽群：側板の膨らみ、帯鉄4本、鏡板（ふた）の板目、埃と底の汚れ
形・寸法の要点:
  - 樽：直径0.55（胴）／0.47（端）、高さ0.85。側板16枚（膨らんだ曲面、端ほど細い）、帯鉄4本、
    鏡板は板3枚を側板の縁（チャイム）より少し下げてはめる
  - A 立った樽（x=-0.45）：上の帯鉄が1本ずり落ちて傾き、別の1本は切れて端が跳ねる。側板1枚の上端が折れて欠け、
    鏡板の1枚が割れて沈む。熱源側（-Y）が炭化
  - B 壊れた樽（x=+0.55）：下の帯鉄1本だけで側板が輪のまま残り（高さはばらばらに折れる）、残りの側板は外へ倒れて
    地面に散る。上の帯鉄は歪んだ輪のまま横に転がる。鏡板の板片が落ちている
劣化（設計書3章）:
  欠け＝折れた側板（ささくれ）、欠けた側板、割れた鏡板、外れた帯鉄（どれも外形の5%以上）
  角の摩耗＝側板の縁（明るい）、帯鉄の角の地金
  煤＝上ほど黒く、A は -Y 側が炭化
  灰＝鏡板の上・倒れた板の上向き面
  熱変色＝帯鉄の焼け（weathered_iron の heat）
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
import common as C  # noqa: E402
import lib_mine as L  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

NAME = "b4p_barrel_broken"
VERSION = "v1"
rnd = random.Random(100)
C.reset(100)

H, RM, RE = 0.85, 0.275, 0.235
NST = 16
TH = 0.022
XA, XB = -0.45, 0.62

wood_z = C.weathered_wood("wood_z", char=0.45, soot_z=(0.45, 0.9), grain_axis="Z", scale=0.5, heat_center=(XA, -0.45, 0.2), heat_r=(0.15, 0.5))
wood_x = C.weathered_wood("wood_x", char=0.5, soot_z=(0.3, 0.9), grain_axis="X", scale=0.5)
iron = C.weathered_iron("iron", soot_z=(0.5, 0.9), rust=0.65, scale=0.5, heat_center=(XA, -0.4, 0.3), heat_r=(0.1, 0.5))
parts = []


def rad(z):
    u = 2 * z / H - 1
    return RM - (RM - RE) * u * u


def stave(name, i, z0=0.0, z1=H, split_top=None, mat=wood_z, cx=0.0, cy=0.0, segs=9):
    """i 番目の側板。z0..z1 の範囲。split_top=折れの荒さ（上端を折れ口に）"""
    a = 2 * math.pi * (i + 0.5) / NST + rnd.uniform(-0.01, 0.01)
    ca, sa = math.cos(a), math.sin(a)
    pts = []
    for k in range(segs + 1):
        z = z0 + (z1 - z0) * k / segs
        r = rad(z) - TH / 2
        pts.append(Vector((cx + r * ca, cy + r * sa, z)))
    w = 2 * math.pi * RM / NST - 0.003
    ob = C.sweep(name, pts, C.rect_profile(TH, w), up_fn=lambda k, p, t, c=(ca, sa): (c[0], c[1], 0),
                 scale_fn=lambda u: (1.0, rad(z0 + (z1 - z0) * u) / RM), smooth=False)
    if split_top:
        # 上端の頂点をばらばらに下げて折れ口にする（ささくれ）
        top_z = max(v.co.z for v in ob.data.vertices)
        for v in ob.data.vertices:
            if v.co.z > top_z - 1e-4:
                v.co.z -= rnd.uniform(0.0, split_top)
    C.displace_noise(ob, 0.002, 8.0, seed=i)
    return C.assign(ob, mat), a


def hoop(name, z, cx=0.0, cy=0.0, tilt=(0, 0), wob=0.0, gap=None, segs=26, w=0.042):
    pts = []
    for k in range(segs + (0 if gap is None else 1)):
        a = 2 * math.pi * k / segs
        if gap is not None:
            a = gap[0] + (2 * math.pi - gap[1]) * k / segs
        r = rad(z) + 0.004 + wob * math.sin(a * 3 + z * 10)
        p = Vector((r * math.cos(a), r * math.sin(a), 0.0))
        p.z += math.tan(math.radians(tilt[0])) * p.x + math.tan(math.radians(tilt[1])) * p.y
        pts.append(Vector((cx, cy, z)) + p)
    ob = C.sweep(name, pts, C.rect_profile(0.006, w, chamfer=0.0015),
                 up_fn=lambda k, p, t, c=(cx, cy): (p.x - c[0], p.y - c[1], 0), closed=gap is None)
    return C.assign(ob, iron)


# ================= A 立った樽 =================
for i in range(NST):
    sp = 0.12 if i == 5 else None
    ob, a = stave(f"A_st{i}", i, split_top=sp, cx=XA)
    parts.append(ob)
# 帯鉄：下2本は正位置、上の1本はずり落ちて傾く、もう1本は切れて端が跳ねる
parts.append(hoop("A_h0", 0.07, cx=XA))
parts.append(hoop("A_h1", 0.25, cx=XA))
parts.append(hoop("A_h2", 0.56, cx=XA, tilt=(7, 2), wob=0.003))
hb = hoop("A_h3", 0.78, cx=XA, gap=(0.6, 0.55))
parts.append(hb)
# 切れた端の跳ね（外へ曲がる短い帯）
for k, a in enumerate((0.6, 0.6 - 0.55 + 2 * math.pi)):
    p = Vector((XA + rad(0.78) * math.cos(a), rad(0.78) * math.sin(a), 0.78))
    outv = Vector((math.cos(a), math.sin(a), 0))
    tang = Vector((-math.sin(a), math.cos(a), 0)) * (1 if k == 0 else -1)
    ob = C.sweep(f"A_h3_end{k}", C.bezier(p, p - tang * 0.03 + outv * 0.01, p - tang * 0.05 + outv * 0.05 + Vector((0, 0, 0.03)), n=5),
                 C.rect_profile(0.006, 0.042, chamfer=0.0015), up_fn=lambda i, q, t, o=outv: (o.x, o.y, 0))
    parts.append(C.assign(ob, iron))
# 鏡板（上）：板3枚、1枚は割れて沈む
for j in range(3):
    y = (j - 1) * 0.15
    wdt = 0.148
    half = math.sqrt(max(0.0, (RE - 0.02) ** 2 - y * y)) * 2
    if j == 2:
        for side, sgn in (("a", -1), ("b", 1)):
            pl = L.plank(f"A_head{j}{side}", half * 0.48, wdt, 0.02, segs=2, seed=150 + j, split_b=0.04 if sgn < 0 else None,
                         split_a=0.04 if sgn > 0 else None)
            C.xform(pl, (XA + sgn * half * 0.26, y, H - 0.045 - 0.02), (0, sgn * -9, 0))
            parts.append(C.assign(pl, wood_x))
        continue
    pl = L.plank(f"A_head{j}", half, wdt, 0.02, segs=3, seed=150 + j, chip=0.004)
    C.xform(pl, (XA, y, H - 0.035), (0, 0, 0))
    parts.append(C.assign(pl, wood_x))
# 底の鏡板（見えない面は省略、地面に接する1枚）
pl = L.plank("A_bottom", (RE - 0.02) * 2, 0.40, 0.02, segs=2, seed=160)
C.xform(pl, (XA, 0, 0.03), (0, 0, 0))
parts.append(C.assign(pl, wood_x))

# ================= B 壊れた樽 =================
standing = [0, 1, 2, 3, 4, 6, 7, 12, 13, 14, 15]
for i in standing:
    z1 = rnd.uniform(0.22, 0.58)
    ob, a = stave(f"B_st{i}", i, z0=0.0, z1=z1, split_top=0.08, cx=XB, segs=5)
    parts.append(ob)
parts.append(hoop("B_h0", 0.07, cx=XB, wob=0.004))
# 倒れて散った側板（外へ倒れる・地面に寝る）
fallen = [5, 8, 9, 10, 11]
for n, i in enumerate(fallen):
    ob, a = stave(f"B_fall{i}", i, z0=0.0, z1=rnd.uniform(0.55, 0.85), split_top=0.06 if n % 2 else None, cx=0.0, segs=6)
    # 原点まわりの局所の側板を、外へ倒して寝かせる
    ca, sa = math.cos(a), math.sin(a)
    r0 = rad(0.0)
    ob.data.transform(Matrix.Translation(Vector((-r0 * ca, -r0 * sa, 0))))
    tip = math.radians(rnd.uniform(78, 96)) if n != 2 else math.radians(52)
    axis = Vector((-sa, ca, 0))
    ob.data.transform(Matrix.Rotation(tip, 4, axis))
    dist = r0 + rnd.uniform(0.02, 0.12)
    ob.location = (XB + ca * dist, sa * dist, 0.035 if n != 2 else 0.0)
    ob.rotation_euler = (0, 0, math.radians(rnd.uniform(-20, 20)))
    parts.append(ob)
# 外れた帯鉄（歪んだ輪のまま斜めに転がる）
hr = hoop("B_h_loose", 0.0, wob=0.012, segs=24)
hr.data.transform(Matrix.Rotation(math.radians(64), 4, "X"))
hr.location = (XB + 0.05, 0.42, rad(0.0) * 0.9)
hr.rotation_euler = (0, 0, math.radians(20))
parts.append(hr)
# 鏡板の板片
for j in range(2):
    pl = L.plank(f"B_headfrag{j}", rnd.uniform(0.22, 0.32), 0.14, 0.02, segs=2, seed=170 + j, split_a=0.04, chip=0.004)
    C.xform(pl, (XB + rnd.uniform(-0.15, 0.25), rnd.uniform(-0.45, -0.32), 0.012), (0, rnd.uniform(-6, 6), rnd.uniform(0, 180)))
    parts.append(C.assign(pl, wood_x))
pl = L.plank("B_bottom", (RE - 0.02) * 2, 0.40, 0.02, segs=2, seed=171)
C.xform(pl, (XB, 0, 0.03), (0, 0, 0))
parts.append(C.assign(pl, wood_x))

C.finish(NAME, parts, version=VERSION, tex_res=1024, budget_tris=6000, refs=[100, 101],
         notes="樽2種（A立った樽：ずり落ちた帯鉄・切れた帯鉄・割れた鏡板／B壊れた樽：側板が散り、帯鉄が転がる）。x=-0.45/+0.62。")
