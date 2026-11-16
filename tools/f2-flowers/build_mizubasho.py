import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import common as C
"""
氷水芭蕉 f2_ice_mizubasho — 第2層「凍った水源」の花アセット（試作・NOT_APPROVED）

実物の基準: ミズバショウ（Lysichiton camtschatcensis）
- 仏炎苞 3（大中小）: 下部は筒状に巻いて肉穂を包み、上部はスプーン形に開いて先端が尖る。縁は外へ反る
- 肉穂花序: 円柱、表面に六角の小花（実メッシュ）
- 葉: 櫂形 3 枚 + 若い巻き葉 1 枚。太い中央脈と側脈の凹凸、溝のある葉柄
- 足元: 泥の上に張った薄氷の円盤、割れ目、閉じ込められた枯れ草、茎の付け根の氷の縁
画像テクスチャは使わず、材質色と頂点色（"Col"）だけで表現する。
"""
import math
import random

import bmesh
import bpy
from mathutils import Matrix, Vector

C.reset(seed=11)
Z = Vector((0, 0, 1))


# ---------------------------------------------------------------------------
# 小道具
# ---------------------------------------------------------------------------
def lin(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def mix(a, b, t):
    t = max(0.0, min(1.0, t))
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


def sstep(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def make_mesh(name, verts, faces, cols=None, smooth=True, recalc=False):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    me.update()
    if recalc:
        bm = bmesh.new()
        bm.from_mesh(me)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(me)
        bm.free()
    me.polygons.foreach_set("use_smooth", [smooth] * len(me.polygons))
    if cols is not None:
        attr = me.color_attributes.new("Col", "BYTE_COLOR", "CORNER")
        for li, lp in enumerate(me.loops):
            c = cols[lp.vertex_index]
            attr.data[li].color = (c[0], c[1], c[2], 1.0)
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def solidify(ob, t, offset=0.0):
    m = ob.modifiers.new("thick", "SOLIDIFY")
    m.thickness = t
    m.offset = offset
    m.use_rim = True
    C.apply_mods(ob)
    return ob


def grid_faces(nu, nv, base=0):
    f = []
    for i in range(nu):
        for j in range(nv):
            a = base + i * (nv + 1) + j
            f.append((a, a + 1, a + nv + 2, a + nv + 1))
    return f


def bezier(p0, p1, p2, p3, n):
    p0, p1, p2, p3 = map(Vector, (p0, p1, p2, p3))
    return [(1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t * t * p2 + t ** 3 * p3
            for t in (i / n for i in range(n + 1))]


def resample(pts, n):
    """折れ線を弧長で等間隔に n+1 点へ"""
    acc = [0.0]
    for a, b in zip(pts, pts[1:]):
        acc.append(acc[-1] + (b - a).length)
    total = acc[-1]
    out, k = [], 0
    for i in range(n + 1):
        d = total * i / n
        while k < len(acc) - 2 and acc[k + 1] < d:
            k += 1
        seg = acc[k + 1] - acc[k]
        t = 0 if seg < 1e-9 else (d - acc[k]) / seg
        out.append(pts[k].lerp(pts[k + 1], min(1.0, t)))
    return out


def sweep(name, pts, rfn, sides=8, normals=None, section=None, cols_fn=None, caps=True):
    """点列に沿った管。normals[k] を断面の a=0 方向（溝の向き）の参照にできる"""
    pts = [Vector(p) for p in pts]
    n = len(pts)
    verts, cols = [], []
    prevN = None
    for k, p in enumerate(pts):
        T = (pts[min(k + 1, n - 1)] - pts[max(k - 1, 0)]).normalized()
        if normals is not None:
            ref = Vector(normals[k])
        elif prevN is None:
            ref = Vector((0, 0, 1)) if abs(T.z) < 0.9 else Vector((1, 0, 0))
        else:
            ref = prevN
        Nv = (ref - T * ref.dot(T)).normalized()
        prevN = Nv
        Bv = T.cross(Nv)
        t = k / (n - 1)
        r = rfn(t)
        for s in range(sides):
            a = 2 * math.pi * s / sides
            rr = r * (section(t, a) if section else 1.0)
            verts.append(p + (Nv * math.cos(a) + Bv * math.sin(a)) * rr)
            if cols_fn:
                cols.append(cols_fn(t, a))
    faces = []
    for k in range(n - 1):
        for s in range(sides):
            faces.append((k * sides + s, k * sides + (s + 1) % sides,
                          (k + 1) * sides + (s + 1) % sides, (k + 1) * sides + s))
    if caps:
        faces.append(tuple(reversed(range(sides))))
        faces.append(tuple(range((n - 1) * sides, n * sides)))
    return make_mesh(name, verts, faces, cols if cols_fn else None, recalc=True)


def frost_mesh(name, items, size, seed, mat):
    """items=[(位置, 外向き法線)] に小さな四角錐の氷晶を並べる"""
    rnd = random.Random(seed)
    verts, faces = [], []
    for p, nrm in items:
        j = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-0.3, 1)))
        d = (nrm.normalized() + j * 0.55).normalized()
        L = size * rnd.uniform(0.55, 1.5)
        r = L * rnd.uniform(0.2, 0.32)
        q = d.to_track_quat("Z", "Y").to_matrix()
        b = len(verts)
        verts += [p + q @ Vector((0, 0, L)), p + q @ Vector((0, 0, -L * 0.2))]
        a0 = rnd.random() * 6.28
        for s in range(4):
            a = a0 + s * math.pi / 2
            verts.append(p + q @ Vector((math.cos(a) * r, math.sin(a) * r, L * 0.22)))
        for s in range(4):
            faces += [(b + 2 + s, b + 2 + (s + 1) % 4, b), (b + 2 + (s + 1) % 4, b + 2 + s, b + 1)]
    ob = make_mesh(name, verts, faces, smooth=False, recalc=True)
    return C.assign(ob, mat)


