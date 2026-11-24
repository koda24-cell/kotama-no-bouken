import bpy, os
from pathlib import Path
from mathutils import Vector
out=Path(os.environ["OUTPUT_DIR"])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.mesh.primitive_cube_add()
bpy.ops.object.camera_add(location=(4,-6,4))
cam=bpy.context.object
cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler()
s=bpy.context.scene
s.camera=cam
s.render.engine='BLENDER_WORKBENCH'
s.render.resolution_x=256
s.render.resolution_y=256
s.render.resolution_percentage=100
s.render.filepath=str(out/'front.png')
bpy.ops.render.render(write_still=True)
