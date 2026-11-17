# Claude (water team W, B2 v4): post-process for GPT's 16 modular water tiles.
# The GPT generator (build-modular-water-tiles.py) is NOT modified. This script runs after it in the
# same Blender container and:
#   1. imports each water_tile_XX.glb, reduces the dense 109x109 grids with a planar decimate
#      (flat water / riverbed / shoreline only; rock ledges are kept) and exports lite/water_tile_XX.glb
#   2. builds seam-test layouts (cross, T, L, dead end, single, 2x2, 3x3, river) from the lite tiles,
#      choosing every tile from the N=8/E=2/S=1/W=4 neighbour mask, and renders top/angle previews
#   3. writes manifest.json (triangle counts before/after per tile, per-edge seam samples)
import bpy, bmesh, math, os, json
from mathutils import Vector

SRC = '/work/render-output/b2-water-tiles'
OUT = '/work/render-output/b2-water-tiles-lite'
os.makedirs(OUT, exist_ok=True)
BITS = {'N': 8, 'E': 2, 'S': 1, 'W': 4}
GRID_NAMES = ('glacial water surface', 'submerged mineral riverbed', 'visible shallow mineral shelves', 'single continuous dark slate shoreline')


def clear():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes, bpy.data.materials):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def tri_count(objs):
    n = 0
    for o in objs:
        if o.type != 'MESH':
            continue
        for p in o.data.polygons:
            n += len(p.vertices) - 2
    return n


def import_tile(path):
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in bpy.context.scene.objects if o not in before]


def decimate(o, angle_deg):
    # glTF import splits vertices per face (flat normals); weld them first or nothing can be dissolved
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bm.to_mesh(o.data)
    bm.free()
    o.data.update()
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    m = o.modifiers.new('planar', 'DECIMATE')
    m.decimate_type = 'DISSOLVE'
    m.angle_limit = math.radians(angle_deg)
    try:
        m.delimit = {'MATERIAL'}
    except Exception:
        pass
    bpy.ops.object.modifier_apply(modifier=m.name)
    t = o.modifiers.new('tri', 'TRIANGULATE')
    bpy.ops.object.modifier_apply(modifier=t.name)


manifest = {'tiles': [], 'bits': BITS, 'note': 'lite = planar decimate of the flat grids only (water, riverbed, shelves, shoreline). Rock ledges/pools/boulders untouched.'}
for mask in range(16):
    clear()
    src = '%s/water_tile_%02d.glb' % (SRC, mask)
    objs = import_tile(src)
    meshes = [o for o in objs if o.type == 'MESH']
    tri0 = tri_count(meshes)
    names = []
    for o in meshes:
        names.append(o.name)
        if any(o.name.startswith(g) for g in GRID_NAMES):
            decimate(o, 5.0)
    tri1 = tri_count(meshes)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    dst = '%s/water_tile_%02d.glb' % (OUT, mask)
    bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', use_selection=True)
    edges = {s: bool(mask & b) for s, b in BITS.items()}
    manifest['tiles'].append({'mask': mask, 'file': 'water_tile_%02d.glb' % mask, 'water_edges': edges, 'triangles_source': tri0, 'triangles_lite': tri1, 'objects': names})
    print('tile %02d  tris %d -> %d  objects %d' % (mask, tri0, tri1, len(meshes)))

# ---- seam test layouts -------------------------------------------------------------
# '#' land, 'w' water. Masks come only from water neighbours, so A.E==B.W and A.S==B.N by construction.
LAYOUT = [
    '...........',
    '.w...www.w.',
    '.w...www.w.',
    '.www.www.w.',
    '.....w.....',
    '.ww..w..w..',
    '.ww.www.w..',
    '.....w..ww.',
    '.w.........',
    '...........',
]
H = len(LAYOUT); W = len(LAYOUT[0])
water = lambda x, y: 0 <= y < H and 0 <= x < W and LAYOUT[y][x] == 'w'
clear()
placed = []
seam_errors = 0
for y in range(H):
    for x in range(W):
        if not water(x, y):
            continue
        m = (8 if water(x, y - 1) else 0) | (1 if water(x, y + 1) else 0) | (2 if water(x + 1, y) else 0) | (4 if water(x - 1, y) else 0)
        # adjacency check (explicit, mirrors the in-game check)
        if water(x + 1, y):
            m2 = (8 if water(x + 1, y - 1) else 0) | (1 if water(x + 1, y + 1) else 0) | (2 if water(x + 2, y) else 0) | (4 if water(x, y) else 0)
            if bool(m & 2) != bool(m2 & 4):
                seam_errors += 1
        objs = import_tile('%s/water_tile_%02d.glb' % (OUT, m))
        for o in objs:
            if o.parent is None:
                o.location.x += x - (W - 1) / 2
                o.location.y += -(y - (H - 1) / 2)   # map row grows southwards (-Y in Blender)
        placed.append(m)
# plain land plates where the map has no water (the tiles' own land is the shore)
land = bpy.data.materials.new('preview land')
land.diffuse_color = (.10, .16, .21, 1)
land.use_nodes = True
land.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value = (.10, .16, .21, 1)
for y in range(H):
    for x in range(W):
        if water(x, y):
            continue
        bpy.ops.mesh.primitive_plane_add(size=1, location=(x - (W - 1) / 2, -(y - (H - 1) / 2), .012))
        bpy.context.object.data.materials.append(land)
manifest['seam_test'] = {'layout': LAYOUT, 'masks_used': sorted(set(placed)), 'mask_mismatches': seam_errors}

world = bpy.context.scene.world or bpy.data.worlds.new('Blue cavern')
bpy.context.scene.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (.06, .12, .19, 1)
for loc, power, size in [((0, -6, 10), 900, 9), ((-5, 5, 8), 500, 7)]:
    bpy.ops.object.light_add(type='AREA', location=loc)
    o = bpy.context.object
    o.data.energy = power
    o.data.size = size
    o.rotation_euler = (Vector((0, 0, 0)) - o.location).to_track_quat('-Z', 'Y').to_euler()
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 24
scene.view_settings.view_transform = 'Standard'
scene.render.resolution_x = 1400
scene.render.resolution_y = 1100
for name, pos, scale in [('seam_top', (0, 0, 14), 11.5), ('seam_angle', (6, -9, 8), 9.5), ('seam_close', (1.6, -3.4, 2.4), 3.6)]:
    bpy.ops.object.camera_add(location=pos)
    cam = bpy.context.object
    target = Vector((1.0, 0.6, 0)) if name == 'seam_close' else Vector((0, 0, 0))
    cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = scale
    scene.camera = cam
    scene.render.filepath = OUT + '/' + name + '.png'
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam, do_unlink=True)

with open(OUT + '/manifest.json', 'w') as f:
    json.dump(manifest, f, indent=1)
print('seam mask mismatches:', seam_errors)
