"""
mine チーム（人・坑道の痕跡）用の部品と材質。common.py の上に積む。

- 形状: lathe（回転体＋凹み）、broken_shell（三角形単位で割れ穴を開けた殻）、
        plank（ささくれた折れ口つきの板・角材）、wedge
- 材質: sooty_glass（煤けた不透明ガラス）、wick_glow（芯だけ光る）、
        canvas（煤けた帆布）。どれも設計書2章の明度上限と3章の劣化（角の摩耗・煤・灰・凹み）を
        weathered_* と同じ考え方で入れる。
"""
import math
import random

import bmesh
from mathutils import Vector, noise

import common as C


# ---------------------------------------------------------------------------
# 形状
# ---------------------------------------------------------------------------
def dent_fn(dents, wobble=0.0, seed=0):
    """dents: [(angle_rad, z, depth, ang_width, z_width)] → rfn(a, z, r)"""
    def f(a, z, r):
        rr = r
        for a0, z0, d, aw, zw in dents:
            da = math.atan2(math.sin(a - a0), math.cos(a - a0))
            rr -= d * math.exp(-((da / aw) ** 2 + ((z - z0) / zw) ** 2))
        if wobble:
            rr += wobble * noise.noise(Vector((math.cos(a) * 3, math.sin(a) * 3, z * 30 + seed)))
        return rr
    return f


def sharpen(bm, deg):
    """面の角度が deg を超える辺をシャープに（GLB の分割法線になる）"""
    lim = math.radians(deg)
    for e in bm.edges:
        if len(e.link_faces) == 2 and e.calc_face_angle(0.0) > lim:
            e.smooth = False


def lathe_bm(prof, sides=12, rfn=None, phase=0.0, cap_bottom=False, cap_top=False):
    """prof: [(r, z)] 下から上。r==0 の端点は1頂点に集約"""
    bm = bmesh.new()
    rings = []
    for r, z in prof:
        if r <= 1e-6:
            rings.append([bm.verts.new((0, 0, z))])
            continue
        ring = []
        for i in range(sides):
            a = phase + 2 * math.pi * i / sides
            rr = rfn(a, z, r) if rfn else r
            ring.append(bm.verts.new((rr * math.cos(a), rr * math.sin(a), z)))
        rings.append(ring)
    for k in range(len(rings) - 1):
        r0, r1 = rings[k], rings[k + 1]
        if len(r0) == 1 and len(r1) == 1:
            continue
        if len(r0) == 1:
            for i in range(sides):
                bm.faces.new((r0[0], r1[i], r1[(i + 1) % sides]))
        elif len(r1) == 1:
            for i in range(sides):
                bm.faces.new((r0[i], r0[(i + 1) % sides], r1[0]))
        else:
            for i in range(sides):
                bm.faces.new((r0[i], r0[(i + 1) % sides], r1[(i + 1) % sides], r1[i]))
    if cap_bottom and len(rings[0]) > 1:
        bm.faces.new(list(reversed(rings[0])))
    if cap_top and len(rings[-1]) > 1:
        bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def lathe(name, prof, sides=12, rfn=None, phase=0.0, cap_bottom=False, cap_top=False, smooth=True, sharp_deg=None):
    bm = lathe_bm(prof, sides, rfn, phase, cap_bottom, cap_top)
    if sharp_deg:
        sharpen(bm, sharp_deg)
    return C.obj_from_bm(bm, name, smooth)


def broken_shell(name, prof, sides, holes, thickness=0.0025, rfn=None, seed=0, jag=0.004, phase=0.0, mats=None):
    """回転体の殻を三角形化し、holes=[(angle, z, ang_r, z_r)] の楕円（ノイズで崩す）内の三角形を消す。
    割れ口の頂点をずらしてギザギザにし、厚みをつける（割れ口の断面が見える）。"""
    bm = lathe_bm(prof, sides, rfn, phase)
    bmesh.ops.triangulate(bm, faces=bm.faces[:], quad_method="ALTERNATE")
    off = Vector((seed * 3.1, seed * 1.7, seed * 5.9))
    kill = []
    for f in bm.faces:
        c = f.calc_center_median()
        a = math.atan2(c.y, c.x)
        for a0, z0, ar, zr in holes:
            da = math.atan2(math.sin(a - a0), math.cos(a - a0))
            d = (da / ar) ** 2 + ((c.z - z0) / zr) ** 2
            d += 0.55 * noise.noise(c * 60 + off)
            if d < 1.0:
                kill.append(f)
                break
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    loose = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=loose, context="VERTS")
    zs = [v.co.z for v in bm.verts]
    zmin, zmax = min(zs), max(zs)
    rnd = random.Random(seed)
    for v in bm.verts:
        if v.is_boundary and zmin + 1e-4 < v.co.z < zmax - 1e-4:
            r = Vector((v.co.x, v.co.y)).length
            a = math.atan2(v.co.y, v.co.x) + rnd.uniform(-1, 1) * jag / max(r, 1e-3)
            v.co = Vector((r * math.cos(a), r * math.sin(a), v.co.z + rnd.uniform(-1, 1) * jag))
    ob = C.obj_from_bm(bm, name, smooth=True)
    if mats:  # mats=(外側, 内側)。内側の殻に別材質（煤の膜）を割り当てる
        for mt in mats:
            ob.data.materials.append(mt)
    m = ob.modifiers.new("solid", "SOLIDIFY")
    m.thickness = thickness
    m.offset = -1.0
    m.use_rim = True
    m.use_even_offset = True
    if mats and len(mats) > 1:
        m.material_offset = 1
    return C.apply_mods(ob)


