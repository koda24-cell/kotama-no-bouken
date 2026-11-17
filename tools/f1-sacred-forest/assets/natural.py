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


def _leaf_texture_arrays():
    """Original UV-space botanical maps, not sampled from a photograph.

    U=.5 follows the raised geometric midrib; V runs from petiole to tip.
    Secondary veins rise toward the tip. Contrasts stay low so the blade
    reads as a surface rather than a collection of dark inked lines.
    """
    import numpy as np
    n = 256
    v, u = np.mgrid[0:n, 0:n].astype(float) / (n-1)
    rng = np.random.default_rng(411022)
    dx = np.abs(u-.5)
    midrib = np.exp(-((u-.5)/.012)**2)
    phase = v-dx*.61+.006*np.sin(u*math.tau*2)
    distance = np.abs((phase+.058) % .116-.058)
    veins = np.exp(-(distance/.0052)**2)
    veins *= np.clip(dx/.05, 0, 1) * np.clip((1-v)/.15, 0, 1)
    # Finer tertiary vein cells are a gentle micro-relief, not an overlay grid.
    cells = .5+.5*np.sin(math.tau*(v*31+dx*17))
    cells *= .5+.5*np.sin(math.tau*(v*23-dx*21))
    broad = np.zeros((n, n))
    fy, fx = np.meshgrid(np.fft.fftfreq(n)*n, np.fft.fftfreq(n)*n, indexing='ij')
    spectrum = np.fft.fft2(rng.normal(size=(n, n)))
    broad = np.fft.ifft2(spectrum*np.exp(-.5*((fx/7)**2+(fy/9)**2))).real
    broad -= broad.mean()
    broad /= max(broad.std(), 1e-6)
    grain = rng.normal(0, 1, (n, n))
    # OpenGL (+Y) normals derived from the height field, with normalized XYZ.
    height = midrib*.0024+veins*.0011+cells*.00005+broad*.00006
    dy, dxh = np.gradient(height, 1/(n-1), 1/(n-1))
    normals = np.stack((-dxh, -dy, np.ones_like(height)), axis=-1)
    normals /= np.linalg.norm(normals, axis=-1, keepdims=True)
    normal = np.ones((n, n, 4), dtype=np.float32)
    normal[:, :, :3] = normals*.5+.5
    orm = np.ones_like(normal)
    orm[:, :, 0] = np.clip(.985-veins*.012, .94, 1)
    orm[:, :, 1] = np.clip(.82+broad*.019+grain*.003-veins*.095-midrib*.065, .65, .92)
    orm[:, :, 2] = 0
    tip_age = np.clip((v-.72)/.28, 0, 1)**2
    edge_age = np.clip((np.abs(u-.5)-.37)/.13, 0, 1)**2
    colors = {}
    variants = {
        'leaf': ((.045, .105, .032), .10),
        'leaf_light': ((.105, .175, .060), .045),
        'leaf_old': ((.09, .105, .036), .30),
    }
    for key, (rgb, aging) in variants.items():
        base = np.array(rgb, dtype=float)
        rgb = np.broadcast_to(base, (n, n, 3)).copy()
        # Pigment variation, mild vein lightening, rare restrained age freckles.
        rgb *= (1+broad*.075+grain*.008+midrib*.15+veins*.075)[:, :, None]
        age = aging*(tip_age*.7+edge_age*.3)
        rgb[:, :, 0] *= 1+age*.40
        rgb[:, :, 1] *= 1-age*.10
        rgb[:, :, 2] *= 1-age*.23
        freckles = np.clip((broad-1.6)/1.6, 0, 1)*aging*.08
        rgb *= 1-freckles[:, :, None]
        srgb = np.where(rgb <= .0031308, rgb*12.92,
                        1.055*np.maximum(rgb, 0)**(1/2.4)-.055)
        rgba = np.ones((n, n, 4), dtype=np.float32)
        rgba[:, :, :3] = np.clip(srgb, 0, 1)
        colors[key] = rgba
    return colors, normal, orm


