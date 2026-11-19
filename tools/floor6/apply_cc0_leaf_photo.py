"""V20: apply externally fetched CC0 maps to the existing V19 .blend.

No original geometry, leaf mesh, limb, root or source file is modified.
The baseline blend was generated immediately before this stage.
"""
import bpy
import hashlib
import json
import os
from pathlib import Path

INPUT = Path("render-output/floor6/cc0-leaf-source")
OUT = Path("render-output/floor6/nature/tree_mature_photo_v25")
OUT.mkdir(parents=True, exist_ok=True)
source = json.loads((INPUT / "source_manifest.json").read_text())
assert source["license"] == "CC0" and source["asset"] == "Leaf001"
def verified_map(kind):
    info = source["maps"].get(kind)
    if not info:
        return None
    p = INPUT / info["filename"]
    payload = p.read_bytes()
    assert hashlib.sha256(payload).hexdigest() == info["sha256"], kind
    assert payload.startswith(b"\x89PNG\r\n\x1a\n")
    img = bpy.data.images.load(str(p.resolve()), check_existing=False)
    img.pack()
    if kind != "color":
        img.colorspace_settings.name = "Non-Color"
    return img

color = verified_map("color")
normal = verified_map("normal")
roughness = verified_map("roughness")
assert color is not None
for i, name in enumerate(("leaf_deep", "leaf_mid", "leaf_lit", "leaf_sage")):
    m = bpy.data.materials.get(name)
    if m is None:
        raise RuntimeError("Missing preserved leaf material: " + name)
    m.use_nodes = True
    nodes = m.node_tree.nodes
    links = m.node_tree.links
    shader = nodes.get("Principled BSDF")
    if shader is None:
        raise RuntimeError("Missing Principled BSDF in " + name)
    # Shared source photograph, no fabricated or unlicensed Pinterest pixels.
    tex = nodes.new("ShaderNodeTexImage")
    tex.name = "CC0_Leaf001_Color"
    tex.image = color
    # V21: CC0 photograph retains its microdetail, but reduce the electric
    # yellow-green cast using a low-saturation forest palette.
    desaturate = nodes.new("ShaderNodeHueSaturation")
    desaturate.name = "V24_ForestSaturation"
    desaturate.inputs["Saturation"].default_value = .91
    desaturate.inputs["Value"].default_value = .85
    links.new(tex.outputs["Color"], desaturate.inputs["Color"])
    tone = nodes.new("ShaderNodeMixRGB")
    tone.name = "V24_ForestTint"
    tone.blend_type = "MULTIPLY"
    tone.inputs[0].default_value = .82
    tone.inputs[2].default_value = ((.16,.26,.18,1),(.23,.36,.22,1),(.37,.43,.24,1),(.26,.32,.22,1))[i]
    links.new(desaturate.outputs["Color"], tone.inputs[1])
    links.new(tone.outputs["Color"], shader.inputs["Base Color"])
    if normal is not None:
        nt = nodes.new("ShaderNodeTexImage")
        nt.name = "CC0_Leaf001_Normal"
        nt.image = normal
        nm = nodes.new("ShaderNodeNormalMap")
        nm.inputs["Strength"].default_value = 0.42
        links.new(nt.outputs["Color"], nm.inputs["Color"])
        links.new(nm.outputs["Normal"], shader.inputs["Normal"])
    if roughness is not None:
        rt = nodes.new("ShaderNodeTexImage")
        rt.name = "CC0_Leaf001_Roughness"
        rt.image = roughness
        # Preserve microscopic CC0 roughness detail, but avoid glossy white
        # glints that erased green in V22/V23 side and angle renders.
        rough_floor = nodes.new("ShaderNodeMath")
        rough_floor.operation = "MAXIMUM"
        rough_floor.inputs[1].default_value = .86
        links.new(rt.outputs["Color"], rough_floor.inputs[0])
        links.new(rough_floor.outputs[0], shader.inputs["Roughness"])
    else:
        shader.inputs["Roughness"].default_value = .9
    # Matte leaf wax, no white dielectric highlight dominating 3/4 views.
    if "Specular" in shader.inputs:
        shader.inputs["Specular"].default_value = .16
    if "Specular IOR Level" in shader.inputs:
        shader.inputs["Specular IOR Level"].default_value = .16
    # Do not infer a cutout alpha mask from diffuse pixels. Original curved
    # leaf silhouettes remain intact and double-sided.

