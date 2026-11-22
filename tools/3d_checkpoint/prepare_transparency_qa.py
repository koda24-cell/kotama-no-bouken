"""Technical, NOT_APPROVED Cycles tiled-render QA probe for glass, alpha, emission.

Uses procedural geometry in a separate .blend; no existing asset is modified.
"""
import bpy
import math
from pathlib import Path

out = Path("render-output/qa-transparent-tiles").resolve()
out.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

def mat(name, rgba, roughness=0.4, transmission=0.0, emission=0.0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = rgba
    m.use_nodes = True
    principled = m.node_tree.nodes.get("Principled BSDF")
    if principled is None:
        raise RuntimeError("Cannot find Principled BSDF")
    principled.inputs["Base Color"].default_value = rgba
    principled.inputs["Roughness"].default_value = roughness
    principled.inputs["Transmission Weight"].default_value = transmission
    principled.inputs["Alpha"].default_value = rgba[3]
    if emission:
        principled.inputs["Emission Color"].default_value = (0.06, 0.55, 1.0, 1.0)
        principled.inputs["Emission Strength"].default_value = emission
    return m

rock = mat("opaque-stone", (0.19, 0.24, 0.32, 1))
glass = mat("glass-90pct-transmission", (0.65, 0.88, 1.0, 1), roughness=0.08, transmission=0.9)
alpha = mat("translucent-mist-plane", (0.18, 0.66, 0.85, 0.32), roughness=0.65)
glow = mat("emissive-blue", (0.02, 0.21, 0.55, 1), emission=5.0)
for x in (-3.7, 3.7):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x,0,3.7))
    ob=bpy.context.object
    ob.name="stone_pillar"
    ob.scale=(1.8,1.6,5.6)
    ob.data.materials.append(rock)
for x in (-1.0,1.0):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=20, radius=2.2, location=(x,0,4))
    bpy.context.object.name="refractive_sphere"
    bpy.context.object.data.materials.append(glass)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0,1.8,3.3))
bpy.context.object.name="emission_core"
bpy.context.object.scale=(1.5,0.45,5.0)
bpy.context.object.data.materials.append(glow)
bpy.ops.mesh.primitive_plane_add(size=2, location=(0,-2.6,4.0), rotation=(math.pi/2,0,0))
bpy.context.object.name="partial_alpha_film"
bpy.context.object.scale=(5.1,3.0,1.0)
bpy.context.object.data.materials.append(alpha)

scene=bpy.context.scene
scene.render.engine="CYCLES"
scene.cycles.samples=24
scene.cycles.use_denoising=True
scene.render.image_settings.file_format="PNG"
scene.render.image_settings.color_mode="RGBA"
scene.render.image_settings.color_depth="8"
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(out/"transparent_material_probe.blend"))
# For provenance and scan QA only; the .blend is authoritative for Cycles.
bpy.ops.export_scene.gltf(filepath=str(out/"transparent_material_probe.glb"),export_format="GLB")
print("TRANSPARENCY_QA_PROBE_SAVED objects=6 materials=4")
