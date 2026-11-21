"""
b4p_chain_anchor — 壁の鉄輪と垂れた太い鎖（#16）

設計図: docs/3d/b4-props/blueprints/b4p_chain_anchor.md（数値は下の定数）

参考（Pinterest、references/b4-dragonfire-props-20261119.md）:
  #78 壁の鉄輪＋鎖：取付金具（板・ボルト・受け金）
  #75 錆びた太い鎖の塊：環の摩耗、赤茶と黒の錆
  #77 壁に垂れる鎖：たるみの曲線
形・寸法の要点:
  - 壁の板（0.26×0.34）にボルト4、受け金に内径0.20の鉄輪。鉄輪から21個の輪の鎖が真下へ垂れ、床でとぐろを巻く
  - 1つの輪は割れて開き、次の輪が外れかける。板の右上の角が欠ける
劣化（設計書3章）:
  欠け＝割れて開いた輪・欠けた板の角／角の摩耗＝輪どうしが擦れる内側で地金が光る（weathered_iron の摩耗）／
  煤＝床の鎖の下側／灰＝上向き面／錆＝黒い地金に赤錆の島
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
import bmesh  # noqa: E402
import common as C  # noqa: E402
import lib_dragon as D  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

NAME = "b4p_chain_anchor"
VERSION = "v1"
rnd = random.Random(1616)
C.reset(1616)

WALL_Y = 0.15
PLATE = (0.26, 0.03, 0.34)
PLATE_C = Vector((0.0, WALL_Y - PLATE[1] / 2, 1.62))
RING_R, RING_T = 0.11, 0.013
LINK_L, LINK_W, WIRE = 0.11, 0.065, 0.012
PITCH = LINK_L - 2 * WIRE
N_LINKS = 21
OPEN_LINK = 9

iron = C.weathered_iron("iron", rust=0.65, soot_z=(0.0, 0.25), scale=0.6)
parts = []

# ---- 壁の板（角を欠き、少し反らせる） ----
bm = bmesh.new()
bmesh.ops.create_cube(bm, size=1.0)
bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=3, use_grid_fill=True)
D.bm_transform(bm, Matrix.Diagonal((PLATE[0], PLATE[1], PLATE[2], 1.0)))
for v in bm.verts:
    v.co.y -= 0.012 * (v.co.x / (PLATE[0] / 2)) ** 2   # 反り
D.bm_layers(bm)
D.bm_cut(bm, (0.10, 0, 0.13), (0.7, 0, 0.7), keep="inner", fresh=1.0)   # 右上の角の欠け
D.bm_transform(bm, Matrix.Translation(PLATE_C))
plate = C.obj_from_bm(bm, "plate", smooth=False)
C.bevel(plate, 0.003, 1, 40)
parts.append(plate)
for sx in (-1, 1):
    for sz in (-1, 1):
        if sx == 1 and sz == 1:
            continue  # 欠けた角のボルトは失われている
        b = C.dome(f"bolt_{sx}_{sz}", 0.018, 0.012, sides=8)
        C.place_on(b, PLATE_C + Vector((sx * (PLATE[0] / 2 - 0.04), -PLATE[1] / 2, sz * (PLATE[2] / 2 - 0.04))), (0, -1, 0))
        parts.append(b)
# ---- 受け金（コの字） ----
eye_c = PLATE_C + Vector((0, -PLATE[1] / 2, -0.06))
pts = [eye_c + Vector((-0.04, 0, 0.0)), eye_c + Vector((-0.04, -0.05, 0.0)), eye_c + Vector((-0.02, -0.07, -0.005)),
       eye_c + Vector((0.02, -0.07, -0.005)), eye_c + Vector((0.04, -0.05, 0.0)), eye_c + Vector((0.04, 0, 0.0))]
parts.append(C.sweep("staple", pts, C.circle_profile(0.011, 7)))
# ---- 鉄輪（受け金に掛かって前下へ垂れる） ----
ring_c = eye_c + Vector((0, -0.065, -RING_R + 0.01))
tilt = math.radians(12)
ring_pts = [ring_c + Vector((math.cos(a) * RING_R, -math.sin(tilt) * math.sin(a) * RING_R, math.cos(tilt) * math.sin(a) * RING_R))
            for a in (2 * math.pi * k / 28 for k in range(28))]
ring = C.sweep("ring", ring_pts, C.circle_profile(RING_T, 8), closed=True)
C.displace_noise(ring, 0.002, 25, seed=3)
parts.append(ring)


# ---- 鎖の経路: 鉄輪の下から真下 → 床でとぐろ ----
def chain_path():
    pts = []
    top = ring_c + Vector((0, -0.01, -RING_R - RING_T - 0.03))
    drop_end = Vector((0.0, -0.02, 0.10))
    for k in range(12):
        t = k / 11
        p = top.lerp(drop_end, t)
        p.x += 0.025 * math.sin(t * math.pi)
        pts.append(p)
    c0 = Vector((0.0, -0.06, 0.0))
    for k in range(1, 40):
        a = -math.pi / 2 + k * 0.22
        r = 0.13 - k * 0.0012
        pts.append(c0 + Vector((math.cos(a) * r, math.sin(a) * r * 0.75, WIRE + 0.004 + 0.0012 * k)))
    return pts


def resample(pts, step, n):
    out = [pts[0]]
    acc = 0.0
    i = 0
    cur = pts[0]
    while len(out) < n and i < len(pts) - 1:
        seg = pts[i + 1] - cur
        L = seg.length
        if acc + L >= step:
            cur = cur + seg.normalized() * (step - acc)
            out.append(cur.copy())
            acc = 0.0
        else:
            acc += L
            cur = pts[i + 1]
            i += 1
    return out


def link_geom(name, opened=False):
    """輪1個（局所: 長さ方向 X、幅 Y）"""
    hl = (LINK_L - LINK_W) / 2
    rr = (LINK_W - 2 * WIRE) / 2 + WIRE
    pts = []
    for k in range(14):
        a = 2 * math.pi * k / 14
        x = math.cos(a) * rr + (hl if math.cos(a) > 0 else -hl)
        pts.append(Vector((x, math.sin(a) * rr, 0)))
    if opened:  # 割れて開いた輪：片側の直線部が切れて外へ開く
        pts = pts[2:] + [pts[0] + Vector((0.004, 0.012, 0))]
        ob = C.sweep(name, pts, C.circle_profile(WIRE, 6), closed=False)
    else:
        ob = C.sweep(name, pts, C.circle_profile(WIRE, 6), closed=True)
    return ob


path = resample(chain_path(), PITCH, N_LINKS + 1)
for k in range(min(N_LINKS, len(path) - 1)):
    a, b = path[k], path[k + 1]
    t = (b - a).normalized()
    ref = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((0, 1, 0))
    n = ref.cross(t).normalized()
    if k % 2:
        n = t.cross(n).normalized()  # 隣の輪と90°ずらす
    bvec = t.cross(n)
    M = Matrix((t, n, bvec)).transposed().to_4x4()
    M.translation = (a + b) / 2
    ob = link_geom(f"link_{k}", opened=(k == OPEN_LINK))
    ob.data.transform(M)
    C.displace_noise(ob, 0.0015, 30, seed=k)
    D.mesh_ground(ob, 0.0)
    parts.append(ob)

for o in parts:
    C.assign(o, iron)
    D.ensure_attrs(o)
off = D.recenter(parts)
C.finish(NAME, parts, version=VERSION, tex_res=512, budget_tris=5000, refs=[78, 75, 77],
         notes="壁の鉄輪と垂れた鎖（21個、1つは割れて開く）。裏 y=+0.15 が壁の面。")