# V21: round off needle-like leaf points in a separate candidate.
# The V19 baseline .blend stays untouched. Preserve each original central
# curved leaf rib while replacing only the review candidate's pointed outline.
from mathutils import Vector
rounding_count = 0
for obj in bpy.data.objects:
    if obj.type != "MESH" or not obj.name.startswith("tree_mature_leaf_"):
        continue
    old_mesh = obj.data
    if len(old_mesh.vertices) != 5:
        continue
    p = [v.co.copy() for v in old_mesh.vertices]
    # Original blade: base(0), right(1), needle-tip(2), left(3), raised rib(4).
    mid = (p[1] + p[3]) * .5
    # V23: a softer, wider oval blade rather than the thin needle profile.
    p[1] = mid + (p[1] - mid) * 1.20
    p[3] = mid + (p[3] - mid) * 1.20
    blunt_tip = p[2].lerp(mid, .24)
    upper_right = p[1].lerp(p[2], .59)
    upper_left = p[3].lerp(p[2], .59)
    # Two soft tip shoulders and an inset center yield a wider,
    # broadleaf-like edge instead of three rigid spear corners.
    shoulder_r = upper_right.lerp(blunt_tip, .48)
    shoulder_l = upper_left.lerp(blunt_tip, .48)
    outline = [p[0], p[1], upper_right, shoulder_r,
               blunt_tip, shoulder_l, upper_left, p[3]]
    vertices = outline + [p[4]]
    front = [(8, i, (i + 1) % 8) for i in range(8)]
    back = [(8, (i + 1) % 8, i) for i in range(8)]
    new_mesh = bpy.data.meshes.new(old_mesh.name + "_V24SoftRounded")
    new_mesh.from_pydata(vertices, [], front + back)
    new_mesh.update()
    for mat in old_mesh.materials:
        new_mesh.materials.append(mat)
    uv = new_mesh.uv_layers.new(name="LeafUV")
    uv_points = [(.5,.04), (.94,.42), (.80,.73), (.67,.87),
                 (.5,.91), (.33,.87), (.20,.73), (.06,.42), (.5,.48)]
    for poly in new_mesh.polygons:
        for loop_id in poly.loop_indices:
            uv.data[loop_id].uv = uv_points[new_mesh.loops[loop_id].vertex_index]
        poly.use_smooth = True
    obj.data = new_mesh
    rounding_count += 1

# V22: restore the visual continuity of leaf sprays without altering any woody
# structure. Source leaves have contiguous, deterministic branch-group indices.
# Bring groups of seven into overlapping, 3D fan-like bunches, not flat cards.
leaf_objects = [o for o in bpy.data.objects if o.type == "MESH" and o.name.startswith("tree_mature_leaf_")]
leaf_objects.sort(key=lambda o: o.name)
from mathutils import Vector
clustered_leaves = 0
for start in range(0, len(leaf_objects), 7):
    group = leaf_objects[start:start + 7]
    if len(group) < 3:
        continue
    centers = []
    for ob in group:
        bounds = [v.co for v in ob.data.vertices]
        centers.append(sum(bounds, Vector()) / len(bounds))
    center = sum(centers, Vector()) / len(centers)
    for j, (ob, original) in enumerate(zip(group, centers)):
        offset = original - center
        # Retain depth and organic openings while reducing paper-confetti spacing.
        ob.location += (center - original) * .62
        # Gentle vertical stratification: coherent overlapping tiers, not planar balls.
        ob.location.z += ((j % 3) - 1) * .012
        clustered_leaves += 1
assert clustered_leaves > 500

assert rounding_count > 500, "No leaf meshes rounded"

