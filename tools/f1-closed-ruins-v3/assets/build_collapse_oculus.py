"""One 4.04 m square fractured ceiling rim with a genuinely open oculus.

Blender Z becomes glTF Y. Geometry stays inside Z=0..0.65 m and fits
X/Y=+-2.02 m; root ends never descend below the module's lower datum.
The nominal 2.5 m opening is irregular, not a boolean-painted dark disk.
Run this asset alone after the previous individual asset has been reviewed.
The common finish exports, reimports and renders four evidence directions.
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
rng = random.Random(7305)
N = 48
HALF = 2.02

# Angular samples include the four square corners. Both outer rings are
# identical in XY, so their planar sides overlap neighboring 4m vault cells
# by 2cm. All eight rings run around an empty center; there is no center fan.
angles = [math.tau*i/N for i in range(N)]
inner = [1.29 + .052*math.sin(3*a+.35) + .034*math.sin(7*a-1.1)
         + .019*math.sin(11*a+.8) for a in angles]
outer = [HALF/max(abs(math.cos(a)), abs(math.sin(a))) for a in angles]
verts = []
for ring in range(8):
    for i, a in enumerate(angles):
        low_wave = .012*math.sin(5*a+.7) + .008*math.sin(9*a)
        top_wave = .009*math.sin(3*a) + .008*math.sin(8*a+.2)
        if ring == 0:
            radius, z = outer[i], .105
        elif ring == 1:
            radius, z = inner[i]+.43*(outer[i]-inner[i]), .085+low_wave
        elif ring == 2:
            radius, z = inner[i]+.035*math.sin(4*a), .155+low_wave
        elif ring == 3:
            # Broad tilted rock fracture facets, not a smooth circular tube.
            radius, z = inner[i]-.018, .442+.018*math.sin(6*a+.5)
        elif ring == 4:
            # A narrow exposed brown sediment/root layer below the moss lip.
            radius, z = inner[i]-.012+.014*math.sin(7*a), .533+.015*math.sin(5*a)
        elif ring == 5:
            radius, z = inner[i]+.030, .605+top_wave
        elif ring == 6:
            radius, z = inner[i]+.48*(outer[i]-inner[i]), .630+top_wave
        else:
            radius, z = outer[i], .615
        verts.append((radius*math.cos(a), radius*math.sin(a), z))

faces = []
material_indices = []
for ring in range(8):
    next_ring = (ring+1) % 8
    for i, a in enumerate(angles):
        j = (i+1) % N
        faces.append((ring*N+i, ring*N+j, next_ring*N+j, next_ring*N+i))
        # Connected sheltered moss areas on the upper annulus; angular stone
        # edges remain visible. No independent floating moss sheet is needed.
        shade = math.sin(2*a+.5)+.53*math.sin(5*a-1.0)+.21*math.sin(9*a)
        if ring == 3:
            material_indices.append(2)  # thin brown soil/root lamination
        elif ring in (4, 5, 6) and shade > (-.38 if ring == 5 else .12):
            material_indices.append(1)
        else:
            material_indices.append(0)

rim = mesh('fractured square ceiling ring open center', verts, faces, m['stone'])
rim.data.materials.append(m['moss'])
rim.data.materials.append(m['bark'])
for poly, index in zip(rim.data.polygons, material_indices):
    poly.material_index = index
    poly.use_smooth = False
uv_world(rim, .75)

# Roots emerge visibly from the sediment layer and taper along the broken
# inner face. They do not form an evenly spaced curtain or fill the aperture.
root_angles = [.18, .43, .67, 1.58, 1.82, 2.67, 3.13, 3.38, 4.29, 4.50, 5.52, 5.85]
for i, a in enumerate(root_angles):
    idx = int(round(a/math.tau*N)) % N
    radius = inner[idx]
    lean = rng.uniform(-.055, .055)
    reach = rng.uniform(.11, .18)
    points = []
    for t, z in [(0, .558), (.22, .470), (.48, .330), (.76, .170), (1, .017)]:
        angle = a+lean*t+.018*math.sin(t*math.pi)
        r = radius+.035-reach*t
        points.append((r*math.cos(angle), r*math.sin(angle), z))
    radii = [.027, .030, .023, .013, .004]
    tube('attached hanging root %02d' % i, points, radii, m['bark'], sides=6)
    if i in (1, 3, 5, 7, 9, 10):
        px, py, pz = points[2]
        side = -.065 if i % 2 else .065
        fork = [(px, py, pz),
                ((radius-.09)*math.cos(a+side), (radius-.09)*math.sin(a+side), .208),
                ((radius-.12)*math.cos(a+side*1.3), (radius-.12)*math.sin(a+side*1.3), .092)]
        tube('fine lateral root fork %02d' % i, fork, [.012, .008, .003], m['bark'], sides=5)

# Six shallow gripping runs join the hanging roots to the upper moss bed.
# Their paths follow the stone surface rather than floating across the hole.
for i, a in enumerate([.40, 1.68, 2.70, 3.23, 4.43, 5.66]):
    idx = int(round(a/math.tau*N)) % N
    radius = inner[idx]
    points = []
    for j in range(6):
        t = j/5
        r = radius+.055+.35*(1-t)
        aa = a+.085*math.sin(t*math.pi)
        points.append((r*math.cos(aa), r*math.sin(aa), .607-.030*t))
    tube('upper attached feeder root %02d' % i, points,
         [.005, .012, .019, .024, .026, .026], m['bark'], sides=6)

# Explicit checks are evaluated when the root producer runs Blender. They are
# not claimed as executed by writing this script. The center disk remains
# empty even after roots; no triangle may bridge the hole unnoticed.
def edge_origin_distance(a, b):
    dx, dy = b[0]-a[0], b[1]-a[1]
    denom = dx*dx+dy*dy
    t = max(0., min(1., -(a[0]*dx+a[1]*dy)/denom)) if denom else 0.
    return math.hypot(a[0]+t*dx, a[1]+t*dy)


def triangle_origin_distance(a, b, c):
    area2 = (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
    if abs(area2) < 1e-10:
        return min(edge_origin_distance(a, b), edge_origin_distance(b, c), edge_origin_distance(c, a))
    crosses = [(v[0]-u[0])*(-u[1])-(v[1]-u[1])*(-u[0])
               for u, v in ((a, b), (b, c), (c, a))]
    if all(v >= 0 for v in crosses) or all(v <= 0 for v in crosses):
        return 0.
    return min(edge_origin_distance(a, b), edge_origin_distance(b, c), edge_origin_distance(c, a))


objects = [o for o in bpy.context.scene.objects if o.type == 'MESH']
triangles = 0
minimum_aperture_radius = math.inf
for obj in objects:
    obj.data.calc_loop_triangles()
    triangles += len(obj.data.loop_triangles)
    for vertex in obj.data.vertices:
        co = obj.matrix_world @ vertex.co
        assert abs(co.x) <= 2.020001 and abs(co.y) <= 2.020001, 'Oculus exceeded square join boundary'
        assert -.000001 <= co.z <= .650001, 'Oculus exceeded 0..0.65m vertical envelope'
    for tri in obj.data.loop_triangles:
        p = [obj.matrix_world @ obj.data.vertices[k].co for k in tri.vertices]
        minimum_aperture_radius = min(minimum_aperture_radius, triangle_origin_distance(*p))
used = {mat.name for o in objects for mat in o.data.materials if mat}
assert triangles <= 2500, 'Oculus triangle budget exceeded: %d' % triangles
assert used <= {m[k].name for k in ('stone', 'moss', 'bark')}, 'Unexpected oculus material'
assert minimum_aperture_radius >= 1.05, 'Geometry bridges the open oculus center'
rim['nominal_oculus_diameter_m'] = 2.5
rim['minimum_empty_cylinder_radius_m'] = minimum_aperture_radius
rim['placement_underside_world_y_m'] = 3.5
rim['outer_join_width_m'] = 4.04
finish('v3_collapse_oculus',
       '4.04m角、厚さ最大0.65mの独立した天井崩落孔縁。公称直径2.5mの不規則な実開口、'
       '広い石破断面、薄い土根層、連続した上面苔と付着する垂れ根。中央を面で埋めず、'
       '半径1.05m以上の空洞を三角形投影で検査。stone/moss/barkの3材質、2500tris以下。'
       '配置Y3.5m、外周は4m vaultへ片側2cm重ねる。新規単体asset、旧素材は変更しない。')
