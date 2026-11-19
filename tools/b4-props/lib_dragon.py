"""
B4 小物 dragon チーム用の部品・材質（竜の痕跡・火山の自然物）

common.py（全チーム共通ハーネス）の上に、玄武岩・炎竜鉱の結晶・骨・鱗などの
形状部品と材質を足す。材質は common の NB（ノードDSL）と同じ考え方で、
設計書2章の色・明度上限、3章の劣化（欠け・角の摩耗・煤・灰・熱変色）を入れる。

頂点/コーナー属性（ベイク時に Attribute ノードで読む。最後に1つへ結合しても残る）:
  glow  (CORNER) 割れ目の内側など「発光してよい面」  0..1
  fresh (CORNER) 新しい割れ面（欠けた断面）          0..1
  tip   (POINT)  結晶の根元0 → 先端1 / 骨の部位など汎用の軸座標
  cd    (POINT)  大きな割れ目への近さ 1=割れ目の縁
すべての部品に ensure_attrs() で同じ属性をそろえてから finish() に渡す。
"""
import math
import random

import bmesh
import bpy
from mathutils import Matrix, Vector, noise

import common as C

ATTRS = {"glow": "CORNER", "fresh": "CORNER", "tip": "POINT", "cd": "POINT"}


# ---------------------------------------------------------------------------
# 属性
# ---------------------------------------------------------------------------
def bm_layers(bm):
    L = {}
    for k, dom in ATTRS.items():
        lay = bm.loops.layers.float if dom == "CORNER" else bm.verts.layers.float
        it = lay.get(k)
        L[k] = it if it is not None else lay.new(k)
    return L


def attr_report(objs, tag=""):
    """属性の値域をログへ（ベイク前後の確認用）"""
    for o in objs:
        me = o.data
        msg = []
        for k in ATTRS:
            a = me.attributes.get(k)
            if a is None:
                msg.append(f"{k}=MISSING")
                continue
            vals = [d.value for d in a.data]
            if vals:
                msg.append(f"{k}[{a.domain}]={min(vals):.2f}..{max(vals):.2f}/avg{sum(vals) / len(vals):.2f}")
        C.log(f"attrs{tag} {o.name}: " + " ".join(msg) + f" all={[x.name for x in me.attributes if not x.name.startswith('.')]}")


def set_face_corner(faces, layer, value):
    for f in faces:
        for lp in f.loops:
            lp[layer] = value


def ensure_attrs(ob):
    me = ob.data
    for k, dom in ATTRS.items():
        if me.attributes.get(k) is None:
            me.attributes.new(k, "FLOAT", dom)
    return ob


def attr(b, name):
    nd = b.n("ShaderNodeAttribute", attribute_name=name)
    return nd.outputs["Fac"]


# ---------------------------------------------------------------------------
# bmesh 操作
# ---------------------------------------------------------------------------
def bm_cut(bm, co, no, keep="inner", fresh=1.0, glow=0.0, poke=0.0, glow_rim=None):
    """平面 (co, no) で切り、断面を塞ぐ。keep='inner' は no の反対側を残す。
    断面のコーナー属性 fresh/glow を設定。poke>0 なら断面中央を内側へ凹ませる"""
    L = bm_layers(bm)
    geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    res = bmesh.ops.bisect_plane(bm, geom=geom, dist=1e-6, plane_co=Vector(co), plane_no=Vector(no),
                                 clear_outer=(keep == "inner"), clear_inner=(keep != "inner"))
    edges = [e for e in res["geom_cut"] if isinstance(e, bmesh.types.BMEdge) and e.is_valid and e.is_boundary]
    faces = []
    if edges:
        faces = bmesh.ops.holes_fill(bm, edges=edges, sides=0)["faces"]
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    centers = set()
    if faces and poke > 0:
        r = bmesh.ops.poke(bm, faces=faces, offset=-poke, center_mode="MEAN_WEIGHTED")
        faces = r["faces"]
        centers = set(r["verts"])
    set_face_corner(faces, L["fresh"], fresh)
    set_face_corner(faces, L["glow"], glow)
    if glow_rim is not None and centers:  # 断面の奥（中央）ほど光り、縁は暗い
        for f in faces:
            for lp in f.loops:
                lp[L["glow"]] = glow if lp.vert in centers else glow_rim
    return faces


def bm_ground(bm, z0=0.0, dissolve=True):
    """z0 より下の頂点を z0 に押し上げ、底面を1枚にまとめる（地面に接する平らな底）"""
    for v in bm.verts:
        if v.co.z < z0:
            v.co.z = z0
    if dissolve:
        bot = [f for f in bm.faces if all(v.co.z <= z0 + 1e-5 for v in f.verts)]
        if len(bot) > 1:
            try:
                bmesh.ops.dissolve_faces(bm, faces=bot, use_verts=False)
            except Exception as e:  # noqa
                C.log(f"dissolve bottom skipped: {e}")
    return bm


