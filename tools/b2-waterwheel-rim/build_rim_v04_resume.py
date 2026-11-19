"""Waterwheel single rim V04: real recessed wooden dowel sockets, end grain fracture.
Restore source V03 .blend exactly; preserve original beam in a separate hidden Blender collection.
"""
import bpy,sys,hashlib,json,math,random
from pathlib import Path
from mathutils import Vector
inp=Path(sys.argv[sys.argv.index('--')+1]);out=Path(sys.argv[sys.argv.index('--')+2]);out.mkdir(parents=True,exist_ok=True)
EXPECTED='40d26481b85e8141d2c431ebc1e96c5f3739fca9bf6d762d1d102cf2ef4adfb4'
sha=hashlib.sha256(inp.read_bytes()).hexdigest()
if sha!=EXPECTED:raise RuntimeError('V03 checkpoint SHA mismatch; refusing to change another asset')
bpy.ops.wm.open_mainfile(filepath=str(inp))
beam=bpy.data.objects.get('B2_RimSegment_01_Curved_OakTimber')
assert beam and beam.type=='MESH'
COLL=bpy.data.collections.new('V03_UNMODIFIED_BEAM_BACKUP_KEEP')
bpy.context.scene.collection.children.link(COLL)
backup=beam.copy();backup.data=beam.data.copy();backup.name='V03_Rim_Original_Protected'
COLL.objects.link(backup);backup.hide_render=True;backup.hide_set(True)
# Replace floating round plug disks with real drilled wooden mortises aligned radially.
removed=[]
for obj in list(bpy.data.objects):
 if obj.name.startswith(('B2_Wood_Dowel_Head_','B2_Dowel_Recess_Edge_')):
  removed.append(obj.name);bpy.data.objects.remove(obj,do_unlink=True)
assert len(removed)==4
# Frozen wet oak, endgrain exposed at weathered peg ends; photo maps on beam untouched.
pegmat=bpy.data.materials.get('Weathered oak dowel head')
assert pegmat is not None
bs=pegmat.node_tree.nodes['Principled BSDF']
bs.inputs['Base Color'].default_value=(.11,.088,.074,1)
bs.inputs['Roughness'].default_value=.94
def radial_at(u):
 a=(u-.5)*(math.tau/14)
 return Vector((0,math.cos(a),math.sin(a)))
cut_report={}
for index,u in enumerate((.20,.79)):
 rad=radial_at(u)
 # Original outer timber face is radius R+0.145, with small procedural irregularity.
 # Cut deeper than desired to ensure real recess. Visible inset plug surface at r=2.694.
 r=2.55+.145
 loc=rad*(r-.011);loc.y-=2.55
 bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=.030,depth=.045,location=loc)
 tool=bpy.context.object;tool.name='TEMP_DOWEL_DRILL_%d'%index
 tool.rotation_euler=rad.to_track_quat('Z','Y').to_euler()
 mod=beam.modifiers.new('ACTUAL_ROUND_MORTISE_%d'%index,'BOOLEAN')
 mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=tool
 bpy.ops.object.select_all(action='DESELECT');beam.hide_set(False);beam.select_set(True)
 bpy.context.view_layer.objects.active=beam
 bpy.ops.object.modifier_apply(modifier=mod.name)
 bpy.data.objects.remove(tool,do_unlink=True)
 # Peg half hidden in the carved socket, not a button floating above the wood.
 p=rad*(r-.025);p.y-=2.55
 bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=.025,depth=.024,location=p)
 peg=bpy.context.object;peg.name='V04_Recessed_Oak_Peg_%d'%index
 peg.rotation_euler=rad.to_track_quat('Z','Y').to_euler()
 peg.data.materials.append(pegmat)
 bevel=peg.modifiers.new('Very_slight_worn_peg_edge','BEVEL');bevel.width=.002;bevel.segments=2
 cut_report[str(index)]={'position_on_ring':u,'hole_radius_m':.030,'peg_radius_m':.025}
# Separate end-face fibers; irregular chip spans only the actual outer end grain,
# never add a repeating sawtooth all the way along the smooth center arc.
endgrain=bpy.data.materials.get('Exposed weathered end grain');assert endgrain
for index,t in enumerate((0,1)):
 angle=(t-.5)*(math.tau/14)
 R=2.55+.126
 y=R*math.cos(angle)-2.55;z=R*math.sin(angle)
 x=.124 if index else -.124
 verts=[(x,y,z-.037),(x+(.008 if index else -.006),y+.007,z+.003),
        (x-.015,y+.004,z+.022),(x-.007,y-.009,z-.022)]
 data=bpy.data.meshes.new('Broken_endwood_mesh_%d'%index)
 data.from_pydata(verts,[],[(0,1,2),(0,2,3)]);data.update()
 ob=bpy.data.objects.new('V04_Sparse_Endgrain_Fracture_%d'%index,data)
 bpy.context.collection.objects.link(ob);data.materials.append(endgrain)
# Keep the V03 original in editable Blender file; omit it from GLB.
COLL.objects.unlink(backup)
tag='b2_waterwheel_single_rim_segment_v04'
glb=out/(tag+'.glb')
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',export_yup=True)
COLL.objects.link(backup);backup.hide_render=True;backup.hide_set(True)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=36
scene.render.resolution_x=820;scene.render.resolution_y=820;scene.render.resolution_percentage=100
cam=scene.camera;cam.data.type='ORTHO';cam.data.ortho_scale=1.80
files=[glb]
for name,pos in [('front',(2.6,.55,0)),('side',(0,1.9,2.4)),('angle',(2.2,1.5,1.7)),('back',(-2.6,.4,0))]:
 cam.location=pos;cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler()
 file=out/(tag+'_'+name+'.png');scene.render.filepath=str(file)
 bpy.ops.render.render(write_still=True);files.append(file)
blend=out/(tag+'.blend');bpy.ops.wm.save_as_mainfile(filepath=str(blend));files.append(blend)
manifest={'asset':tag,'status':'NOT_APPROVED','source_v03_sha256':sha,
 'original_V03_beam_preserved_in_blend':True,'recessed_dowels':cut_report,
 'added_endgrain_fractures':2,'photo_PBR':'Fine Grained Wood from Poly Haven CC0 inherited unchanged',
 'wood_mesh_polygons':len(beam.data.polygons),'files':{}}
for f in files:
 b=f.read_bytes();manifest['files'][f.name]={'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
(out/(tag+'_manifest.json')).write_text(json.dumps(manifest,indent=2))
print('B2_RIM_V04_VERIFIED_CHECKPOINT',json.dumps(cut_report),flush=True)
