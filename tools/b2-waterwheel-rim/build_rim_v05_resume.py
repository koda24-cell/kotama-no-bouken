"""V05: correct black-hole dowels and remove floating endgrain shards from V04.
Restore one rim segment .blend; source V03 beam backup retained. Real Blender QA.
"""
import bpy,sys,hashlib,json
from pathlib import Path
from mathutils import Vector
src=Path(sys.argv[sys.argv.index('--')+1]);out=Path(sys.argv[sys.argv.index('--')+2]);out.mkdir(parents=True,exist_ok=True)
expected='0fc2491adbd55a8dcfdf4c06c948548a2f1279d06e580e224ed0096e6bd329d1'
sha=hashlib.sha256(src.read_bytes()).hexdigest()
if sha!=expected:raise RuntimeError('V04 checkpoint not verified')
bpy.ops.wm.open_mainfile(filepath=str(src))
timber=bpy.data.objects.get('B2_RimSegment_01_Curved_OakTimber')
backup=bpy.data.objects.get('V03_Rim_Original_Protected')
assert timber and backup
faces=len(timber.data.polygons)
# V04 dowels were set 0.013m behind the wood surface; relocate them radially
# outward 0.014m so the head meets the actual exterior and is not a black hole.
doweldeltas={}
for i in (0,1):
 obj=bpy.data.objects.get('V04_Recessed_Oak_Peg_%d'%i)
 assert obj
 radial=Vector((0,obj.location.y+2.55,obj.location.z)).normalized()
 before=obj.location.copy()
 obj.location+=radial*.014
 doweldeltas[obj.name]={'before':list(before),'after':list(obj.location)}
# Remove only V04's superficial cardboard-like fiber triangles, keeping parent wood.
removed=[]
for ob in list(bpy.data.objects):
 if ob.name.startswith('V04_Sparse_Endgrain_Fracture_'):
  removed.append(ob.name);bpy.data.objects.remove(ob,do_unlink=True)
assert len(removed)==2
assert len(timber.data.polygons)==faces
backupcoll=backup.users_collection[0]
backupcoll.objects.unlink(backup)
tag='b2_waterwheel_single_rim_segment_v05'
glb=out/(tag+'.glb')
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',export_yup=True)
backupcoll.objects.link(backup);backup.hide_set(True);backup.hide_render=True
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=40
scene.render.resolution_x=820;scene.render.resolution_y=820;scene.render.resolution_percentage=100
cam=scene.camera;cam.data.type='ORTHO';cam.data.ortho_scale=1.80
files=[glb]
for view,pos in [('front',(2.6,.55,0)),('side',(0,1.9,2.4)),('angle',(2.2,1.5,1.7)),('back',(-2.6,.4,0))]:
 cam.location=pos;cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler()
 p=out/(tag+'_'+view+'.png');scene.render.filepath=str(p)
 bpy.ops.render.render(write_still=True);files.append(p)
blend=out/(tag+'.blend');bpy.ops.wm.save_as_mainfile(filepath=str(blend));files.append(blend)
m={'asset':tag,'status':'NOT_APPROVED','source_v04_sha256':sha,
 'original_V03_geometry_preserved':True,'V04_wood_faces_unchanged':True,
 'two_dowels_moved_to_surface':doweldeltas,'floating_shards_removed':len(removed),
 'photo_maps':'Poly Haven fine_grained_wood CC0 inherited, unchanged','files':{}}
for p in files:
 b=p.read_bytes();m['files'][p.name]={'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
(out/(tag+'_manifest.json')).write_text(json.dumps(m,indent=2))
print('B2_RIM_V05_REAL_BLENDER_REVIEW',flush=True)