def bm_vnoise(bm, amp, freq, seed=0, z0=None, fade=0.05):
    """ワールド座標のベクトルノイズで頂点をずらす（同じ場→割った2片の断面が一致する）"""
    off = Vector((seed * 3.7, seed * 1.9, seed * 6.1))
    for v in bm.verts:
        p = v.co
        w = 1.0
        if z0 is not None:
            w = max(0.0, min(1.0, (p.z - z0) / fade))
        d = Vector((noise.noise(p * freq + off), noise.noise(p * freq + off + Vector((17.3, 0, 0))),
                    noise.noise(p * freq + off + Vector((0, 29.1, 0)))))
        v.co = p + d * amp * w
    return bm


def bm_refine_near(bm, dist_fn, thresholds):
    """dist_fn(co) が小さい所の辺だけ細分（溝など細部が要る所にだけ頂点を足す）"""
    for th in thresholds:
        edges = [e for e in bm.edges if dist_fn((e.verts[0].co + e.verts[1].co) * 0.5) < th]
        if edges:
            bmesh.ops.subdivide_edges(bm, edges=edges, cuts=1, use_grid_fill=True)
        bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 3])
    return bm


def polyline_nearest(pts, q):
    """2D 折れ線 pts への最近点: (距離, 媒介変数 t∈[0,1], 符号つき横方向)"""
    best = (1e9, 0.0, 0.0)
    total = sum((pts[i + 1] - pts[i]).length for i in range(len(pts) - 1))
    acc = 0.0
    for i in range(len(pts) - 1):
        a, b = pts[i], pts[i + 1]
        ab = b - a
        L = ab.length
        u = max(0.0, min(1.0, (q - a).dot(ab) / max(L * L, 1e-9)))
        c = a + ab * u
        d = (q - c).length
        if d < best[0]:
            side = ab.x * (q - a).y - ab.y * (q - a).x
            best = (d, (acc + L * u) / total, 1.0 if side >= 0 else -1.0)
        acc += L
    return best


def bm_transform(bm, M):
    bmesh.ops.transform(bm, matrix=M, verts=bm.verts[:])
    return bm


def mesh_ground(ob, z0=0.0):
    for v in ob.data.vertices:
        if v.co.z < z0:
            v.co.z = z0
    return ob


def sharp_by_angle(ob, deg=38):
    me = ob.data
    for p in me.polygons:
        p.use_smooth = True
    try:
        me.set_sharp_from_angle(angle=math.radians(deg))
    except Exception as e:  # noqa
        C.log(f"set_sharp_from_angle unavailable: {e}")
    return ob


def rot_about_line(point, axis, ang):
    p = Vector(point)
    return Matrix.Translation(p) @ Matrix.Rotation(ang, 4, Vector(axis).normalized()) @ Matrix.Translation(-p)


def recenter(parts):
    """全部品の外接箱の XY 中心と最下点を原点へ（オブジェクト座標の材質マスクを最終座標と一致させる）"""
    pts = []
    for o in parts:
        pts += [o.matrix_world @ v.co for v in o.data.vertices]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    off = Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z))
    for o in parts:
        o.data.transform(o.matrix_world)
        o.matrix_world = Matrix.Identity(4)
        o.data.transform(Matrix.Translation(-off))
    C.log(f"recenter offset={tuple(round(x, 4) for x in off)} size={tuple(round(x, 3) for x in (mx - mn))}")
    return off


