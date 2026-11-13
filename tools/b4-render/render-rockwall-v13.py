import bpy,sys,os
from mathutils import Vector
src,outdir=sys.argv[sys.argv.index('--')+1:]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=os.path.abspath(src))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
if not meshes:raise RuntimeError('No meshes in GLB')
corners=[o.matrix_world@Vector(v) for o in meshes for v in o.bound_box]
lo=[min(v[i] for v in corners) for i in range(3)];hi=[max(v[i] for v in corners) for i in range(3)]
center=Vector([(a+b)/2 for a,b in zip(lo,hi)]);size=max(b-a for a,b in zip(lo,hi))
def aim(o,target):o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();camera=bpy.context.object;camera.data.type='ORTHO';camera.data.ortho_scale=size*1.35;bpy.context.scene.camera=camera
for vec,power,scale in [((-3,3,5),1850,1.0),((4,2,1),1050,2.8),((1,-2,4),750,2.2)]:
 bpy.ops.object.light_add(type='AREA',location=center+Vector(vec)*size)
 light=bpy.context.object;light.data.energy=power*max(size,1);light.data.size=size*scale;aim(light,center)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=64
scene.render.resolution_x=900;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.world.color=(.2,.2,.2)
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=1.05
os.makedirs(outdir,exist_ok=True);stem=os.path.splitext(os.path.basename(src))[0]
# 8 azimuths reveal which surface is the relief face after glTF coordinate conversion.
views=[('front-lit',(0,1,.12)),('front-level',(0,1,0)),('front-low',(0,1,-.2)),('angle-lit',(1,1,.28)),('side-lit',(1,0,.12))]
for label,direction in views:
 camera.location=center+Vector(direction).normalized()*size*2.7;aim(camera,center)
 scene.render.filepath=os.path.abspath(os.path.join(outdir,stem+'-'+label+'.png'))
 bpy.ops.render.render(write_still=True)
 if not os.path.exists(scene.render.filepath):raise RuntimeError('PNG missing '+scene.render.filepath)
 print('RENDER_OK',label,scene.render.filepath)
