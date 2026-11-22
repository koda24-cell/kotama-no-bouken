"""Prepare a *separate* normalized preview of existing basalt columns GLB.

Never overwrite the source asset. Original object mesh geometry/materials are retained.
"""
import bpy
from pathlib import Path
from mathutils import Vector

source = Path("assets/models/floor4/props/b4p_basalt_columns.glb").resolve(strict=True)
out = Path("render-output/qa-basalt-tiles")
out.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(source))
meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
if not meshes:
    raise RuntimeError("Basalt source has no mesh")
points = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
low = Vector(tuple(min(v[i] for v in points) for i in range(3)))
high = Vector(tuple(max(v[i] for v in points) for i in range(3)))
center = (low + high) * 0.5
extent = max(high[i] - low[i] for i in range(3))
if not 0.0001 < extent < 1e6:
    raise RuntimeError("Bad basalt world extent")
factor = 5.0 / extent
# Transform positions and sizes without editing source mesh vertices.
for obj in bpy.context.scene.objects:
    if obj.type == "MESH":
        obj.location = (obj.location - center) * factor + Vector((0, 0, 3.8))
        obj.scale *= factor
bpy.context.scene.render.image_settings.file_format = "PNG"
bpy.context.scene.render.image_settings.color_mode = "RGBA"
bpy.context.scene.render.image_settings.color_depth = "8"
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str((out / "normalized_basalt_qa.blend").resolve()))
# Preserve the exact source GLB as a candidate/reference input; don't export changes.
import shutil
shutil.copyfile(source, out / "original_basalt_source.glb")
print("BASALT_QA_SCENE_SAVED", len(meshes), extent, factor)
