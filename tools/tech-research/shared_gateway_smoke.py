import bpy, os, json
from pathlib import Path
assert bpy.app.version[:3] == (5,3,0), bpy.app.version_string
out=Path(os.environ["OUTPUT_DIR"])
out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1.0)
rock=bpy.context.object
rock.name="SharedGatewaySmokeRock"
mat=bpy.data.materials.new("SmokeMaterial")
mat.diffuse_color=(0.23,0.38,0.46,1)
rock.data.materials.append(mat)
bpy.ops.object.camera_add(location=(4,-6,3))
camera=bpy.context.object
direction=rock.location-camera.location
camera.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
bpy.context.scene.camera=camera
bpy.ops.object.light_add(type='AREA', location=(2,-4,6))
bpy.context.object.data.energy=650
scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.samples=8
scene.render.resolution_x=512
scene.render.resolution_y=512
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.filepath=str(out/'smoke_angle.png')
bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'smoke.blend'))
(out/'smoke.json').write_text(json.dumps({'blender':bpy.app.version_string,'status':'NOT_APPROVED'}))
print("SHARED_GATEWAY_SMOKE_RENDER_SUCCESS")
