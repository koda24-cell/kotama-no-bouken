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
OUT = Path("render-output/floor6/nature/tree_mature_photo_v21")
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
    desaturate.name = "V21_SoftForestSaturation"
    desaturate.inputs["Saturation"].default_value = .62
    desaturate.inputs["Value"].default_value = .83
    links.new(tex.outputs["Color"], desaturate.inputs["Color"])
    tone = nodes.new("ShaderNodeMixRGB")
    tone.name = "V21_WoodlandTint"
    tone.blend_type = "MULTIPLY"
    tone.inputs[0].default_value = .43
    tone.inputs[2].default_value = (0.38, 0.48, 0.41, 1)
    links.new(desaturate.outputs["Color"], tone.inputs[1])
    links.new(tone.outputs["Color"], shader.inputs["Base Color"])
    if normal is not None:
        nt = nodes.new("ShaderNodeTexImage")
        nt.name = "CC0_Leaf001_Normal"
        nt.image = normal
        nm = nodes.new("ShaderNodeNormalMap")
        nm.inputs["Strength"].default_value = 0.52
        links.new(nt.outputs["Color"], nm.inputs["Color"])
        links.new(nm.outputs["Normal"], shader.inputs["Normal"])
    if roughness is not None:
        rt = nodes.new("ShaderNodeTexImage")
        rt.name = "CC0_Leaf001_Roughness"
        rt.image = roughness
        links.new(rt.outputs["Color"], shader.inputs["Roughness"])
    else:
        shader.inputs["Roughness"].default_value = .78
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
    blunt_tip = p[2].lerp(mid, .19)
    upper_right = p[1].lerp(p[2], .69)
    upper_left = p[3].lerp(p[2], .69)
    # Two soft tip shoulders and an inset center yield a wider,
    # broadleaf-like edge instead of three rigid spear corners.
    shoulder_r = upper_right.lerp(blunt_tip, .56)
    shoulder_l = upper_left.lerp(blunt_tip, .56)
    outline = [p[0], p[1], upper_right, shoulder_r,
               blunt_tip, shoulder_l, upper_left, p[3]]
    vertices = outline + [p[4]]
    front = [(8, i, (i + 1) % 8) for i in range(8)]
    back = [(8, (i + 1) % 8, i) for i in range(8)]
    new_mesh = bpy.data.meshes.new(old_mesh.name + "_V21SoftRounded")
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
assert rounding_count > 500, "No leaf meshes rounded"

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
manifest = dict(asset_id="tree_mature", version="V21-CC0-softleaf-review",
                status="NOT_APPROVED", game_integration="NOT_INTEGRATED",
                base_model="tree_mature V19 existing source geometry unchanged",
                branch=os.getenv("GITHUB_REF_NAME", "local"),
                source_sha=os.getenv("GITHUB_SHA", "local"),
                render_run_id=os.getenv("GITHUB_RUN_ID", "local"),
                source_texture=source, preserved_meshes=len(objects), rounded_leaf_meshes=rounding_count,
                files=files, notes="CC0 albedo with muted tint and new softly rounded review-only geometry; no alpha fabricated")
(OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print("F6_CC0_PHOTO_V20_DONE", len(objects), len(files))
