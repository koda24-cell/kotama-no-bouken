"""Original botanical geometry helpers shared by the six individual assets.

No scene is built on import. Blender Z up, metre units. Leaf and cylindrical
UVs are authored here so bark follows stems and veins follow leaf length.
"""
from pathlib import Path
import math
import random
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import OUT, material, mesh, tube
from mathutils import Vector


def botanical_materials():
    tex = OUT / 'textures'
    sets = {key: tex / ('bark_' + value + '.jpg') for key, value in
            [('basecolor', 'color'), ('normal', 'normal'), ('roughness', 'roughness')]}
    bark = material('cedar_weathered_bark', (.13, .105, .079, 1), .91,
                    texture_set=sets if all(p.exists() for p in sets.values()) else None)
    return {
        'bark': bark,
        'heart': material('cedar_old_heartwood', (.22, .15, .078, 1), .93),
        'dark': material('cedar_cavity_shadow', (.027, .025, .018, 1), .98),
        'moss': material('cedar_shade_moss', (.105, .15, .054, 1), .96),
        'leaf': material('forest_leaf', (.045, .105, .032, 1), .78),
        'leaf_light': material('forest_new_leaf', (.105, .175, .060, 1), .75),
        'leaf_old': material('forest_old_leaf', (.09, .105, .036, 1), .89),
        'stem': material('forest_flexible_stem', (.071, .11, .035, 1), .86),
    }


def stem(name, points, radius, mat, sides=7):
    """Use longitudinal UVs rather than projecting bark across ring cuts."""
    obj = tube(name, points, radius, mat, sides=sides)
    uv = obj.data.uv_layers.new(name='UVMap')
    distances = [0]
    for a, b in zip(points, points[1:]):
        distances.append(distances[-1] + (Vector(b)-Vector(a)).length)
    for poly in obj.data.polygons:
        js = [obj.data.loops[i].vertex_index % sides for i in poly.loop_indices]
        seam = max(js)-min(js) > sides/2
        for loop in poly.loop_indices:
            vi = obj.data.loops[loop].vertex_index
            j, row = vi % sides, vi // sides
            u = j / sides
            if seam and j == 0:
                u = 1
            uv.data[loop].uv = (u, distances[row] / .7)
    return obj


def leaf(name, base, tip, width, mat, roll=0, curve=.03, bite=False):
    """Six triangle lanceolate/ovate blade with a raised central midrib.

    The outer edge can have an actual small feeding notch rather than merely
    a painted dot. Geometry is double-sided through the material, not alpha.
    """
    a, b = Vector(base), Vector(tip)
    axis = b-a
    side = axis.cross(Vector((0, 0, 1)))
    if side.length < .001:
        side = axis.cross(Vector((0, 1, 0)))
    side.normalize()
    normal = side.cross(axis.normalized()).normalized()
    side = side*math.cos(roll)+normal*math.sin(roll)
    normal = side.cross(axis.normalized()).normalized()
    c1, c2 = a+axis*.36+normal*curve, a+axis*.72+normal*curve*.8
    verts = [a, c1, c2, b, c1-side*width*.52-normal*curve*.45,
             c2-side*width*.38-normal*curve*.4,
             c1+side*width*(.29 if bite else .52)-normal*curve*.4,
             c2+side*width*.38-normal*curve*.4]
    faces = [(0, 4, 1), (1, 4, 5), (1, 5, 2), (2, 5, 3),
             (0, 1, 6), (1, 2, 7, 6), (2, 3, 7)]
    obj = mesh(name, [tuple(v) for v in verts], faces, mat)
    uv = obj.data.uv_layers.new(name='UVMap')
    coords = [(.5, 0), (.5, .36), (.5, .72), (.5, 1),
              (0, .36), (.1, .72), (1, .36), (.9, .72)]
    for loop in obj.data.loops:
        uv.data[loop.index].uv = coords[loop.vertex_index]
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj


def moss_patch(name, center, radius, mat, rng, slope=(0, 0), count=12):
    c = Vector(center)
    verts = [tuple(c)]
    for i in range(count):
        a = math.tau*i/count
        r = radius*rng.uniform(.65, 1.13)
        x, y = math.cos(a)*r, math.sin(a)*r
        verts.append(tuple(c+Vector((x, y, slope[0]*x+slope[1]*y+rng.uniform(-.006, .006)))))
    return mesh(name, verts, [(0, i+1, (i+1) % count+1) for i in range(count)], mat)


def object_texture_state():
    return all((OUT / 'textures' / ('bark_'+k+'.jpg')).exists()
               for k in ('color', 'normal', 'roughness'))