# ---------------------------------------------------------------------------
# 形状：玄武岩の塊
# ---------------------------------------------------------------------------
def basalt_bm(radii, center=(0, 0, 0), seed=0, subdiv=4, lumpy=0.12, facets=8, facet_depth=(0.62, 0.9),
              fresh_ratio=0.35, up_bias=0.3, fine=(0.012, 7.0), ground=0.0, extra_planes=(), hook=None, notches=0, notch_depth=(0.72, 0.9)):
    """角ばった玄武岩: 楕円体＋低周波のこぶ＋平面の割れ面（facets）＋細かい凹凸＋平らな底。
    割れ面の一部は fresh（新しい断面）としてコーナー属性に記録"""
    rnd = random.Random(seed)
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=1.0)
    L = bm_layers(bm)
    rx, ry, rz = radii
    off = Vector((seed * 11.3, seed * 5.7, seed * 2.9))
    for v in bm.verts:
        d = v.co.normalized()
        n = noise.fractal(d * 1.7 + off, 0.55, 2.0, 4)
        s = 1.0 + lumpy * n
        v.co = Vector((d.x * rx, d.y * ry, d.z * rz)) * s
    planes = []
    for i in range(facets):
        d = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-0.25, 1.0) + up_bias)).normalized()
        sup = math.sqrt((d.x * rx) ** 2 + (d.y * ry) ** 2 + (d.z * rz) ** 2)
        planes.append((d, sup * rnd.uniform(*facet_depth), rnd.random() < fresh_ratio))
    for d, frac, fr in extra_planes:  # 指定の割れ面（d=方向, frac=支持距離に対する比）
        d = Vector(d).normalized()
        sup = math.sqrt((d.x * rx) ** 2 + (d.y * ry) ** 2 + (d.z * rz) ** 2)
        planes.append((d, sup * frac, fr))
    # 段差（欠けた角の塊）: 2つの平面の両方の外側だけを d 面へ押し込む → 平らな棚＋急な壁
    steps = []
    for i in range(notches):
        d = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(0.0, 1.2))).normalized()
        e = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-0.5, 0.5)))
        e = (e - d * e.dot(d)).normalized()
        sd = math.sqrt((d.x * rx) ** 2 + (d.y * ry) ** 2 + (d.z * rz) ** 2)
        se = math.sqrt((e.x * rx) ** 2 + (e.y * ry) ** 2 + (e.z * rz) ** 2)
        steps.append((d, sd * rnd.uniform(*notch_depth), e, se * rnd.uniform(-0.1, 0.45)))
    tag = {}
    for v in bm.verts:
        for k, (d, dist, _) in enumerate(planes):
            h = v.co.dot(d)
            if h > dist:
                v.co -= d * (h - dist)
                tag[v] = k
    for j, (d, dist, e, edist) in enumerate(steps):
        k = len(planes) + j
        for v in bm.verts:
            h = v.co.dot(d)
            if h > dist and v.co.dot(e) > edist:
                v.co -= d * (h - dist)
                tag[v] = k
    planes = planes + [(d, dist, True) for d, dist, e, edist in steps]
    for f in bm.faces:
        ks = {tag.get(v, -1) for v in f.verts}
        if len(ks) == 1:
            k = ks.pop()
            if k >= 0 and planes[k][2]:
                set_face_corner([f], L["fresh"], 1.0)
    bm_transform(bm, Matrix.Translation(Vector(center)))
    if hook is not None:
        hook(bm)
    if fine and fine[0] > 0:
        bm_vnoise(bm, fine[0], fine[1], seed=seed + 101, z0=ground, fade=0.06)
    if ground is not None:
        bm_ground(bm, ground)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return bm


def chip_rock(name, size, pos, seed, subdiv=2, squash=(1.0, 0.8, 0.6), rot_z=0.0, sink=0.25, fresh_ratio=0.6):
    """足元に転がる岩片（割れ面多め、底は地面に平らに接する）"""
    bm = basalt_bm((size * squash[0], size * squash[1], size * squash[2]), (0, 0, 0), seed=seed, subdiv=subdiv,
                   lumpy=0.18, facets=6, facet_depth=(0.5, 0.85), fresh_ratio=fresh_ratio, up_bias=0.0,
                   fine=(size * 0.04, 9.0 / size), ground=None)
    M = Matrix.Translation(Vector((pos[0], pos[1], size * squash[2] * (1 - 2 * sink)))) @ \
        Matrix.Rotation(rot_z, 4, "Z") @ Matrix.Rotation(seed * 0.7, 4, "X")
    bm_transform(bm, M)
    bm_ground(bm, 0.0)
    ob = C.obj_from_bm(bm, name)
    return sharp_by_angle(ob, 40)


# ---------------------------------------------------------------------------
# 形状：結晶
# ---------------------------------------------------------------------------
def crystal_bm(length, radius, seed, sides=6, taper=0.84, tip_frac=0.26, embed=0.08, broken=None, chips=0,
               bend=0.10):
    """六角柱＋不揃いな錐面の先端。原点＝岩から出る位置、+Z が成長方向、根元は embed だけ埋まる。
    broken=(高さ比, 傾き) で先端が折れた断面、chips 個の角の欠け（どちらも fresh）"""
    rnd = random.Random(seed)
    bm = bmesh.new()
    L = bm_layers(bm)
    angs = [2 * math.pi * i / sides + rnd.uniform(-0.2, 0.2) for i in range(sides)]
    rads = [radius * rnd.uniform(0.78, 1.18) for _ in range(sides)]
    shoulder = length * (1 - tip_frac * rnd.uniform(0.75, 1.25))
    zs = [-embed, shoulder * 0.45, shoulder]
    ss = [1.0, (1 + taper) / 2 + rnd.uniform(-0.03, 0.03), taper]
    drift = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), 0)).normalized() * radius * bend
    rings = []
    for k, (z, s) in enumerate(zip(zs, ss)):
        o = drift * (max(0.0, z) / length) ** 1.5 * 4
        rings.append([bm.verts.new((math.cos(a) * r * s + o.x, math.sin(a) * r * s + o.y, z)) for a, r in zip(angs, rads)])
    for k in range(len(rings) - 1):
        for i in range(sides):
            j = (i + 1) % sides
            bm.faces.new((rings[k][i], rings[k][j], rings[k + 1][j], rings[k + 1][i]))
    o = drift * 4
    apex = bm.verts.new((o.x + rnd.uniform(-0.35, 0.35) * radius, o.y + rnd.uniform(-0.35, 0.35) * radius, length))
    for i in range(sides):
        bm.faces.new((rings[-1][i], rings[-1][(i + 1) % sides], apex))
    bm.faces.new(list(reversed(rings[0])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    if broken:
        frac, tilt = broken
        nrm = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), 0)).normalized() * math.sin(tilt) + Vector((0, 0, math.cos(tilt)))
        bm_cut(bm, (o.x * frac, o.y * frac, length * frac), nrm, keep="inner", fresh=1.0)
    for c in range(chips):  # 角の欠け: 肩（柱面と錐面の境）の角を斜めに小さく落とす（柱面を縦に削がない）
        i = rnd.randrange(sides)
        ring = 2 if rnd.random() < 0.75 else 1
        vco = Vector((math.cos(angs[i]) * rads[i] * ss[ring], math.sin(angs[i]) * rads[i] * ss[ring], zs[ring])) + \
            drift * (max(0.0, zs[ring]) / length) ** 1.5 * 4
        hz = Vector((math.cos(angs[i]), math.sin(angs[i]), 0))
        nrm = (hz + Vector((0, 0, rnd.uniform(0.7, 1.4) * (1 if ring == 2 else rnd.choice((-1, 1)))))).normalized()
        p = vco - nrm * radius * rnd.uniform(0.15, 0.28)
        try:
            bm_cut(bm, p, nrm, keep="inner", fresh=1.0)
        except Exception as e:  # noqa
            C.log(f"chip skipped: {e}")
    top = max(v.co.z for v in bm.verts)
    for v in bm.verts:
        v[L["tip"]] = max(0.0, min(1.0, v.co.z / max(top, 1e-4)))
    return bm


