"""Generate a temporary QA fixture only; never use as a production asset."""
from pathlib import Path
import bpy
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1)
obj = bpy.context.object
obj.name = "QA_TEST_ONLY"
mat = bpy.data.materials.new("Test rock")
mat.diffuse_color = (0.35, 0.30, 0.38, 1)
obj.data.materials.append(mat)
Path("qa-fixture").mkdir(exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(Path("qa-fixture/sample.blend").resolve()))
