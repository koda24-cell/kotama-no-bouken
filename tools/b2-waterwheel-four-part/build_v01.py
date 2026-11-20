"""Review-only assembly of four original GLBs. Blender 5.3; no mesh edits."""
import bpy,sys,math,json,hashlib,struct
from pathlib import Path
from mathutils import Vector
argv=sys.argv[sys.argv.index('--')+1:]
src,out=map(lambda x:Path(x).resolve(),argv)
out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
names={'post':'b2_single_timber_support_post_v03.glb','brace':'b2_single_diagonal_oak_brace_v02.glb','peg':'b2_single_oak_drawbore_peg_v02.glb','beam':'b2_single_lower_oak_crossbeam_v01.glb'}
parts={};anchors={};source_info={}
for label,filename in names.items():
    p=src/filename
    assert p.is_file() and p.stat().st_size>1000,str(p)
    before=set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(p))
    objects=[o for o in bpy.data.objects if o not in before]
    meshes=[o for o in objects if o.type=='MESH']
    assert meshes,'No mesh in '+filename
    anchor=bpy.data.objects.new('ASSEMBLY_'+label,None);bpy.context.collection.objects.link(anchor)
    for root in [o for o in objects if o.parent not in objects]:
        world=root.matrix_world.copy();root.parent=anchor;root.matrix_world=world
    parts[label]=meshes;anchors[label]=anchor
    source_info[label]={'file':filename,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'mesh_objects':len(meshes)}
def bounds(label):
    bpy.context.view_layer.update()
    pts=[m.matrix_world @ Vector(v) for m in parts[label] for v in m.bound_box]
    return [[min(v[i] for v in pts) for i in range(3)],[max(v[i] for v in pts) for i in range(3)]]
def move(label,axis,delta):
    anchors[label].location[axis]+=delta
def mid(b,i):return (b[0][i]+b[1][i])/2
# Post stays in its original coordinate system. Align beam horizontally by its actual longest local axis.
post=bounds('post')
beam=bounds('beam')
dims=[beam[1][i]-beam[0][i] for i in range(3)]
longest=max(range(3),key=lambda i:dims[i])
if longest==2:anchors['beam'].rotation_euler[1]=math.pi/2
elif longest==1:anchors['beam'].rotation_euler[2]=math.pi/2
beam=bounds('beam')
# Beam extends outward from the post; its top meets the diagonal brace bottom.
move('beam',0,post[1][0]+0.38-mid(beam,0))
beam=bounds('beam')
move('beam',1,mid(post,1)-mid(beam,1))
beam=bounds('beam')
move('beam',2,post[0][2]+0.27-beam[0][2])
beam=bounds('beam')
# Orient diagonal brace in the X/Z plane, then fit its two ends between post and beam.
anchors['brace'].rotation_euler[1]=math.radians(-35)
brace=bounds('brace')
move('brace',0,post[1][0]+0.24-mid(brace,0))
brace=bounds('brace')
move('brace',1,mid(post,1)-mid(brace,1))
brace=bounds('brace')
move('brace',2,beam[1][2]+0.015-brace[0][2])
brace=bounds('brace')
# Peg is a visual location marker only: no unverified hole is cut.
peg=bounds('peg')
move('peg',0,post[1][0]+0.01-mid(peg,0))
peg=bounds('peg')
move('peg',1,post[0][1]-0.025-mid(peg,1))
peg=bounds('peg')
move('peg',2,brace[1][2]-0.12-mid(peg,2))
b={k:bounds(k) for k in parts}
def gap(a,c,axis):return max(0,a[0][axis]-c[1][axis],c[0][axis]-a[1][axis])
def overlap(a,c):return [max(0,min(a[1][i],c[1][i])-max(a[0][i],c[0][i])) for i in range(3)]
measure={'brace_beam_AABB_overlap_m':overlap(b['brace'],b['beam']),'brace_post_AABB_overlap_m':overlap(b['brace'],b['post']),'peg_post_AABB_overlap_m':overlap(b['peg'],b['post']),'brace_beam_vertical_AABB_gap_m':gap(b['brace'],b['beam'],2)}
# Rendering-only stage, excluded from GLB.
bpy.ops.mesh.primitive_cube_add(size=1,location=(mid(post,0)+0.3,0,post[0][2]-0.09))
floor=bpy.context.object;floor.name='RENDER_STAGE_ONLY';floor.scale=(3,3,.08)
mat=bpy.data.materials.new('Stage');mat.diffuse_color=(.12,.13,.15,1);floor.data.materials.append(mat)
def look(obj,target):obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
center=Vector((mid(b['post'],0)+.3,mid(post,1),mid(post,2)))
for pos,power in [((3,-4,4),900),((-3,2,3),650)]:
    data=bpy.data.lights.new('Softbox','AREA');data.energy=power;data.shape='DISK';data.size=4
    lamp=bpy.data.objects.new('Softbox',data);bpy.context.collection.objects.link(lamp);lamp.location=pos;look(lamp,center)
camera=bpy.data.objects.new('ReviewCamera',bpy.data.cameras.new('ReviewCamera'));bpy.context.collection.objects.link(camera)
bpy.context.scene.camera=camera;camera.data.type='ORTHO'
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=800;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX'
views={'front':((2,-5,1.5),center,2.9),'side':((-4,2,1.5),center,2.9),'angle':((3,-4,3),center,2.9),'top':((.3,-.1,5),center,2.9),
'upper_joint':((1.6,-2,1.3),Vector((post[1][0],mid(post,1),brace[1][2])),.85),
'lower_joint':((2,-2,.7),Vector((beam[0][0],mid(beam,1),beam[1][2])),.85)}
for name,(position,target,scale) in views.items():
    camera.location=position;look(camera,target);camera.data.ortho_scale=scale
    scene.render.filepath=str(out/('b2_four_part_'+name+'.png'));bpy.ops.render.render(write_still=True)
bpy.data.objects.remove(floor,do_unlink=True)
for o in list(bpy.data.objects):
    if o.type in ('LIGHT','CAMERA'):bpy.data.objects.remove(o,do_unlink=True)
# Export all original imported roots and their children, not just mesh objects.
bpy.ops.object.select_all(action='DESELECT')
for label in parts:
    anchors[label].select_set(True)
    for m in parts[label]:m.select_set(True)
bpy.context.view_layer.objects.active=next(iter(parts.values()))[0]
glb=out/'b2_waterwheel_four_part_review_v01.glb'
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'b2_waterwheel_four_part_review_v01.blend'))
raw=glb.read_bytes();assert raw[:4]==b'glTF'
size=struct.unpack_from('<I',raw,12)[0];gltf=json.loads(raw[20:20+size])
assert len(gltf.get('meshes',[]))>=4
files={p.name:{'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size} for p in out.iterdir() if p.is_file()}
manifest={'approval':'NOT_APPROVED','fit_status':'VISUAL_AABB_ONLY_NO_HOLES_NO_BVH','sources':source_info,'bounds_m':b,'measurements':measure,'export_meshes':len(gltf['meshes']),'views':list(views),'files':files,'warning':'AABB is not precise contact/collision; no drilled holes, peg marker only; requires visual review.'}
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print('B2_FOUR_PART_REAL_GLB_RENDER_SUCCESS',flush=True)
