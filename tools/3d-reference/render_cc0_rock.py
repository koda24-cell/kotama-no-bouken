import bpy, math, os
from mathutils import Vector
from pathlib import Path
ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "cc0-rocks/polyhaven/source_rock.fbx"
OUT = ROOT / "cc0-rocks/polyhaven/reviews"
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
# Blender 5 native importer avoids legacy io_scene_fbx compatibility issues.
if hasattr(bpy.ops.wm, "fbx_import"):
    bpy.ops.wm.fbx_import(filepath=str(SOURCE))
else:
    bpy.ops.import_scene.fbx(filepath=str(SOURCE))
objects = [o for o in bpy.context.scene.objects if o.type == "MESH"]
if not objects: raise RuntimeError("FBX import produced no meshes")
print("IMPORTED_MESHES", len(objects), "VERTICES", sum(len(o.data.vertices) for o in objects))
for o in objects: o.select_set(True)
bpy.context.view_layer.objects.active = objects[0]
# Keep the source geometry unchanged. Only set a display material on the imported mesh.
mat = bpy.data.materials.new("Neutral stone review")
mat.diffuse_color = (0.32, 0.34, 0.36, 1)
mat.use_nodes = True
bsdf = mat.node_tree.nodes.get("Principled BSDF")
bsdf.inputs["Base Color"].default_value = (0.32, 0.34, 0.36, 1)
bsdf.inputs["Roughness"].default_value = 0.9
for o in objects:
    o.data.materials.clear()
    o.data.materials.append(mat)
bpy.context.view_layer.update()
points = [o.matrix_world @ Vector(v) for o in objects for v in o.bound_box]
center = sum(points, Vector()) / len(points)
extent = max(max(p[i] for p in points) - min(p[i] for p in points) for i in range(3))
if extent <= 0: raise RuntimeError("Invalid mesh dimensions")
# Camera targets original mesh center; no changes to source geometry.
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 20
scene.render.resolution_x = 800
scene.render.resolution_y = 600
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.world.color = (0.20, 0.20, 0.20)
bpy.ops.object.light_add(type="AREA", location=center + Vector((extent*1.4,-extent*2,extent*2.5)))
bpy.context.object.data.energy = 1000
bpy.context.object.data.shape = "DISK"
bpy.context.object.data.size = extent * 2
bpy.ops.object.camera_add()
camera = bpy.context.object
scene.camera = camera
for name, offset in {
    "front": (0,-2.7,1.2),
    "side": (2.7,0,1.2),
    "angle": (2.0,-2.2,1.5),
}.items():
    camera.location = center + Vector(offset) * extent
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z","Y").to_euler()
    scene.render.filepath = str(OUT / (name + ".png"))
    bpy.ops.render.render(write_still=True)
# Export only original meshes, not lights/camera.
bpy.ops.object.select_all(action="DESELECT")
for o in objects: o.select_set(True)
bpy.context.view_layer.objects.active = objects[0]
bpy.ops.export_scene.gltf(filepath=str(OUT / "rock_geometry_review.glb"), export_format="GLB", use_selection=True)
print("RENDER_AND_EXPORT_COMPLETE", [str(p) for p in OUT.iterdir()])
