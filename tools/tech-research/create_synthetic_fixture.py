"""Synthetic, original fixture for CI; not the artist's source file."""
import bpy, os
from pathlib import Path
assert bpy.app.version[:2] == (5,3)
out=Path(os.environ["FIXTURE_DIR"]);out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,location=(0,0,0))
obj=bpy.context.object
m=bpy.data.materials.new("synthetic_painterly_test");m.use_nodes=True
n=m.node_tree.nodes;l=m.node_tree.links
bs=n.get("Principled BSDF");bs.inputs["Roughness"].default_value=.8
noise=n.new("ShaderNodeTexNoise");noise.inputs["Scale"].default_value=3
vor=n.new("ShaderNodeTexVoronoi");vor.inputs["Scale"].default_value=5
fres=n.new("ShaderNodeFresnel")
ramp=n.new("ShaderNodeValToRGB");ramp.color_ramp.elements[0].color=(.1,.25,.2,1);ramp.color_ramp.elements[1].color=(.7,.8,.3,1)
l.new(noise.outputs["Fac"],ramp.inputs["Fac"]);l.new(ramp.outputs["Color"],bs.inputs["Base Color"])
obj.data.materials.append(m)
bpy.ops.object.camera_add(location=(3,-5,3));cam=bpy.context.object
from mathutils import Vector
cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat("-Z","Y").to_euler()
bpy.context.scene.camera=cam
bpy.ops.object.light_add(type="AREA",location=(1,-3,5));bpy.context.object.data.energy=700
bpy.context.scene.render.resolution_x=512;bpy.context.scene.render.resolution_y=512
bpy.ops.wm.save_as_mainfile(filepath=str(out/"synthetic_fixture.blend"))
print("SYNTHETIC_FIXTURE_CREATED")
