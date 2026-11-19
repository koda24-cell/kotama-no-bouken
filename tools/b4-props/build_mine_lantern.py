"""
b4p_mine_lantern — 坑道ランタン（ハリケーン型、掛け金具つき、灯った状態）

参考（Pinterest、references/b4-dragonfire-props-20261119.md）:
  #84 ハリケーンランタン：燃料タンク、左右の空気管、ガード線に囲まれた膨らんだホヤ、上の笠と煙突、吊り手（ベイル）
  #80 鉱山ランタンの金属枠とガラス：細い縦枠、笠の縁、ガラスの奥の芯
形・寸法の要点:
  - 全体 0.18×0.18×0.38m。タンク z=0〜0.065（径0.16、肩が丸い）、バーナーの襟 z=0.065〜0.085、
    ホヤ z=0.085〜0.225（最大径0.12）、笠 z=0.23〜0.27＋煙突と通気キャップ〜0.30、
    吊り手の頂点 z≈0.345、S字の掛け金具が吊り手に掛かり上端 z≈0.38
  - ホヤを4本のガード線と中段の輪が囲む。左右の空気管がタンクの肩から笠へ上がる。芯の調整つまみは +X 側
劣化（設計書3章）:
  欠け＝ガード線1本が内へ潰れて折れ、そこからホヤが大きく割れて欠落（割れ口は三角形のギザギザ＋厚み）、
       背面にも小さな欠け。タンクの凹み・笠の縁の凹み・吊り手の曲がり
  角の摩耗＝縁と線材の角に地金（weathered_iron の edge）
  煤＝笠・煙突は真っ黒、ホヤは上半分が内側から煤ける
  灰＝タンクの肩・笠の上向き面
  熱変色＝バーナーと笠の内側まわりが青黒〜紫茶
発光: 芯の先と小さな炎だけ（wick_glow）。ガラスは不透明の煤けた材質で、割れ穴から芯の光が漏れる。
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
import common as C  # noqa: E402
import lib_mine as L  # noqa: E402
from mathutils import Vector  # noqa: E402

NAME = "b4p_mine_lantern"
VERSION = "v2"
rnd = random.Random(84)
C.reset(84)

FLAME = (0.0, 0.0, 0.10)
iron = C.weathered_iron("iron", heat_center=(0, 0, 0.16), heat_r=(0.03, 0.13), soot_z=(0.19, 0.30), rust=0.32, scale=0.35, wear=0.7)
wire = C.weathered_iron("wire", heat_center=(0, 0, 0.16), heat_r=(0.03, 0.12), soot_z=(0.18, 0.30), rust=0.25, scale=0.35, wear=0.35)
HOLE_A = -1.25
glass = L.sooty_glass("glass", soot_z=(0.15, 0.215), scale=0.4,
                      crack_center=(0.06 * math.cos(HOLE_A), 0.06 * math.sin(HOLE_A), 0.145), crack_r=(0.03, 0.09))
wick = L.wick_glow("wick", 0.079, 0.0825, 0.122, strength=5.0)

parts = []

# ---- 燃料タンク（肩の丸い円盤、横に凹み） ----
# 底のつば→わずかに膨らむ胴→プレスのビード→肩→上面（角はシャープに）
tank_prof = [(0.0, 0.0), (0.073, 0.0), (0.078, 0.0035), (0.078, 0.008), (0.074, 0.0105), (0.0785, 0.028),
             (0.077, 0.041), (0.0705, 0.0485), (0.056, 0.0575), (0.040, 0.0635), (0.0, 0.065)]
tank = L.lathe("tank", tank_prof, sides=16, sharp_deg=38,
               rfn=L.dent_fn([(3.6, 0.026, 0.011, 0.30, 0.012), (0.9, 0.047, 0.005, 0.22, 0.008)]))
parts.append(C.assign(tank, iron))
# 給油口のキャップ
fc = C.dome("filler", 0.010, 0.007, sides=8)
C.place_on(fc, (-0.050 * math.cos(0.6), 0.050 * math.sin(0.6), 0.058), (-0.35, 0.2, 1.0))
parts.append(C.assign(fc, iron))

# ---- バーナーの襟（ギャラリー）と芯の調整つまみ ----
coll = L.lathe("collar", [(0.030, 0.063), (0.037, 0.066), (0.037, 0.078), (0.040, 0.080), (0.040, 0.085), (0.034, 0.086)],
               sides=12, rfn=L.dent_fn([], wobble=0.0006))
parts.append(C.assign(coll, iron))
knob = C.sweep("knob", [Vector((0.034, 0.0, 0.072)), Vector((0.055, 0.0, 0.072)), Vector((0.056, 0.0, 0.072)), Vector((0.062, 0.0, 0.072))],
               C.circle_profile(0.0028, 6), scale_fn=lambda u: 1.0 if u < 0.5 else 3.2)
parts.append(C.assign(knob, iron))

# ---- 芯と炎（発光は芯と炎だけ） ----
wick_tape = C.sweep("wick_tape", [Vector((0, 0, 0.076)), Vector((0, 0, 0.084))], C.rect_profile(0.012, 0.0025), up_fn=lambda k, p, t: (1, 0, 0))
parts.append(C.assign(wick_tape, wick))
flame = L.lathe("flame", [(0.0, 0.0825), (0.0055, 0.087), (0.0068, 0.094), (0.0055, 0.103), (0.0030, 0.113), (0.0, 0.122)], sides=6,
                rfn=lambda a, z, r: r * (1.0 - 0.18 * math.cos(2 * a)))
parts.append(C.assign(flame, wick))

# ---- ホヤ（膨らんだガラス、正面が大きく割れて欠落） ----
GLOBE = [(0.033, 0.084), (0.044, 0.094), (0.054, 0.110), (0.059, 0.130), (0.060, 0.150), (0.057, 0.170),
         (0.050, 0.190), (0.040, 0.207), (0.033, 0.218), (0.031, 0.226)]
globe = L.broken_shell("globe", GLOBE, 14,
                       holes=[(HOLE_A, 0.145, 0.95, 0.050), (HOLE_A + 2.9, 0.175, 0.30, 0.018)],
                       thickness=0.0022, seed=3, jag=0.0035,
                       rfn=L.dent_fn([], wobble=0.0008, seed=2))
parts.append(C.assign(globe, glass))

# 落ちた破片2枚（タンクの肩に引っかかる）
for j, (a, z) in enumerate(((HOLE_A + 0.25, 0.060),)):
    r = 0.058 if j == 0 else 0.066
    p = Vector((r * math.cos(a), r * math.sin(a), z))
    sh = L.broken_shell(f"shard_{j}", [(0.06, 0.0), (0.06, 0.02)], 10, holes=[], thickness=0.002, seed=10 + j)
    # 欠片にするため扇形だけ残す：殻を小さく縮めて傾ける
    import bmesh  # noqa: E402
    bm = bmesh.new()
    bm.from_mesh(sh.data)
    keep_a = rnd.uniform(-math.pi, math.pi)
    dele = [f for f in bm.faces if abs(math.atan2(math.sin(math.atan2(f.calc_center_median().y, f.calc_center_median().x) - keep_a),
                                                   math.cos(math.atan2(f.calc_center_median().y, f.calc_center_median().x) - keep_a))) > 0.45]
    bmesh.ops.delete(bm, geom=dele, context="FACES")
    bm.to_mesh(sh.data)
    bm.free()
    C.apply_xform(sh)
    # 欠片の重心を原点へ
    cen = sum((v.co for v in sh.data.vertices), Vector()) / max(1, len(sh.data.vertices))
    sh.data.transform(C.Matrix.Translation(-cen))
    C.xform(sh, p, (rnd.uniform(60, 80), rnd.uniform(-20, 20), math.degrees(a) + 90), scale=(0.32, 0.32, 0.4))
    parts.append(C.assign(sh, glass))

# ---- 笠と煙突・通気キャップ（縁が凹む） ----
cap = L.lathe("cap", [(0.040, 0.226), (0.068, 0.231), (0.0725, 0.2335), (0.0725, 0.2375), (0.067, 0.2395), (0.050, 0.252),
                      (0.030, 0.265), (0.026, 0.268), (0.026, 0.283), (0.038, 0.2875), (0.038, 0.2915), (0.031, 0.297),
                      (0.0, 0.299)], sides=14, sharp_deg=35,
              rfn=L.dent_fn([(-0.6, 0.236, 0.007, 0.30, 0.008), (2.2, 0.25, 0.003, 0.4, 0.01)], wobble=0.0008, seed=5))
parts.append(C.assign(cap, iron))
# 笠の内側（下から見て抜けないよう浅い皿）
capin = L.lathe("cap_in", [(0.064, 0.2305), (0.034, 0.238), (0.0, 0.242)], sides=8)
parts.append(C.assign(capin, iron))

# ---- 左右の空気管（タンクの肩→笠） ----
for k, sx in enumerate((1, -1)):
    a = 0.0 if sx > 0 else math.pi
    a += 0.0
    pts = [Vector((sx * 0.066, 0, 0.048)), Vector((sx * 0.074, 0, 0.062)), Vector((sx * 0.075, 0, 0.10)),
           Vector((sx * 0.0755, 0, 0.16)), Vector((sx * 0.074, 0, 0.215)), Vector((sx * 0.068, 0, 0.236)), Vector((sx * 0.058, 0, 0.246))]
    if k == 1:  # 片側は少し曲がっている
        pts[3] += Vector((0.0, 0.006, 0.0))
        pts[2] += Vector((0.0, 0.003, 0.0))
    tube = C.sweep(f"tube_{k}", C.bezier(pts[0], pts[2], pts[4], pts[6], n=8), C.circle_profile(0.0052, 6))
    C.displace_noise(tube, 0.0008, 60, seed=k)
    parts.append(C.assign(tube, iron))
    # 吊り手の軸受け（管に巻いた帯）
    band = C.sweep(f"pivot_band_{k}", [Vector((sx * 0.075, 0, 0.192)), Vector((sx * 0.075, 0, 0.204))], C.circle_profile(0.0075, 6), cap=False)
    parts.append(C.assign(band, iron))

# ---- ガード線（4本）と中段の輪。-45°の1本は潰れて内へ曲がり、上で折れている ----
def globe_r(z):
    for (r0, z0), (r1, z1) in zip(GLOBE, GLOBE[1:]):
        if z0 <= z <= z1:
            return r0 + (r1 - r0) * (z - z0) / (z1 - z0)
    return GLOBE[-1][0]


WIRE = C.circle_profile(0.0019, 4)
for k in range(4):
    a = math.pi / 4 + k * math.pi / 2
    pts = []
    for j in range(9):
        z = 0.086 + (0.229 - 0.086) * j / 8
        r = globe_r(min(max(z, 0.085), 0.225)) + 0.008
        if j in (0, 8):
            r -= 0.003
        pts.append(Vector((r * math.cos(a), r * math.sin(a), z)))
    if k == 3:  # 潰れたガード（割れの原因）
        crushed = []
        for j, p in enumerate(pts):
            t = j / 8
            push = 0.020 * math.exp(-((t - 0.45) / 0.18) ** 2)
            d = Vector((p.x, p.y, 0)).normalized()
            crushed.append(p - d * push + Vector((-d.y, d.x, 0)) * push * 0.4)
        lower = crushed[:6]
        tip = lower[-1] + (lower[-1] - lower[-2]).normalized() * 0.006 + Vector((math.cos(a), math.sin(a), 0)) * 0.012
        ob = C.sweep("guard_3a", lower + [tip], WIRE)
        parts.append(C.assign(ob, wire))
        stub = C.sweep("guard_3b", [crushed[8], crushed[7] + Vector((math.cos(a), math.sin(a), 0)) * 0.008], WIRE)
        parts.append(C.assign(stub, wire))
        continue
    ob = C.sweep(f"guard_{k}", pts, WIRE)
    C.displace_noise(ob, 0.0007, 50, seed=k)
    parts.append(C.assign(ob, wire))

ring_pts = []
for j in range(16):
    a = 2 * math.pi * j / 16
    r = globe_r(0.150) + 0.0095
    da = math.atan2(math.sin(a - (-math.pi / 4)), math.cos(a - (-math.pi / 4)))
    r -= 0.013 * math.exp(-(da / 0.35) ** 2)
    ring_pts.append(Vector((r * math.cos(a), r * math.sin(a), 0.150 + 0.002 * math.sin(a * 2))))
ring = C.sweep("guard_ring", ring_pts, WIRE, closed=True)
parts.append(C.assign(ring, wire))
lowring = C.sweep("guard_lowring", [Vector((0.043 * math.cos(2 * math.pi * j / 12), 0.043 * math.sin(2 * math.pi * j / 12), 0.087)) for j in range(12)],
                  WIRE, closed=True)
parts.append(C.assign(lowring, wire))

# ---- 吊り手（ベイル）：軸受けから上へ弧、少し歪む ----
bail_pts = []
for j in range(15):
    t = j / 14
    ang = math.pi * t
    x = 0.081 * math.cos(ang)
    z = 0.198 + 0.148 * math.sin(ang) ** 0.85
    y = 0.004 * math.sin(ang * 3) + (0.006 * math.sin(ang) if t > 0.5 else 0.0)
    bail_pts.append(Vector((x, y, z)))
bail = C.sweep("bail", bail_pts, C.circle_profile(0.0024, 5))
parts.append(C.assign(bail, wire))
for sx in (1, -1):
    eye = C.dome(f"bail_eye_{sx}", 0.0045, 0.003, sides=5)
    C.place_on(eye, (sx * 0.0825, 0, 0.198), (sx, 0, 0))
    parts.append(C.assign(eye, iron))

# ---- S字の掛け金具（吊り手の頂点に掛かる） ----
TOP = Vector((0.0, 0.0028, 0.3435))
r = 0.0085
hook = []
for j in range(9):   # 下の輪：-Y 側の背から下を回って +Y 側の先端へ
    th = math.radians(180 + 200 * j / 8)
    hook.append(TOP + Vector((0, r * math.cos(th), r * math.sin(th) + r * 0.9)))
hook = list(reversed(hook))
spine_top = TOP + Vector((0, -r, r * 0.9 + 0.016))
hook.append(spine_top)
c2 = spine_top + Vector((0, -r, 0))
for j in range(1, 9):  # 上の輪：反対側へ巻く
    th = math.radians(200 * j / 8)
    hook.append(c2 + Vector((0, r * math.cos(th), r * math.sin(th))))
hk = C.sweep("s_hook", hook, C.circle_profile(0.0028, 4), scale_fn=lambda u: 1.0 - 0.3 * max(0.0, u - 0.85) / 0.15)
hk.rotation_euler = (0, 0, math.radians(14))
parts.append(C.assign(hk, iron))

C.finish(NAME, parts, version=VERSION, lights=[((0.0, 0.0, 0.102), 0.9, (1.0, 0.52, 0.18))], tex_res=512, budget_tris=2500,
         refs=[84, 80],
         notes="ハリケーン型の坑道ランタン（灯った状態）。潰れたガード線の部分でホヤが大きく割れ、芯と炎だけ発光。S字金具つき。")