def plank(name, length, width, thick, segs=6, split_a=None, split_b=None, seed=0, round_edges=0.25,
          warp=0.0, chip=0.0):
    """X軸方向の角材・板（中心原点）。両端を折れ口（ささくれ）にできる。
    split_a/split_b: None=きれいな木口（小さな欠けのみ）、数値=折れ口の荒さ（m、裂けの長さ）
    round_edges: 角の丸み（断面8角形の面取り比）。warp: 長手の反り。chip: 角の欠け量"""
    rnd = random.Random(seed)
    hw, ht = width / 2, thick / 2
    c = min(hw, ht) * round_edges
    prof = [(-hw + c, -ht), (hw - c, -ht), (hw, -ht + c), (hw, ht - c),
            (hw - c, ht), (-hw + c, ht), (-hw, ht - c), (-hw, -ht + c)]
    M = len(prof)
    bm = bmesh.new()
    rings = []
    off = Vector((seed * 2.3, seed * 4.1, seed * 0.7))
    for k in range(segs + 1):
        u = k / segs
        x = -length / 2 + length * u
        ring = []
        for j, (py, pz) in enumerate(prof):
            yy, zz = py, pz
            # 角の欠け：低周波ノイズで断面を内側へ削る
            if chip:
                n = noise.noise(Vector((x * 9, py * 40, pz * 40)) + off)
                if n > 0.15:
                    s = 1 - chip * (n - 0.15) / max(hw, ht)
                    yy, zz = yy * s, zz * s
            xx = x
            if k == 0 and split_a:
                xx += rnd.uniform(0, split_a) + (split_a * 0.6 if j % 3 == 0 else 0)
            elif k == 0:
                xx += rnd.uniform(0, 0.004)
            if k == segs and split_b:
                xx -= rnd.uniform(0, split_b) + (split_b * 0.6 if j % 3 == 1 else 0)
            elif k == segs:
                xx -= rnd.uniform(0, 0.004)
            zz += warp * math.sin(math.pi * u)
            ring.append(bm.verts.new((xx, yy, zz)))
        rings.append(ring)
    for k in range(segs):
        for j in range(M):
            bm.faces.new((rings[k][j], rings[k][(j + 1) % M], rings[k + 1][(j + 1) % M], rings[k + 1][j]))
    for k, sp, sign in ((0, split_a, -1), (segs, split_b, 1)):
        ring = rings[k]
        if sp:
            # 折れ口：中心に突き出た裂け（ささくれ）の先端へ扇状に閉じる
            cx = sum(v.co.x for v in ring) / M
            tip = bm.verts.new((cx + sign * sp * rnd.uniform(0.25, 0.6), rnd.uniform(-hw, hw) * 0.5, rnd.uniform(-ht, ht) * 0.5))
            for j in range(M):
                a, b = ring[j], ring[(j + 1) % M]
                bm.faces.new((a, b, tip) if sign > 0 else (b, a, tip))
        else:
            bm.faces.new(list(reversed(ring)) if sign < 0 else ring)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return C.obj_from_bm(bm, name, smooth=False)


def wedge(name, l, w, h, seed=0):
    """楔（X方向に細る）。原点は中心"""
    bm = bmesh.new()
    rnd = random.Random(seed)
    v = [bm.verts.new(p) for p in (
        (-l / 2, -w / 2, -h / 2), (l / 2, -w / 2, -h / 2 + h * 0.8), (l / 2, w / 2, -h / 2 + h * 0.8), (-l / 2, w / 2, -h / 2),
        (-l / 2, -w / 2, h / 2), (l / 2, -w / 2, h / 2 * rnd.uniform(0.9, 1.0)), (l / 2, w / 2, h / 2), (-l / 2, w / 2, h / 2))]
    for f in ((0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)):
        bm.faces.new([v[i] for i in f])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return C.obj_from_bm(bm, name, smooth=False)