def xf(M, v):
    return M @ Vector(v)


# ---------------------------------------------------------------------------
# 材質
# ---------------------------------------------------------------------------
def node(m):
    return m.node_tree.nodes["Principled BSDF"]


M_SPATHE = C.mat_petal("mz_spathe", lin("F4F6F1"), rough=0.36, sss=0.45,
                       sss_radius=(1.0, 0.92, 0.78), sheen=0.25, vcol=True)
C._set(node(M_SPATHE), "Subsurface Scale", 0.006)
C._set(node(M_SPATHE), "Coat Weight", 0.18)
C._set(node(M_SPATHE), "Coat Roughness", 0.3)

M_SPADIX = C.mat_petal("mz_spadix", lin("D8C24A"), rough=0.6, sss=0.12, sheen=0.15, vcol=True)
C._set(node(M_SPADIX), "Emission Color", (*lin("FFD65A"), 1))
C._set(node(M_SPADIX), "Emission Strength", 0.25)

M_LEAF = C.mat_leaf("mz_leaf", lin("4E7F3A"), rough=0.42, sss=0.15, coat=0.3, vcol=True)
M_ICE = C.mat_ice("mz_ice", lin("BFDDEB"), rough=0.07, trans=0.85)
M_ICE_RIM = C.mat_ice("mz_ice_rim", lin("D9ECF4"), rough=0.22, trans=0.55)
M_FROST = C.mat_ice("mz_frost", lin("EAF6FF"), rough=0.12, trans=0.45)
M_CRACK = C.mat_basic("mz_ice_crack", lin("D6E6F0"), rough=0.5)
M_MUD = C.mat_basic("mz_mud", lin("2E2820"), rough=0.32)
C._use_vcol(M_MUD, node(M_MUD))
M_GRASS = C.mat_basic("mz_dead_grass", lin("8E7A52"), rough=0.75)
C._use_vcol(M_GRASS, node(M_GRASS))

objs = []
frost_items = []
collars = []   # (地面の点, 茎の半径) → 付け根の氷の縁


# ---------------------------------------------------------------------------
# 巻いたシート（仏炎苞・若い巻き葉の共通形）
#   局所座標: 原点=基部の背、+Z=上、-Y=開口（前）、断面は水平の円弧
#   a∈[-1,1] の円弧角 = a*phi(s)。phi>π で巻き重なり、spiral で外側の縁が外に来る
# ---------------------------------------------------------------------------
def rolled_sheet(res_u, res_v, phi_fn, R_fn, spine_fn, spiral_fn, recurve_fn, col_fn):
    verts, cols, edge = [], [], []
    for i in range(res_u + 1):
        s = i / res_u
        phi = phi_fn(s)
        R = max(R_fn(s), 2.5e-4)
        sp = spine_fn(s)
        center = sp + Vector((0, -R, 0))
        sw = spiral_fn(s)
        for j in range(res_v + 1):
            a = -1 + 2 * j / res_v
            t = a * phi
            Reff = R * (1 + sw * (a + 1) * 0.5)
            d = Vector((math.sin(t), math.cos(t), 0))
            p = center + d * (Reff + recurve_fn(s, a))
            verts.append(p)
            cols.append(col_fn(s, a))
            if j in (0, res_v):
                edge.append((s, p.copy(), d.copy()))
    return verts, cols, grid_faces(res_u, res_v), edge


