import bpy,sys,os
from mathutils import Vector
src,outdir=sys.argv[sys.argv.index('--')+1:]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=os.path.abspath(src))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
if not meshes:raise RuntimeError('No meshes in GLB')
corners=[o.matrix_world@Vector(v) for o in meshes for v in o.bound_box]
minimum=[min(v[i] for v in corners) for i in range(3)];maximum=[max(v[i] for v in corners) for i in range(3)]
center=Vector([(a+b)/2 for a,b in zip(minimum,maximum)]);size=max(b-a for a,b in zip(minimum,maximum))
def aim(o,target):o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();camera=bpy.context.object;camera.data.type='ORTHO';camera.data.ortho_scale=size*1.5;bpy.context.scene.camera=camera
for vec,power,scale in [((2,-3,4),2500,1.6),((-4,-2,2),1800,1.9),((1,3,4),1100,1.2)]:
 bpy.ops.object.light_add(type='AREA',location=center+Vector(vec)*size)
 light=bpy.context.object;light.data.energy=power*max(size,1);light.data.size=size*scale;aim(light,center)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=40
scene.render.resolution_x=960;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.world.color=(.2,.2,.2)
scene.view_settings.view_transform='AgX';scene.view_settings.look='Medium High Contrast';scene.view_settings.view_settings if False else None
scene.view_settings.exposure=1.1
os.makedirs(outdir,exist_ok=True);stem=os.path.splitext(os.path.basename(src))[0]
for label,direction in [('front',(0,-1,.25)),('side',(1,-.12,.22)),('angle',(1,-1,.52))]:
 camera.location=center+Vector(direction).normalized()*size*2.7;aim(camera,center)
 scene.render.filepath=os.path.abspath(os.path.join(outdir,stem+'-'+label+'-bright.png'))
 bpy.ops.render.render(write_still=True)
 if not os.path.exists(scene.render.filepath):raise RuntimeError('PNG missing: '+scene.render.filepath)
 print('RENDER_OK',scene.render.filepath)