# ---------------------------------------------------------------------------
# 材質
# ---------------------------------------------------------------------------
def sooty_glass(name, soot_z=None, scale=1.0, tint=(0.012, 0.014, 0.011), crack_center=None, crack_r=(0.02, 0.08), tint2=None):
    """煤けた不透明ガラス（透過はベイクできないため）。
    暗い琥珀色の地＋上方の煤（内側から付く黒い膜）＋細いひび（明るい線）＋灰。粗さで艶の島を残す。"""
    b = C.NB(name)
    n_big = b.noise(9.0 / scale, 6, 0.6)
    n_fine = b.noise(60.0 / scale, 4, 0.5)
    # ひび：ノイズの等値線（|n-0.5|が小さい所）を細い線にする＝蛇行する割れ。割れ穴の近くほど密に
    def ridge(sc, w):
        n = b.noise(sc, 3, 0.45)
        return b.ramp(b.math("ABSOLUTE", b.math("SUBTRACT", n, 0.5)), [(0.0, 1.0), (w, 0.0)])
    cr1 = ridge(14.0 / scale, 0.022)
    cr2 = ridge(38.0 / scale, 0.016)
    near = b.dist_mask(crack_center, *crack_r) if crack_center is not None else 0.4
    crack = b.math("MULTIPLY", b.math("MAXIMUM", cr1, cr2), b.math("ADD", b.math("MULTIPLY", near, 0.85), 0.15), clamp=True)
    # 地：暗い灰緑〜茶のくすみ（明度は低く、艶で見せる）
    col = b.mix(n_big, tint, tint2 or (tint[0] * 1.5, tint[1] * 1.3, tint[2] * 1.1))
    soot = b.ramp(n_big, [(0.25, 0.25), (0.75, 0.75)])
    if soot_z is not None:
        soot = b.math("MAXIMUM", soot, b.height_mask(*soot_z))
    soot = b.math("MULTIPLY", soot, b.ramp(n_fine, [(0.2, 0.7), (0.8, 1.0)]))
    col = b.mix(soot, col, (0.006, 0.0055, 0.005))
    col = b.mix(b.math("MULTIPLY", crack, 0.8), col, (0.075, 0.075, 0.068))
    # 割れ口（少し明るい断面）
    edge = b.edge_mask(0.0012, 0.08, 0.35)
    col = b.mix(b.math("MULTIPLY", edge, 0.35), col, (0.09, 0.085, 0.075))
    ash = b.math("MULTIPLY", b.up_mask(0.5, 0.9), b.ramp(n_big, [(0.35, 0.0), (0.7, 1.0)]))
    col = b.mix(b.math("MULTIPLY", ash, 0.8), col, (0.075, 0.07, 0.066))
    r = b.mixf(soot, 0.04, 0.5)
    r = b.mixf(crack, r, 0.35)
    r = b.mixf(ash, r, 0.95)
    b.normal_from(None, bump_height=b.math("SUBTRACT", 1.0, crack), bump_strength=0.25, bump_dist=0.0008)
    return b.out(col, r, 0.0)


def wick_glow(name, z_dark, z_red, z_tip, strength=8.0):
    """芯と小さな炎：z_dark より下は炭化した黒、z_red で赤い燠、z_tip へ向かって橙→黄。
    基本色は暗く、発光だけで見せる（面全体ではなく芯の部品だけに割り当てる）"""
    b = C.NB(name)
    h = b.height_mask(z_dark, z_tip)
    t_red = (z_red - z_dark) / max(1e-6, z_tip - z_dark)
    n = b.noise(400.0, 4, 0.5)
    emit = b.ramp(b.math("ADD", h, b.math("MULTIPLY", n, 0.04)),
                  [(0.0, (0, 0, 0)), (t_red, (0.55, 0.06, 0.01)), (min(0.95, t_red + 0.2), (1.0, 0.30, 0.04)),
                   (1.0, (1.0, 0.62, 0.22))])
    col = b.mix(h, (0.008, 0.007, 0.006), (0.05, 0.02, 0.01))
    return b.out(col, 0.9, 0.0, emit=emit, emit_strength=strength)


def canvas(name, soot_z=None, scale=1.0, base=(0.085, 0.066, 0.045), heat_center=None, heat_r=(0.05, 0.3)):
    """煤けた帆布：織り目（細かい格子）＋汚れムラ＋煤（下と上）＋縫い目付近の擦れ（明るい）＋灰。
    明度上限は煤けた木と同等（0.30）以下に抑える"""
    b = C.NB(name)
    n_big = b.noise(3.0 / scale, 6, 0.6)
    n_mid = b.noise(12.0 / scale, 6, 0.6)
    # 織り目：XとYの細かい縞を掛け合わせる
    sep = b.n("ShaderNodeSeparateXYZ")
    b.link(b.coord("Object"), sep.inputs[0])
    wx = b.math("SINE", b.math("MULTIPLY", b.math("ADD", sep.outputs["X"], sep.outputs["Z"]), 500.0 / scale))
    wy = b.math("SINE", b.math("MULTIPLY", b.math("ADD", sep.outputs["Y"], sep.outputs["Z"]), 500.0 / scale))
    weave = b.math("MULTIPLY", b.math("ADD", wx, wy), 0.25)
    weave = b.math("ADD", weave, 0.5)
    col = b.mix(n_mid, base, (base[0] * 0.65, base[1] * 0.62, base[2] * 0.6))
    col = b.mix(b.math("MULTIPLY", weave, 0.25), col, (base[0] * 0.6, base[1] * 0.6, base[2] * 0.6))
    stain = b.ramp(n_big, [(0.45, 0.0), (0.7, 1.0)])
    col = b.mix(b.math("MULTIPLY", stain, 0.7), col, (0.030, 0.022, 0.016))
    if soot_z is not None:
        soot = b.math("MULTIPLY", b.height_mask(*soot_z), b.ramp(n_mid, [(0.2, 0.5), (0.8, 1.0)]))
        col = b.mix(b.math("MULTIPLY", soot, 0.8), col, (0.012, 0.010, 0.009))
    if heat_center is not None:
        burn = b.dist_mask(heat_center, *heat_r)
        col = b.mix(burn, col, (0.008, 0.006, 0.005))
    edge = b.edge_mask(0.006, 0.03, 0.3)
    col = b.mix(b.math("MULTIPLY", edge, 0.45), col, (0.15, 0.125, 0.095))
    cav = b.math("SUBTRACT", 1.0, b.cavity(0.04))
    ash = b.math("MAXIMUM", b.math("MULTIPLY", cav, 0.5), b.math("MULTIPLY", b.up_mask(0.6, 0.95), 0.45))
    ash = b.math("MULTIPLY", ash, b.ramp(n_big, [(0.3, 0.0), (0.7, 1.0)]))
    col = b.mix(b.math("MULTIPLY", ash, 0.85), col, (0.075, 0.07, 0.066))
    r = b.mixf(ash, 0.92, 0.97)
    b.normal_from(None, bump_height=b.math("ADD", weave, b.math("MULTIPLY", n_mid, 2.0)), bump_strength=0.35, bump_dist=0.0015)
    return b.out(col, r, 0.0)