def crystal(name, root, axis, length, radius, seed, spin=0.0, **kw):
    bm = crystal_bm(length, radius, seed, **kw)
    q = Vector(axis).normalized().to_track_quat("Z", "Y")
    M = Matrix.Translation(Vector(root)) @ q.to_matrix().to_4x4() @ Matrix.Rotation(spin, 4, "Z")
    bm_transform(bm, M)
    return C.obj_from_bm(bm, name, smooth=False)


# ---------------------------------------------------------------------------
# 材質
# ---------------------------------------------------------------------------
def warp(b, scale, amt, vec=None):
    """座標をノイズでゆがめる（ボロノイの割れ線を自然にする）"""
    col = b.noise(scale, 3, 0.5, vec=vec, out="Color")
    sub = b.n("ShaderNodeVectorMath", operation="SUBTRACT")
    b.link(col, sub.inputs[0])
    sub.inputs[1].default_value = (0.5, 0.5, 0.5)
    sc = b.n("ShaderNodeVectorMath", operation="SCALE")
    b.link(sub.outputs[0], sc.inputs[0])
    sc.inputs["Scale"].default_value = amt
    add = b.n("ShaderNodeVectorMath", operation="ADD")
    b.link(vec or b.coord(), add.inputs[0])
    b.link(sc.outputs[0], add.inputs[1])
    return add.outputs[0]


def ridge(b, scale, vec=None, detail=4):
    """1-|2n-1|: 曲がりくねった細い線（溶岩の筋・ひび）。1に近いほど線の中心"""
    n = b.noise(scale, detail, 0.5, vec=vec)
    return b.math("SUBTRACT", 1.0, b.math("ABSOLUTE", b.math("SUBTRACT", b.math("MULTIPLY", n, 2.0), 1.0)))


def bw(b, color):
    nd = b.n("ShaderNodeRGBToBW")
    b.link(color, nd.inputs[0])
    return nd.outputs[0]


# 2章の玄武岩 #1d1a19〜#2e2926（linear）
BASALT_DARK = (0.0122, 0.0103, 0.0097)
BASALT_LIGHT = (0.0273, 0.0222, 0.0194)
ASH = (0.082, 0.077, 0.070)


