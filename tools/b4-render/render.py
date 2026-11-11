import bpy,sys,math,os
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:]
path,out=args
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=os.path.abspath(path))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
if not meshes: raise RuntimeError('No meshes imported')
for o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=meshes[0]
from mathutils import Vector
corners=[o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
center=sum(corners,Vector())/len(corners)
size=max((max(v[i] for v in corners)-min(v[i] for v in corners)) for i in range(3))
# Clay override to make geometry visible without texture dependencies
mat=bpy.data.materials.new('neutral_clay');mat.diffuse_color=(.55,.57,.60,1)
for o in meshes:
  o.data.materials.clear();o.data.materials.append(mat)
def point(obj,target):obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=center+Vector((size*1.7,-size*2.3,size*1.5)))
cam=bpy.context.object;point(cam,center);cam.data.type='ORTHO';cam.data.ortho_scale=size*2.35;bpy.context.scene.camera=cam
for loc,power,scale in [((3,-4,7),1100,5),((-5,1,4),650,4)]:
 bpy.ops.object.light_add(type='AREA',location=center+Vector(loc)*max(size/3,0.4))
 lamp=bpy.context.object;lamp.data.energy=power;lamp.data.shape='DISK';lamp.data.size=scale*max(size/3,0.4);point(lamp,center)
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=1100;scene.render.resolution_y=850;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.filepath=os.path.abspath(out)
scene.world.color=(.17,.17,.17)
scene.render.film_transparent=False
bpy.ops.render.render(write_still=True)
print('RENDER_OK',out)
