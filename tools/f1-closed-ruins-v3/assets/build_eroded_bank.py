"""One eroded bank asset; never assembles the pond or launches other assets.

Origin is the ground-level shore centre. Blender +X runs along the shore,
Blender -Y is water and +Y is land. glTF export maps that to +X along shore,
+Z toward water and +Y up. For a bank whose water is east/world +X use
rotationY=+pi/2; west=-pi/2; south/world +Z=0; north/world -Z=pi.
Authoring limits: X +/-2m, land +Y <=.35m, water -Y >=-.75m,
height -.50m..+.28m. The primary rocks continue below the -.15m waterline.
"""
from pathlib import Path
import sys, math, random
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from asset_common import *
from mathutils import Vector

reset_scene()
m = materials()
rng = random.Random(119037)


def angular_rock(name, cx, cy, rx, ry, low, high, sides=8, turn=0):
    """Asymmetric angular block with fracture ledge, sloping cap and real depth."""
    outline = []
    for j in range(sides):
        a = turn + j * math.tau / sides + rng.uniform(-.09, .09)
        r = rng.uniform(.82, 1.0)
        outline.append((math.cos(a) * rx * r, math.sin(a) * ry * r))
    verts = []
    # Undercut base, broken shoulder and smaller uneven upper fracture ring.
    # All three rings belong to the same closed stone, rather than floating caps.
    for level, z in enumerate([low, low * .18 + high * .82 - .045, high]):
        for x, y in outline:
            scale = [ .84, 1.0, .78 ][level]
            shift_x = [ .025, 0, -.035 ][level]
            shift_y = [ -.018, 0, .023 ][level]
            verts.append((cx + x * scale + shift_x, cy + y * scale + shift_y,
                          z + (rng.uniform(-.018, .008) if level else 0)))
    center = len(verts)
    verts.append((cx - .03, cy + .01, high - .023))
    faces = [tuple(reversed(range(sides)))]
    for level in range(2):
        for j in range(sides):
            k = (j + 1) % sides
            faces.append((level*sides+j, level*sides+k,
                          (level+1)*sides+k, (level+1)*sides+j))
    for j in range(sides):
        faces.append((2*sides+j, 2*sides+(j+1)%sides, center))
    o = mesh(name, verts, faces, m['stone'])
    uv_world(o, .8)
    return verts[2*sides:3*sides], verts[center]


def moss_on_fracture(name, ring, center, sections):
    """Interrupted real surface skin; never a rectangular band across the bank."""
    for index in sections:
        a, b = Vector(ring[index % len(ring)]), Vector(ring[(index+1) % len(ring)])
        c = Vector(center)
        # A broken inward-growing triangular patch, inset from the exposed edge.
        p = a.lerp(c, rng.uniform(.05,.18)) + Vector((0,0,.005))
        q = b.lerp(c, rng.uniform(.08,.24)) + Vector((0,0,.005))
        end = c.lerp((a+b)*.5, .2) + Vector((0,0,.007))
        middle = (p+q+end)/3 + Vector((0,0,.008))
        o = mesh(name, [tuple(v) for v in [p,q,end,middle]],
                 [(0,1,3),(1,2,3),(2,0,3)], m['moss'])
        uv_world(o, .32)


# Three unequal fracture blocks, with visible voids between the rock groups.
# The large western block anchors the cluster; the other two are rotated,
# partially submerged remnants, not a row of matching round stones.
rocks = [
    ('western buried fracture block', -1.30, -.13, .57, .35, -.45, .215, 7, .19),
    ('central tilted bank fragment', -.06, -.31, .60, .39, -.48, .245, 8, -.17),
    ('eastern drowned stone slab', 1.16, -.27, .49, .36, -.43, .125, 7, .31),
]
for i, spec in enumerate(rocks):
    ring, centre = angular_rock(*spec)
    moss_on_fracture('interrupted moss on bank stone', ring, centre,
                     [[0,1,5], [1,2,3,6], [0,4,5]][i])

