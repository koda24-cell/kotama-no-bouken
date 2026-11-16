"""Assemble individually finished GLBs into a sacred-forest review scene.

No environment geometry or asset is generated here. Each placed object is a
linked copy of the exported, reimported individual GLB. This is a candidate
environment, not a modification of the game's tile map or collision rules.

Blender CLI examples (arguments follow Blender's ``--`` separator)::

  blender -b --python tools/f1-sacred-forest/assemble_scene.py -- --build
  blender -b --python tools/f1-sacred-forest/assemble_scene.py -- --render-view entry
  blender -b --python tools/f1-sacred-forest/assemble_scene.py -- --render-view courtyard --samples 64
  blender -b --python tools/f1-sacred-forest/assemble_scene.py -- --build --export-glb

``--build`` writes scene/scene.blend and scene/assembly-layout.json without a
render. ``--render-view`` opens that saved scene if it already exists; otherwise
it first assembles all assets. ``--rebuild`` forces reassembly before rendering.
Scene GLB export is deliberately optional because it can duplicate the kit.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import random
import subprocess
import sys

import bpy
from mathutils import Vector, Matrix

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from common import OUT, ROOT, repair_zero_tangents

SCENE_DIR = OUT / "scene"
SCENE_FILE = SCENE_DIR / "scene.blend"
LAYOUT_FILE = SCENE_DIR / "assembly-layout.json"
RENDER_DIR = OUT / "renders" / "scene"

ASSETS = {
    "mod_sacred_stone_floor_4m": "modules",
    "mod_root_soil_floor_4m": "modules",
    "mod_sacred_wall_4m": "modules",
    "mod_sacred_collapsed_wall_4m": "modules",
    "mod_sacred_arch_4m": "modules",
    "sacred_cedar_tree": "props",
    "fallen_cedar_log": "props",
    "forest_fern_cluster": "props",
    "forest_shrub_cluster": "props",
    "white_wildflower_patch": "props",
    "hanging_forest_vines": "props",
    "weathered_torii_gate": "props",
    "broken_votive_stele": "props",
    "moss_stone_lantern": "props",
    "ofuda_seal_cluster": "props",
    "sacred_hokora_shrine": "props",
    "mossy_granite_boulder": "props",
}

VIEWS = {
    "entry": {
        "position": (0.0, -13.4, 1.6), "target": (0.0, .7, 2.0),
        "lens": 25.8, "description": "人の目高1.6m。根の参道から退色鳥居と中庭を予告。",
    },
    "courtyard": {
        "position": (-.55, -3.5, 1.6), "target": (1.0, 5.0, 2.35),
        "lens": 24.5, "description": "目高1.6m。石碑・古杉・封印回廊を同一画面で確認。",
    },
    "sealed_corridor": {
        "position": (.0, 11.0, 1.6), "target": (0.0, 18.0, 1.70),
        "lens": 25.8, "description": "目高1.6m。中庭の開放感から石造回廊への圧縮。",
    },
    "shrine_detail": {
        "position": (-1.2, 5.3, 1.6), "target": (-4.8, 8.5, 1.35),
        "lens": 40.0, "description": "目高1.6m。小祠の屋根板・格子・基壇と周囲の植生を接写。",
    },
    "birdseye": {
        "position": (31.0, -38.0, 37.5), "target": (1.0, 2.0, .0),
        "ortho_scale": 59.0, "description": "配置検証用鳥瞰。外側の背景用forest beltも含む。ゲーム視点の証拠とは区別。",
    },
}


def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()


def asset_path(asset_id):
    return OUT / ASSETS[asset_id] / (asset_id + ".glb")


def file_hash(path):
    with path.open('rb') as fh:
        return hashlib.file_digest(fh, 'sha256').hexdigest()


def import_template(asset_id):
    """Keep imported originals in an unlinked library collection.

    The review scene contains copies sharing the original Mesh and Material
    datablocks. Library originals are not linked to the scene, so cannot appear
    as extra objects at the world origin in the render.
    """
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(asset_path(asset_id)))
    objects = sorted(set(bpy.data.objects) - before, key=lambda obj: obj.name)
    if not objects or not any(obj.type == 'MESH' for obj in objects):
        raise RuntimeError("Asset has no imported mesh: " + asset_id)
    allowed = {'MESH', 'EMPTY'}
    unexpected = {obj.type for obj in objects} - allowed
    if unexpected:
        raise RuntimeError("Unexpected content in %s: %s" % (asset_id, sorted(unexpected)))
    library = bpy.data.collections.new("LIBRARY_" + asset_id)
    for obj in objects:
        for collection in list(obj.users_collection):
            collection.objects.unlink(obj)
        library.objects.link(obj)
    return objects


def linked_placement(asset_id, template, name, position, angle_degrees=0, scale=1, collection=None,
                     rotation_x_degrees=0):
    """Duplicate an imported hierarchy without duplicating mesh or images."""
    parent = bpy.data.objects.new(name, None)
    collection.objects.link(parent)
    parent.location = position
    parent.rotation_euler.x = math.radians(rotation_x_degrees)
    parent.rotation_euler.z = math.radians(angle_degrees)
    parent.scale = (scale, scale, scale) if isinstance(scale, (int, float)) else scale
    parent['asset_id'] = asset_id
    parent['source_glb'] = str(asset_path(asset_id).relative_to(OUT))
    copies = {}
    for original in template:
        duplicate = original.copy()
        # Object.copy() intentionally preserves shared Mesh/Material datablocks.
        duplicate.name = name + "__" + original.name
        collection.objects.link(duplicate)
        copies[original] = duplicate
    for original, duplicate in copies.items():
        duplicate.parent = copies.get(original.parent, parent)
        duplicate.matrix_parent_inverse = original.matrix_parent_inverse.copy()
        duplicate.matrix_basis = original.matrix_basis.copy()
    return parent


def planned_placements():
    placements = []
    def add(asset, name, x, y, z=0, angle=0, scale=1, zone="courtyard", role="dressing"):
        placements.append(dict(asset_id=asset, name=name, position=[x, y, z],
                               rotation_z_degrees=angle, rotation_x_degrees=0,
                               scale=scale, zone=zone, role=role))

    # 24 x 32m kit ground. Tile centres remain on a 4m grid; the broad central
    # stone axis is uninterrupted and stays level. No generated ground plane.
    for y in (-12, -8, -4, 0, 4, 8, 12, 16):
        for x in (-8, -4, 0, 4, 8, 12):
            stone = x == 0
            asset = "mod_sacred_stone_floor_4m" if stone else "mod_root_soil_floor_4m"
            role = "walk_floor" if stone else "ground"
            # Only complete quarter turns preserve the exact kit perimeter.
            angle = ((x // 4 + y // 4) % 4) * 90
            add(asset, "ground_%+03d_%+03d" % (x, y), x, y, angle=angle,
                zone="sealed_corridor" if y >= 12 else "root_path" if y <= -8 else "courtyard", role=role)

    # Two sparse, tile-exact ground rings keep first-person views from showing
    # a hard diorama edge. They are scenery only, outside the 24x32m review
    # space and never a proposal to expand the game's traversable map.
    for y in range(-20, 25, 4):
        for x in range(-16, 21, 4):
            if -8 <= x <= 12 and -12 <= y <= 16:
                continue
            add("mod_root_soil_floor_4m", "background_ground_%+03d_%+03d" % (x, y),
                x, y, angle=((x // 4 + y // 4) % 4) * 90,
                zone="background_forest", role="dressing_only")

    # A quiet, readable threshold. Gate timber sits outside the 2m movement box.
    add("weathered_torii_gate", "threshold_torii", 0, -6.1, angle=-2, zone="threshold", role="gateway")
    add("moss_stone_lantern", "approach_lantern_left", -2.65, -10.6, angle=13, zone="root_path")
    add("moss_stone_lantern", "approach_lantern_right", 2.85, -5.0, angle=-17, zone="threshold", scale=.89)

    # The asymmetrical root garden: one hero cedar and a denser outer belt.
    add("sacred_cedar_tree", "hero_cedar", 6.7, 3.5, angle=21, scale=1.12, role="landmark")
    add("sacred_cedar_tree", "western_canopy", -6.9, 5.8, angle=156, scale=.91, role="landmark")
    add("sacred_cedar_tree", "entry_cedar", -6.6, -10.5, angle=82, scale=.82, zone="root_path")
    add("sacred_cedar_tree", "rear_canopy", 9.9, 14.3, angle=248, scale=1.04, zone="sealed_corridor")
    for i, (x, y, angle, scale) in enumerate([
        (-13.2, -12.7, 31, 1.08), (-13.7, -.8, 144, .94),
        (-10.1, 13.4, 258, 1.17), (-5.8, 22.4, 93, 1.02),
        (5.3, 23.5, 204, 1.23), (16.1, 17.7, 17, .97),
        (18.1, 5.2, 321, 1.14), (16.5, -10.3, 177, 1.05),
    ]):
        add("sacred_cedar_tree", "background_cedar_%02d" % i,
            x, y, angle=angle, scale=scale,
            zone="background_forest", role="dressing_only")
    for i,(x,y,angle,scale) in enumerate([
        (-9.0,21.0,52,1.32),(-2.8,23.2,173,1.22),(1.6,24.1,284,1.35),
        (9.1,22.4,97,1.19),(13.5,23.7,247,1.42),
        (-6.0,13.8,315,1.14),(5.5,17.7,61,1.28),
        (-12.8,7.1,187,1.31),(15.7,-3.1,211,1.25),
    ]):
        add("sacred_cedar_tree","deep_forest_cedar_%02d"%i,x,y,
            angle=angle,scale=scale,zone="background_forest",role="dressing_only")
    for i,(x,y,angle,scale) in enumerate([
        (-14,32,153,1.45),(-8,34,46,1.36),(-2,32,273,1.52),
        (4,35,81,1.39),(10,33,214,1.61),(16,31,327,1.43),
    ]):
        add('sacred_cedar_tree','distant_cedar_%02d'%i,x,y,
            angle=angle,scale=scale,zone='background_forest',role='dressing_only')
    for i,(x,y) in enumerate([(-8,27),(-3.5,27),(1.0,29),(5.5,28),(9.5,27)]):
        add('forest_shrub_cluster','distant_understory_%02d'%i,x,y,
            angle=i*71,scale=1.7,zone='background_forest',role='dressing_only')
    add("fallen_cedar_log", "fallen_trunk_east", 6.9, -3.2, angle=-27, scale=.96)
    add("broken_votive_stele", "western_votive_stele", -3.6, 2.9, angle=18, scale=1.04, role="landmark")
    add("sacred_hokora_shrine", "quiet_hokora_shrine", -4.8, 8.5,
        angle=0, zone="altar_remains", role="landmark")
    add("broken_votive_stele", "rear_small_stele", -7.2, 8.7, angle=-11, scale=.67, zone="altar_remains")
    add("moss_stone_lantern", "votive_lantern", -2.9, 6.25, angle=21, scale=.8, zone="altar_remains")

    # Fragmentary perimeter, not a uniform repeated enclosure. Collapsed wall
    # variants are intentionally sparse, with nature taking over the gaps.
    for i, (x, y, angle, collapsed) in enumerate([
        (-9.8, -5, 90, True), (-9.8, -1, 90, False),
        (-9.8, 3, 90, True), (-9.8, 11, 90, True),
        (13.8, 1, -90, True), (13.8, 5, -90, False),
        (13.8, 9, -90, True), (-8, 17.8, 0, True),
        (-4, 17.8, 0, False), (4, 17.8, 0, True),
        (8, 17.8, 0, False), (12, 17.8, 0, True),
    ]):
        add("mod_sacred_collapsed_wall_4m" if collapsed else "mod_sacred_wall_4m",
            "boundary_fragment_%02d" % i, x, y, angle=angle, role="perimeter")

    # Underground remnant: two 4m sections with an actual 2x3m arch opening.
    # No fresh block geometry is substituted for the completed kit modules.
    add("mod_sacred_arch_4m", "sealed_corridor_mouth", 0, 10.0,
        zone="sealed_corridor", role="gateway")
    for side, angle in ((-1, 90), (1, -90)):
        for y in (12.0, 16.0):
            add("mod_sacred_wall_4m", "corridor_wall_%+d_%02d" % (side, y),
                side * 2.0, y, angle=angle, zone="sealed_corridor", role="structural_wall")
    # The already completed paving module is reused upside-down as a level
    # stone soffit. Its top surface becomes the ceiling underside at exactly
    # 4m; all slab thickness remains above that, preserving head clearance.
    # This is kit reuse, not newly generated ceiling geometry.
    for y in (12.0, 16.0):
        add("mod_sacred_stone_floor_4m", "corridor_stone_soffit_%02d" % y,
            0, y, 4.0, zone="sealed_corridor", role="ceiling")
        placements[-1]['rotation_x_degrees'] = 180
    add("mod_sacred_arch_4m", "inner_seal_arch", 0, 17.8,
        zone="sealed_corridor", role="gateway")
    # The cluster is a complete standalone prop. Keep it on the outer jamb
    # rather than floating across the central player opening.
    add("ofuda_seal_cluster", "outer_ofuda_cluster", 1.56, 9.97, .70,
        zone="sealed_corridor", scale=.80)
    add("ofuda_seal_cluster", "inner_ofuda_cluster", -1.56, 17.77, .95,
        zone="sealed_corridor", scale=.74, angle=4)

    # Individual rocks establish three size tiers and embed in soil slightly.
    for i, (x, y, z, scale, angle) in enumerate([
        (-4.3, -8.3, -.04, .68, 22), (4.1, -10.8, -.05, .43, 134),
        (8.9, -8.1, -.09, 1.15, 68), (-7.8, -2.6, -.07, .92, 111),
        (4.8, 1.4, -.03, .53, 209), (-4.8, 5.2, -.04, .49, 302),
        (10.7, 7.7, -.08, 1.27, 17), (-7.8, 12.4, -.05, 1.08, 186),
        (4.9, 12.2, -.03, .56, 252), (10.8, -1.4, -.04, .73, 84),
        (-3.2, -1.9, -.02, .31, 64), (3.15, 7.5, -.02, .36, 286),
    ]):
        add("mossy_granite_boulder", "granite_%02d" % i, x, y, z,
            scale=scale, angle=angle)

    # Vegetation is placed in deliberate ecological pockets. The deterministic
    # jitter is confined to those pockets, never used as whole-scene scatter.
    pockets = [
        (-5.3, -9.0, 4), (5.2, -7.4, 5), (-7.6, -5.0, 4),
        (8.3, -.3, 6), (-5.7, 4.4, 5), (8.8, 7.4, 5),
        (-6.3, 11.1, 5), (5.8, 14.5, 3), (11.4, 11.6, 5),
    ]
    rng = random.Random(611016)
    for pocket, (cx, cy, count) in enumerate(pockets):
        for i in range(count):
            x, y = cx + rng.uniform(-1.0, 1.0), cy + rng.uniform(-1.1, 1.1)
            asset = "forest_fern_cluster" if i % 3 else "forest_shrub_cluster"
            add(asset, "vegetation_p%02d_%02d" % (pocket, i), x, y,
                angle=rng.uniform(0, 360), scale=rng.uniform(.72, 1.12))
    for i, (x, y, scale, angle) in enumerate([
        (-2.6, -3.6, .80, 32), (-3.1, -3.1, .65, 167),
        (3.0, 1.3, .86, 69), (3.4, 1.9, .70, 213),
        (-3.8, 6.6, .75, 271), (5.7, -4.9, .62, 108),
    ]):
        add("white_wildflower_patch", "sunward_flowers_%02d" % i,
            x, y, angle=angle, scale=scale)

    # Hanging origin is at its attachment, per asset guide. Never shrink below
    # legibility merely to fill every gap; the central opening stays clear.
    for i, (x, y, z, angle, scale) in enumerate([
        (-9.55, -.5, 3.65, 90, 1.0), (13.55, 4.7, 3.7, -90, 1.1),
        (-2.12, 10.05, 3.80, 0, .74), (2.12, 17.8, 3.84, 0, .68),
        (-8.1, 10.3, 4.35, 52, .86),
    ]):
        add("hanging_forest_vines", "attached_vines_%02d" % i,
            x, y, z, angle=angle, scale=scale)
    # Understory follows route edges and stone/root moisture pockets. It does
    # not carpet the two-metre clear axis or change the logical game grid.
    rng=random.Random(711016)
    for side in (-1,1):
        for row,y in enumerate((-12,-10,-8,-6,-4,-2,0,2,4,6,8)):
            for band in range(2):
                x=side*(2.65+band*1.45+rng.uniform(-.10,.18))
                asset='forest_shrub_cluster' if (row+band)%4==0 else 'forest_fern_cluster'
                add(asset,'route_understory_%+d_%02d_%d'%(side,row,band),x,
                    y+rng.uniform(-.45,.45),-.012,angle=rng.uniform(0,360),
                    scale=rng.uniform(.72,1.08),role='understory')
    for pocket,(cx,cy) in enumerate([(-6,-5),(8,-7),(-7,1),(9,4),(-7,12),(10,13)]):
        for i in range(7):
            asset='forest_fern_cluster' if i%3 else 'forest_shrub_cluster'
            add(asset,'root_pocket_%02d_%02d'%(pocket,i),cx+rng.uniform(-1.4,1.4),
                cy+rng.uniform(-1.6,1.6),-.012,angle=rng.uniform(0,360),
                scale=rng.uniform(.7,1.18),role='understory')
    for i,(x,y) in enumerate([(-2.35,-7),(2.4,-4),(-2.45,-1),(2.5,3),(-2.5,5),
                              (3.5,6.4),(-5.8,7.2),(6.2,-2.5),(-5.0,-8.4),
                              (7.5,8),(-7,10.3),(9.5,-4.2)]):
        add('white_wildflower_patch','trail_whiteflowers_%02d'%i,x,y,-.005,
            angle=rng.uniform(0,360),scale=rng.uniform(.65,1),role='sunlit_flowers')
    return placements


def lighting_and_cameras():
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 8
    scene.cycles.transparent_max_bounces = 8
    scene.render.threads_mode = 'FIXED'
    scene.render.threads = int(os.environ.get('F1_RENDER_THREADS', '4'))
    scene.render.image_settings.file_format = 'PNG'
    scene.render.film_transparent = False
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.exposure = .0
    world = bpy.data.worlds.new('overcast_forest_sky')
    world.use_nodes = True
    sky=world.node_tree.nodes.new('ShaderNodeTexSky');sky.sky_type='MULTIPLE_SCATTERING'
    sky.sun_disc=False;sky.sun_elevation=math.atan2(19,math.hypot(14,15))
    sky.sun_rotation=math.atan2(-15,-14);sky.air_density=1.1;sky.aerosol_density=.5
    world.node_tree.links.new(sky.outputs['Color'],world.node_tree.nodes['Background'].inputs['Color'])
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = .18
    scene.world = world

    # Wide overcast fill plus one broad, low-contrast shaft of sun. No bloom,
    # volume or generated god-ray geometry disguises the asset surfaces.
    data = bpy.data.lights.new('late_morning_break_in_cloud', 'SUN')
    data.energy = 1.9
    data.angle = math.radians(4)
    data.color = (1.0, .91, .77)
    sun = bpy.data.objects.new('late_morning_break_in_cloud', data)
    scene.collection.objects.link(sun)
    sun.location = (-12, -9, 19)
    look_at(sun, (2, 6, 0))

    data = bpy.data.lights.new('courtyard_open_sky', 'AREA')
    data.energy = 1100
    data.shape = 'DISK'
    data.size = 13
    data.color = (.82, .90, 1)
    fill = bpy.data.objects.new('courtyard_open_sky', data)
    scene.collection.objects.link(fill)
    fill.location = (-2, -1, 12)
    look_at(fill, (0, 5, 0))

    for name, spec in VIEWS.items():
        data = bpy.data.cameras.new('camera_' + name)
        data.clip_start = .05
        data.clip_end = 150
        data.sensor_width = 36
        if 'ortho_scale' in spec:
            data.type = 'ORTHO'
            data.ortho_scale = spec['ortho_scale']
        else:
            data.lens = spec['lens']
        obj = bpy.data.objects.new('camera_' + name, data)
        scene.collection.objects.link(obj)
        obj.location = spec['position']
        look_at(obj, spec['target'])
    scene.camera = bpy.data.objects['camera_entry']


def build():
    missing = [str(asset_path(a)) for a in ASSETS if not asset_path(a).is_file()]
    if missing:
        raise FileNotFoundError('Individual GLBs must be completed first:\n' + '\n'.join(missing))
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1
    collection = bpy.data.collections.new('sacred_forest_asset_instances')
    scene.collection.children.link(collection)
    templates = {asset: import_template(asset) for asset in ASSETS}
    placements = planned_placements()
    for row in placements:
        linked_placement(row['asset_id'], templates[row['asset_id']], row['name'],
                         row['position'], row['rotation_z_degrees'], row['scale'], collection,
                         row['rotation_x_degrees'])
    # Continue the earth beyond the composition without a floating platform
    # edge. Reuse only the existing soil surface from the validated floor GLB;
    # positions/faces are unchanged, its UVs repeat at the original metre scale.
    original=next(o for o in templates['mod_root_soil_floor_4m'] if o.type=='MESH'
                  and any(m and m.name.startswith('sacred_damp_forest_soil') for m in o.data.materials))
    ground=original.copy();ground.data=original.data.copy();ground.parent=None
    collection.objects.link(ground);ground.name='background_earth_reused_floor_surface'
    ground.matrix_world=Matrix.Translation((0,0,-.225))@Matrix.Diagonal((35,35,1,1))@original.matrix_world
    for uv in ground.data.uv_layers:
        for loop in uv.data:loop.uv*=35
    ground['asset_id']='mod_root_soil_floor_4m';ground['role']='dressing_only'
    ground['review_exclude_from_framing']=True
    lighting_and_cameras()
    # Imported GLBs embed images. Pack them into the .blend as well so moving
    # the review file does not depend on Blender's temporary import paths.
    for image in bpy.data.images:
        if image.source == 'FILE':
            if not image.packed_file:
                image.pack()
            assert image.packed_file, image.name
    bpy.context.view_layer.update()
    SCENE_DIR.mkdir(parents=True, exist_ok=True)
    RENDER_DIR.mkdir(parents=True, exist_ok=True)
    commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    layout = {
        'name': 'F1 sacred forest candidate — individual GLB assembly',
        'approvalStatus': 'pending_user_review',
        'gameIntegration': False,
        'sourceCommit': commit,
        'coordinateSystem': {'authoring': 'Blender Z up, -Y front, metres', 'gltf': '+Y up, +Z front'},
        'groundBoundsBlender': {'x': [-10, 14], 'y': [-14, 18], 'walkHeight': 0},
        'backgroundDressingBoundsBlender': {'x': [-18, 22], 'y': [-22, 26],
                                            'role': 'dressing_only', 'gameTraversable': False},
        'mainWalkClearanceDesign': {'x': [-1, 1], 'y': [-14, 18], 'z': [0, 3],
                                    'status': 'design envelope; verify against rendered GLBs, not physics integration'},
        'designBeats': ['root_path', 'threshold', 'courtyard', 'altar_remains', 'sealed_corridor'],
        'assetCount': len(ASSETS),
        'placementCount': len(placements)+1,
        'sourceAssets': [dict(id=a, file=str(asset_path(a).relative_to(OUT)),
                              sha256=file_hash(asset_path(a)), bytes=asset_path(a).stat().st_size)
                         for a in ASSETS],
        'linkedMeshes': True,
        'backgroundEarth': {'source':'modules/mod_root_soil_floor_4m.glb',
                            'part':'sacred_damp_forest_soil only','role':'dressing_only',
                            'worldScale':[35,35,1],'uvScale':35,'surfaceHeight':-.225},
        'environment': {'sky':'Blender 5.3 multiple scattering','skyStrength':.18,
                        'sunEnergy':1.9,'sunAngleDegrees':4,'AgXExposure':0},
        'placements': placements,
        'cameras': VIEWS,
        'notes': ['No new geometry generated by the assembler.',
                  'All placements import the individually authored GLBs.',
                  'No fog/particle runtime or game-map changes.',
                  'Layered cedars and understory continue beyond the main courtyard as dressing_only.',
                  'A scaled copy of the existing soil-only mesh, with UV repeat, prevents a floating ground edge; no new terrain asset is generated.',
                  'Corridor soffits reuse the completed paving GLB upside-down at 4m; no ceiling geometry is generated.'],
        'renders': {},
    }
    scene['candidate_status'] = 'pending_user_review'
    scene['assembly_layout'] = str(LAYOUT_FILE)
    scene['source_commit'] = commit
    bpy.ops.wm.save_as_mainfile(filepath=str(SCENE_FILE))
    LAYOUT_FILE.write_text(json.dumps(layout, ensure_ascii=False, indent=2) + '\n')
    print('F1_SCENE_BUILT ' + json.dumps({'scene': str(SCENE_FILE), 'assets': len(ASSETS),
                                         'placements': len(placements)}, ensure_ascii=False))


def render_view(name, args):
    if str(Path(bpy.data.filepath)) != str(SCENE_FILE):
        bpy.ops.wm.open_mainfile(filepath=str(SCENE_FILE))
    scene = bpy.context.scene
    scene.camera = bpy.data.objects['camera_' + name]
    scene.cycles.samples = args.samples
    scene.render.resolution_x = args.width
    scene.render.resolution_y = args.height
    scene.render.resolution_percentage = 100
    path = RENDER_DIR / (name + '.png')
    path.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    if not path.is_file():
        raise RuntimeError('Render produced no file: ' + str(path))
    layout = json.loads(LAYOUT_FILE.read_text())
    layout.setdefault('renders', {})[name] = {
        'file': str(path.relative_to(OUT)), 'sha256': file_hash(path),
        'width': args.width, 'height': args.height, 'samples': args.samples,
        'renderer': 'Cycles CPU', 'geometrySource': 'reimported individual GLBs',
        'blenderVersion': bpy.app.version_string,
    }
    LAYOUT_FILE.write_text(json.dumps(layout, ensure_ascii=False, indent=2) + '\n')
    print('F1_SCENE_RENDERED ' + json.dumps(layout['renders'][name], ensure_ascii=False))


def export_scene_glb():
    scene = bpy.context.scene
    bpy.ops.object.select_all(action='DESELECT')
    for obj in scene.collection.children['sacred_forest_asset_instances'].all_objects:
        obj.select_set(True)
    path = SCENE_DIR / 'sacred_forest_scene.glb'
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True,
                             export_yup=True, export_texcoords=True, export_normals=True,
                             export_tangents=True,
                             export_vertex_color='NONE', export_materials='EXPORT',
                             export_image_format='AUTO', export_cameras=False,
                             export_lights=False, export_extras=True, export_animations=False)
    repairs=repair_zero_tangents(path)
    layout = json.loads(LAYOUT_FILE.read_text())
    layout['optionalSceneGLB'] = dict(file=str(path.relative_to(OUT)), bytes=path.stat().st_size,
                                     sha256=file_hash(path), gameIntegrated=False,
                                     zeroTangentFallbackVertices=repairs)
    LAYOUT_FILE.write_text(json.dumps(layout, ensure_ascii=False, indent=2) + '\n')


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--build', action='store_true', help='Assemble and save only; never implicitly render.')
    parser.add_argument('--rebuild', action='store_true', help='Force rebuild before a requested render.')
    parser.add_argument('--render-view', choices=tuple(VIEWS), help='Render one named camera from scene.blend.')
    parser.add_argument('--export-glb', action='store_true', help='Optionally export the assembled geometry as a GLB.')
    parser.add_argument('--samples', type=int, default=int(os.environ.get('F1_SCENE_SAMPLES', '48')))
    parser.add_argument('--width', type=int, default=1600)
    parser.add_argument('--height', type=int, default=1000)
    args = parser.parse_args(argv)
    if not (args.build or args.render_view or args.export_glb):
        parser.error('Choose --build, --render-view NAME, or --export-glb.')
    if min(args.samples, args.width, args.height) <= 0:
        parser.error('Samples and image dimensions must be positive.')
    if args.build or args.rebuild or not SCENE_FILE.is_file():
        build()
    elif str(Path(bpy.data.filepath)) != str(SCENE_FILE):
        bpy.ops.wm.open_mainfile(filepath=str(SCENE_FILE))
    if args.export_glb:
        export_scene_glb()
    if args.render_view:
        render_view(args.render_view, args)


if __name__ == '__main__':
    main()
