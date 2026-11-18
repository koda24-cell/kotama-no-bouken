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
OUT = Path("render-output/floor6/nature/tree_mature_photo_v20")
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
    links.new(tex.outputs["Color"], shader.inputs["Base Color"])
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
manifest = dict(asset_id="tree_mature", version="V20-CC0-photo-review",
                status="NOT_APPROVED", game_integration="NOT_INTEGRATED",
                base_model="tree_mature V19 existing source geometry unchanged",
                branch=os.getenv("GITHUB_REF_NAME", "local"),
                source_sha=os.getenv("GITHUB_SHA", "local"),
                render_run_id=os.getenv("GITHUB_RUN_ID", "local"),
                source_texture=source, preserved_meshes=len(objects),
                files=files, notes="No alpha fabricated; test renders and GLB before approval")
(OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print("F6_CC0_PHOTO_V20_DONE", len(objects), len(files))