def splinters(prefix, origin, direction, radius, n=4, length=0.12, seed=0, mat=None):
    """折れ口のささくれ：細く尖った木片を direction 方向へ n 本（断面三角形、先端0）"""
    rnd = random.Random(seed)
    d = Vector(direction).normalized()
    side = d.cross(Vector((0, 0, 1)))
    if side.length < 1e-4:
        side = d.cross(Vector((1, 0, 0)))
    side.normalize()
    up = side.cross(d).normalized()
    out = []
    for i in range(n):
        a = rnd.uniform(0, 2 * math.pi)
        rr = radius * rnd.uniform(0.2, 0.85)
        base = Vector(origin) + (side * math.cos(a) + up * math.sin(a)) * rr - d * length * 0.15
        L = length * rnd.uniform(0.35, 1.0)
        bend = (side * rnd.uniform(-1, 1) + up * rnd.uniform(-1, 1)) * L * 0.18
        pts = [base, base + d * L * 0.5 + bend * 0.4, base + d * L + bend]
        w = radius * rnd.uniform(0.14, 0.30)
        prof = [(-w, -w * 0.4), (w, -w * 0.4), (0.0, w * 0.8)]
        ob = C.sweep(f"{prefix}_{i}", pts, prof, scale_fn=lambda u: max(0.02, 1.0 - u), smooth=False)
        if mat is not None:
            C.assign(ob, mat)
        out.append(ob)
    return out


def mine_rock(name, scale=1.0, ash_amt=0.75):
    """坑道の落石（玄武岩）：#1d1a19〜#2e2926、割れたばかりの面は少し明るく、上向き面と凹みに灰"""
    b = C.NB(name)
    diff = b.image(C.cc0("rock_face_02", "diff"), scale * 0.8)
    nrm = b.image(C.cc0("rock_face_02", "nor_gl"), scale * 0.8)
    n_big = b.noise(2.0 / scale, 6, 0.6)
    n_fine = b.noise(30.0 / scale, 5, 0.55)
    col = b.mix(n_big, (0.013, 0.011, 0.010), (0.026, 0.022, 0.020))
    if diff is not None:
        hs = b.n("ShaderNodeHueSaturation")
        hs.inputs["Saturation"].default_value = 0.35
        hs.inputs["Value"].default_value = 0.45
        b.link(diff, hs.inputs["Color"])
        col = b.mix(0.55, col, hs.outputs[0], "MULTIPLY")
        col = b.mix(0.2, col, hs.outputs[0])
    col = b.mix(b.math("MULTIPLY", n_fine, 0.4), col, (0.008, 0.007, 0.007))
    edge = b.edge_mask(0.01, 0.03, 0.25)
    col = b.mix(b.math("MULTIPLY", edge, 0.6), col, (0.045, 0.040, 0.036))
    cav = b.math("SUBTRACT", 1.0, b.cavity(0.06))
    ash = b.math("MAXIMUM", b.math("MULTIPLY", cav, 0.5), b.math("MULTIPLY", b.up_mask(0.55, 0.9), 0.6))
    ash = b.math("MULTIPLY", ash, b.ramp(n_big, [(0.25, 0.1), (0.7, 1.0)]))
    col = b.mix(b.math("MULTIPLY", ash, ash_amt), col, (0.085, 0.079, 0.072))
    r = b.mixf(ash, 0.82, 0.96)
    r = b.mixf(edge, r, 0.7)
    b.normal_from(nrm, 0.8, bump_height=n_fine, bump_strength=0.3, bump_dist=0.01)
    return b.out(col, r, 0.0)


