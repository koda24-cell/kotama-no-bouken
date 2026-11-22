"""Small real headless Blender smoke test; QA only, not a production asset."""
from pathlib import Path
import bpy
from mathutils import Vector

out = Path("qa/container-smoke")
out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.mesh.primitive_cube_add(size=1.6, location=(0, 0, 0))
cube = bpy.context.object
cube.name = "SMOKE_TEST_CUBE_NOT_APPROVED"
bpy.ops.object.camera_add(location=(3.5, -4.0, 2.8))
camera = bpy.context.object
camera.rotation_euler = (Vector((0, 0, 0)) - camera.location).to_track_quat("-Z", "Y").to_euler()
scene = bpy.context.scene
scene.camera = camera
scene.render.engine = "BLENDER_WORKBENCH"
scene.render.resolution_x = 128
scene.render.resolution_y = 128
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str((out / "smoke.png").resolve())
bpy.ops.render.render(write_still=True)
bpy.ops.object.select_all(action="DESELECT")
cube.select_set(True)
bpy.context.view_layer.objects.active = cube
bpy.ops.export_scene.gltf(
    filepath=str((out / "smoke.glb").resolve()),
    export_format="GLB",
    use_selection=True,
)
assert (out / "smoke.png").stat().st_size > 100
assert (out / "smoke.glb").stat().st_size > 100
print("BLENDER_RENDER_AND_GLB_EXPORT_PASS")
