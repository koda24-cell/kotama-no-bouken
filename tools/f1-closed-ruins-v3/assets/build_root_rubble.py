"""One independent, grounded pocket of fractured masonry, roots and moss.

Design: approximately 2.4 x 1.0 x 0.8 m, long axis X, Blender Z up.
Seven asymmetric large fragments and scattered splinters retain planar fracture
faces; clipped corners and thin broken arrises avoid rounded boulder silhouettes.
Three image PBR materials only. This is edge dressing, not a walkable obstacle.
Run separately after review of the previous individual asset; never assembles
or modifies a dungeon. Source and evidence export are delegated to the adapter.
"""
from pathlib import Path
import math
import random
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from asset_common import reset_scene, materials, mesh, tube, uv_world, finish
import bpy

reset_scene()
m = materials()
rng = random.Random(7303)


def world_xy(x, y, cx, cy, angle):
    c, s = math.cos(angle), math.sin(angle)
    return cx + c*x - s*y, cy + s*x + c*y


def fragment(name, center, size, angle, seed, moss=False):
    """Three irregular rings form clipped, angular masonry, not an ico-sphere."""
    rr = random.Random(seed)
    cx, cy, base = center
    sx, sy, height = size
    # Nonuniform clipped corners make an eight-sided broken block footprint.
    outline = [(-.5, -.30), (-.31, -.5), (.28, -.5), (.5, -.28),
               (.5, .27), (.29, .5), (-.28, .5), (-.5, .31)]
    outline = [(x*sx*(1+rr.uniform(-.07, .07)),
                y*sy*(1+rr.uniform(-.07, .07))) for x, y in outline]
    pitch_x, pitch_y = rr.uniform(-.065, .065), rr.uniform(-.045, .045)
    arris = min(.025, height*.12)
    verts = []
    for ring in range(3):
        for x, y in outline:
            if ring == 0:
                # Flat buried underside puts every ground fragment on Z=base.
                xx, yy, z = x*.96, y*.96, base
            elif ring == 1:
                xx, yy = x, y
                z = base + height - arris + x*pitch_x + y*pitch_y
            else:
                # Narrow chipped upper arris; the main sides stay large planes.
                xx, yy = x*.92+sx*.015, y*.90-sy*.012
                z = base + height + xx*pitch_x + yy*pitch_y
            wx, wy = world_xy(xx, yy, cx, cy, angle)
            verts.append((wx, wy, z))
    n = len(outline)
    faces = [tuple(reversed(range(n))), tuple(range(2*n, 3*n))]
    for ring in range(2):
        for i in range(n):
            j = (i+1) % n
            faces.append((ring*n+i, ring*n+j, (ring+1)*n+j, (ring+1)*n+i))
    obj = mesh(name, verts, faces, m['stone'])
    uv_world(obj, .75)
    if moss:
        # Low, irregular patches follow the actual pitched top plane. They
        # leave exposed fracture edges and never become a rectangular green lid.
        for patch in range(3):
            px = rr.uniform(-.15, .15)*sx
            py = rr.uniform(-.12, .15)*sy
            rx = sx*rr.uniform(.16, .25)
            ry = sy*rr.uniform(.16, .27)
            samples = 10
            points = [(px, py)]
            for i in range(samples):
                a = math.tau*i/samples
                r = rr.uniform(.79, 1.12)
                points.append((px+rx*math.cos(a)*r, py+ry*math.sin(a)*r))
            pv = []
            for i, (x, y) in enumerate(points):
                wx, wy = world_xy(x, y, cx, cy, angle)
                z = base+height+x*pitch_x+y*pitch_y+.008+(0.007 if i == 0 else 0)
                pv.append((wx, wy, z))
            pf = [(0, 1+i, 1+(i+1) % samples) for i in range(samples)]
            cap = mesh(name+'_sheltered_moss_'+str(patch), pv, pf, m['moss'])
            uv_world(cap, .46)
    return obj


