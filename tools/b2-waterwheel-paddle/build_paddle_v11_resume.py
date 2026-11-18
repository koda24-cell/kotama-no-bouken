"""V11: remove visible square ice roots; correct Stage-2 cold wood tone.
Resume exact V10 Blender checkpoint; preserve all parent timber and bracket geometry.
"""
import bpy,sys,json,hashlib
from pathlib import Path
inp=Path(sys.argv[sys.argv.index('--')+1]);out=Path(sys.argv[sys.argv.index('--')+2]);out.mkdir(parents=True,exist_ok=True)
expected='7edbc20b96625a73f73175289ec432c8f79246a9f45220eba50669f23fbdb664'
sha=hashlib.sha256(inp.read_bytes()).hexdigest()
if sha!=expected:raise RuntimeError('unexpected source V10 .blend')
bpy.ops.wm.open_mainfile(filepath=str(inp))
original=bpy.data.objects.get('solid_curved_scoop_timbers')
if original is None:raise RuntimeError('base timber missing')
removed=[]
for obj in list(bpy.data.objects):
 if obj.name.startswith(('V10 ice attachment collar','V10 granular frost seam')):
  removed.append(obj.name);bpy.data.objects.remove(obj,do_unlink=True)
assert len(removed)==11, 'expected 7 square ice collars and 4 rectangular frost tabs'
assert bpy.data.objects.get('solid_curved_scoop_timbers') is original
# Original CC0 diffuse/normal/roughness untouched. Make icy dungeon tint less golden.
wood=bpy.data.materials.get('Wood_waterlogged_aged_embedded_PBR')
assert wood and wood.use_nodes
mix=[n for n in wood.node_tree.nodes if n.type=='MIX_RGB' and n.blend_type=='MULTIPLY']
assert mix
mix[-1].inputs[0].default_value=.96
mix[-1].inputs[2].default_value=(.34,.46,.57,1)
tag='b2_bucket_paddle_blender_v11'
glb=out/(tag+'.glb')
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',export_yup=True)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32
scene.render.resolution_x=820;scene.render.resolution_y=820;scene.render.resolution_percentage=100
cam=scene.camera;cam.data.type='ORTHO';cam.data.ortho_scale=1.7
files=[glb]
for name,pos in [('front',(0,-2.5,.12)),('side',(2.8,0,.12)),('angle',(1.65,-2.15,.72)),('back',(0,2.5,.12))]:
 cam.location=pos;cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler()
 p=out/(tag+'_'+name+'.png');scene.render.filepath=str(p)
 bpy.ops.render.render(write_still=True);files.append(p)
blend=out/(tag+'.blend');bpy.ops.wm.save_as_mainfile(filepath=str(blend));files.append(blend)
m={'asset':tag,'status':'NOT_APPROVED','source_v10_sha256':sha,'non_destructive_wood':True,
 'removed_bad_ice_roots':len(removed),'cc0_wood_pbr':'Poly Haven Wood Planks Diffuse Normal Roughness',
 'blender':bpy.app.version_string,'files':{}}
for file in files:
 data=file.read_bytes();m['files'][file.name]={'size':len(data),'sha256':hashlib.sha256(data).hexdigest()}
(out/(tag+'_manifest.json')).write_text(json.dumps(m,indent=2))
print('V11_ICE_ROOTS_FIXED',len(removed),flush=True)