def staple(name, center, axis_dir, width=0.08, leg=0.05, thick=0.008, seed=0):
    """コの字の鉄の鎹（かすがい）。center=橋の中心、axis_dir=橋の向き。脚は -Z 側（後で回転して使う）"""
    a = Vector(axis_dir).normalized()
    c = Vector(center)
    pts = [c - a * width / 2 + Vector((0, 0, -leg)), c - a * width / 2, c + a * width / 2, c + a * width / 2 + Vector((0, 0, -leg))]
    pts = C.bezier(pts[0], pts[1] + Vector((0, 0, 0.0)), pts[2], pts[3], n=8)
    return C.sweep(name, pts, C.rect_profile(thick * 1.6, thick, chamfer=thick * 0.25), up_fn=lambda k, p, t: (0, 0, 1))


def orient_between(ob, p0, p1, roll_deg=0.0):
    """X軸に沿って作った部品（中心原点）を p0→p1 の中点に置き、X を p0→p1 へ向ける"""
    from mathutils import Matrix
    p0, p1 = Vector(p0), Vector(p1)
    d = p1 - p0
    q = d.normalized().to_track_quat("X", "Z")
    ob.matrix_world = Matrix.Translation((p0 + p1) / 2) @ q.to_matrix().to_4x4() @ Matrix.Rotation(math.radians(roll_deg), 4, "X")
    return ob


def beam_between(name, p0, p1, w, t, split_a=None, split_b=None, seed=0, bow=0.0, chip=0.0, roll=0.0, segs=12,
                 round_edges=0.35, mat=None):
    """p0→p1 の角材（手斧で削った丸太風：面取り8角形・曲がり・角の欠け・折れ口）"""
    L_ = (Vector(p1) - Vector(p0)).length
    ob = plank(name, L_, w, t, segs=segs, split_a=split_a, split_b=split_b, seed=seed, round_edges=round_edges,
               warp=0.0, chip=chip)
    if bow:
        C.displace_noise(ob, bow, 1.2 / max(L_, 0.1), seed=seed)
        C.displace_noise(ob, bow * 0.15, 9.0, seed=seed + 50)
    orient_between(ob, p0, p1, roll)
    if mat is not None:
        C.assign(ob, mat)
    return ob


def crate(prefix, w, d, h, mats, seed=0, nb=3, t=0.022, post=0.05, segs=3, chip=0.006,
          skip=(), broken=None, lid=True):
    """スラットの木箱（底中心が原点、+Z上）。mats={'x','y','z'}（木目方向別の木材）。
    板ID: 'F0'..（前 -Y）、'B0'..（後 +Y）、'L0'..（-X）、'R0'..（+X）、'T0'..（蓋）、'P0'..'P3'（角柱）、'K0','K1'（蓋の桟）、'S0'..（底）
    skip: 作らない板ID。broken: {ID: ('a'|'b'|'mid', 荒さ)} 折れた板（'mid' は中央で折れて2片が内へ落ちる）
    戻り値: {ID: [objects]}"""
    rnd = random.Random(seed)
    broken = broken or {}
    out = {}
    gap = (h - nb * ((h - t) / nb)) if False else 0.0
    sh = (h - 0.02) / nb  # 1段の高さ
    bw = sh - 0.012       # 板幅（隙間 12mm）

    def mk(bid, length, width, thick, loc, rot, mat, grain_seed):
        if bid in skip:
            return
        sp = broken.get(bid)
        if sp and sp[0] == "mid":
            obs = []
            for half, sgn in (("a", -1), ("b", 1)):
                hl = length * rnd.uniform(0.42, 0.55)
                pl = plank(f"{prefix}_{bid}{half}", hl, width, thick, segs=max(2, segs - 1), seed=grain_seed + (7 if half == "b" else 0),
                           split_b=sp[1] if half == "a" else None, split_a=sp[1] if half == "b" else None, chip=chip)
                # 外端を支点に内へ落ちる
                from mathutils import Matrix
                piv = Vector((sgn * length / 2, 0, 0))
                pl.data.transform(Matrix.Translation(Vector((sgn * (length / 2 - hl / 2), 0, 0))))
                ang = math.radians(rnd.uniform(14, 24)) * (-sgn)
                pl.data.transform(Matrix.Translation(piv) @ Matrix.Rotation(ang, 4, "Y") @ Matrix.Translation(-piv))
                C.xform(pl, loc, rot)
                obs.append(C.assign(pl, mat))
            out[bid] = obs
            return
        pl = plank(f"{prefix}_{bid}", length, width, thick, segs=segs, seed=grain_seed,
                   split_a=sp[1] if sp and sp[0] == "a" else None, split_b=sp[1] if sp and sp[0] == "b" else None, chip=chip)
        C.displace_noise(pl, 0.002, 6.0, seed=grain_seed)
        C.xform(pl, loc, rot)
        out[bid] = [C.assign(pl, mat)]

    hw, hd = w / 2, d / 2
    # 角柱（縦）。Y90°回転なので上端=split_a
    for k, (sx, sy) in enumerate(((-1, -1), (1, -1), (1, 1), (-1, 1))):
        mk(f"P{k}", h, post, post, (sx * (hw - post / 2), sy * (hd - post / 2), h / 2), (0, 90, 0), mats["z"], seed + 10 + k)
    for i in range(nb):
        z = 0.01 + sh * i + sh / 2
        mk(f"F{i}", w + 0.004, bw, t, (0, -hd - t / 2, z), (90, 0, 0), mats["x"], seed + 20 + i)
        mk(f"B{i}", w + 0.004, bw, t, (0, hd + t / 2, z), (90, 0, 0), mats["x"], seed + 30 + i)
        mk(f"L{i}", d + 2 * t, bw, t, (-hw - t / 2, 0, z), (90, 0, 90), mats["y"], seed + 40 + i)
        mk(f"R{i}", d + 2 * t, bw, t, (hw + t / 2, 0, z), (90, 0, 90), mats["y"], seed + 50 + i)
    if lid:
        nt = 3
        tw = (d + 2 * t) / nt
        for i in range(nt):
            y = -hd - t + tw * i + tw / 2
            mk(f"T{i}", w + 2 * t + 0.01, tw - 0.01, t, (0, y, h + t / 2), (0, 0, 0), mats["x"], seed + 60 + i)
        for k, sx in enumerate((-1, 1)):
            mk(f"K{k}", d - 0.004, 0.06, 0.02, (sx * (hw - post - 0.035), 0, h - 0.01), (0, 0, 90), mats["y"], seed + 70 + k)
    for i in range(2):
        mk(f"S{i}", w, (d / 2) - 0.01, t, (0, (i - 0.5) * d / 2, t / 2), (0, 0, 0), mats["x"], seed + 80 + i)
    return out