# V25: CC0 real photogrammetry of bark; load with manifest hashes.
BARK_INPUT = Path("render-output/floor6/cc0-bark-source")
bark_source = json.loads((BARK_INPUT / "source_manifest.json").read_text())
assert bark_source["license"] == "CC0" and bark_source["asset"] == "Bark015"
def bark_map(kind):
    info = bark_source["maps"].get(kind)
    if not info:
        return None
    p = BARK_INPUT / info["filename"]
    raw = p.read_bytes()
    assert raw[:8] == bytes([137,80,78,71,13,10,26,10]) and hashlib.sha256(raw).hexdigest() == info["sha256"]
    img = bpy.data.images.load(str(p.resolve()), check_existing=False)
    img.pack()
    if kind != "color":
        img.colorspace_settings.name = "Non-Color"
    return img

bark_color = bark_map("color")
bark_normal = bark_map("normal")
bark_rough = bark_map("roughness")
assert bark_color is not None
bark_materials = []
for name in ("aged_bark", "twigs"):
    material = bpy.data.materials.get(name)
    assert material is not None, "Missing bark material " + name
    shader = material.node_tree.nodes.get("Principled BSDF")
    assert shader is not None
    nodes, links = material.node_tree.nodes, material.node_tree.links
    tex = nodes.new("ShaderNodeTexImage")
    tex.name = "V25_CC0_Bark015_Photogrammetry"
    tex.image = bark_color
    links.new(tex.outputs["Color"], shader.inputs["Base Color"])
    if bark_normal:
        nt = nodes.new("ShaderNodeTexImage")
        nt.image = bark_normal
        nm = nodes.new("ShaderNodeNormalMap")
        nm.inputs["Strength"].default_value = .76
        links.new(nt.outputs["Color"], nm.inputs["Color"])
        links.new(nm.outputs["Normal"], shader.inputs["Normal"])
    if bark_rough:
        rt = nodes.new("ShaderNodeTexImage")
        rt.image = bark_rough
        links.new(rt.outputs["Color"], shader.inputs["Roughness"])
    bark_materials.append(name)

# V25: make the canopy broad and continuous. Source leaf geometry and the
# tree's original trunk/branches/roots remain intact in the V19 checkpoint.
# Each cloned seven-leaf SPRAY stays cohesive, then spreads as one unit.
from math import sin, cos, tau
import random
rng = random.Random(62525)
leaf_objects.sort(key=lambda obj: obj.name)
sprays = [leaf_objects[i:i+7] for i in range(0,len(leaf_objects)-6,7)]
def obj_center(ob):
    return sum((v.co for v in ob.data.vertices), Vector()) / len(ob.data.vertices) + ob.location
spray_centers = [sum((obj_center(o) for o in group), Vector()) / len(group) for group in sprays]
added_canopy_leaves = 0
def clone_spray(group, translation, seed, enlargement=1.0):
    global added_canopy_leaves
    for j, src in enumerate(group):
        duplicate = src.copy()
        duplicate.data = src.data.copy()
        duplicate.name = "tree_mature_v25_canopy_%05d" % added_canopy_leaves
        bpy.context.collection.objects.link(duplicate)
        duplicate.location += translation + Vector((rng.uniform(-.012,.012),rng.uniform(-.012,.012),rng.uniform(-.013,.013)))
        # Preserve the original surface curvature, but give some new leaves
        # a more legible, broad near-view silhouette.
        if enlargement > 1.0:
            pivot = sum((v.co for v in duplicate.data.vertices),Vector()) / len(duplicate.data.vertices)
            for v in duplicate.data.vertices:
                v.co = pivot + (v.co-pivot) * enlargement
        added_canopy_leaves += 1