def leaf_texture_sets():
    """Generate 3 tiny color variants sharing one normal and one ORM image."""
    import bpy
    cache = OUT / 'sources' / 'generated_materials'
    cache.mkdir(parents=True, exist_ok=True)
    shared = {k: cache / ('woodland_leaf_veins_v2_'+k+'.jpg') for k in ('normal', 'orm')}
    sets = {key: dict(shared, basecolor=cache / ('woodland_'+key+'_veins_v2_basecolor.jpg'))
            for key in ('leaf', 'leaf_light', 'leaf_old')}
    paths = [*shared.values(), *(p['basecolor'] for p in sets.values())]
    if not all(p.exists() for p in paths):
        colors, normal, orm = _leaf_texture_arrays()
        maps = [(shared['normal'], normal), (shared['orm'], orm)]
        maps += [(sets[key]['basecolor'], pixels) for key, pixels in colors.items()]
        for path, pixels in maps:
            im = bpy.data.images.new(path.stem, width=256, height=256, alpha=False)
            # Arrays already contain sRGB color or encoded data-map values.
            # Write those raw bytes; common._image assigns the reader space.
            im.colorspace_settings.name = 'Non-Color'
            im.pixels.foreach_set(pixels.ravel())
            im.filepath_raw = str(path)
            im.file_format = 'JPEG'
            im.save()
            bpy.data.images.remove(im)
    return sets


def botanical_materials():
    tex = OUT / 'textures'
    sets = {key: tex / ('bark_' + value + '.jpg') for key, value in
            [('basecolor', 'color_graded'), ('normal', 'normal'), ('roughness', 'roughness')]}
    bark = material('cedar_weathered_bark', (.13, .105, .079, 1), .91,
                    texture_set=sets if all(p.exists() for p in sets.values()) else None)
    leaves = leaf_texture_sets()
    return {
        'bark': bark,
        'heart': material('cedar_old_heartwood', (.22, .15, .078, 1), .93),
        'dark': material('cedar_cavity_shadow', (.027, .025, .018, 1), .98),
        'moss': material('cedar_shade_moss', (.105, .15, .054, 1), .96),
        'leaf': material('forest_leaf', (.045, .105, .032, 1), .78, texture_set=leaves['leaf']),
        'leaf_light': material('forest_new_leaf', (.105, .175, .060, 1), .75, texture_set=leaves['leaf_light']),
        'leaf_old': material('forest_old_leaf', (.09, .105, .036, 1), .89, texture_set=leaves['leaf_old']),
        'stem': material('forest_flexible_stem', (.071, .11, .035, 1), .86),
    }


def stem(name, points, radius, mat, sides=7):
    """Use longitudinal UVs rather than projecting bark across ring cuts."""
    obj = tube(name, points, radius, mat, sides=sides)
    # common.tube already supplies metre-scale cylindrical UVs. A second UV
    # layer can make the normal texture use a different exported channel.
    uv = obj.data.uv_layers.active
    if uv is not None:
        uv.active_render = True
    return obj


def leaf(name, base, tip, width, mat, roll=0, curve=.03, bite=False):
    """Smooth 36-triangle blade with longitudinal bow and a raised midrib.

    Eleven longitudinal samples shape the ovate/lanceolate outline, instead
    of the old few-point diamond. Fern width remains caller-controlled. A
    feeding notch is a small local outline loss, never a large angular bite.
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
    samples=[0,.07,.16,.27,.39,.51,.63,.75,.85,.93,1]
    # A deterministic leaf-local phase produces restrained non-identical rims.
    phase=math.sin(a.x*17+a.y*11+b.z*23)*2.4
    verts=[tuple(a)];coords=[(.5,0)]
    for t in samples[1:-1]:
        profile=(math.sin(math.pi*t)**.78)*(1-.20*t)*1.11
        half_width=width*.52*profile
        arch=curve*(math.sin(math.pi*t)**.85)
        tip_curl=-curve*.40*(max(0,(t-.76)/.24)**2)
        c=a+axis*t+normal*(arch+tip_curl)
        ripple=.018*math.sin(t*math.pi*7+phase)+.009*math.sin(t*math.pi*15-phase)
        notch=.12*math.exp(-((t-.84)/.065)**2) if bite else 0
        left=c-side*half_width*(1+ripple)-normal*curve*.27*profile
        right=c+side*half_width*(1-ripple-notch)-normal*curve*.30*profile
        verts += [tuple(left),tuple(c),tuple(right)]
        coords += [(0,t),(.5,t),(1,t)]
    verts.append(tuple(b-normal*curve*.40));coords.append((.5,1))
    # U grows from left to right; the winding points toward the raised midrib.
    faces=[(0,2,1),(0,3,2)]
    for row in range(8):
        start=1+row*3;next_start=start+3
        faces += [(start,start+1,next_start+1,next_start),
                  (start+1,start+2,next_start+2,next_start+1)]
    tip_index=len(verts)-1;last=1+8*3
    faces += [(last,last+1,tip_index),(last+1,last+2,tip_index)]
    obj = mesh(name, [tuple(v) for v in verts], faces, mat)
    uv = obj.data.uv_layers.new(name='UVMap')
    obj.data.uv_layers.active = uv
    uv.active_render = True
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
               for k in ('color_graded', 'normal', 'roughness'))
