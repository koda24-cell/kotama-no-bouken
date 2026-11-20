"""Read ORIGINAL three GLBs from reviewed Actions artifacts and stage a no-cut fit check."""
import bpy,sys,math,json,hashlib,struct
from pathlib import Path
from mathutils import Vector
arg=sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
assert len(arg)==2,"expected <input_dir> <output_dir>"
source=Path(arg[0]).resolve();out=Path(arg[1]).resolve();out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
items={
 "support":("b2_single_timber_support_post_v03.glb",(0,0,0),(0,0,0)),
 "brace":("b2_single_diagonal_oak_brace_v02.glb",(.39,0,-.80),(0,math.radians(-35),0)),
 "peg":("b2_single_oak_drawbore_peg_v02.glb",(.135,-.220,-.355),(0,0,0))
}
all_mesh=[];anchors={};parts={}
for label,(name,xyz,rot) in items.items():
    f=source/name
    assert f.is_file() and f.stat().st_size>1000,name
    before=set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(f))
    objs=[o for o in bpy.data.objects if o not in before]
    meshes=[o for o in objs if o.type=='MESH']
    assert meshes,label
    anchor=bpy.data.objects.new('ASSEMBLY_ANCHOR_'+label,None)
    bpy.context.collection.objects.link(anchor)
    # only attach root objects, preserving the glTF's internal hierarchy and transformations
    roots=[o for o in objs if o.parent not in objs]
    for root in roots:
        mat=root.matrix_world.copy();root.parent=anchor;root.matrix_world=mat
    anchor.location=xyz;anchor.rotation_euler=rot
    for m in meshes:m.name=label+'_'+m.name
    all_mesh.extend(meshes);anchors[label]=anchor;parts[label]=meshes
def bound(meshes):
    verts=[]
    for m in meshes:
        for v in m.bound_box:verts.append(m.matrix_world @ Vector(v))
    return [[min(v[j] for v in verts) for j in range(3)],
            [max(v[j] for v in verts) for j in range(3)]]
bpy.context.view_layer.update()
bounds={k:bound(ms) for k,ms in parts.items()}
def overlap(a,b):
    return [max(0,min(a[1][i],b[1][i])-max(a[0][i],b[0][i])) for i in range(3)]
measures={"support_brace_AABB_overlap":overlap(bounds['support'],bounds['brace']),
          "support_peg_AABB_overlap":overlap(bounds['support'],bounds['peg']),
          "brace_peg_AABB_overlap":overlap(bounds['brace'],bounds['peg'])}
# This indicator is not precise mesh collision / fitted joinery.
fit_status='NOT_TESTED_HOLES_UNCUT'
print("ASSEMBLY_AABB",json.dumps(bounds),flush=True)
# Camera / lighting stage are REVIEW ONLY and excluded from exported GLB.
bpy.ops.mesh.primitive_cube_add(size=1,location=(.25,0,-1.78))
floor=bpy.context.object;floor.name='PHOTO_STAGE_NOT_ASSET';floor.scale=(2.5,2.5,.08)
floor_mat=bpy.data.materials.new('gray_studio_floor');floor_mat.use_nodes=True
floor_mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.065,.075,.085,1)
floor.data.materials.append(floor_mat)
def look(o,point):o.rotation_euler=(Vector(point)-o.location).to_track_quat('-Z','Y').to_euler()
for pos,power,size in [((2.1,-2.5,3.3),630,3),((-2.1,1.7,2.5),360,2)]:
    lamp=bpy.data.lights.new('AreaSoft','AREA');lamp.energy=power;lamp.shape='DISK';lamp.size=size
    ob=bpy.data.objects.new('AreaSoft',lamp);bpy.context.collection.objects.link(ob)
    ob.location=pos;look(ob,(.25,0,-.85))
cam=bpy.data.cameras.new('Review_Camera')
camera=bpy.data.objects.new('Review_Camera',cam);bpy.context.collection.objects.link(camera)
bpy.context.scene.camera=camera
cam.type='ORTHO';cam.ortho_scale=2.25
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=720;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.view_settings.view_transform='AgX'
views={'front':(2.1,-4.0,1.5),'side':(-3,2.1,1.3),'angle':(2.8,-3.2,2.7),'top':(.1,-.03,4.2),'joint_detail':(.63,-1.24,.20)}
for name,pos in views.items():
    camera.location=pos
    if name=='joint_detail':
        cam.ortho_scale=.62
        look(camera,(.13,-.02,-.37))
    else:
        cam.ortho_scale=2.25
        look(camera,(.27,0,-.85))
    scene.render.filepath=str(out/('b2_waterwheel_frame_assembly_v02_'+name+'.png'))
    bpy.ops.render.render(write_still=True)
# Delete everything except imported original source parts.
bpy.data.objects.remove(floor,do_unlink=True)
for o in list(bpy.data.objects):
    if o.type in ('LIGHT','CAMERA'):bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.object.select_all(action='DESELECT')
for m in all_mesh:m.select_set(True)
bpy.context.view_layer.objects.active=all_mesh[0]
glb=out/'b2_waterwheel_frame_assembly_v02.glb'
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,export_materials='EXPORT')
bpy.ops.wm.save_as_mainfile(filepath=str(out/'b2_waterwheel_frame_assembly_v02.blend'))
raw=glb.read_bytes()
jlen=struct.unpack_from('<I',raw,12)[0];gltf=json.loads(raw[20:20+jlen])
assert len(gltf.get('meshes',[]))>=3 and len(gltf.get('images',[]))>=3, "Original GLBs were not retained"
files={}
for f in sorted(out.iterdir()):
    if f.is_file():
        data=f.read_bytes();files[f.name]={'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
report={
 'approval':'NOT_APPROVED','fit_status':fit_status,
 'original_glb_names':{k:v[0] for k,v in items.items()},
 'original_glb_sha256':{k:hashlib.sha256((source/v[0]).read_bytes()).hexdigest() for k,v in items.items()},
 'bounds_world':bounds,'approximate_AABB_overlap_m':measures,
 'warning':'AABB is coarse; no actual joinery holes or precise BVH tested; brace lower end unsupported; peg visually indicated only',
 'meshes_exported':len(gltf.get('meshes',[])),
 'embedded_images':len(gltf.get('images',[])),
 'views':list(views),'files':files}
(out/'manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print('B2_FRAME_ASSEMBLY_V02_RENDER_SUCCESS',len(all_mesh),len(gltf['images']),flush=True)