# Small angular collapse chips collect preferentially around two gaps.
# Their height/size varies, and much of the 4m span remains open mud/water.
for index in range(17):
    if index < 11:
        cx = rng.uniform(.42,.78)
        cy = rng.uniform(-.37,.10)
    else:
        cx = rng.uniform(-.82,-.58)
        cy = rng.uniform(-.18,.20)
    rx = rng.uniform(.035,.115)
    ry = rng.uniform(.03,.09)
    top = rng.uniform(-.08,.055)
    ring, centre = angular_rock('splintered submerged bank chip', cx, cy, rx, ry,
                               top-rng.uniform(.08,.17), top, 5,
                               rng.random()*math.tau)
    if index % 5 == 0:
        moss_on_fracture('moss on sheltered chip', ring, centre, [0])

# Low silt/moss shelves are short, irregular islands underneath the rock toes.
# They follow the bank but are explicitly separated: no continuous 4m bar.
for index, (cx,cy,rx,ry) in enumerate([(-1.25,-.06,.52,.27),(-.02,-.17,.54,.30),
                                     (1.16,-.12,.43,.26),(.62,.04,.18,.14)]):
    n=9
    ring=[]
    for j in range(n):
        a=j*math.tau/n+rng.uniform(-.08,.08)
        factor=rng.uniform(.72,1)
        ring.append((cx+math.cos(a)*rx*factor,cy+math.sin(a)*ry*factor,
                     -.035+rng.uniform(-.014,.008)))
    verts=ring+[(cx,cy,-.006)]
    o=mesh('broken moss and sediment shelf',verts,
           [(j,(j+1)%n,n) for j in range(n)],m['moss'])
    uv_world(o,.4)

# Fine roots enter fractures on the land side and continue through the water
# level, rather than ending exactly on the flat water surface.
root_paths = [
    ([(-1.58,.20,.07),(-1.50,.09,.19),(-1.43,-.11,.22),(-1.39,-.31,.08),(-1.43,-.43,-.19),(-1.39,-.46,-.36)], [.022,.020,.017,.014,.009,.002]),
    ([(-.39,.23,.025),(-.25,.12,.19),(-.16,-.07,.25),(-.08,-.30,.25),(.02,-.51,.045),(.08,-.62,-.28)], [.024,.022,.020,.016,.010,.002]),
    ([(1.36,.20,.015),(1.25,.08,.12),(1.15,-.13,.14),(1.24,-.35,.08),(1.19,-.51,-.15),(1.12,-.58,-.33)], [.018,.017,.014,.012,.007,.002]),
]
for i,(points,radii) in enumerate(root_paths):
    tube('root entering eroded bank fissure',points,radii,m['bark'],6)
    p=Vector(points[-3])
    tube('fine divided root in water',[p,p+Vector((.05*(-1 if i%2 else 1),-.08,-.07)),
         p+Vector((.10*(-1 if i%2 else 1),-.11,-.17))],[.009,.005,.0015],m['bark'],5)

# Fail before export if later edits exceed the agreed low-cost placement box.
obs=[o for o in bpy.context.scene.objects if o.type=='MESH']
triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in obs)
assert triangles <= 3500, f'Bank exceeds 3500 triangles: {triangles}'
for obj in obs:
    for vertex in obj.data.vertices:
        v=obj.matrix_world@vertex.co
        assert -2.001 <= v.x <= 2.001, f'Bank shore span exceeded: {obj.name}'
        assert -.751 <= v.y <= .351, f'Bank crosses land/water clearance: {obj.name}'
        assert -.501 <= v.z <= .281, f'Bank vertical clearance exceeded: {obj.name}'

finish('v3_eroded_bank',
       '幅4m以内の非対称な侵食岸。原点=地表の岸中心。Blender-Xは岸沿い、-Yが水側（glTF+Z）、+Yが陸側（glTF-Z）。'
       '水側最大0.75m/陸側最大0.35m、下0.5m/上0.28m。大小3つの角形破断岩と偏った小礫、途切れた泥苔棚、'
       '水面下まで続く細根。水がworld+X側ならrotationY=+pi/2、-X側=-pi/2、+Z側=0、-Z側=pi。'
       '単純な4m棒や均一玉石列ではなく、隙間を残して配置する。')
