"""V05 visual silhouette pass: substantial non-regular wood losses and end-face fissures.
Resume exact V02 finished blend. Keep center bore and 14 real spoke mortises.
"""
import bpy,bmesh,sys,hashlib,json,math
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
# Broad angular missing material, not cylindrical holes.
# Restrict cutters to front/back exposed endgrain (outside |X|>0.107m),
# leaving real spoke mortises confined near |X|<0.096m untouched.
def fix_closed_cutter_normals(mesh):
    bm=bmesh.new();bm.from_mesh(mesh);bm.normal_update()
    signed=bm.calc_volume(signed=True)
    if signed<0:
        bmesh.ops.reverse_faces(bm,faces=list(bm.faces))
    bm.to_mesh(mesh);bm.free();mesh.update()
def angular_chip_tool(side,angle,reach,span,index):
    # Zig-zag fracture silhouette: irregular staggered wood volumes
    # at r=.62, ending near r=.62-reach; these edges are intentionally angular.
    contour=[(.685,-span*.60),(.643,-span*.56),
             (.610,-span*.42),(.585,-span*.33),
             (.620-reach,-span*.12),(.620-reach*.86,span*.04),
             (.565,span*.24),(.607,span*.31),
             (.636,span*.55),(.689,span*.59)]
    verts=[]
    for x in (side*.107,side*.255):
        for radius,tangent in contour:
            a=angle+tangent/max(radius,.3)
            verts.append((x,radius*math.cos(a),radius*math.sin(a)))
    n=len(contour)
    faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]
    for j in range(n):
        k=(j+1)%n
        faces.append((j,k,n+k,n+j))
    mesh=bpy.data.meshes.new('V05_AngularChipCutter_%02d'%index)
    mesh.from_pydata(verts,[],faces);mesh.update();fix_closed_cutter_normals(mesh)
    cutter=bpy.data.objects.new('TEMP_AngularChip_%02d'%index,mesh)
    bpy.context.collection.objects.link(cutter)
    mesh.materials.append(endmat)
    return cutter
chips=[
    ( 1,.2244,.096,.080),
    ( 1,2.0196,.075,.061),
    (-1,3.3660,.090,.081),
    (-1,4.7124,.080,.077),
    ( 1,5.6104,.075,.067),
    (-1,1.5708,.072,.069)]
for i,(side,a,reach,span) in enumerate(chips):
    cutter=angular_chip_tool(side,a,reach,span,i)
    subtract(cutter,'Deep angular chipped timber edge %02d'%i)
# Irregular wedge-shaped real cuts to end grain, varied depth.
def wedge_tool(side,a,length,opening,deep,index):
    # Polygon spans from outer rim r=.650 to inner endpoint r=.650-length.
    # Tangential width narrows asymmetrically; jagged axis follows tree-fiber grain.
    contour=[
        (.660,-opening*.48),
        (.612,-opening*.29),
        (.558,-opening*.36),
        (.492,-opening*.12),
        (.660-length,-.0023),
        (.488,opening*.10),
        (.542,opening*.18),
        (.583,opening*.28),
        (.628,opening*.37),
        (.663,opening*.43),
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
    mesh=bpy.data.meshes.new('V05_Irregular_WedgeCutter_%02d'%index)
    mesh.from_pydata(vertices,[],faces);mesh.update();fix_closed_cutter_normals(mesh)
    tool=bpy.data.objects.new('TEMP_Fissure_%02d'%index,mesh)
    bpy.context.collection.objects.link(tool)
    mesh.materials.append(endmat)
    return tool
cracks=[
 ( 1,.6732,.250,.065,.044),
 ( 1,2.4684,.216,.057,.039),
 ( 1,4.2636,.203,.051,.035),
 (-1,1.12199,.260,.062,.043),
 (-1,2.9172,.225,.056,.038),
 (-1,5.1612,.230,.057,.039),
]
for i,(side,a,length,opening,depth) in enumerate(cracks):
    cutter=wedge_tool(side,a,length,opening,depth,i)
    subtract(cutter,'Deep irregular end grain split %02d'%i)
assert not any(ob.name.startswith('TEMP_') for ob in bpy.data.objects)
# Keep all V02 bevels and weighted normals. Remain one hub mesh only.
bpy.ops.object.select_all(action='DESELECT')
hub.select_set(True);bpy.context.view_layer.objects.active=hub
tag='b2_waterwheel_single_wooden_hub_v05'
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
print('B2_HUB_V05_ORIENTED_WOOD_BREAK_RENDER_OK',len(chips),len(cracks),flush=True)
