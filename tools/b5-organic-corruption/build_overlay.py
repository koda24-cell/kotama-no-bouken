#!/usr/bin/env python3
"""Non-destructive B5 organic corruption overlay: Blender renders + candidate GLB.
No external model, shader, image, or downloaded texture is required.
Run: blender -b -t 2 --python tools/b5-organic-corruption/build_overlay.py
"""
import bpy
import math
import json
import hashlib
import random
import pathlib
from mathutils import Vector

OUT = pathlib.Path("render-output/b5-organic-corruption")
OUT.mkdir(parents=True, exist_ok=True)
SEED = 5192026
rng = random.Random(SEED)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

def material(name, color, roughness=0.85, emission=None, strength=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    p = mat.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value = (*color, 1)
    p.inputs["Roughness"].default_value = roughness
    if emission:
        # Blender 3.x and 4.x input labels differ.
        col = p.inputs.get("Emission Color") or p.inputs.get("Emission")
        power = p.inputs.get("Emission Strength")
        if col: col.default_value = (*emission, 1)
        if power: power.default_value = strength
    return mat

skin = material("B5_corruption_skin", (.016, .009, .023), .93)
rootmat = material("B5_living_tendrils", (.035, .013, .037), .76)
veinmat = material("B5_crimson_pulse_channels", (.12, .007, .034), .5,
                   emission=(.78, .014, .10), strength=1.9)
substrate = material("QA_only_rock_not_exported", (.16, .13, .16), .96)

# Corruption membrane: continuous surface with broken edge, not a rectangular plane.
rings, sides = 14, 96
verts, faces = [], []
for r in range(rings):
    t = (r + 0.15) / (rings - .85)
    for i in range(sides):
        a = 2 * math.pi * i / sides
        edge = (1 + .16 * math.sin(5*a+.3) + .10 * math.sin(11*a+1.3)
                + .045 * math.sin(23*a+.5))
        radius = 1.45 * t * edge
        z = .075 + .075 * math.sin(a*4+radius*5) * (1-t) + .038*math.sin(17*a+9*t)
        verts.append((radius*math.cos(a), radius*math.sin(a)*.78, z))
for r in range(rings-1):
    for i in range(sides):
        j = (i+1) % sides
        faces.append((r*sides+i, r*sides+j, (r+1)*sides+j, (r+1)*sides+i))
mesh = bpy.data.meshes.new("organic_membrane_mesh")
mesh.from_pydata(verts, [], faces)
mesh.update()
membrane = bpy.data.objects.new("B5_overlay_corruption_membrane", mesh)
bpy.context.collection.objects.link(membrane)
membrane.data.materials.append(skin)
for poly in membrane.data.polygons: poly.use_smooth = True

def tube(name, points, radii, mat, thickness):
    curve = bpy.data.curves.new(name+"_curve", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 18
    curve.bevel_depth = thickness
    curve.bevel_resolution = 4
    spline = curve.splines.new("POLY")
    spline.points.add(len(points)-1)
    for p, xyz, radius in zip(spline.points, points, radii):
        p.co = (*xyz, 1)
        p.radius = radius
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj.select_set(False)
    return bpy.context.view_layer.objects.active

roots = []
for i in range(16):
    angle = i * 2.399963 + rng.uniform(-.18, .18)
    length = rng.uniform(.60, 1.40)
    offset = rng.uniform(-.12, .12)
    points = []
    radii = []
    for j in range(15):
        t = j / 14
        theta = angle + .24*math.sin(t*math.pi*1.8+i) + .15*t
        dist = .12 + length*t
        x = dist*math.cos(theta) + offset
        y = dist*math.sin(theta)*.78
        z = .16 + .075*math.sin(t*math.pi*2+i) + .11*(1-t)**2
        points.append((x,y,z))
        radii.append(max(.10, (1-t)**1.55)*(1+.08*math.sin(j*2+i)))
    roots.append(tube("B5_overlay_tendril_%02d"%i, points, radii, rootmat, rng.uniform(.052,.095)))
    if i % 2 == 0:
        # Smaller veins follow roots; emitted light is confined, not all-over.
        veinpoints = [(x, y, z+.025) for x,y,z in points[:10]]
        tube("B5_overlay_glow_vein_%02d"%i, veinpoints,
             [max(.08, .55-j*.047) for j in range(10)], veinmat, .015)

# Node clusters with varying size, avoiding a repeated spike-grid silhouette.
for i in range(7):
    a = i * 2.399963
    rad = .12 + .48*(i%3)/2
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=.13+(i%3)*.04,
        location=(rad*math.cos(a), rad*math.sin(a), .20))
    node = bpy.context.object
    node.name = "B5_overlay_organic_node_%02d"%i
    node.scale.z = .52 + .13*(i%3)
    node.data.materials.append(rootmat)

# QA-only stage to make contact/shadows legible. Excluded from candidate GLB.
bpy.ops.mesh.primitive_cube_add(size=2, location=(0,0,-.30))
qa = bpy.context.object
qa.name = "QA_ONLY_SUBSTRATE"
qa.scale = (2.2, 1.8, .28)
qa.data.materials.append(substrate)
qa.hide_render = False

world = bpy.context.scene.world
world.color = (.10,.10,.10)
bpy.ops.object.light_add(type="AREA", location=(-3,-4,5))
bpy.context.object.data.energy = 700
bpy.context.object.data.shape = "DISK"
bpy.context.object.data.size = 5
bpy.ops.object.light_add(type="AREA", location=(2,2,3))
bpy.context.object.data.energy = 450
bpy.context.object.data.color = (.68,.38,1.0)
bpy.context.object.data.size = 4

scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 32
scene.render.resolution_x = 960
scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = False

def aim(camera, target):
    direction = Vector(target) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()

views = {
    "front": (0,-4.4,1.45),
    "side": (4.4,0,1.45),
    "angle": (3.5,-3.7,3.1),
}
bpy.ops.object.camera_add()
camera = bpy.context.object
scene.camera = camera
camera.data.type = "ORTHO"
camera.data.ortho_scale = 3.75
for name, xyz in views.items():
    camera.location = xyz
    aim(camera, (0,0,.08))
    scene.render.filepath = str((OUT / (name+".png")).resolve())
    bpy.ops.render.render(write_still=True)

bpy.ops.wm.save_as_mainfile(filepath=str((OUT/"candidate.blend").resolve()))

# Export only new overlay, never the QA floor/cameras/lights or original stage.
bpy.ops.object.select_all(action="DESELECT")
overlay = [o for o in scene.objects if o.name.startswith("B5_overlay_") and o.type=="MESH"]
assert len(overlay) >= 20, "overlay geometry missing"
for obj in overlay: obj.select_set(True)
bpy.context.view_layer.objects.active = overlay[0]
bpy.ops.export_scene.gltf(filepath=str((OUT/"candidate.glb").resolve()),
    export_format="GLB", use_selection=True)

files = [OUT/"candidate.blend", OUT/"candidate.glb"] + [OUT/(v+".png") for v in views]
assert all(p.is_file() and p.stat().st_size>1000 for p in files)
manifest = {
    "asset_id":"b5-organic-corruption-overlay-v1",
    "status":"NOT_APPROVED", "external_assets":[],
    "seed":SEED, "original_game_mesh_modified":False,
    "mesh_objects":len(overlay), "render_views":list(views),
    "files":[{"path":str(p),"bytes":p.stat().st_size,
              "sha256":hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]
}
(OUT/"manifest.json").write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf-8")
print("B5_OVERLAY_RENDER_AND_EXPORT_SUCCESS", len(overlay))