def basalt(name, tex_scale=1.5, glow_strength=6.0, hot=(1.0, 0.20, 0.04), hairline=1.0, ash_amt=1.0,
           tex_lo=0.03, tex_hi=0.40, nrm_strength=0.75, bump=0.6, prox_soot=0.0, heat_range=(0.82, 1.0), heat_amt=0.6):
    """玄武岩: rock_face_02（CC0）の明暗を 2章の色域へ写す＋気泡の穴＋新しい割れ面＋角の欠け＋
    割れ目の縁の煤と焼け＋上向き面・凹みの灰。発光は glow 面（割れ目の内側）と、
    割れ目の近く（cd）の細いひびの中だけ"""
    b = C.NB(name)
    diff = b.image(C.cc0("rock_face_02", "diff"), tex_scale)
    rgh = b.image(C.cc0("rock_face_02", "rough"), tex_scale)
    nrm = b.image(C.cc0("rock_face_02", "nor_gl"), tex_scale)
    n_big = b.noise(1.4, 6, 0.6)
    n_mid = b.noise(6.0, 6, 0.6)
    n_fine = b.noise(32.0, 4, 0.5)
    glow = attr(b, "glow")
    fresh = attr(b, "fresh")
    cd = attr(b, "cd")
    if diff is not None:
        lum = b._map(bw(b, diff), tex_lo, tex_hi)
    else:
        lum = n_mid
    t = b.math("ADD", b.math("MULTIPLY", lum, 0.7), b.math("MULTIPLY", n_big, 0.3))
    col = b.ramp(t, [(0.0, (0.0080, 0.0071, 0.0067)), (0.35, BASALT_DARK), (0.75, (0.020, 0.017, 0.0152)), (1.0, BASALT_LIGHT)])
    # 気泡（スコリア）の穴: まだらに分布
    ves = b.ramp(b.voronoi(48.0, "F1", "Distance"), [(0.0, 1.0), (0.10, 0.0)])
    ves = b.math("MULTIPLY", ves, b.ramp(n_mid, [(0.42, 0.0), (0.68, 1.0)]))
    col = b.mix(b.math("MULTIPLY", ves, 0.85), col, (0.004, 0.0036, 0.0034))
    # 新しい割れ面（少し灰色がかって明るい、灰がのらない）
    fcol = b.mix(n_fine, (0.0155, 0.0150, 0.0148), (0.023, 0.0222, 0.0218))
    col = b.mix(b.math("MULTIPLY", fresh, 0.85), col, fcol)
    # 角の欠け（新しい断面が角に出る）
    edge = b.math("MULTIPLY", b.edge_mask(0.018, 0.025, 0.2), b.ramp(n_fine, [(0.3, 0.25), (0.6, 1.0)]), clamp=True)
    col = b.mix(b.math("MULTIPLY", edge, 0.85), col, (0.031, 0.0285, 0.027))
    # 割れ目まわり: 広めの煤 → 縁のごく近くだけ赤茶に焼ける
    soot = b.math("MULTIPLY", b._map(cd, 0.35, 0.85), b.ramp(n_mid, [(0.2, 0.55), (0.7, 1.0)]))
    col = b.mix(b.math("MULTIPLY", soot, 0.7), col, (0.0055, 0.0048, 0.0045))
    if prox_soot > 0:  # tip 属性＝溝などへの近さ。まわりを煤で黒く
        ps = b.math("MULTIPLY", b.math("POWER", attr(b, "tip"), 1.5), b.ramp(n_mid, [(0.25, 0.45), (0.75, 1.0)]))
        col = b.mix(b.math("MULTIPLY", ps, prox_soot), col, (0.0050, 0.0044, 0.0042))
    heat = b.math("MULTIPLY", b._map(cd, *heat_range), b.ramp(n_fine, [(0.3, 0.4), (0.7, 1.0)]))
    col = b.mix(b.math("MULTIPLY", heat, heat_amt), col, (0.030, 0.009, 0.0045))
    # 灰: 上向き面と凹み（割れ面・熱い縁には積もらない）
    cav = b.math("SUBTRACT", 1.0, b.cavity(0.05))
    ashm = b.math("MAXIMUM", b.math("MULTIPLY", b.up_mask(0.62, 0.92), 0.65), b.math("MULTIPLY", cav, 0.85))
    ashm = b.math("MULTIPLY", ashm, b.ramp(n_mid, [(0.28, 0.0), (0.62, 1.0)]))
    ashm = b.math("MULTIPLY", ashm, b.math("SUBTRACT", 1.0, b.math("MULTIPLY", fresh, 0.85)))
    ashm = b.math("MULTIPLY", ashm, b.math("SUBTRACT", 1.0, b._map(cd, 0.6, 0.95)))
    ashm = b.math("MULTIPLY", ashm, ash_amt, clamp=True)
    col = b.mix(b.math("MULTIPLY", ashm, 0.8), col, ASH)
    # 割れ目の内側（glow 面）: 黒い殻＋溶けた筋
    crust = ridge(b, 7.0, vec=warp(b, 3.0, 0.15))
    veins = b.ramp(crust, [(0.0, 0.05), (0.80, 0.25), (0.93, 1.0)])
    veins = b.math("MULTIPLY", veins, b.ramp(glow, [(0.0, 0.0), (0.35, 0.3), (1.0, 1.0)]))
    col = b.mix(b.math("MINIMUM", b.math("MULTIPLY", glow, 4.0), 1.0), col, (0.010, 0.0055, 0.004))
    # 割れ目の縁から伸びる短い細いひび（発光）
    hv = ridge(b, 5.0, vec=warp(b, 2.0, 0.25))
    hl = b.ramp(hv, [(0.968, 0.0), (0.99, 1.0)])
    hair_m = b.math("MULTIPLY", hl, b._map(cd, 0.84, 0.985))
    hair_m = b.math("MULTIPLY", hair_m, b.ramp(n_big, [(0.4, 0.0), (0.6, 1.0)]))
    hair_m = b.math("MULTIPLY", hair_m, b.math("SUBTRACT", 1.0, glow))
    hair_m = b.math("MULTIPLY", hair_m, hairline, clamp=True)
    col = b.mix(hair_m, col, (0.006, 0.004, 0.0035))
    e = b.math("MAXIMUM", veins, b.math("MULTIPLY", hair_m, 0.75))
    emit = b.ramp(e, [(0.0, (0, 0, 0)), (0.2, (0.22, 0.02, 0.004)), (0.6, (hot[0] * 0.85, hot[1] * 0.55, hot[2] * 0.5)), (1.0, hot)])
    # 粗さ
    r = b.val(0.82)
    if rgh is not None:
        r = b.math("ADD", 0.62, b.math("MULTIPLY", rgh, 0.32))
    r = b.mixf(fresh, r, 0.62)
    r = b.mixf(ves, r, 0.92)
    r = b.mixf(ashm, r, 0.97)
    r = b.mixf(glow, r, 0.8)
    hgt = b.math("ADD", b.math("MULTIPLY", lum, 0.4), b.math("MULTIPLY", n_fine, 0.25))
    hgt = b.math("SUBTRACT", hgt, b.math("MULTIPLY", ves, 0.7))
    hgt = b.math("SUBTRACT", hgt, b.math("MULTIPLY", hair_m, 0.8))
    b.normal_from(nrm, nrm_strength, bump_height=hgt, bump_strength=bump, bump_dist=0.004)
    return b.out(col, r, 0.0, emit=emit, emit_strength=glow_strength)


