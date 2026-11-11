import bpy,sys,os
from mathutils import Vector
src,outdir=sys.argv[sys.argv.index('--')+1:]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=os.path.abspath(src))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
if not meshes:raise RuntimeError('No mesh in '+src)
corners=[o.matrix_world@Vector(v) for o in meshes for v in o.bound_box]
center=sum(corners,Vector())/len(corners)
size=max(max(v[i] for v in corners)-min(v[i] for v in corners) for i in range(3))
size=max(size,.1)
clay=bpy.data.materials.new('neutral_clay')
clay.diffuse_color=(.65,.66,.68,1)
for o in meshes:
 o.data.materials.clear()
 o.data.materials.append(clay)
def aim(o,target):o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add()
camera=bpy.context.object
camera.data.type='ORTHO'
camera.data.ortho_scale=size*1.9
bpy.context.scene.camera=camera
for vec,power in [((3,-4,6),850),((-4,2,4),550)]:
 bpy.ops.object.light_add(type='AREA',location=center+Vector(vec)*size)
 light=bpy.context.object
 light.data.energy=power*max(size,1)
 light.data.size=size*2
 aim(light,center)
scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.samples=20
scene.render.resolution_x=960
scene.render.resolution_y=720
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
os.makedirs(outdir,exist_ok=True)
stem=os.path.splitext(os.path.basename(src))[0]
for label,direction in [('front',(0,.22,1)),('side',(1,.22,0)),('angle',(1,.7,1))]:
 camera.location=center+Vector(direction).normalized()*size*3
 aim(camera,center)
 scene.render.filepath=os.path.abspath(os.path.join(outdir,stem+'-'+label+'.png'))
 bpy.ops.render.render(write_still=True)
 print('RENDER_OK',scene.render.filepath)