# ---------------------------------------------------------------------------
# 仏炎苞 + 肉穂 + 花茎
# ---------------------------------------------------------------------------
SP_WHITE = lin("EEF2EA")
SP_GREEN = lin("C2D8AC")
SP_GREEN_DEEP = lin("9DBB7E")


def build_spathe(tag, L, wmax, rs, Ls, base, yaw, lean, roll, ground, seed):
    rnd = random.Random(seed)
    fh = 0.0011 * (L / 0.16) ** 0.5           # 小花の高さ
    thick = 0.0016 * (L / 0.16)
    R0 = rs + fh + thick * 0.5 + 0.0012       # 筒部の半径（肉穂との隙間を確保）
    asym = rnd.uniform(-1, 1)

    def phi_fn(s):
        return math.pi * (1.08 - 0.33 * sstep(0.05, 0.22, s) - 0.2 * sstep(0.22, 0.55, s) - 0.17 * sstep(0.62, 1.0, s))

    def blade_w(s):
        if s < 0.6:
            f = sstep(0.0, 0.58, s) ** 0.6
        else:
            t = (s - 0.6) / 0.4
            f = (1 - t) * (1 + 1.25 * t) / (1 + 0.0) * (1 - 0.18 * t * t)
        return wmax * 0.5 * 1.25 * f

    def w_fn(s):
        wt = phi_fn(s) * R0 * (1 + 0.1 * s / 0.2)
        return max(5e-4, wt + (blade_w(s) - wt) * sstep(0.04, 0.3, s))

    def R_fn(s):
        return w_fn(s) / phi_fn(s)

    def spine_fn(s):
        y = L * (0.25 * s * s - 1.3 * max(0.0, s - 0.62) ** 2)
        x = L * 0.035 * asym * math.sin(math.pi * s) * s
        return Vector((x, y, s * L))

    def spiral_fn(s):
        return 0.16 * (1 - sstep(0.04, 0.2, s))

    def recurve_fn(s, a):
        e = max(0.0, (abs(a) - 0.7) / 0.3) ** 2
        return e * L * 0.04 * sstep(0.3, 0.55, s) * (1 - 0.6 * sstep(0.8, 1.0, s))

    def col_fn(s, a):
        g = 1 - sstep(0.02, 0.26, s)
        c = mix(SP_WHITE, SP_GREEN, g)
        keel = max(0.0, 1 - abs(a) / 0.2) * (1 - sstep(0.05, 0.45, s)) * 0.5
        c = mix(c, SP_GREEN_DEEP, keel + (1 - sstep(0.0, 0.08, s)) * 0.5)
        return c

    M = (Matrix.Translation(Vector(base)) @ Matrix.Rotation(math.radians(yaw), 4, "Z")
         @ Matrix.Rotation(math.radians(lean), 4, "X") @ Matrix.Rotation(math.radians(roll), 4, "Y"))

    verts, cols, faces, edge = rolled_sheet(24, 20, phi_fn, R_fn, spine_fn, spiral_fn, recurve_fn, col_fn)
    verts = [M @ v for v in verts]
    ob = make_mesh(f"spathe_{tag}", verts, faces, cols)
    solidify(ob, thick)
    C.assign(ob, M_SPATHE)
    objs.append(ob)
    R3 = M.to_3x3()
    for s, p, d in edge:
        if 0.5 < s < 0.95 and rnd.random() < 0.22:
            frost_items.append((M @ p, R3 @ (d + Vector((0, 0, 0.4)))))

    # --- 肉穂花序（芯 + 六角の小花） ---
    ax = Vector((0, -R0, 0))                      # 筒の中心軸
    z0, z1 = 0.006 * (L / 0.16), 0.07 * L + Ls    # 芯の下端・上端
    r0 = rs - fh * 0.45                           # 芯の半径
    dome = r0 * 0.95
    zc = z1 - dome

    def core_r(z):
        if z > zc:
            q = (z - zc) / dome
            return r0 * math.sqrt(max(0.0, 1 - q * q))
        return r0 * (0.55 + 0.45 * sstep(z0, z0 + 0.25 * Ls, z))

    prof = [z0 + (zc - z0) * k / 8 for k in range(9)] + [zc + dome * math.sin(math.pi / 2 * k / 5) for k in range(1, 6)]
    sides = 14
    cverts, ccols = [], []
    CORE = lin("7E7D33")
    for z in prof:
        r = core_r(z)
        for s in range(sides):
            a = 2 * math.pi * s / sides
            cverts.append(M @ (ax + Vector((math.cos(a) * r, math.sin(a) * r, z))))
            ccols.append(CORE)
    cf = []
    for k in range(len(prof) - 1):
        for s in range(sides):
            cf.append((k * sides + s, k * sides + (s + 1) % sides, (k + 1) * sides + (s + 1) % sides, (k + 1) * sides + s))
    cf.append(tuple(reversed(range(sides))))
    # 小花
    pitch = 0.0034 * (rs / 0.0068) ** 0.6
    fr = pitch * 0.5
    YEL_TOP = lin("E6CC4C")
    YEL = lin("D8C24A")
    YGRN = lin("B9B347")
    GAP = lin("8F9038")
    places = []
    zstart = 0.085 * L
    dz = pitch * 0.866
    k = 0
    z = zstart
    while z < zc:
        n = max(6, round(2 * math.pi * r0 / pitch))
        for i in range(n):
            a = 2 * math.pi * (i + 0.5 * (k % 2)) / n + rnd.uniform(-0.05, 0.05)
            rad = Vector((math.cos(a), math.sin(a), 0))
            places.append((ax + rad * r0 + Vector((0, 0, z)), rad, (z - zstart) / (zc - zstart)))
        z += dz
        k += 1
    beta = 0.0
    while True:
        beta += pitch / dome
        if beta > math.pi / 2 - 0.15:
            break
        rr = dome * math.cos(beta)
        n = max(1, round(2 * math.pi * rr / pitch))
        for i in range(n):
            a = 2 * math.pi * (i + 0.5 * (k % 2)) / n
            rad = Vector((math.cos(a), math.sin(a), 0))
            nrm = rad * math.cos(beta) + Z * math.sin(beta)
            places.append((ax + Vector((0, 0, zc)) + nrm * dome, nrm, 1.0))
        k += 1
    places.append((ax + Vector((0, 0, z1)), Z.copy(), 1.0))
    for c, nrm, tz in places:
        nrm = nrm.normalized()
        tq = nrm.to_track_quat("Z", "Y").to_matrix()
        b = len(cverts)
        h = fh * rnd.uniform(0.8, 1.15)
        rot = rnd.random() * math.pi / 3
        top_col = mix(YGRN, YEL_TOP, 0.35 + 0.65 * tz)
        for ring, (rad_f, hh) in enumerate(((fr * 0.98, -h * 0.5), (fr * 0.74, h))):
            for s in range(6):
                a = rot + math.pi / 3 * s
                cverts.append(M @ (c + tq @ Vector((math.cos(a) * rad_f, math.sin(a) * rad_f, hh))))
                ccols.append(GAP if ring == 0 else mix(top_col, YEL, 0.3))
        cverts.append(M @ (c + tq @ Vector((0, 0, h * 1.45))))
        ccols.append(top_col)
        for s in range(6):
            cf.append((b + s, b + (s + 1) % 6, b + 6 + (s + 1) % 6, b + 6 + s))
            cf.append((b + 6 + s, b + 6 + (s + 1) % 6, b + 12))
    sp = make_mesh(f"spadix_{tag}", cverts, cf, ccols, recalc=False)
    bm = bmesh.new()
    bm.from_mesh(sp.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(sp.data)
    bm.free()
    C.assign(sp, M_SPADIX)
    objs.append(sp)

    # --- 花茎（地面から苞の筒の中まで） ---
    top = M @ (ax + Vector((0, 0, 0.012)))
    bot = M @ (ax + Vector((0, 0, -0.004)))
    up = (top - bot).normalized()
    g = Vector((bot.x * 0.85, bot.y * 0.85, GZ))
    h = (bot - g).length
    collars.append((g, R0 * 1.1))
    pts = bezier(g, g + Z * h * 0.45, bot - up * h * 0.35, bot, 10) + [top]
    STALK_LO = lin("C9D3A6")
    STALK = lin("8DAE5A")
    st = sweep(f"stalk_{tag}", pts, lambda t: R0 * (1.08 - 0.16 * t), sides=10,
               cols_fn=lambda t, a: mix(STALK_LO, STALK, sstep(0.0, 0.5, t)))
    C.assign(st, M_LEAF)
    objs.append(st)


# ---------------------------------------------------------------------------
# 葉（櫂形）: 葉柄+中央脈は1本の管、葉身は中心線に沿ったリボン
# ---------------------------------------------------------------------------
LF = lin("4E7F3A")
LF_DARK = lin("3C6A2C")
LF_RIB = lin("A2C25C")
LF_VEIN = lin("6A9A45")
LF_BASE = lin("8DB04F")
PET_LO = lin("D3DBB4")
PET = lin("6E9944")


def build_leaf(tag, ground, ang, hp, alpha, Lb, wmax, bend=(16, 38), roll=0.0, twist=0.0,
               res_u=32, res_v=12, seed=0):
    rnd = random.Random(seed)
    D = Vector((math.cos(math.radians(ang)), math.sin(math.radians(ang)), 0))

    def dv(a):
        a = math.radians(a)
        return D * math.sin(a) + Z * math.cos(a)

    G = Vector(ground)
    B = G + dv(alpha) * hp
    P1 = B + dv(alpha) * Lb * 0.36
    P2 = P1 + dv(alpha + bend[0]) * Lb * 0.34
    P3 = P2 + dv(alpha + bend[1]) * Lb * 0.34
    cl = resample(bezier(B, P1, P2, P3, 120), res_u)
    S0 = Z.cross(D).normalized()
    frames = []
    for i, p in enumerate(cl):
        T = (cl[min(i + 1, res_u)] - cl[max(i - 1, 0)]).normalized()
        u = i / res_u
        s = (S0 - T * S0.dot(T)).normalized()
        s = Matrix.Rotation(roll + twist * u, 3, T) @ s
        frames.append((T, s, T.cross(s)))

    def wfn(u):
        if u < 0.55:
            f = 0.09 + 0.91 * math.sin(math.pi / 2 * u / 0.55) ** 0.75
        else:
            t = (u - 0.55) / 0.45
            f = 0.85 * math.sqrt(max(0.0, 1 - t ** 2.4)) * (1 - 0.12 * t) + 0.15 * (1 - t)
        return 0.5 * wmax * f

    nv = 7
    verts, cols = [], []
    ph = rnd.random()
    for i in range(res_u + 1):
        u = i / res_u
        T, S, N = frames[i]
        w = wfn(u)
        fold = 0.16 + 0.22 * (1 - sstep(0.0, 0.35, u))
        for j in range(res_v + 1):
            v = -1 + 2 * j / res_v
            av = abs(v)
            phase = 2 * math.pi * (nv * u - 1.3 * av + ph)
            corr = 0.0026 * sstep(0.05, 0.3, av) * (1 - av ** 4) * math.cos(phase) * sstep(0.03, 0.15, u)
            wave = 0.003 * math.sin(u * 21 + (1.7 if v > 0 else 0.0)) * av ** 4 * sstep(0.2, 0.5, u)
            zoff = w * (fold * av + 0.08 * v * v) + corr + wave
            verts.append(cl[i] + S * (v * w) + N * zoff)
            c = LF
            c = mix(c, LF_VEIN, 0.8 * max(0.0, math.cos(phase)) ** 3 * sstep(0.1, 0.3, av))
            c = mix(c, LF_DARK, sstep(0.8, 1.0, av) * 0.7)
            c = mix(c, LF_RIB, 1 - sstep(0.04, 0.2, av))
            c = mix(c, LF_BASE, (1 - sstep(0.0, 0.15, u)) * 0.6)
            cols.append(c)
    blade = make_mesh(f"leaf_{tag}", verts, grid_faces(res_u, res_v), cols)
    solidify(blade, 0.0013)
    C.assign(blade, M_LEAF)

    # 葉柄 + 中央脈
    npet = 8
    pet_pts = [G.lerp(B, k / npet) for k in range(npet)]
    rib_r = [0.0]
    pts, nrms, rs = [], [], []
    for k, p in enumerate(pet_pts):
        t = k / npet
        pts.append(p)
        nrms.append(frames[0][2])
        rs.append(0.0074 - 0.0014 * t)
    for i, p in enumerate(cl):
        u = i / res_u
        r = 0.006 * (1 - u) ** 1.1 + 0.0006
        pts.append(p - frames[i][2] * r * 0.45 * sstep(0.0, 0.12, u))
        nrms.append(frames[i][2])
        rs.append(r)
    ntot = len(pts) - 1
    split = npet / ntot

    def rfn(t):
        return rs[min(ntot, round(t * ntot))]

    def section(t, a):
        g = 1 - sstep(split, split + 0.15, t) * 0.6
        return 1 - 0.32 * g * max(0.0, math.cos(a)) ** 6

    def cfn(t, a):
        if t < split:
            return mix(PET_LO, PET, sstep(0.0, split, t))
        return mix(PET, LF_RIB, sstep(split, split + 0.1, t))

    rib = sweep(f"rib_{tag}", pts, rfn, sides=8, normals=nrms, section=section, cols_fn=cfn)
    collars.append((G, 0.0078))
    C.assign(rib, M_LEAF)
    objs.extend([blade, rib])


def build_rolled_leaf(tag, ground, H, R0, yaw, lean, seed):
    rnd = random.Random(seed)
    FRESH = lin("6FA246")
    FRESH_PALE = lin("C3D49C")
    EDGE = lin("8DBA5C")
    M = (Matrix.Translation(Vector(ground)) @ Matrix.Rotation(math.radians(yaw), 4, "Z")
         @ Matrix.Rotation(math.radians(lean), 4, "X"))

    def phi_fn(s):
        return math.pi * (1.3 - 0.5 * sstep(0.72, 1.0, s))

    def R_fn(s):
        return R0 * (0.85 + 0.3 * math.sin(math.pi * min(s, 0.6) / 1.2)) * (1 - sstep(0.75, 1.0, s)) ** 0.8 + 3e-4

    def spine_fn(s):
        return Vector((0, H * 0.06 * s * s, s * H))

    def col_fn(s, a):
        c = mix(FRESH_PALE, FRESH, sstep(0.0, 0.25, s))
        return mix(c, EDGE, max(0.0, (a - 0.6) / 0.4))

    verts, cols, faces, edge = rolled_sheet(26, 16, phi_fn, R_fn, spine_fn, lambda s: 0.24,
                                            lambda s, a: 0.0, col_fn)
    verts = [M @ v for v in verts]
    ob = make_mesh(f"leaf_young_{tag}", verts, faces, cols)
    solidify(ob, 0.0014)
    C.assign(ob, M_LEAF)
    objs.append(ob)
    R3 = M.to_3x3()
    for s, p, d in edge:
        if 0.6 < s < 0.95 and rnd.random() < 0.4:
            frost_items.append((M @ p, R3 @ d))


# ---------------------------------------------------------------------------
# 足元: 泥・薄氷・氷の縁・割れ目・枯れ草
# ---------------------------------------------------------------------------
ICE_R = 0.205
MUD_TOP = 0.004
ICE_BOT = 0.0043


def rim(th):
    return ICE_R * (1 + 0.06 * math.sin(3 * th + 0.5) + 0.04 * math.sin(5 * th + 2.1) + 0.025 * math.sin(11 * th + 1.0))


def ice_top(x, y):
    r = math.hypot(x, y)
    th = math.atan2(y, x)
    f = min(1.0, r / rim(th))
    return (ICE_BOT + 0.0105 * (1 - 0.45 * f ** 3)
            + 0.0008 * math.sin(x * 55 + 1.3) * math.cos(y * 47 + 0.4) + 0.0005 * math.sin((x + y) * 120))


def build_ground():
    NA = 56
    # 泥（氷の外側にはみ出す濡れた泥の縁）
    verts, cols, faces = [Vector((0, 0, MUD_TOP))], [lin("2A251E")], []
    rings = [0.3, 0.6, 0.85, 1.0, 1.06, 1.13]
    rnd = random.Random(5)
    for k, f in enumerate(rings):
        for a in range(NA):
            th = 2 * math.pi * a / NA
            rr = rim(th) * f + (0.012 * (1 + 0.5 * math.sin(7 * th)) if f > 1 else 0)
            zz = MUD_TOP if f <= 1.0 else MUD_TOP * (1 - sstep(1.0, 1.13, f)) + 0.0012 * rnd.random()
            if f >= 1.13:
                zz = 0.0
            verts.append(Vector((math.cos(th) * rr, math.sin(th) * rr, zz)))
            cols.append(mix(lin("2A251E"), lin("4A3D2C"), rnd.random() * 0.8 if f > 0.9 else rnd.random() * 0.3))
    for a in range(NA):
        faces.append((0, 1 + a, 1 + (a + 1) % NA))
    for k in range(len(rings) - 1):
        for a in range(NA):
            i0, i1 = 1 + k * NA + a, 1 + k * NA + (a + 1) % NA
            faces.append((i0, i0 + NA, i1 + NA, i1))
    mud = make_mesh("mud", verts, faces, cols, recalc=True)
    C.assign(mud, M_MUD)

    # 薄氷の円盤
    verts, faces = [Vector((0, 0, ice_top(0, 0)))], []
    fr = [0.12, 0.25, 0.4, 0.55, 0.7, 0.82, 0.92, 0.98]
    for f in fr:
        for a in range(NA):
            th = 2 * math.pi * a / NA
            x, y = math.cos(th) * rim(th) * f, math.sin(th) * rim(th) * f
            verts.append(Vector((x, y, ice_top(x, y))))
    edge_prof = [(1.0, 0.75), (1.008, 0.4), (1.0, 0.0)]
    for fe, zf in edge_prof:
        for a in range(NA):
            th = 2 * math.pi * a / NA
            x, y = math.cos(th) * rim(th) * fe, math.sin(th) * rim(th) * fe
            zt = ice_top(x * 0.98, y * 0.98)
            verts.append(Vector((x, y, ICE_BOT + (zt - ICE_BOT) * zf)))
    verts.append(Vector((0, 0, ICE_BOT)))
    nr = len(fr) + len(edge_prof)
    for a in range(NA):
        faces.append((0, 1 + a, 1 + (a + 1) % NA))
    for k in range(nr - 1):
        for a in range(NA):
            i0, i1 = 1 + k * NA + a, 1 + k * NA + (a + 1) % NA
            faces.append((i0, i0 + NA, i1 + NA, i1))
    cb = len(verts) - 1
    last = 1 + (nr - 1) * NA
    for a in range(NA):
        faces.append((cb, last + (a + 1) % NA, last + a))
    ice = make_mesh("ice_disc", verts, faces, recalc=True)
    C.assign(ice, M_ICE)

    # 氷の割れ目（白い細線）
    rnd = random.Random(21)
    cv, cf = [], []

    def crack(p, ang, n, step, wid):
        pts = [p]
        for _ in range(n):
            ang += rnd.uniform(-0.45, 0.45)
            p = p + Vector((math.cos(ang), math.sin(ang), 0)) * step * rnd.uniform(0.7, 1.3)
            if p.length > rim(math.atan2(p.y, p.x)) * 0.97:
                break
            pts.append(p)
        for k in range(len(pts) - 1):
            d = (pts[k + 1] - pts[k]).normalized()
            sd = Vector((-d.y, d.x, 0)) * wid * (1 - k / len(pts) * 0.6)
            b = len(cv)
            for q in (pts[k] - sd, pts[k] + sd, pts[k + 1] + sd * 0.8, pts[k + 1] - sd * 0.8):
                cv.append(Vector((q.x, q.y, ice_top(q.x, q.y) + 0.0003)))
            cf.append((b, b + 1, b + 2, b + 3))
        return pts

    for i in range(8):
        a0 = 2 * math.pi * i / 8 + rnd.uniform(-0.3, 0.3)
        st = Vector((math.cos(a0), math.sin(a0), 0)) * 0.068
        pts = crack(st, a0, 9, 0.016, 0.0009)
        if len(pts) > 4 and rnd.random() < 0.7:
            crack(pts[len(pts) // 2], a0 + rnd.choice((-0.9, 0.9)), 5, 0.012, 0.0006)
    cr = make_mesh("ice_cracks", cv, cf, smooth=False, recalc=True)
    C.assign(cr, M_CRACK)

    # 枯れ草（氷の下に閉じ込められたもの・氷を突き抜けて立つもの）
    gv, gf, gc = [], [], []
    STRAW = lin("9C8558")
    STRAW_D = lin("5A4A33")

    def blade(pts, w0):
        n = len(pts)
        for k, p in enumerate(pts):
            T = (pts[min(k + 1, n - 1)] - pts[max(k - 1, 0)]).normalized()
            side = T.cross(Z)
            if side.length < 0.1:
                side = Vector((1, 0, 0))
            side.normalize()
            w = w0 * (1 - k / (n - 1)) + 0.0003
            c = mix(STRAW_D, STRAW, rnd.random())
            gv.extend([p - side * w, p + side * w])
            gc.extend([c, c])
        b = len(gv) - 2 * n
        for k in range(n - 1):
            gf.append((b + 2 * k, b + 2 * k + 1, b + 2 * k + 3, b + 2 * k + 2))

    for i in range(16):
        a = rnd.uniform(0, 2 * math.pi)
        r = rnd.uniform(0.07, 0.19)
        p = Vector((math.cos(a) * r, math.sin(a) * r, ICE_BOT - 0.0002))
        d = rnd.uniform(0, 2 * math.pi)
        L = rnd.uniform(0.05, 0.11)
        pts = [p + Vector((math.cos(d + 0.4 * math.sin(t * 3)), math.sin(d + 0.4 * math.sin(t * 3)), 0)) * L * t
               for t in (k / 5 for k in range(6))]
        pts = [Vector((q.x, q.y, ICE_BOT - 0.0002)) for q in pts]
        blade(pts, 0.0018)
    for i in range(9):
        a = rnd.uniform(0, 2 * math.pi)
        r = rnd.uniform(0.16, 0.235)
        base = Vector((math.cos(a) * r, math.sin(a) * r, 0.002))
        out = Vector((math.cos(a), math.sin(a), 0))
        H = rnd.uniform(0.03, 0.07)
        tip = base + Z * H + out * rnd.uniform(0.01, 0.03) + Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), 0)) * 0.01
        mid = base + Z * H * 0.6 + out * 0.003
        if rnd.random() < 0.5:   # 折れて垂れる
            tip = mid + out * H * 0.6 + Z * (-H * 0.25)
        blade(bezier(base, mid, mid.lerp(tip, 0.5), tip, 5), 0.0016)
    grass = make_mesh("dead_grass", gv, gf, gc)
    C.assign(grass, M_GRASS)
    objs.extend([ice, mud, cr, grass])



