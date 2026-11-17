"""Six-view full head context render. Retains facial shell and adds hair/eyes/ears.
Not a replacement for geometry or semantic face validation.
Usage: blender -b --python render_full_head.py -- input.vrm output_dir
"""
import bpy,sys,os,json
from mathutils import Vector
a=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if len(a)!=2:raise SystemExit('usage: blender -b --python render_full_head.py -- input.vrm output_dir')
src,out=a;os.makedirs(out,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=src)
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
def is_head(o):
 n=o.name.lower()
 return any(x in n for x in ('face','head','ear','hair','eye','brow','lash','mouth','teeth','tongue'))
face=[o for o in meshes if any(x in o.name.lower() for x in ('face','head')) and 'hair' not in o.name.lower()]
if not face:raise RuntimeError('No face/head mesh identified; inspect object naming')
chosen=[o for o in meshes if is_head(o)]
# VRoid models may have hair/eyes combined with body. The manifest records selection for audit.
for o in meshes:o.hide_render=o not in chosen
face_pts=[o.matrix_world@v.co for o in face for v in o.data.vertices]
lo=Vector([min(p[i] for p in face_pts) for i in range(3)])
hi=Vector([max(p[i] for p in face_pts) for i in range(3)])
center=(lo+hi)/2
extent=max((hi-lo).length,.15)
scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items else 'BLENDER_EEVEE'
scene.render.resolution_x=720;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.world.color=(.28,.28,.28)
cam_data=bpy.data.cameras.new('FullHeadCamera')
cam=bpy.data.objects.new('FullHeadCamera',cam_data);scene.collection.objects.link(cam);scene.camera=cam
cam.data.type='ORTHO';cam.data.ortho_scale=extent*2.2
ld=bpy.data.lights.new('Softbox','AREA');light=bpy.data.objects.new('Softbox',ld);scene.collection.objects.link(light)
light.location=center+Vector((extent,extent,extent*1.4));ld.energy=650;ld.shape='DISK';ld.size=extent*1.5
views={'front':(0,1,0),'back':(0,-1,0),'left':(-1,0,0),'right':(1,0,0),'three_quarter':(1,1,.28),'back_upper':(1,-1,.65)}
for name,offset in views.items():
 cam.location=center+Vector(offset).normalized()*extent*3
 cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=os.path.join(out,name+'.png')
 bpy.ops.render.render(write_still=True)
with open(os.path.join(out,'review_manifest.json'),'w') as f:
 json.dump({'source':os.path.basename(src),'selected_objects':[o.name for o in chosen],'excluded_meshes':[o.name for o in meshes if o not in chosen],'face_reference':[o.name for o in face],'front_axis_assumption':'+Y for these VRoid samples; verify','coverage':'Name-based face/hair/eye selection; inspect manifest and all views','views':list(views)},f,indent=2)
