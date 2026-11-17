"""B2 V09: correct V08 floating fasteners by anchoring hardware to original rivets.
Non-destructive to original V07 curved timber and CC0 photo wood.
"""
import bpy,sys,json,hashlib,math,random
from pathlib import Path
inp=Path(sys.argv[sys.argv.index('--')+1]);out=Path(sys.argv[sys.argv.index('--')+2]);out.mkdir(parents=True,exist_ok=True)
EXPECTED='bf043453e7a51c1349064ba9ff60309236000cc0c7621529da0e2b9c89fe282c'
s=hashlib.sha256(inp.read_bytes()).hexdigest()
if s!=EXPECTED:raise RuntimeError('V08 checkpoint hash differs')
bpy.ops.wm.open_mainfile(filepath=str(inp))
# Original iron rivets were correct; remove only new, improperly positioned V08 washers/bolts/lips.
removed=[]
for ob in list(bpy.data.objects):
 if ob.name.startswith(('V08 forged raised washer','V08 forged bolt shank','V08 bent bracket lip')):
  removed.append(ob.name);bpy.data.objects.remove(ob,do_unlink=True)
assert len(removed)==14, 'Expected exactly 14 detached hardware objects, found '+str(len(removed))
original=[o for o in bpy.data.objects if o.name.startswith('real_iron_rivet') and o.type=='MESH']
assert len(original)==6, 'Unexpected V07 rivet inventory '+str(len(original))
metal=bpy.data.materials.get('V08 cold iron wear')
if metal is None:raise RuntimeError('V08 metal material missing')
# Real rivet center coordinates are read from the V07 Blender checkpoint, never guessed.
def ring(name,x,y,z,rad):
 verts=[];faces=[];N=24
 for r in (rad*.70,rad):
  for i in range(N):
   a=2*math.pi*i/N;verts.append((x+r*math.cos(a),y,z+r*math.sin(a)))
 for i in range(N):
  a=i;b=(i+1)%N;faces.append((a,b,b+N,a+N))
 data=bpy.data.meshes.new(name+'_mesh');data.from_pydata(verts,[],faces);data.update()
 obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj)
 obj.data.materials.append(metal)
 return obj
for index,original_rivet in enumerate(original):
 x,y,z=original_rivet.location
 ring('V09 washer anchored to original rivet %d'%index,x,y+.003,z,.021)
# Tone down false pen-drawn black cracks, retain every original crack as a mesh.
m=bpy.data.materials.get('Deep_recessed_cracks')
if m:
 shader=m.node_tree.nodes.get('Principled BSDF')
 shader.inputs['Base Color'].default_value=(.115,.098,.083,1)
 shader.inputs['Roughness'].default_value=.94
# A slight enhancement of cold moisture rather than overall frost whitening.
wood=bpy.data.materials.get('Wood_waterlogged_aged_embedded_PBR')
assert wood is not None
mix=[n for n in wood.node_tree.nodes if n.type=='MIX_RGB' and n.blend_type=='MULTIPLY']
if mix:mix[-1].inputs[0].default_value=.87
tag='b2_bucket_paddle_blender_v09'
glb=out/(tag+'.glb')
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',export_yup=True)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32
scene.render.resolution_x=800;scene.render.resolution_y=800;scene.render.resolution_percentage=100
cam=scene.camera;cam.data.type='ORTHO';cam.data.ortho_scale=1.7
files=[glb]
for name,pos in [('front',(0,-2.5,.12)),('side',(2.8,0,.12)),('angle',(1.65,-2.15,.72)),('back',(0,2.5,.12))]:
 cam.location=pos;cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler()
 p=out/(tag+'_'+name+'.png');scene.render.filepath=str(p)
 bpy.ops.render.render(write_still=True);files.append(p)
blend=out/(tag+'.blend');bpy.ops.wm.save_as_mainfile(filepath=str(blend));files.append(blend)
m={'asset':tag,'status':'NOT_APPROVED','source_v08_sha256':s,'removed_floating_objects':len(removed),
 'anchored_washers':len(original),'old_v07_mesh_unchanged':True,
 'wood':'Poly Haven CC0 Diffuse + OpenGL Normal + Roughness','blender':bpy.app.version_string,'files':{}}
for p in files:
 data=p.read_bytes();m['files'][p.name]={'size':len(data),'sha256':hashlib.sha256(data).hexdigest()}
(out/(tag+'_manifest.json')).write_text(json.dumps(m,indent=2))
print('V09_ANCHORED_RIVETS_AND_SHA',len(removed),len(original),flush=True)
