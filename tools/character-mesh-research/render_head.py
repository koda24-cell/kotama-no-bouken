"""Render isolated facial shell from six directions. Not a complete head.\nCamera labels are calibrated for these VRoid samples (+Y facial front).\n"""
import bpy,sys,os,math,json
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if len(args)!=2:raise SystemExit('usage: blender -b --python render_head.py -- input.vrm output_directory')
src,out=args
os.makedirs(out,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=src)
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
head=[o for o in meshes if any(s in o.name.lower() for s in ('face','head','ear')) and not any(s in o.name.lower() for s in ('hair','eyelash','eye','brow','mouth','teeth'))]
if not head:
 raise RuntimeError('No identifiable head mesh; inspect mesh names before rendering')
for o in meshes:
 o.hide_render=o not in head
 o.hide_set(o not in head)
verts=[o.matrix_world@v.co for o in head for v in o.data.vertices]
lo=Vector([min(v[i] for v in verts) for i in range(3)])
hi=Vector([max(v[i] for v in verts) for i in range(3)])
center=(lo+hi)/2
extent=max((hi-lo).length,.15)
scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items else 'BLENDER_EEVEE'
scene.render.resolution_x=720;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.world.color=(.32,.32,.32)
camera_data=bpy.data.cameras.new('ReviewCamera');cam=bpy.data.objects.new('ReviewCamera',camera_data);scene.collection.objects.link(cam);scene.camera=cam
cam.data.type='ORTHO';cam.data.ortho_scale=extent*1.5
light_data=bpy.data.lights.new('Softbox','AREA');light=bpy.data.objects.new('Softbox',light_data);scene.collection.objects.link(light)
light.location=center+Vector((extent,extent,extent*1.4));light_data.energy=650;light_data.shape='DISK';light_data.size=extent*1.5
views={'front':(0,1,0),'back':(0,-1,0),'left':(-1,0,0),'right':(1,0,0),'three_quarter':(1,1,.28),'back_upper':(1,-1,.65)}
for name,offset in views.items():
 vec=Vector(offset).normalized()
 cam.location=center+vec*extent*3
 direction=center-cam.location
 cam.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=os.path.join(out,name+'.png')
 bpy.ops.render.render(write_still=True)
with open(os.path.join(out,'review_manifest.json'),'w') as f:
 json.dump({'source':os.path.basename(src),'head_objects':[o.name for o in head],'bounds':[list(lo),list(hi)],'views':list(views),'forward_axis':'+Y for tested VRoid samples; verify per source','coverage':'Face/ear only; rear head and hair are intentionally excluded'},f,indent=2)
