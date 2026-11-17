"""V12: retop frost patches onto actual wood rim; preserve V11 solid timber and photo PBR."""
import bpy,sys,json,hashlib,math
from pathlib import Path
inp=Path(sys.argv[sys.argv.index('--')+1]);out=Path(sys.argv[sys.argv.index('--')+2]);out.mkdir(parents=True,exist_ok=True)
EXPECTED='a18c95540a9ac6f73d2e7ebb96303e581e16626dc02c862b629608f213bed75c'
sha=hashlib.sha256(inp.read_bytes()).hexdigest()
if sha!=EXPECTED:raise RuntimeError('V11 checkpoint mismatch')
bpy.ops.wm.open_mainfile(filepath=str(inp))
wood=bpy.data.objects.get('solid_curved_scoop_timbers')
assert wood
removed=[]
for obj in list(bpy.data.objects):
 if obj.name.startswith(('thin_top_rime_patch','V08 corner rime')):
  removed.append(obj.name);bpy.data.objects.remove(obj,do_unlink=True)
assert len(removed)>=9
frost=bpy.data.materials.get('V08 irregular thin granular frost')
assert frost and frost.use_nodes
frost.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.42,.51,.57,1)
def upper_point(x):
 # same top wood cross-section as original V07 generator, before material changes
 y=.18+.045*(x/.62)**2-.042
 z=.415
 return (x,y,z)
for k,(x0,x1) in enumerate([(-.59,-.46),(-.37,-.29),(-.12,.02),(.18,.24),(.39,.55)]):
 verts=[];faces=[]
 for j in range(9):
  u=j/8;x=x0+(x1-x0)*u
  _,y,z=upper_point(x)
  edge=.004+.002*math.sin(3*math.pi*u+k*.7)
  verts.append((x,y-.006,z+.001))
  verts.append((x,y-.009,z+edge))
 for j in range(8):
  a=2*j;faces.append((a,a+2,a+3,a+1))
 me=bpy.data.meshes.new('attached_frost_%02d'%k);me.from_pydata(verts,[],faces);me.update()
 ob=bpy.data.objects.new('V12 attached upper-rim frost %02d'%k,me)
 bpy.context.collection.objects.link(ob);me.materials.append(frost)
# More legible silhouette and non-black comparison environment
scene=bpy.context.scene
if scene.world and scene.world.use_nodes:
 bg=scene.world.node_tree.nodes.get('Background')
 if bg:
  bg.inputs['Color'].default_value=(.10,.13,.16,1)
  bg.inputs['Strength'].default_value=.58
assert bpy.data.objects.get('solid_curved_scoop_timbers') is wood
tag='b2_bucket_paddle_blender_v12'
glb=out/(tag+'.glb');bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',export_yup=True)
scene.render.engine='CYCLES';scene.cycles.samples=32
scene.render.resolution_x=820;scene.render.resolution_y=820;scene.render.resolution_percentage=100
cam=scene.camera;cam.data.type='ORTHO';cam.data.ortho_scale=1.7
files=[glb]
for name,pos in [('front',(0,-2.5,.12)),('side',(2.8,0,.12)),('angle',(1.65,-2.15,.72)),('back',(0,2.5,.12))]:
 cam.location=pos;cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler()
 p=out/(tag+'_'+name+'.png');scene.render.filepath=str(p)
 bpy.ops.render.render(write_still=True);files.append(p)
blend=out/(tag+'.blend');bpy.ops.wm.save_as_mainfile(filepath=str(blend));files.append(blend)
m={'asset':tag,'status':'NOT_APPROVED','source_v11_sha256':sha,'replaced_floating_snow_patches':len(removed),'attached_frost_patches':5,
 'base_wood_preserved':True,'photo_pbr':'Poly Haven CC0 wood diffuse normal roughness','blender':bpy.app.version_string,'files':{}}
for p in files:
 b=p.read_bytes();m['files'][p.name]={'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
(out/(tag+'_manifest.json')).write_text(json.dumps(m,indent=2))
print('V12_SNOW_RIM_CHECKPOINT_OK',len(removed),flush=True)