# The large fragments form a pile with staggered bed heights, fallen carved
# blocks and small open gaps; their dimensions remain recognisable masonry.
blocks = [
    ('left fallen wedge', (-.91, -.02, 0), (.51, .50, .32), -.21),
    ('central load block', (-.35, .09, 0), (.94, .64, .61), .08),
    ('right split voussoir', (.49, .10, 0), (.76, .59, .45), -.17),
    ('upper slipped fragment', (-.23, .16, .53), (.59, .39, .22), .29),
    ('front broken sill', (-.12, -.27, 0), (.69, .31, .20), -.08),
    ('right flaked corner', (.94, -.13, 0), (.39, .43, .26), .31),
    ('rear tilted shard', (.53, .33, .32), (.50, .25, .19), -.36),
]
for i, (name, center, size, angle) in enumerate(blocks):
    fragment(name, center, size, angle, 73030+i, moss=True)

# Small angular chips stay around the pile instead of a regular decorative ring.
chips = [(-1.12, -.34), (-.87, -.39), (-.64, -.40), (-.43, -.39),
         (.32, -.39), (.63, -.40), (.86, -.37), (1.12, -.34),
         (1.13, .17), (.98, .36), (-1.09, .29), (-.84, .39)]
for i, (x, y) in enumerate(chips):
    fragment('angular mortar chip %02d' % i, (x, y, 0),
             (rng.uniform(.09, .16), rng.uniform(.06, .13), rng.uniform(.055, .12)),
             rng.uniform(-1.1, 1.1), 73100+i)

# Tapered roots lie partly in cracks, partly around stones. The three main
# curves have distinct routes; forks are short and all roots touch the pile.
root_specs = [
    ('front climbing root', [(-1.17,-.15,.045),(-.95,-.25,.20),(-.69,-.25,.34),
      (-.47,-.22,.58),(-.22,-.15,.65),(.02,-.09,.63),(.27,-.13,.47),
      (.54,-.19,.30),(.82,-.24,.18),(1.16,-.22,.025)],
     [.022,.041,.055,.061,.058,.050,.043,.036,.024,.009]),
    ('root over slipped block', [(-.91,.31,.035),(-.70,.29,.26),(-.48,.25,.58),
      (-.35,.26,.78),(-.10,.27,.78),(.12,.25,.62),(.34,.28,.56),
      (.60,.30,.53),(.87,.30,.27),(1.13,.25,.024)],
     [.018,.030,.043,.046,.040,.035,.030,.024,.017,.007]),
    ('low splitting root', [(-1.08,-.34,.025),(-.77,-.35,.05),(-.52,-.35,.10),
      (-.22,-.35,.22),(.06,-.37,.22),(.35,-.37,.07),(.61,-.42,.025)],
     [.012,.028,.034,.037,.032,.020,.007]),
]
for name, points, radii in root_specs:
    tube(name, points, radii, m['bark'], sides=7)
for i, points in enumerate([
    [(-.68,-.25,.34),(-.72,-.13,.30),(-.85,-.08,.19),(-1.03,.02,.025)],
    [(.27,-.13,.47),(.29,-.26,.35),(.21,-.35,.19),(.10,-.43,.025)],
    [(.60,.30,.53),(.74,.23,.46),(.79,.10,.31),(.99,.04,.025)],
    [(-.48,.25,.58),(-.59,.35,.37),(-.72,.39,.16),(-.93,.42,.025)],
]):
    tube('fine gripping root fork %02d' % i, points, [.025,.019,.012,.004], m['bark'], sides=5)

# Before export, enforce a meaningful geometry/material budget without running
# Blender here: the root caller executes this individual script sequentially.
objects = [o for o in bpy.context.scene.objects if o.type == 'MESH']
for obj in objects:
    obj.data.calc_loop_triangles()
triangles = sum(len(o.data.loop_triangles) for o in objects)
used_materials = {mat.name for o in objects for mat in o.data.materials if mat}
assert triangles <= 2500, 'Root rubble triangle budget exceeded: %d' % triangles
assert len(used_materials) <= 3, 'Root rubble must use no more than three materials'
finish('v3_root_rubble',
       '約2.4×1.0×0.8m、底面接地の根付き崩落石材。大破片7塊と角形小礫12、'
       '巻き根と頂面の苔。角張った破断面、写真CC0既存PBR3材質、2500tris以下。'
       '壁・柱・岸際のpocket用。中央の歩行帯へ置かず原点は地面中央。')