def dragon_crystal(name, glow_strength=4.0, body_dark=(0.024, 0.0016, 0.0015), body_mid=(0.036, 0.0021, 0.0019),
                   body_hi=(0.052, 0.0030, 0.0026), inner=0.85, metallic=0.0, rough_lo=0.20, root_len=0.2):
    """炎竜鉱の結晶: 暗い赤の艶のある面＋角は欠けて明るく＋根元は煤と灰。
    発光は「内部」だけ: 根元ほど強く、面の中央で強く角で弱い（厚みの見え方）＋内部のひび＋包有物＋折れ口"""
    b = C.NB(name)
    tip = attr(b, "tip")
    fresh = attr(b, "fresh")
    n1 = b.noise(4.0, 6, 0.6)
    n2 = b.noise(16.0, 4, 0.5)
    edge = b.edge_mask(0.005, 0.02, 0.25)
    body = b.ramp(n1, [(0.2, body_dark), (0.55, body_mid), (0.9, body_hi)])
    col = b.mix(b.math("MULTIPLY", edge, 0.55), body, (0.060, 0.016, 0.013))
    col = b.mix(b.math("MULTIPLY", fresh, 0.6), col, (0.075, 0.020, 0.016))  # 新しい欠け口は白っぽく曇る
    root = b._map(tip, 0.0, 0.16, 1.0, 0.0)
    col = b.mix(b.math("MULTIPLY", root, 0.75), col, (0.010, 0.0065, 0.006))
    ashm = b.math("MULTIPLY", b.up_mask(0.55, 0.95), b.ramp(n1, [(0.4, 0.0), (0.75, 1.0)]))
    ashm = b.math("MULTIPLY", ashm, b.math("ADD", 0.25, b.math("MULTIPLY", root, 0.75)))
    ashm = b.math("MULTIPLY", ashm, b.math("SUBTRACT", 1.0, fresh))
    col = b.mix(b.math("MULTIPLY", ashm, 0.65), col, ASH)
    # 粗さ: 面は艶、角の欠け・灰・根元は粗い
    r = b.mixf(n2, rough_lo, rough_lo + 0.10)
    r = b.mixf(edge, r, 0.5)
    r = b.mixf(fresh, r, 0.28)
    r = b.mixf(root, r, 0.7)
    r = b.mixf(ashm, r, 0.92)
    # 発光（内部）: 根元（tip<0.2）と内部のひび線だけ。結晶表面の大部分は発光ゼロ
    body_e = b.math("POWER", b._map(tip, 0.0, root_len, 1.0, 0.0), 1.6)
    body_e = b.math("MULTIPLY", body_e, b.math("SUBTRACT", 1.0, b.math("MULTIPLY", edge, 0.9)))
    body_e = b.math("MULTIPLY", body_e, b.ramp(n1, [(0.3, 0.45), (0.7, 1.0)]))
    body_e = b.math("MULTIPLY", body_e, inner)
    cr = b.ramp(b.voronoi(6.5, "DISTANCE_TO_EDGE", vec=warp(b, 3.0, 0.2)), [(0.0, 1.0), (0.010, 0.0)])
    cr = b.math("MULTIPLY", cr, b.ramp(b.noise(2.2, 3, 0.5), [(0.5, 0.0), (0.64, 1.0)]))
    cr = b.math("MULTIPLY", cr, b.math("SUBTRACT", 1.0, edge))
    cr = b.math("MULTIPLY", cr, b._map(tip, 0.15, 0.85, 1.0, 0.25))
    e = b.math("MAXIMUM", body_e, b.math("MULTIPLY", cr, 0.8))
    e = b.math("MULTIPLY", e, b.math("SUBTRACT", 1.0, b.math("MULTIPLY", ashm, 0.8)))
    # 内部の発光色 #ff3b1f（linear 1.0,0.044,0.014）を中心に
    emit = b.ramp(e, [(0.0, (0, 0, 0)), (0.25, (0.26, 0.006, 0.003)), (0.65, (0.72, 0.024, 0.008)), (1.0, (1.0, 0.065, 0.02))])
    # 反射を暗い赤に寄せる（白っぽいハイライトでピンクに見えるのを防ぐ）
    metal = b.mixf(b.math("MAXIMUM", ashm, root), metallic, 0.0)
    # 柱面の横すじ（成長条線）: 反射を帯状に割り、面全体が一様に光るのを防ぐ
    stri = b.math("SINE", b.math("ADD", b.math("MULTIPLY", tip, 70.0), b.math("MULTIPLY", n1, 6.0)))
    hgt = b.math("ADD", b.math("MULTIPLY", n2, 0.3), b.math("MULTIPLY", cr, -0.4))
    hgt = b.math("ADD", hgt, b.math("MULTIPLY", stri, 0.25))
    b.normal_from(None, bump_height=hgt, bump_strength=0.3, bump_dist=0.002)
    return b.out(col, r, metal, emit=emit, emit_strength=glow_strength)