def flatten(dct):
    res = []
    for v in dct.values():
        res.extend(v)
    return res


def leather(name, scale=1.0, base=(0.040, 0.025, 0.015), soot_z=None):
    """古い革：暗い茶＋細かいしわ割れ＋擦れて明るく艶の出た角＋煤と灰"""
    b = C.NB(name)
    n_big = b.noise(4.0 / scale, 6, 0.6)
    n_mid = b.noise(25.0 / scale, 5, 0.6)
    cr = b.ramp(b.voronoi(60.0 / scale, "DISTANCE_TO_EDGE"), [(0.0, 1.0), (0.05, 0.0)])
    col = b.mix(n_big, base, (base[0] * 0.6, base[1] * 0.6, base[2] * 0.6))
    col = b.mix(b.math("MULTIPLY", cr, 0.6), col, (0.010, 0.007, 0.005))
    edge = b.edge_mask(0.004, 0.03, 0.25)
    col = b.mix(b.math("MULTIPLY", edge, 0.7), col, (0.085, 0.060, 0.040))
    if soot_z is not None:
        col = b.mix(b.math("MULTIPLY", b.height_mask(*soot_z), 0.7), col, (0.010, 0.009, 0.008))
    cav = b.math("SUBTRACT", 1.0, b.cavity(0.02))
    ash = b.math("MAXIMUM", b.math("MULTIPLY", cav, 0.5), b.math("MULTIPLY", b.up_mask(0.65, 0.95), 0.35))
    ash = b.math("MULTIPLY", ash, b.ramp(n_big, [(0.3, 0.0), (0.7, 1.0)]))
    col = b.mix(b.math("MULTIPLY", ash, 0.8), col, (0.075, 0.07, 0.066))
    r = b.mixf(edge, 0.62, 0.38)
    r = b.mixf(ash, r, 0.95)
    b.normal_from(None, bump_height=b.math("ADD", b.math("MULTIPLY", n_mid, 0.6), b.math("MULTIPLY", cr, -0.5)), bump_strength=0.4, bump_dist=0.0015)
    return b.out(col, r, 0.0)


def soft_box_bm(hx, hy, hz, cuts=6, n=3.0):
    """丸みのある箱（超楕円体）。中心原点。cuts=各辺の分割"""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=2.0)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=cuts, use_grid_fill=True)
    for v in bm.verts:
        q = v.co
        linf = max(abs(q.x), abs(q.y), abs(q.z))
        ln = (abs(q.x) ** n + abs(q.y) ** n + abs(q.z) ** n) ** (1.0 / n)
        p = q * (linf / ln)
        v.co = Vector((p.x * hx, p.y * hy, p.z * hz))
    return bm


def jag_boundary(bm, amount, seed=0, zmin=None):
    rnd = random.Random(seed)
    for v in bm.verts:
        if v.is_boundary and (zmin is None or v.co.z > zmin):
            v.co += Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-1, 1))) * amount


def punch_holes(bm, centers, seed=0):
    """centers=[(Vector, radius)] の周りの面を、ノイズで崩した形で消す（焼け穴・突き破り）"""
    off = Vector((seed * 1.3, seed * 2.9, seed * 0.4))
    kill = []
    for f in bm.faces:
        c = f.calc_center_median()
        for p, r in centers:
            if (c - Vector(p)).length < r * (1.0 + 0.45 * noise.noise(c * 40 + off)):
                kill.append(f)
                break
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    loose = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=loose, context="VERTS")


