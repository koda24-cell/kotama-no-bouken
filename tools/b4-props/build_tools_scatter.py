"""
b4p_tools_scatter — 落ちたつるはし・スコップ・ハンマー（地面に散らばった3点、1つのGLB）

参考（Pinterest、references/b4-dragonfire-props-20261119.md）:
  #82 つるはし頭の鍛造形状：反った両尖りの頭、目（柄穴）の膨らみ、柄の楔
  #83 スコップとつるはし：スコップの刃の皿形と肩、ソケット、柄の摩耗、錆
  #84 斧と柄：柄の木目、手の当たる所の艶
形・寸法の要点（地面に寝た状態、全体 約1.1×0.75m）:
  - つるはし：柄0.85m（楕円断面、末端が太る）、頭0.50m（反り、片方の尖りが欠けて短い）。頭を横に寝かせて柄が少し浮く
  - スコップ：刃0.24×0.29m（皿形、先は丸く尖る、片方の肩が折れ曲がり、錆の穴）、ソケット、柄は途中で折れて0.55m（ささくれ）
  - ハンマー（片手の大槌）：頭0.16m（面取りの角柱、打撃面がめくれて広がる）、柄0.50m
劣化（設計書3章）:
  欠け＝つるはしの欠けた尖り、スコップの曲がった肩・錆穴・折れた柄、ハンマーのめくれた打撃面
  角の摩耗＝刃先・尖り・打撃面の地金（明るい）、柄の握りの艶
  煤＝刃の上面、柄の先
  灰＝上向きの面
  熱変色＝刃の青黒い焼け（weathered_iron の heat）
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
import bmesh  # noqa: E402
import common as C  # noqa: E402
import lib_mine as L  # noqa: E402
from mathutils import Matrix, Vector, noise  # noqa: E402

NAME = "b4p_tools_scatter"
VERSION = "v1"
rnd = random.Random(83)
C.reset(83)

iron = C.weathered_iron("iron", heat_center=(0.25, 0.15, 0.0), heat_r=(0.05, 0.35), soot_z=(0.02, 0.08), rust=0.55, scale=0.4, wear=1.2)
wood = C.weathered_wood("wood", char=0.2, grain_axis="X", scale=0.35)
wood_y = C.weathered_wood("wood_y", char=0.25, grain_axis="Y", scale=0.35)
parts = []


def place(objs, loc, rz):
    M = Matrix.Translation(Vector(loc)) @ Matrix.Rotation(math.radians(rz), 4, "Z")
    for o in objs:
        C.apply_xform(o)
        o.data.transform(M)
    return objs


# ================= つるはし（局所: 柄は +X、頭は Y 方向） =================
def pickaxe():
    obs = []
    hl = 0.85
    hr = 0.019
    # 頭：反った両尖り。片方（-Y）は欠けて短い
    eye = Vector((0.0, 0.0, 0.0))
    a = Vector((0.04, -0.20, 0.0))   # 欠けた側
    b = Vector((0.06, 0.25, 0.0))
    pts = C.bezier(a, Vector((-0.02, -0.08, 0)), Vector((-0.02, 0.09, 0)), b, n=12)
    head = C.sweep("pick_head", pts, C.rect_profile(0.034, 0.030, chamfer=0.007), up_fn=lambda k, p, t: (0, 0, 1),
                   scale_fn=lambda u: (max(0.10, 1 - abs(u - 0.47) * 1.9) ** 0.75 if u > 0.47 else max(0.45, 1 - abs(u - 0.47) * 1.2),
                                       max(0.15, 1 - abs(u - 0.47) * 1.7) ** 0.7 if u > 0.47 else max(0.5, 1 - abs(u - 0.47) * 1.1)))
    C.displace_noise(head, 0.0015, 40, seed=8)
    obs.append(C.assign(head, iron))
    # 欠けた尖りの断面（荒れた面）
    chip = C.rock("pick_chip", 0.016, detail=1, rough=0.3, squash=(1, 0.6, 0.9), seed=3, facet=3)
    C.xform(chip, a + Vector((0.0, 0.005, 0)), (0, 0, 0))
    obs.append(C.assign(chip, iron))
    collar = L.lathe("pick_eye", [(0.026, -0.035), (0.031, -0.02), (0.031, 0.02), (0.026, 0.035)], sides=8, sharp_deg=30)
    collar.rotation_euler = (0, math.radians(90), 0)
    obs.append(C.assign(collar, iron))
    hp = [Vector((-0.06 + (hl) * t, 0.006 * math.sin(t * 7), 0)) for t in (k / 9 for k in range(10))]
    hdl = C.sweep("pick_handle", hp, [(x, y * 0.75) for x, y in C.circle_profile(hr, 8)], up_fn=lambda k, p, t: (0, 0, 1),
                  scale_fn=lambda u: 1.0 + 0.3 * max(0.0, u - 0.8) / 0.2)
    C.displace_noise(hdl, 0.0012, 18, seed=9)
    obs.append(C.assign(hdl, wood))
    wd = L.wedge("pick_wedge", 0.028, 0.012, 0.03, seed=4)
    C.xform(wd, (-0.045, 0, 0), (0, 0, 0))
    obs.append(C.assign(wd, wood))
    return obs


# ================= スコップ（局所: 柄は +X、刃は -X 側に寝る、刃の凹みが上） =================
def shovel():
    obs = []
    bm = bmesh.new()
    nx, ny = 10, 8
    BL, BW = 0.29, 0.24
    grid = []
    for i in range(nx + 1):
        u = i / nx            # 0=先 1=肩
        row = []
        for j in range(ny + 1):
            v = j / ny * 2 - 1   # -1..1
            half = BW / 2 * (0.35 + 0.65 * math.sin(min(1.0, u * 1.6 + 0.05) * math.pi / 2))
            x = -BL + BL * u
            y = v * half
            z = 0.028 * v * v + 0.01 * (1 - u)          # 皿形（縁が上がる）
            if u > 0.92 and v > 0.5:                      # 折れ曲がった肩
                z += 0.05 * (u - 0.92) / 0.08 * (v - 0.5) / 0.5
            row.append(bm.verts.new((x, y, z)))
        grid.append(row)
    for i in range(nx):
        for j in range(ny):
            bm.faces.new((grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]))
    L.punch_holes(bm, [(Vector((-0.12, -0.05, 0.01)), 0.022)], seed=5)
    bm.normal_update()
    for v in bm.verts:   # へこみ
        v.co.z += 0.006 * noise.noise(v.co * 12 + Vector((4, 1, 2)))
    L.jag_boundary(bm, 0.003, seed=7)
    bl = C.obj_from_bm(bm, "shovel_blade", smooth=True)
    m = bl.modifiers.new("solid", "SOLIDIFY")
    m.thickness = 0.004
    m.offset = 0.0
    C.apply_mods(bl)
    obs.append(C.assign(bl, iron))
    sock = L.lathe("shovel_socket", [(0.040, 0.0), (0.030, 0.04), (0.024, 0.11), (0.022, 0.15)], sides=8)
    sock.data.transform(Matrix.Translation((0, 0, 0)) @ Matrix.Rotation(math.radians(90), 4, "Y"))
    sock.location = (-0.005, 0, 0.036)
    obs.append(C.assign(sock, iron))
    hp = [Vector((0.13 + 0.55 * t, 0.004 * math.sin(t * 6), 0.036 - 0.016 * t)) for t in (k / 7 for k in range(8))]
    hdl = L.plank("shovel_handle", 0.55, 0.036, 0.036, segs=7, split_b=0.05, seed=12, round_edges=0.45)
    L.orient_between(hdl, hp[0], hp[-1])
    obs.append(C.assign(hdl, wood))
    obs += L.splinters("shovel_spl", hp[-1] + Vector((0.02, 0, 0)), (1, 0.05, 0.05), 0.018, n=5, length=0.06, seed=13, mat=wood)
    return obs


# ================= ハンマー（局所: 柄は +X、頭は Y 方向） =================
def hammer():
    obs = []
    hd = L.plank("hammer_head", 0.16, 0.06, 0.06, segs=4, seed=21, round_edges=0.3, chip=0.004)
    hd.rotation_euler = (0, 0, math.radians(90))
    obs.append(C.assign(hd, iron))
    for s in (-1, 1):   # めくれて広がった打撃面
        fl = L.lathe(f"hammer_face{s}", [(0.0, 0.0), (0.034, 0.0), (0.038, 0.006), (0.033, 0.012), (0.0, 0.012)], sides=8,
                     rfn=L.dent_fn([], wobble=0.003, seed=s + 3), sharp_deg=30)
        fl.data.transform(Matrix.Rotation(math.radians(-90 * s), 4, "X"))
        fl.location = (0, s * 0.074, 0)
        obs.append(C.assign(fl, iron))
    hp = [Vector((0.0 + 0.50 * t, 0.003 * math.sin(t * 6), 0)) for t in (k / 7 for k in range(8))]
    hdl = C.sweep("hammer_handle", hp, [(x, y * 0.72) for x, y in C.circle_profile(0.017, 8)], up_fn=lambda k, p, t: (0, 0, 1),
                  scale_fn=lambda u: 1.0 + 0.2 * max(0.0, u - 0.8) / 0.2)
    obs.append(C.assign(hdl, wood))
    return obs


P = pickaxe()
# 頭を横に寝かせる：頭の厚み分だけ浮かせ、柄の末端は地面へ
parts += place(P, (-0.30, 0.05, 0.020), 18)
S = shovel()
parts += place(S, (0.12, -0.24, 0.004), -24)
Hm = hammer()
for o in Hm:
    C.apply_xform(o)
    o.data.transform(Matrix.Rotation(math.radians(1.5), 4, "Y"))
parts += place(Hm, (0.05, 0.30, 0.031), 150)

C.finish(NAME, parts, version=VERSION, tex_res=512, budget_tris=4500, refs=[82, 83, 84],
         notes="地面に落ちたつるはし（尖りが欠ける）・スコップ（肩の曲がり・錆穴・柄が折れる）・ハンマー（打撃面のめくれ）。")
