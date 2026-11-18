"""B2 Waterwheel V07: reopen a verified V06 BLEND artifact; improve CC0 PBR without remeshing.
Blender 5.3 run, input .blend from GitHub Actions run 44131102651.
"""
import bpy,sys,os,json,hashlib
from pathlib import Path
from mathutils import Vector
src=Path(sys.argv[sys.argv.index('--')+1]).resolve()
out=Path(sys.argv[sys.argv.index('--')+2]).resolve()
out.mkdir(parents=True,exist_ok=True)
EXPECTED='632fcb47afdf5fecb6f44f88e61a24911bc845d8b0a329c042375c95d548b199'
raw=src.read_bytes();source_sha=hashlib.sha256(raw).hexdigest()
if source_sha!=EXPECTED:raise RuntimeError('Checkpoint SHA mismatch; refuse to alter the wrong model')
bpy.ops.wm.open_mainfile(filepath=str(src))
scene=bpy.context.scene
base=bpy.data.materials.get('Wood_waterlogged_aged_embedded_PBR')
if not base:raise RuntimeError('Wood material missing in V06 checkpoint')
nodes=base.node_tree.nodes;links=base.node_tree.links
bs=nodes.get('Principled BSDF')
mixes=[n for n in nodes if n.type=='MIX_RGB' and n.blend_type=='MULTIPLY']
if not mixes:raise RuntimeError('CC0 diffuse tint node missing in V06')
tint=mixes[-1]
tint.inputs[0].default_value=.86
tint.inputs[2].default_value=(.48,.62,.77,1)
bs.inputs['Roughness'].default_value=.84
source_dir=out
applied={}
for suffix,socket in [('rough','Roughness'),('nor_gl','Normal')]:
 file=source_dir/('wood_planks_'+suffix+'_1k.jpg')
 key='photo_'+suffix+'_applied'
 applied[key]=False
 if not file.exists():continue
 buf=file.read_bytes()
 if not buf.startswith(bytes.fromhex('ffd8')) or len(buf)<20000:continue
 im=bpy.data.images.load(str(file),check_existing=False)
 im.colorspace_settings.name='Non-Color';im.pack()
 node=nodes.new('ShaderNodeTexImage');node.image=im;node.interpolation='Linear'
 if socket=='Roughness':
  links.new(node.outputs['Color'],bs.inputs['Roughness'])
 else:
  nn=nodes.new('ShaderNodeNormalMap');nn.inputs['Strength'].default_value=.38
  links.new(node.outputs['Color'],nn.inputs['Color'])
  links.new(nn.outputs['Normal'],bs.inputs['Normal'])
 applied[key]=True
 applied[key.replace('_applied','_sha256')]=hashlib.sha256(buf).hexdigest()
 print('PBR_PHOTO_MAP',suffix,key,applied[key],flush=True)
# The topology, mesh positions, and named object slots are not modified.
tag='b2_bucket_paddle_blender_v07'
glb=out/(tag+'.glb')
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',export_yup=True)
camera=scene.camera
if not camera:raise RuntimeError('No inherited QA camera in verified V06 BLEND')
scene.render.engine='CYCLES';scene.cycles.samples=26
scene.render.resolution_x=740;scene.render.resolution_y=740;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
paths=[glb]
for name,pos in [('front',(0,-2.5,.12)),('side',(2.8,0,.12)),('angle',(1.65,-2.15,.72)),('back',(0,2.5,.12))]:
 camera.location=pos
 camera.rotation_euler=(-camera.location).to_track_quat('-Z','Y').to_euler()
 p=out/(tag+'_'+name+'.png');scene.render.filepath=str(p)
 bpy.ops.render.render(write_still=True);paths.append(p)
blend=out/(tag+'.blend');bpy.ops.wm.save_as_mainfile(filepath=str(blend));paths.append(blend)
manifest={'asset':tag,'status':'NOT_APPROVED',
 'source_checkpoint_sha256':source_sha,'source_run_id':44131102651,
 'source_artifact_id':14349903645,
 'preserve_original_geometry':True,'blender':bpy.app.version_string,
 'mesh_count':len([o for o in scene.objects if o.type=='MESH']),
 'cc0_color_source':'https://polyhaven.com/a/wood_planks',
 'cc0_color_applied':True,
 **applied,'files':{}}
for file in paths:
 b=file.read_bytes()
 if len(b)<100:raise RuntimeError('missing file '+str(file))
 manifest['files'][file.name]={'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
(out/(tag+'_manifest.json')).write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
(out/'progress.json').write_text(json.dumps({'status':'NOT_APPROVED','checkpoint_run_id':44131102651,'checkpoint_sha256':source_sha,
 'completed_variants':[7],'next':'visual QA and user approval'},indent=2))
print('BLENDER_V07_RESUME_VERIFIED',source_sha,flush=True)