# ---------------------------------------------------------------------------
# 形状：竜の鱗（抜け落ちた1枚）
# ---------------------------------------------------------------------------
def scale_plate_bm(length, seed, width=0.78, ns=28, nr=6, thick=0.022, edge=0.004, keel=0.010, cup=0.035,
                   notches=2, chord=None, root_tear=0.07):
    """涙形の盾のような鱗。局所座標: +Y が先端、原点が外形の中心付近、+Z が表。
    notches 個の縁の欠け、chord=(角度, 比) で縁が直線に割れ落ちる。根元は裂けて不揃い。
    tip 属性=中心からの比 ρ（成長線用）、cd=横方向の位置（0..1、条線用）、欠けの縁は fresh"""
    rnd = random.Random(seed)
    R0 = length * 0.40
    nts = [(rnd.uniform(-2.6, 2.6), rnd.uniform(0.10, 0.2), rnd.uniform(0.10, 0.22)) for _ in range(notches)]
    off = rnd.uniform(0, 50)

    def outline(th):
        t = math.atan2(math.sin(th), math.cos(th))
        r = R0 * (1 + 0.75 * math.exp(-(t / 0.5) ** 2))
        rootw = max(0.0, -math.cos(th)) ** 2
        r *= 1 + root_tear * noise.noise(Vector((th * 3.0 + off, 0.3, 0.7))) * rootw * 2.0
        fr = 0.0
        for c, dep, w in nts:
            dd = math.atan2(math.sin(th - c), math.cos(th - c))
            k = math.exp(-(dd / w) ** 2)
            r *= 1 - dep * k
            fr = max(fr, k)
        if chord:
            ca, cr = chord
            dd = math.cos(th - ca)
            lim = R0 * cr / max(dd, 1e-3) if dd > 0 else 1e9
            if r > lim:
                r = lim
                fr = 1.0
        return r, fr

    bm = bmesh.new()
    L = bm_layers(bm)
    ths = [2 * math.pi * i / ns + math.pi / 2 for i in range(ns)]  # i=0 が先端(+Y)
    outl = [outline(th - math.pi / 2) for th in ths]

    def ztop(x, y, rho):
        z = thick * 0.5 * (1 - rho ** 2) ** 0.7
        z += keel * math.exp(-(x / (R0 * 0.16)) ** 2) * (1 - rho * 0.6) * (1 if y > -R0 * 0.3 else 0.6)
        z += cup * rho ** 2
        return z

    def thk(rho):
        return thick * (1 - rho ** 1.6) + edge

    top_rings, bot_rings = [], []
    ct = bm.verts.new((0, 0, ztop(0, 0, 0)))
    cb = bm.verts.new((0, 0, ztop(0, 0, 0) - thk(0)))
    for j in range(1, nr + 1):
        rho = j / nr
        tr, br = [], []
        for th, (r, _) in zip(ths, outl):
            x, y = math.cos(th) * r * rho * width, math.sin(th) * r * rho
            zt = ztop(x, y, rho) + 0.0015 * noise.noise(Vector((x * 30 + off, y * 30, 0)))
            tr.append(bm.verts.new((x, y, zt)))
            br.append(bm.verts.new((x, y, zt - thk(rho))))
        top_rings.append(tr)
        bot_rings.append(br)
    for i in range(ns):
        k = (i + 1) % ns
        bm.faces.new((ct, top_rings[0][i], top_rings[0][k]))
        bm.faces.new((cb, bot_rings[0][k], bot_rings[0][i]))
        for j in range(nr - 1):
            bm.faces.new((top_rings[j][i], top_rings[j + 1][i], top_rings[j + 1][k], top_rings[j][k]))
            bm.faces.new((bot_rings[j][k], bot_rings[j + 1][k], bot_rings[j + 1][i], bot_rings[j][i]))
        f = bm.faces.new((top_rings[-1][i], bot_rings[-1][i], bot_rings[-1][k], top_rings[-1][k]))
        frv = max(outl[i][1], outl[k][1])
        if frv > 0.35:
            set_face_corner([f], L["fresh"], min(1.0, frv))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    wmax = max(abs(v.co.x) for v in bm.verts) or 1.0
    for v in bm.verts:
        rho = Vector((v.co.x / width, v.co.y)).length / (R0 * 1.75)
        v[L["tip"]] = min(1.0, rho)
        v[L["cd"]] = 0.5 + 0.5 * v.co.x / wmax
    return bm