# ---------------------------------------------------------------------------
# 任意の向きの板（木箱 v2 以降）
# ---------------------------------------------------------------------------
def _basis(ax, aw):
    from mathutils import Matrix
    x = Vector(ax).normalized()
    y = Vector(aw)
    y = (y - x * y.dot(x)).normalized()
    z = x.cross(y)
    m = Matrix.Identity(4)
    for i in range(3):
        m[i][0], m[i][1], m[i][2] = x[i], y[i], z[i]
    return m


def grain_mat(mats, ax):
    """木目方向が近い軸の材質（mats={'x','y','z'}）"""
    a = Vector(ax)
    k = max(range(3), key=lambda i: abs(a[i]))
    return mats["xyz"[k]]


def board(name, c, ax, aw, length, width, thick, mats, seed=0, split_a=None, split_b=None, chip=0.005,
          segs=3, warp=0.0, extra=None):
    """中心 c、長手 ax、幅方向 aw の板。extra=Matrix（世界座標での追加変換：落ちる・傾く）"""
    from mathutils import Matrix
    pl = plank(name, length, width, thick, segs=segs, split_a=split_a, split_b=split_b, seed=seed, chip=chip, warp=warp)
    C.displace_noise(pl, min(0.003, thick * 0.12), 5.0, seed=seed)
    M = Matrix.Translation(Vector(c)) @ _basis(ax, aw)
    if extra is not None:
        M = extra @ M
    pl.matrix_world = M
    return C.assign(pl, grain_mat(mats, ax))


def pivot_rot(pivot, axis, deg, move=(0, 0, 0)):
    """pivot を通る axis 周りに deg 回転してから move だけ平行移動する行列"""
    from mathutils import Matrix
    p = Vector(pivot)
    return Matrix.Translation(Vector(move)) @ Matrix.Translation(p) @ Matrix.Rotation(math.radians(deg), 4, Vector(axis)) @ Matrix.Translation(-p)


def board_broken(name, c, ax, aw, length, width, thick, mats, seed=0, f=0.5, rough=0.06,
                 rot_a=None, rot_b=None, drop_a=False, drop_b=False, chip=0.005, segs=3, hinge="outer"):
    """中央付近（f）で折れた板。各片は外端（板の端）を支点に rot=(world_axis, deg[, move]) で回る。
    drop_*=True でその片を作らない（失われた）。hinge="inner" で折れ口を支点にする。戻り値: 片のリスト"""
    ax_n = Vector(ax).normalized()
    c = Vector(c)
    pa = c - ax_n * length / 2
    pb = c + ax_n * length / 2
    pm = pa + ax_n * length * f
    out = []
    rnd = random.Random(seed)
    for tag, p0, p1, sa, sb, rot, drop in (("a", pa, pm, None, rough, rot_a, drop_a),
                                           ("b", pm, pb, rough, None, rot_b, drop_b)):
        if drop:
            continue
        ln = (p1 - p0).length
        if hinge == "inner":   # 折れ口を支点に（ささくれで繋がったまま垂れる）
            piv = p1 if tag == "a" else p0
        else:
            piv = p0 if tag == "a" else p1
        ex = pivot_rot(piv, rot[0], rot[1], rot[2] if len(rot) > 2 else (0, 0, 0)) if rot else None
        out.append(board(f"{name}{tag}", (p0 + p1) / 2, ax, aw, ln, width, thick, mats,
                         seed=seed + (11 if tag == "b" else 0), split_a=sa, split_b=sb, chip=chip,
                         segs=max(2, segs - 1), extra=ex))
    return out


def nail(name, pos, normal, r=0.0075, mat=None):
    ob = C.dome(name, r, r * 0.45, sides=6)
    C.place_on(ob, pos, normal)
    if mat is not None:
        C.assign(ob, mat)
    return ob


