"""B2 Waterwheel rim V08: re-orient photographic grain along curved timber.
Reopen verified V07 Blend; preserve actual geometry and recessed pegged mortises.
"""
import bpy,sys,json,hashlib
from pathlib import Path
src=Path(sys.argv[sys.argv.index('--')+1]);out=Path(sys.argv[sys.argv.index('--')+2]);out.mkdir(parents=True,exist_ok=True)
EXPECTED='ee4792751f12d11e57df3341003bac72651a5b02f5514cf8a42999a1092ff819'
source_sha=hashlib.sha256(src.read_bytes()).hexdigest()
if source_sha!=EXPECTED:raise RuntimeError('V07 checkpoint mismatch, stop')
bpy.ops.wm.open_mainfile(filepath=str(src))
wood=bpy.data.objects['B2_RimSegment_01_Curved_OakTimber']
backup=bpy.data.objects['V03_Rim_Original_Protected']
assert wood.data.uv_layers
uv=wood.data.uv_layers.active
# Original source photo grain is horizontal in texture, the geometry's UV U axis
# previously ran down the arc. Rotate only body face UVs; both end caps remain
# end-on to the timber and retain their own mapped endgrain texture.
rotated=0
for poly in wood.data.polygons:
 if poly.material_index==1:continue
 for li in poly.loop_indices:
  coord=uv.data[li].uv.copy()
  uv.data[li].uv=(coord.y,1-coord.x)
  rotated+=1
# Source photographs are inside the existing .blend. No extra file downloaded.
timber_mat=bpy.data.materials.get('Cold wet aged oak - actual CC0 photo if retrieved')
end_mat=bpy.data.materials.get('Exposed weathered end grain')
assert timber_mat and end_mat
photographs=[n for n in timber_mat.node_tree.nodes if n.type=='TEX_IMAGE' and n.image and 'fine_grained_wood_col' in n.image.name]
assert len(photographs)==1, 'Verified V03 photographic wood diffuse missing'
photo=photographs[0].image
nodes=end_mat.node_tree.nodes;links=end_mat.node_tree.links
bs=nodes.get('Principled BSDF')
old=[n for n in nodes if n.type=='TEX_IMAGE']
assert len(old)==1
pnode=nodes.new('ShaderNodeTexImage');pnode.image=photo
mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MIX'
mix.inputs[0].default_value=.70 # photo dominates, ring map only 30%
links.new(old[0].outputs['Color'],mix.inputs[1])
links.new(pnode.outputs['Color'],mix.inputs[2])
links.new(mix.outputs['Color'],bs.inputs['Base Color'])
bs.inputs['Roughness'].default_value=.88
# The pale plugs had a button-like appearance; dark wet oak with rough endgrain.
peg=bpy.data.materials['Weathered oak dowel head']
pbs=peg.node_tree.nodes['Principled BSDF']
pbs.inputs['Base Color'].default_value=(.062,.054,.048,1)
pbs.inputs['Roughness'].default_value=.95
# Keep exact same geometry and materials for core and peg positions
original_count=len(wood.data.vertices)
coll=backup.users_collection[0];coll.objects.unlink(backup)
tag='b2_waterwheel_single_rim_segment_v08'
glb=out/(tag+'.glb')
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',export_yup=True)
coll.objects.link(backup);backup.hide_render=True;backup.hide_set(True)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=44
scene.render.resolution_x=860;scene.render.resolution_y=860;scene.render.resolution_percentage=100
cam=scene.camera;cam.data.type='ORTHO';cam.data.ortho_scale=1.80
files=[glb]
for name,pos in [('front',(2.6,.55,0)),('side',(0,1.9,2.4)),
                 ('angle',(2.2,1.5,1.7)),('back',(-2.6,.4,0))]:
 cam.location=pos;cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler()
 png=out/(tag+'_'+name+'.png')
 scene.render.filepath=str(png)
 bpy.ops.render.render(write_still=True);files.append(png)
blend=out/(tag+'.blend');bpy.ops.wm.save_as_mainfile(filepath=str(blend));files.append(blend)
m={'asset':tag,'status':'NOT_APPROVED','source_v07_sha256':source_sha,
 'body_uv_loops_rotated':rotated,'wood_mesh_vertex_count':original_count,
 'original_v03_backup_preserved':True,'wood_timber_geometry_untouched':True,
 'photo_PBR':'Poly Haven Fine Grained Wood CC0 inherited',
 'endgrain_photographic_mix':.70,'files':{}}
for p in files:
 b=p.read_bytes();m['files'][p.name]={'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
(out/(tag+'_manifest.json')).write_text(json.dumps(m,indent=2))
print('B2_RIM_V08_PHOTOGRAPHIC_GRAIN_DIRECTION_QA',rotated,flush=True)