def build_collars():
    """茎・葉柄の付け根ごとに盛り上がった薄氷の縁（凸凹のリング）"""
    rnd = random.Random(17)
    tv, tf = [], []
    nu, nvv = 14, 5
    for g, r in collars:
        b = len(tv)
        zc = ice_top(g.x, g.y) - 0.0015
        rm = 0.0045 + r * 0.35
        Rm = r + rm * 0.55
        ph0 = rnd.random() * 6.28
        for i in range(nu):
            th = 2 * math.pi * i / nu
            k = 1 + 0.35 * math.sin(3 * th + ph0) * math.sin(2 * th + 1.0)
            for j in range(nvv):
                ph = math.pi * j / (nvv - 1)          # 0..π 外側→内側（上に盛り上がる半断面）
                rr = Rm + math.cos(ph) * rm * 1.5 * k
                tv.append(Vector((g.x + math.cos(th) * rr, g.y + math.sin(th) * rr,
                                  zc + math.sin(ph) * rm * 0.9 * k)))
                if j == 2 and rnd.random() < 0.35:
                    frost_items.append((tv[-1].copy(), Vector((math.cos(th), math.sin(th), 1.6))))
        for i in range(nu):
            for j in range(nvv - 1):
                i2 = (i + 1) % nu
                tf.append((b + i * nvv + j, b + i2 * nvv + j, b + i2 * nvv + j + 1, b + i * nvv + j + 1))
    ob = make_mesh("ice_collars", tv, tf, recalc=True)
    C.assign(ob, M_ICE_RIM)
    objs.append(ob)