def framed_crate(prefix, w, d, h, mats, iron=None, seed=0, nb=3, t=0.02, bat=0.075, gap=0.028,
                 brace=False, skip=(), broken=None, mods=None, nails=True, skids=True, lid_n=3, splits=None, no_nails=""):
    """枠つきのスラット木箱（底中心が原点、+Z 上）。#97 の形：
    面ごとに横板 nb 枚（隙間 gap）＋外側の縦の角当て（bat 幅）＋上下の横の縁当て、必要なら斜めの筋交い、
    蓋 lid_n 枚、底の下に2本の根太（skids）。
    板ID: F/B/L/R + s0.. (横板), F/B/L/R + v0,v1（縦の角当て）, F/B + t,b（上下の縁当て）, F/B + x（筋交い）,
          T0..（蓋）, K0,K1（根太）
    skip: 作らない ID。broken: {ID: dict(f=, rough=, rot_a=, rot_b=, drop_a=, drop_b=)}
    mods: {ID: Matrix}（板全体を動かす: 外れて倒れる等）
    戻り値: {ID: [objects]}"""
    broken = broken or {}
    mods = mods or {}
    splits = splits or {}
    out = {}
    z0 = 0.045 if skids else 0.0   # 根太の上に乗る
    hw, hd = w / 2, d / 2
    H = h - z0

    def add(bid, c, ax, aw, length, width, thick, sa=None, sb=None, chip=0.005, segs=3):
        if bid in skip:
            return
        if bid in splits:
            sa, sb = splits[bid]
        sd = seed * 100 + sum(ord(ch) * (i + 3) for i, ch in enumerate(bid)) % 997
        if bid in broken:
            kw = dict(broken[bid])
            out[bid] = board_broken(f"{prefix}_{bid}", c, ax, aw, length, width, thick, mats, seed=sd, chip=chip, segs=segs, **kw)
        elif bid in mods and isinstance(mods[bid], dict):
            kw = dict(mods[bid])
            out[bid] = [board(f"{prefix}_{bid}", c, ax, aw, length, width, thick, mats, seed=sd, chip=chip, segs=segs, **kw)]
        else:
            out[bid] = [board(f"{prefix}_{bid}", c, ax, aw, length, width, thick, mats, seed=sd,
                              split_a=sa, split_b=sb, chip=chip, segs=segs, extra=mods.get(bid))]

    sw = (H - gap * (nb + 1)) / nb  # 横板の幅
    for face, n_out, along, half_len, half_off in (("F", Vector((0, -1, 0)), Vector((1, 0, 0)), hw, hd),
                                                    ("B", Vector((0, 1, 0)), Vector((-1, 0, 0)), hw, hd),
                                                    ("L", Vector((-1, 0, 0)), Vector((0, -1, 0)), hd, hw),
                                                    ("R", Vector((1, 0, 0)), Vector((0, 1, 0)), hd, hw)):
        # 横板（面の内側の層）
        for i in range(nb):
            z = z0 + gap + sw / 2 + i * (sw + gap)
            c = n_out * (half_off - t / 2) + Vector((0, 0, z))
            add(f"{face}s{i}", c, along, (0, 0, 1), 2 * half_len - (2 * t if face in "LR" else 0), sw, t)
        # 縦の角当て（外側の層）
        for j, sgn in enumerate((-1, 1)):
            c = n_out * (half_off + t / 2) + along * sgn * (half_len - bat / 2 + (t if face in "FB" else 0)) + Vector((0, 0, z0 + H / 2))
            add(f"{face}v{j}", c, (0, 0, 1), along, H, bat, t)
        # 上下の縁当て（F/B のみ）と筋交い
        if face in "FB":
            inner = 2 * half_len - 2 * bat + 2 * t
            for tag, zz in (("t", z0 + H - bat / 2), ("b", z0 + bat / 2)):
                c = n_out * (half_off + t / 2) + Vector((0, 0, zz))
                add(f"{face}{tag}", c, along, (0, 0, 1), inner, bat * 0.9, t)
            if brace:
                p0 = n_out * (half_off + t * 1.5) + along * (-(half_len - bat)) + Vector((0, 0, z0 + bat))
                p1 = n_out * (half_off + t * 1.5) + along * (half_len - bat) + Vector((0, 0, z0 + H - bat))
                dv = p1 - p0
                add(f"{face}x", (p0 + p1) / 2, dv, n_out.cross(dv), dv.length * 0.98, bat * 0.85, t)
    # 蓋（X 方向の板を Y に並べる）
    ld = d + 4 * t
    lw = (ld - 0.008 * (lid_n - 1)) / lid_n
    for i in range(lid_n):
        y = -ld / 2 + lw / 2 + i * (lw + 0.008)
        add(f"T{i}", (0, y, h + t / 2), (1, 0, 0), (0, 1, 0), w + 4 * t + 0.01, lw, t)
    if skids:
        for k, sx in enumerate((-1, 1)):
            add(f"K{k}", (sx * (hw - 0.08), 0, z0 / 2), (0, 1, 0), (1, 0, 0), d + 2 * t, 0.07, z0, chip=0.008)
    # 底板（見えにくいので2枚）
    for i in range(2):
        add(f"S{i}", (0, (i - 0.5) * d / 2, z0 + t / 2), (1, 0, 0), (0, 1, 0), w - 0.01, d / 2 - 0.01, t)
    # 釘（縦の角当ての上下）
    if nails and iron is not None:
        k = 0
        for face, n_out, along, half_len, half_off in (("F", Vector((0, -1, 0)), Vector((1, 0, 0)), hw, hd),
                                                        ("L", Vector((-1, 0, 0)), Vector((0, -1, 0)), hd, hw),
                                                        ("R", Vector((1, 0, 0)), Vector((0, 1, 0)), hd, hw),
                                                        ("B", Vector((0, 1, 0)), Vector((-1, 0, 0)), hw, hd)):
            if face in no_nails:
                continue
            for j, sgn in enumerate((-1, 1)):
                if f"{face}v{j}" in skip or f"{face}v{j}" in mods or f"{face}v{j}" in broken:
                    continue
                for zz in (z0 + H - gap - sw / 2,):
                    p = n_out * (half_off + t) + along * sgn * (half_len - bat / 2 + (t if face in "FB" else 0)) + Vector((0, 0, zz))
                    out[f"N{k}"] = [nail(f"{prefix}_N{k}", p, n_out, mat=iron)]
                    k += 1
    return out
