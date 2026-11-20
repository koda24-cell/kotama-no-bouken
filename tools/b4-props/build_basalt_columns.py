"""
b4p_basalt_columns — 柱状節理の小群（#20、ユーザー追加要望「岩・鉱石多め、前人未踏感」）

設計図: docs/3d/b4-props/blueprints/b4p_basalt_columns.md（数値は下の定数）

参考（Pinterest、references/b4-dragonfire-props-20261119.md）:
  #30 柱状節理の段差：六角柱の天端、割れ、角の欠け（主参考）
  #31 垂直壁：柱の長さのばらつき、陰影のリズム
  #33 天端が段々に崩れる形
形・寸法の要点:
  - 六角柱7本（中央＋まわり6）、六角格子の間隔0.47m、対辺0.38〜0.50m（辺は±7%不揃い）、角は1.5cm面取り
  - 高さ 中央2.20、他1.85/1.55/1.30/1.05/0.82/0.60 が一方へ段々に下がる。天端は3〜10°傾く
  - 3本は天端が2段（段差0.06〜0.15）、全柱の角に欠け1〜2、横の節理（割れ目）0〜2本
  - 正面の裾に折れて転がった節（長さ0.5）
劣化（設計書3章）:
  欠け＝天端の段差・角の欠け（新しい断面）・節で割れた柱／角の摩耗＝面取りの稜／
  煤＝下0.3mが黒い／灰＝天端と段差の棚
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
import bmesh  # noqa: E402
import common as C  # noqa: E402
import lib_dragon as D  # noqa: E402
from mathutils import Matrix, Vector, noise  # noqa: E402

NAME = "b4p_basalt_columns"
VERSION = "v6"
rnd = random.Random(2020)
C.reset(2020)

SPACING = 0.47
HEIGHTS = [2.20, 1.85, 1.55, 1.30, 1.05, 0.82, 0.60]
FLAT = (0.38, 0.50)
CHAMFER = 0.015
STEPPED = {0, 2, 4, 5}


def column_bm(flat, H, seed, joints=()):
    """面取りした六角柱（12角の断面）。joints の高さに横の割れ目（細い溝）"""
    r = random.Random(seed)
    R = flat / math.sqrt(3)  # 外接半径 = 対辺/√3
    corners = [2 * math.pi * i / 6 + r.uniform(-0.06, 0.06) for i in range(6)]
    radii = [R * r.uniform(0.93, 1.07) for _ in range(6)]
    prof = []
    for i in range(6):
        p = Vector((math.cos(corners[i]) * radii[i], math.sin(corners[i]) * radii[i]))
        pp = Vector((math.cos(corners[i - 1]) * radii[i - 1], math.sin(corners[i - 1]) * radii[i - 1]))
        pn = Vector((math.cos(corners[(i + 1) % 6]) * radii[(i + 1) % 6], math.sin(corners[(i + 1) % 6]) * radii[(i + 1) % 6]))
        prof.append(p + (pp - p).normalized() * CHAMFER)
        prof.append(p + (pn - p).normalized() * CHAMFER)
    zs = []
    n = max(4, int(H / 0.12))
    for k in range(n + 1):
        z = H * k / n
        if 0 < k < n and any(abs(z - j) < 0.035 for j in joints):
            continue  # 節理の溝の輪と重ならない（自己交差するとブーリアンが失敗する）
        zs.append((z, 1.0))
    for j in joints:
        zs += [(j - 0.008, 1.0), (j, 0.93), (j + 0.008, 1.0)]
    zs.sort()
    bm = bmesh.new()
    lean = Vector((r.uniform(-1, 1), r.uniform(-1, 1))) * 0.03
    rings = []
    off = r.uniform(0, 100)
    for z, s in zs:
        ring = []
        for p in prof:
            wob = 0.022 * noise.noise(Vector((p.x * 3 + off, p.y * 3, z * 2.2))) + 0.010 * noise.noise(Vector((p.x * 9, p.y * 9 + off, z * 9)))
            q = p * s * (1 + wob) + lean * z
            ring.append(bm.verts.new((q.x, q.y, z)))
        rings.append(ring)
    M = len(prof)
    for a, b in zip(rings[:-1], rings[1:]):
        for i in range(M):
            bm.faces.new((a[i], a[(i + 1) % M], b[(i + 1) % M], b[i]))
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    D.bm_layers(bm)
    # 天端の傾き（新しい断面ではない＝古い割れ面）
    tilt = math.radians(r.uniform(4, 12) if r.random() < 0.6 else r.uniform(18, 30))  # 4割は大きく斜めに折れた天端
    d = r.uniform(0, 6.3)
    nrm = Vector((math.cos(d) * math.sin(tilt), math.sin(d) * math.sin(tilt), math.cos(tilt)))
    D.bm_cut(bm, (0, 0, H - R * math.tan(tilt) * 0.8), nrm, keep="inner", fresh=0.0)
    return bm, R


def box(name, center, size, rot):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    D.bm_transform(bm, Matrix.Diagonal((size[0], size[1], size[2], 1.0)))
    R = Matrix.Rotation(rot[2], 4, "Z") @ Matrix.Rotation(rot[1], 4, "Y") @ Matrix.Rotation(rot[0], 4, "X")
    D.bm_transform(bm, Matrix.Translation(Vector(center)) @ R)
    return C.obj_from_bm(bm, name, smooth=False)


cols = []
pos = [Vector((0, 0))] + [Vector((math.cos(math.radians(30 + 60 * k)), math.sin(math.radians(30 + 60 * k)))) * SPACING for k in range(6)]
for k, (p, H) in enumerate(zip(pos, HEIGHTS)):
    flat = rnd.uniform(*FLAT)
    joints = [rnd.uniform(0.3, H - 0.3) for _ in range(rnd.randint(0, 2))] if H > 0.9 else []
    bm, R = column_bm(flat, H, seed=50 + k, joints=joints)
    D.bm_transform(bm, Matrix.Translation(Vector((p.x, p.y, 0))) @ Matrix.Rotation(rnd.uniform(-0.1, 0.1), 4, "Z"))
    ob = C.obj_from_bm(bm, f"col_{k}", smooth=True)
    import bmesh as _b
    _t = _b.new(); _t.from_mesh(ob.data)
    C.log(f"column {k}: H={H} faces={len(ob.data.polygons)} nonmanifold_edges={sum(1 for e in _t.edges if not e.is_manifold)} joints={len(joints)}")
    _t.free()
    D.sharp_by_angle(ob, 25)
    cuts = []
    top = max(v.co.z for v in ob.data.vertices)
    if k in STEPPED:  # 天端の段差：上の角を箱で落とす
        a = rnd.uniform(0, 6.3)
        st = rnd.uniform(0.10, 0.22)
        c = Vector((p.x + math.cos(a) * R * 0.85, p.y + math.sin(a) * R * 0.85, top))
        cuts.append(box(f"_s{k}", c, (R * 1.5, R * 1.5, st * 2), (rnd.uniform(-0.15, 0.15), rnd.uniform(-0.15, 0.15), a)))
    for j in range(rnd.randint(2, 4)):  # 角の欠け（天端の角＋柱の途中の稜）
        a = rnd.uniform(0, 6.3)
        sz = rnd.uniform(0.11, 0.2)
        z = top - rnd.uniform(0.0, 0.25) if j < 2 else rnd.uniform(0.25, top - 0.2)
        c = Vector((p.x + math.cos(a) * R, p.y + math.sin(a) * R, z))
        cuts.append(box(f"_k{k}_{j}", c, (sz, sz * rnd.uniform(0.7, 1.2), sz * 1.3), (rnd.uniform(-0.9, 0.9), rnd.uniform(-0.9, 0.9), a + rnd.uniform(-0.6, 0.6))))
    if cuts:
        D.bool_diff(ob, cuts)
    cols.append(ob)

# ---- 転がった節 ----
bm, R = column_bm(0.42, 0.5, seed=99)
D.bm_transform(bm, Matrix.Translation(Vector((0.35, -0.78, 0.42 / 2 * 0.9))) @ Matrix.Rotation(math.radians(80), 4, "Z") @
               Matrix.Rotation(math.radians(90), 4, "X") @ Matrix.Translation(Vector((0, 0, -0.25))))
D.bm_ground(bm, 0.0, dissolve=False)
seg = D.sharp_by_angle(C.obj_from_bm(bm, "segment"), 25)
cols.append(seg)


# ---- 割れ落ちた欠片（天端の段差から） ----
for j in range(5):
    a = rnd.uniform(-2.6, -0.4)
    rr = rnd.uniform(0.62, 0.85)
    ob = D.chip_rock(f"chip_{j}", rnd.uniform(0.07, 0.16), (math.cos(a) * rr, math.sin(a) * rr), seed=900 + j, subdiv=1,
                     squash=(1.0, 0.8, 0.55), rot_z=rnd.uniform(0, 6.3))
    cols.append(ob)


# 属性: fresh はブーリアンで出来た面（どの列の元の面にも当たらない＝法線が水平・鉛直から外れた面）を近似で判定
def mark_fresh(ob):
    me = ob.data
    D.ensure_attrs(ob)
    a = me.attributes["fresh"]
    for p in me.polygons:
        n = p.normal
        horiz = abs(n.z) < 0.08
        vert_up = n.z > 0.93
        val = 0.0 if (horiz or vert_up or n.z < -0.9) else 1.0
        for li in p.loop_indices:
            a.data[li].value = val


for o in cols:
    mark_fresh(o)
    D.set_attr_fn(o, "tip", lambda co: max(0.0, min(1.0, 1 - co.z / 0.35)))
off = D.recenter(cols)
mat = D.basalt("basalt", hairline=0.0, prox_soot=0.8, tex_scale=1.2, ash_amt=1.5)
for o in cols:
    C.assign(o, mat)
C.finish(NAME, cols, version=VERSION, tex_res=1024, budget_tris=6000, refs=[30, 31, 33],
         notes="柱状節理7本（2.20〜0.60m）＋転がった節。天端の段差・角の欠け・横の節理。")
