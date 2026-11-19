"""V03 visual silhouette pass: substantial non-regular wood losses and end-face fissures.
Resume exact V02 finished blend. Keep center bore and 14 real spoke mortises.
"""
import bpy,sys,hashlib,json,math
from pathlib import Path
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
assert len(args)==2,'expected output directory and V02 checkpoint'
out=Path(args[0]).resolve();out.mkdir(parents=True,exist_ok=True)
checkpoint=Path(args[1]).resolve()
SOURCE_SHA='8e6f827c5fb4dfe8ffe47c33e545a7ff982acc4d01cdb5e82e782c3f402de4d1'
assert hashlib.sha256(checkpoint.read_bytes()).hexdigest()==SOURCE_SHA,'V02 checkpoint mismatch'
bpy.ops.wm.open_mainfile(filepath=str(checkpoint))
hub=bpy.data.objects['B2_Single_Wooden_Hub_01']
before=(len(hub.data.vertices),len(hub.data.polygons))
assert before[0]>=1452 and before[1]>=1273
# Old, fractured wooden end grain: 6 asymmetric wedge-shaped radial cracks
# from the outer end face towards (but not into) the central bore.
endmat=bpy.data.materials.get('Exposed weathered end grain')
assert endmat
if endmat.name not in [m.name for m in hub.data.materials if m]:
    hub.data.materials.append(endmat)
def subtract(obj,name):
    bpy.context.view_layer.objects.active=hub
    modifier=hub.modifiers.new(name,'BOOLEAN')
    modifier.operation='DIFFERENCE';modifier.solver='EXACT';modifier.object=obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.data.objects.remove(obj,do_unlink=True)
# Cut actual broad chips where the wooden beam end face meets its outside wall.
# Choose positions in between neighboring spoke mortises rather than at socket centers.
chips=[
    ( 1, .22440, .090,.078,.079),
    ( 1, 2.01959, .078,.061,.069),
    (-1, 3.36600, .101,.083,.076),
    (-1, 4.71240, .081,.069,.073),
    ( 1, 5.61038, .091,.066,.080),
    (-1, 1.57080, .065,.055,.060),
]
for i,(side,a,rxt,rtan,rrad) in enumerate(chips):
    r=.608
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,
        location=(side*.181,r*math.cos(a),r*math.sin(a)))
    tool=bpy.context.object
    tool.name='TEMP_real_chipped_corner_%02d'%i
    tool.scale=(rxt,rtan,rrad)
    tool.rotation_euler=(a,0,0)
    bpy.context.view_layer.objects.active=tool
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    tool.data.materials.append(endmat)
    subtract(tool,'Real fractured end corner %02d'%i)
# Irregular wedge-shaped real cuts to end grain, varied depth.
def wedge_tool(side,a,length,opening,deep,index):
    # Polygon spans from outer rim r=.650 to inner endpoint r=.650-length.
    # Tangential width narrows asymmetrically; jagged axis follows tree-fiber grain.
    contour=[
        (.650, -opening*.59),
        (.574, -opening*.31),
        (.510, -opening*.19),
        (.650-length,-.0018),
        (.535, opening*.10),
        (.585,opening*.45),
        (.652,opening*.41),
    ]
    vertices=[]
    for x in (side*(.182-deep),side*(.182+.090)):
        for r,t in contour:
            angle=a+t/max(r,.3)
            vertices.append((x,r*math.cos(angle),r*math.sin(angle)))
    n=len(contour)
    faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]
    for j in range(n):
        k=(j+1)%n
        faces.append((j,k,n+k,n+j))
    mesh=bpy.data.meshes.new('V03_Irregular_WedgeCutter_%02d'%index)
    mesh.from_pydata(vertices,[],faces);mesh.update()
    tool=bpy.data.objects.new('TEMP_Fissure_%02d'%index,mesh)
    bpy.context.collection.objects.link(tool)
    mesh.materials.append(endmat)
    return tool
cracks=[
 ( 1,.6732,.195,.038,.030),
 ( 1,2.4684,.167,.029,.022),
 ( 1,4.2636,.143,.025,.019),
 (-1,1.12199,.198,.037,.029),
 (-1,2.9172,.151,.029,.024),
 (-1,5.1612,.171,.034,.027),
]
for i,(side,a,length,opening,depth) in enumerate(cracks):
    cutter=wedge_tool(side,a,length,opening,depth,i)
    subtract(cutter,'Deep irregular end grain split %02d'%i)
assert not any(ob.name.startswith('TEMP_') for ob in bpy.data.objects)
# Keep all V02 bevels and weighted normals. Remain one hub mesh only.
bpy.ops.object.select_all(action='DESELECT')
hub.select_set(True);bpy.context.view_layer.objects.active=hub
tag='b2_waterwheel_single_wooden_hub_v03'
glb=out/(tag+'.glb')
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True)
hub.select_set(False)
sc=bpy.context.scene
sc.render.engine='CYCLES';sc.cycles.samples=48
sc.render.resolution_x=850;sc.render.resolution_y=850
sc.render.resolution_percentage=100
camera=sc.camera;camera.data.type='ORTHO';camera.data.ortho_scale=1.70
files=[glb]
for name,loc in [('front',(3.0,.35,.35)),('side',(.85,2.95,.8)),
                 ('angle',(2.4,2.0,1.8)),('back',(-2.9,.50,.3))]:
    camera.location=loc
    camera.rotation_euler=(-camera.location).to_track_quat('-Z','Y').to_euler()
    f=out/(tag+'_'+name+'.png')
    sc.render.filepath=str(f);bpy.ops.render.render(write_still=True)
    files.append(f)
blend=out/(tag+'.blend');bpy.ops.wm.save_as_mainfile(filepath=str(blend));files.append(blend)
manifest={'asset':tag,'approval':'NOT_APPROVED','source_v02_blend_sha256':SOURCE_SHA,
    'preserved_original_V02_checkpoint':True,
    'prior_vertices_and_faces':list(before),
    'new_vertices_and_faces':[len(hub.data.vertices),len(hub.data.polygons)],
    'outer_corner_chips':len(chips),'deep_endgrain_wedges':len(cracks),
    'original_bore_radius_m':.303,'original_radial_socket_count':14,
    'boolean_solver':'EXACT','wood_photo_source':'https://polyhaven.com/a/fine_grained_wood',
    'user_review_needed':True,'files':{}}
for f in files:
    by=f.read_bytes()
    manifest['files'][f.name]={'bytes':len(by),'sha256':hashlib.sha256(by).hexdigest()}
(out/(tag+'_manifest.json')).write_text(json.dumps(manifest,indent=2))
print('B2_HUB_V03_VISIBLE_DAMAGE_RENDER_OK',len(chips),len(cracks),flush=True)
