"""V09 rim wooden plugs: endgrain photographic material and correctly mapped cap UV.
Source V08 is immutable and kept as backup in GitHub Actions artifact. No rim remeshing.
"""
import bpy,sys,hashlib,json,math
from pathlib import Path
from mathutils import Vector
source=Path(sys.argv[sys.argv.index('--')+1]);out=Path(sys.argv[sys.argv.index('--')+2]);out.mkdir(parents=True,exist_ok=True)
EXPECTED='e114f942a1701c7284087ef89ab71743130a89109faa3d8c16ce51866aaaed01'
sha=hashlib.sha256(source.read_bytes()).hexdigest()
if sha!=EXPECTED:raise RuntimeError('Wrong V08 source blend SHA')
bpy.ops.wm.open_mainfile(filepath=str(source))
core=bpy.data.objects['B2_RimSegment_01_Curved_OakTimber']
original=bpy.data.objects['V03_Rim_Original_Protected']
before=(len(core.data.vertices),len(core.data.polygons))
endmat=bpy.data.materials.get('Exposed weathered end grain')
assert endmat and endmat.use_nodes
changed=0
for i in (0,1):
 ob=bpy.data.objects.get('V04_Recessed_Oak_Peg_%d'%i)
 if ob is None:raise RuntimeError('Original fitted wood plug missing')
 # The curved rim's two wooden plugs should have their own actual cut endgrain.
 # Use same softened photo-based material as the rim end caps, not flat bright grey.
 ob.data.materials.clear();ob.data.materials.append(endmat)
 # UV project cap faces from their own local space, preserving plank texture
 # and avoiding the texture being stretched over the round cap.
 uv=ob.data.uv_layers.active or ob.data.uv_layers.new(name='DowelFaceUV')
 for poly in ob.data.polygons:
  for li in poly.loop_indices:
   p=ob.data.vertices[ob.data.loops[li].vertex_index].co
   uv.data[li].uv=(.5+p.x/.052,.5+p.y/.052)
 changed+=1
assert changed==2 and (len(core.data.vertices),len(core.data.polygons))==before
# Make the recess ring a muted damp oak color rather than a black ink outline.
socket=bpy.data.materials.get('Aged joinery recess')
if socket:
 p=socket.node_tree.nodes.get('Principled BSDF')
 p.inputs['Base Color'].default_value=(.095,.080,.068,1)
 p.inputs['Roughness'].default_value=.96
# Remove the protected original only from the export scene; restore afterwards.
coll=original.users_collection[0];coll.objects.unlink(original)
tag='b2_waterwheel_single_rim_segment_v09'
glb=out/(tag+'.glb')
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',export_yup=True)
coll.objects.link(original);original.hide_render=True;original.hide_set(True)
sc=bpy.context.scene;sc.render.engine='CYCLES';sc.cycles.samples=44
sc.render.resolution_x=860;sc.render.resolution_y=860;sc.render.resolution_percentage=100
cam=sc.camera;cam.data.type='ORTHO';cam.data.ortho_scale=1.80
files=[glb]
for n,pos in [('front',(2.6,.55,0)),('side',(0,1.9,2.4)),
              ('angle',(2.2,1.5,1.7)),('back',(-2.6,.4,0))]:
 cam.location=pos;cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler()
 png=out/(tag+'_'+n+'.png');sc.render.filepath=str(png)
 bpy.ops.render.render(write_still=True);files.append(png)
blend=out/(tag+'.blend');bpy.ops.wm.save_as_mainfile(filepath=str(blend));files.append(blend)
manifest={'asset':tag,'approval':'NOT_APPROVED','source_v08_sha256':sha,
 'preserved_core_mesh':True,'plug_materials_photo_based':changed,'backup_in_editable_blend':True,
 'wood_photo_source':'https://polyhaven.com/a/fine_grained_wood',
 'files':{}}
for p in files:
 b=p.read_bytes();manifest['files'][p.name]={'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
(out/(tag+'_manifest.json')).write_text(json.dumps(manifest,indent=2))
print('V09_PLUG_ENDGRAIN_REVIEW_OK',changed,flush=True)