# ---------------------------------------------------------------------------
# 組み立て
# ---------------------------------------------------------------------------
build_ground()
GZ = 0.008
# 仏炎苞（大・中・小）: 向きと高さをばらす
build_spathe("L", L=0.165, wmax=0.13, rs=0.0068, Ls=0.06, base=(-0.022, -0.036, 0.034),
             yaw=-12, lean=-8, roll=4, ground=None, seed=1)
build_spathe("M", L=0.14, wmax=0.11, rs=0.0062, Ls=0.052, base=(0.038, -0.022, 0.026),
             yaw=46, lean=4, roll=-6, ground=None, seed=2)
build_spathe("S", L=0.118, wmax=0.092, rs=0.0056, Ls=0.044, base=(-0.044, 0.006, 0.02),
             yaw=-80, lean=10, roll=5, ground=None, seed=3)
# 葉（後ろ側に広がる櫂形 3 枚 + 後方中央の若い巻き葉）
build_leaf("A", ground=(-0.008, 0.018, GZ), ang=118, hp=0.10, alpha=12, Lb=0.30, wmax=0.15,
           bend=(14, 32), roll=math.radians(-8), twist=0.22, seed=4)
build_leaf("B", ground=(0.014, 0.014, GZ), ang=50, hp=0.085, alpha=17, Lb=0.27, wmax=0.14,
           bend=(18, 40), roll=math.radians(10), twist=-0.18, seed=5)
