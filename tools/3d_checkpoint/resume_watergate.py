"""Resume a verified watergate .blend, make a non-destructive addition and render."""
import bpy
from mathutils import Vector
from pathlib import Path
import os

source = Path(os.environ["RESUME_BLEND"]).resolve()
output = Path(os.environ.get("RESUME_OUTPUT", "render-output/b2-watergate-resumed"))
if not source.is_file() or source.suffix != ".blend":
    raise RuntimeError("Missing validated Blend checkpoint")
bpy.ops.wm.open_mainfile(filepath=str(source), load_ui=False)
output.mkdir(parents=True, exist_ok=True)
# Additive-only edit: a small visible inspection marker, preserving all original geometry.
bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=0.22, location=(0, -1.65, 5.9))
marker = bpy.context.object
marker.name = "QA resume addition v02"
material = bpy.data.materials.new("QA resume amber marker")
material.diffuse_color = (0.85, 0.25, 0.04, 1)
material.use_nodes = True
material.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.85, 0.25, 0.04, 1)
marker.data.materials.append(material)
bpy.ops.wm.save_as_mainfile(filepath=str(output / "watergate_resumed_v02.blend"))
bpy.ops.export_scene.gltf(filepath=str(output / "watergate_resumed_v02.glb"), export_format="GLB")
world = bpy.context.scene.world or bpy.data.worlds.new("Resume World")
bpy.context.scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.035, 0.07, 0.13, 1)
def area(loc, power, size):
    bpy.ops.object.light_add(type="AREA", location=loc)
    light = bpy.context.object
    light.data.energy = power
    light.data.shape = "DISK"
    light.data.size = size
    light.rotation_euler = (Vector((0, 0, 3)) - light.location).to_track_quat("-Z", "Y").to_euler()
area((1, -5, 12), 2100, 9)
area((-8, 2, 7), 1200, 7)
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 24
scene.render.resolution_x = 1000
scene.render.resolution_y = 760
scene.render.resolution_percentage = 100
for name, pos in (("front", (0, -23, 10)), ("side", (22, -3, 10)), ("angle", (17, -21, 12))):
    bpy.ops.object.camera_add(location=pos)
    cam = bpy.context.object
    cam.rotation_euler = (Vector((0, 0, 3.8)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = 20
    scene.camera = cam
    scene.render.filepath = str(output / (name + ".png"))
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam, do_unlink=True)
print("RESUME_EDIT_RENDER_COMPLETE")