def dragon_scale_mat(name, glow_strength=0.0):
    """竜の鱗: 黒い鈍い艶（玄武岩より少しだけ冷たい黒）＋同心の成長線＋縦の条線＋細かい引っかき傷＋
    縁の摩耗と欠けた断面（層状の暗い赤茶）＋成長線の溝と上向き面に灰"""
    b = C.NB(name)
    tip = attr(b, "tip")
    lat = attr(b, "cd")
    fresh = attr(b, "fresh")
    n_big = b.noise(3.0, 6, 0.6)
    n_fine = b.noise(40.0, 4, 0.5)
    growth = b.math("SINE", b.math("ADD", b.math("MULTIPLY", tip, 46.0), b.math("MULTIPLY", n_big, 3.0)))
    gr = b._map(growth, 0.55, 1.0)
    stria = b._map(b.math("SINE", b.math("ADD", b.math("MULTIPLY", lat, 120.0), b.math("MULTIPLY", n_big, 4.0))), 0.7, 1.0)
    col = b.ramp(n_big, [(0.2, (0.0095, 0.0090, 0.0092)), (0.6, (0.016, 0.0145, 0.0142)), (0.95, (0.024, 0.021, 0.020))])
    col = b.mix(b.math("MULTIPLY", gr, 0.5), col, (0.026, 0.016, 0.012))  # 成長線の山は少し赤茶
    # 細かい引っかき傷（2方向の細い線）
    scr = None
    for k, (sx, sy) in enumerate(((18.0, 0.6), (0.7, 22.0))):
        mp = b.n("ShaderNodeMapping")
        mp.inputs["Scale"].default_value = (sx, sy, 3.0)
        mp.inputs["Rotation"].default_value = (0.0, 0.0, 0.5 + k * 0.9)
        b.link(b.coord(), mp.inputs["Vector"])
        line = b.ramp(ridge(b, 6.0, vec=mp.outputs[0], detail=2), [(0.975, 0.0), (0.995, 1.0)])
        line = b.math("MULTIPLY", line, b.ramp(b.noise(5.0 + k, 3, 0.5), [(0.45, 0.0), (0.6, 1.0)]))
        scr = line if scr is None else b.math("MAXIMUM", scr, line)
    col = b.mix(b.math("MULTIPLY", scr, 0.8), col, (0.055, 0.050, 0.047))
    edge = b.math("MULTIPLY", b.edge_mask(0.004, 0.03, 0.25), b.ramp(n_fine, [(0.3, 0.3), (0.65, 1.0)]), clamp=True)
    col = b.mix(b.math("MULTIPLY", edge, 0.7), col, (0.050, 0.044, 0.040))
    fcol = b.mix(b._map(b.math("SINE", b.math("MULTIPLY", tip, 160.0)), -1.0, 1.0), (0.020, 0.010, 0.008), (0.040, 0.022, 0.016))
    col = b.mix(b.math("MULTIPLY", fresh, 0.9), col, fcol)
    cav = b.math("SUBTRACT", 1.0, b.cavity(0.012))
    ashm = b.math("MAXIMUM", b.math("MULTIPLY", b.up_mask(0.75, 0.97), 0.35), b.math("MULTIPLY", cav, 0.9))
    ashm = b.math("MAXIMUM", ashm, b.math("MULTIPLY", b.math("SUBTRACT", 1.0, gr), b.math("MULTIPLY", b.up_mask(0.5, 0.9), 0.3)))
    ashm = b.math("MULTIPLY", ashm, b.ramp(b.noise(9.0, 5, 0.6), [(0.35, 0.0), (0.7, 1.0)]))
    col = b.mix(b.math("MULTIPLY", ashm, 0.75), col, ASH)
    r = b.mixf(n_big, 0.36, 0.5)
    r = b.mixf(scr, r, 0.62)
    r = b.mixf(edge, r, 0.55)
    r = b.mixf(fresh, r, 0.8)
    r = b.mixf(ashm, r, 0.95)
    hgt = b.math("ADD", b.math("MULTIPLY", gr, 0.5), b.math("MULTIPLY", stria, 0.15))
    hgt = b.math("SUBTRACT", hgt, b.math("MULTIPLY", scr, 0.6))
    hgt = b.math("ADD", hgt, b.math("MULTIPLY", n_fine, 0.1))
    b.normal_from(None, bump_height=hgt, bump_strength=0.35, bump_dist=0.0015)
    return b.out(col, r, 0.0)