build_leaf("C", ground=(0.022, 0.0, GZ), ang=4, hp=0.06, alpha=24, Lb=0.23, wmax=0.12,
           bend=(20, 44), roll=math.radians(-6), twist=0.15, seed=6)
build_rolled_leaf("Y", ground=(0.0, 0.03, GZ - 0.002), H=0.27, R0=0.0105, yaw=8, lean=-5, seed=7)
collars.append((Vector((0.0, 0.03 - 0.0105, GZ)), 0.0115))
build_collars()

objs.append(frost_mesh("frost", frost_items, 0.002, 33, M_FROST))

for o in objs:
    o.data.calc_loop_triangles()
    C.log(f"tris {o.name}: {len(o.data.loop_triangles)}")
ob = C.join(objs, "f2_ice_mizubasho")
C.set_origin_bottom(ob)

C.finish("f2_ice_mizubasho", notes=(
    "氷水芭蕉（ミズバショウ基準）。仏炎苞3（筒状基部→スプーン形の舟状フード、縁の外反、基部の緑）、"
    "六角小花の実メッシュ肉穂、櫂形の葉3+若い巻き葉1（中央脈・側脈の凹凸・溝付き葉柄）、"
    "泥の上の薄氷円盤・割れ目・閉じ込めた枯れ草・茎元の氷の縁・縁の霜。画像テクスチャなし（材質色+頂点色）。"
))
