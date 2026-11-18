"""V06: true non-uniform terminal wear on one wooden wheel rim segment.
Continue from exact V05 editable .blend, preserve protected original V03.
"""
import bpy,sys,hashlib,json,math,random
import numpy as np
from pathlib import Path
from mathutils import Vector
src=Path(sys.argv[sys.argv.index('--')+1]);out=Path(sys.argv[sys.argv.index('--')+2]);out.mkdir(parents=True,exist_ok=True)
expected='55ebe59e0ceb4d4875ff85daa48ff3f14e8e507fe76a60f20cd629ac97af96c4'
sha=hashlib.sha256(src.read_bytes()).hexdigest()
if sha!=expected:raise RuntimeError('V05 rim source mismatch')
bpy.ops.wm.open_mainfile(filepath=str(src))
wood=bpy.data.objects.get('B2_RimSegment_01_Curved_OakTimber')
backup=bpy.data.objects.get('V03_Rim_Original_Protected')
assert wood and backup
# Real cutouts, sparse and irregular. No extra pseudo-splinter meshes.
R=2.55;ANGLE=math.tau/14
chips=[(0,-.118,.108,.031),(.005,.106,-.119,.025),(1,-.115,-.111,.037)]
# tuple: (near_end_param, x, radial_delta, cutter_radius)
for idx,(end,x,dr,scale) in enumerate(chips):
 a=(end-.5)*ANGLE
 rr=R+dr
 center=Vector((x,rr*math.cos(a)-R,rr*math.sin(a)))
 # Shift away from the terminal plane: intersect only with tip and its outer corners.
 radial=Vector((0,math.cos(a),math.sin(a)))
 center+=radial*(.010 if dr>0 else -.008)
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=scale,location=center)
 cut=bpy.context.object;cut.name='V06_TEMP_WOOD_CHIP_CUTTER_%d'%idx
 cut.scale=(1.15,.90,1.25)
 mod=wood.modifiers.new('V06_ACTUAL_WORN_CORNER_%d'%idx,'BOOLEAN')
 mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cut
 bpy.ops.object.select_all(action='DESELECT')
 wood.hide_set(False);wood.select_set(True);bpy.context.view_layer.objects.active=wood
 bpy.ops.object.modifier_apply(modifier=mod.name)
 bpy.data.objects.remove(cut,do_unlink=True)
# The old 512px endgrain photo-like diagram looked a little like a fingerprint.
# Lower ring contrast while keeping the same original mapped image.
endmat=bpy.data.materials.get('Exposed weathered end grain')
assert endmat
tex=[n for n in endmat.node_tree.nodes if n.type=='TEX_IMAGE']
assert len(tex)==1
image=tex[0].image
w,h=image.size
arr=np.empty(w*h*4,dtype=np.float32);image.pixels.foreach_get(arr)
arr=arr.reshape((h,w,4))
mean=np.mean(arr[:,:,:3],axis=(0,1))
arr[:,:,:3]=np.clip(mean[None,None,:]+.42*(arr[:,:,:3]-mean[None,None,:]),0,1)
new=bpy.data.images.new('V06 subtle aged oak end grain',width=w,height=h,alpha=True)
new.pixels.foreach_set(arr.ravel());new.pack()
tex[0].image=new
# No original rim backup in the GLB; retain it inside editable Blend.
coll=backup.users_collection[0];coll.objects.unlink(backup)
tag='b2_waterwheel_single_rim_segment_v06'
glb=out/(tag+'.glb')
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',export_yup=True)
coll.objects.link(backup);backup.hide_set(True);backup.hide_render=True
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=40
scene.render.resolution_x=820;scene.render.resolution_y=820;scene.render.resolution_percentage=100
cam=scene.camera;cam.data.type='ORTHO';cam.data.ortho_scale=1.80
files=[glb]
for view,pos in [('front',(2.6,.55,0)),('side',(0,1.9,2.4)),('angle',(2.2,1.5,1.7)),('back',(-2.6,.4,0))]:
 cam.location=pos;cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler()
 p=out/(tag+'_'+view+'.png');scene.render.filepath=str(p)
 bpy.ops.render.render(write_still=True);files.append(p)
blend=out/(tag+'.blend');bpy.ops.wm.save_as_mainfile(filepath=str(blend));files.append(blend)
m={'asset':tag,'status':'NOT_APPROVED','source_v05_sha256':sha,
 'protected_original_preserved':True,'nonuniform_corner_chips':len(chips),
 'wood_photo_PBR':'Poly Haven fine_grained_wood CC0 preserved',
 'wood_polygons':len(wood.data.polygons),'files':{}}
for p in files:
 b=p.read_bytes();m['files'][p.name]={'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
(out/(tag+'_manifest.json')).write_text(json.dumps(m,indent=2))
print('V06_REAL_WOOD_CHIPS_RENDERED',len(chips),flush=True)