# Extend existing branch sprays into a coherent umbrella crown, rather than
# a single horizontal disc or disconnected point-like confetti.
candidates = [i for i,p in enumerate(spray_centers) if 1.65 < p.z < 3.1 and (p.x*p.x+p.y*p.y)**.5 > .35]
rng.shuffle(candidates)
for k,idx in enumerate(candidates[:170]):
    p=spray_centers[idx]
    radial=Vector((p.x,p.y,0)).normalized()
    reach=.23+(.18 if k%3==0 else .08)+rng.uniform(-.07,.10)
    offset=radial*reach + Vector((0,0,-.07 + .12*rng.random()))
    clone_spray(sprays[idx],offset,k,1.12 if k%4 else 1.21)

# Three overlapping shell directions screen the exposed central trunk without
# burying all of its bark. The canopy remains open under its outer edge.
inner = [i for i,p in enumerate(spray_centers) if 1.60 < p.z < 2.8 and (p.x*p.x+p.y*p.y)**.5 < .72]
rng.shuffle(inner)
for k in range(min(120,len(inner))):
    idx = inner[k]
    p = spray_centers[idx]
    angle=(k * .61803398875 % 1.0)*tau
    target_radius=.21+rng.uniform(.04,.16)
    target = Vector((cos(angle)*target_radius, sin(angle)*target_radius, p.z + rng.uniform(-.07,.08)))
    clone_spray(sprays[idx], target-p,1000+k,1.18 if k%3 else 1.32)

# Four camera-facing oblique sprays reduce obvious empty slits without creating
# a spherical blob. All are derived from existing leaf geometry, no billboards.
for k in range(48):
    if not inner: break
    idx=inner[k%len(inner)]
    p=spray_centers[idx]
    angle=k*tau/48
    target=Vector((.20*cos(angle),.20*sin(angle), 1.72+1.02*((k*7)%48)/48))
    clone_spray(sprays[idx],target-p,2000+k,1.20)
assert added_canopy_leaves > 500, "V25 canopy was not expanded"

scene = bpy.context.scene
objects = [o for o in bpy.data.objects if o.type == "MESH" and o.name.startswith("tree_mature_")]
assert len(objects) > 100
bpy.ops.object.select_all(action="DESELECT")
for o in objects:
    o.select_set(True)
bpy.context.view_layer.objects.active = objects[0]
glb = OUT / "tree_mature_photo_v20.glb"
bpy.ops.export_scene.gltf(filepath=str(glb.resolve()), export_format="GLB", use_selection=True)
bpy.ops.object.select_all(action="DESELECT")
for view in ("front", "side", "angle", "top"):
    camera = bpy.data.objects.get("review_camera_" + view)
    if camera is None or camera.type != "CAMERA":
        raise RuntimeError("Missing original review camera " + view)
    scene.camera = camera
    scene.render.filepath = str((OUT / (view + ".png")).resolve())
    bpy.ops.render.render(write_still=True)
blend = OUT / "tree_mature_photo_v20.blend"
bpy.ops.wm.save_as_mainfile(filepath=str(blend.resolve()))
files = []
for f in sorted(OUT.iterdir()):
    if f.suffix in (".glb", ".png", ".blend"):
        data = f.read_bytes()
        files.append(dict(name=f.name, bytes=len(data), sha256=hashlib.sha256(data).hexdigest()))
assert len(files) == 6
manifest = dict(asset_id="tree_mature", version="V25-CC0-wide-crown-bark-review",
                status="NOT_APPROVED", game_integration="NOT_INTEGRATED",
                base_model="tree_mature V19 existing source geometry unchanged",
                branch=os.getenv("GITHUB_REF_NAME", "local"),
                source_sha=os.getenv("GITHUB_SHA", "local"),
                render_run_id=os.getenv("GITHUB_RUN_ID", "local"),
                source_texture=source, bark_source=bark_source, bark_materials=bark_materials, expanded_canopy_leaves=added_canopy_leaves, preserved_meshes=len(objects), rounded_leaf_meshes=rounding_count, clustered_leaf_meshes=clustered_leaves,
                files=files, notes="V25 wider coherent crown + 3D central foliage screens + actual CC0 Bark015 photogrammetry PBR for bark and twigs; V19 original retained; approval pending")
(OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print("F6_CC0_PHOTO_V25_DONE", len(objects), len(files))
