"""B2 single wooden hub shell, X-axis, 14 real radial socket cuts.
Isolated Blender review. Does not modify source rim/spoke/game meshes.
"""
import bpy, math, sys, hashlib, json, struct
from pathlib import Path
from mathutils import Vector
arguments=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
assert len(arguments)==2, 'usage: outdir approved-look V11 Blend'
out=Path(arguments[0]).resolve();out.mkdir(parents=True,exist_ok=True)
source=Path(arguments[1]).resolve()
SRC_SHA='addae90dd199b9f6d0417c70f5152a32bd504e83e2deffa8e0965a0fdf5e2c67'
assert hashlib.sha256(source.read_bytes()).hexdigest()==SRC_SHA,'V11 material reference source SHA mismatch'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
WOOD='Cold wet aged oak - actual CC0 photo if retrieved'
END='Exposed weathered end grain'
with bpy.data.libraries.load(str(source),link=False) as (available,selected):
    assert WOOD in available.materials and END in available.materials
    selected.materials=[WOOD,END]
wood=bpy.data.materials[WOOD];end=bpy.data.materials[END]
assert any(n.type=='TEX_IMAGE' and n.image and n.image.packed_file for n in wood.node_tree.nodes),'V11 photo images missing'
# Profiles in X-radius, preserve exact inner bore 0.303m.
# Ends are slimmer than main body to emulate old shoulder planing, not decorative spheres.
profile=[(-.180,.573),(-.168,.590),(-.143,.608),(-.119,.615),
         (.115,.615),(.141,.609),(.168,.590),(.180,.573)]
inner=.303;radial_segments=112
verts=[];faces=[];kinds=[];uvbyvert=[]
def create_ring(x,r):
    offset=len(verts)
    for j in range(radial_segments):
        angle=2*math.pi*j/radial_segments
        # Subtle silhouette wear only on the outer wood surface (up to 2mm).
        wear=0
        if r>0.5:
            wear=.0016*math.sin(11*angle+2*x)+.0007*math.sin(37*angle-3*x)
        radius=r+wear
        verts.append((x,radius*math.cos(angle),radius*math.sin(angle)))
        uvbyvert.append(((x+.18)/.36,(j/radial_segments)))
    return offset
outer=[create_ring(x,rad) for x,rad in profile]
inner0=create_ring(-.180,inner);inner1=create_ring(.180,inner)
def bridge(a,b,matid=0,reversed=False):
    for j in range(radial_segments):
        k=(j+1)%radial_segments
        face=(a+j,a+k,b+k,b+j) if not reversed else (a+j,b+j,b+k,a+k)
        faces.append(face);kinds.append(matid)
for j in range(len(outer)-1):bridge(outer[j],outer[j+1])
bridge(inner0,inner1,0,True)
bridge(outer[0],inner0,1,True)
bridge(outer[-1],inner1,1)
mesh=bpy.data.meshes.new('Hub_hollow_aged_oak_14_socket_mesh')
mesh.from_pydata(verts,[],faces);mesh.update()
hub=bpy.data.objects.new('B2_Single_Wooden_Hub_01',mesh)
bpy.context.collection.objects.link(hub)
mesh.materials.append(wood);mesh.materials.append(end)
uv=mesh.uv_layers.new(name='Longitudinal_woodgrain_UV')
for face,kind in zip(mesh.polygons,kinds):
    face.material_index=kind
    face.use_smooth=(kind==0)
    for li in face.loop_indices:
        vi=mesh.loops[li].vertex_index
        co=mesh.vertices[vi].co
        angle=(math.atan2(co.z,co.y)+2*math.pi)%(2*math.pi)
        if kind==1: uv.data[li].uv=(.5+co.y/1.5,.5+co.z/1.5)
        else:uv.data[li].uv=((co.x+.18)*2.4, angle/(2*math.pi)*2.0)
# Apply actual 14 radial rectangular mortises, shell geometry must retain 0.303m bore.
for i in range(14):
    a=i*2*math.pi/14
    bpy.ops.mesh.primitive_cube_add(size=1,location=(0,.571*math.cos(a),.571*math.sin(a)))
    cutter=bpy.context.object;cutter.name='Temporary_socket_cutter_%02d'%i
    # x length .192m, radial length .17m, tangent width .152m
    cutter.scale=(.192,.170,.152)
    cutter.rotation_euler=(a,0,0)
    bpy.context.view_layer.objects.active=cutter
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    modifier=hub.modifiers.new('Mortise_cut_%02d'%i,'BOOLEAN')
    modifier.operation='DIFFERENCE';modifier.solver='EXACT';modifier.object=cutter
    bpy.context.view_layer.objects.active=hub
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.data.objects.remove(cutter,do_unlink=True)
assert not any(o.name.startswith('Temporary_socket') for o in bpy.data.objects)
# Main mesh must remain a single hub with a real bore and 14 rectangular sockets.
tag='b2_waterwheel_single_wooden_hub_v01'
glb=out/(tag+'.glb')
bpy.ops.object.select_all(action='DESELECT')
hub.select_set(True);bpy.context.view_layer.objects.active=hub
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,export_yup=True)
hub.select_set(False)
# Neutral cave studio only; no geometry from other parts in exports.
world=bpy.data.worlds.new('hub_cold_neutral_world');world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.42
bpy.context.scene.world=world
for loc,power,size in [((2.8,-2.2,3.1),510,3.0),((-2.1,2.3,1.9),290,2.3)]:
    bpy.ops.object.light_add(type='AREA',location=loc)
    light=bpy.context.object;light.data.energy=power;light.data.size=size
    light.rotation_euler=(-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();camera=bpy.context.object;bpy.context.scene.camera=camera
camera.data.type='ORTHO';camera.data.ortho_scale=1.70
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=40
scene.render.resolution_x=850;scene.render.resolution_y=850
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
files=[glb]
for name,loc in [('front',(3.0,.35,.35)),('side',(.85,2.95,.8)),('angle',(2.4,2.0,1.8)),('back',(-2.9,.50,.3))]:
    camera.location=loc
    camera.rotation_euler=(-camera.location).to_track_quat('-Z','Y').to_euler()
    dst=out/(tag+'_'+name+'.png');scene.render.filepath=str(dst)
    bpy.ops.render.render(write_still=True);files.append(dst)
blend=out/(tag+'.blend');bpy.ops.wm.save_as_mainfile(filepath=str(blend));files.append(blend)
manifest={'asset':tag,'approval':'NOT_APPROVED','independent_part_count':1,
    'axle_axis':'X','original_axle_radius_m':.30,'hub_inner_bore_radius_m':inner,
    'hub_outer_radius_nominal_m':.615,'axial_length_m':.36,
    'socket_count':14,'socket_tangent_width_m':.152,'socket_axial_width_m':.192,
    'source_v11_blend_sha256':SRC_SHA,
    'v11_photo_pbr_reused':True,'photo_source':'https://polyhaven.com/a/fine_grained_wood',
    'hub_mesh_vertices':len(hub.data.vertices),'hub_mesh_polygons':len(hub.data.polygons),'files':{}}
for p in files:
    bits=p.read_bytes()
    manifest['files'][p.name]={'bytes':len(bits),'sha256':hashlib.sha256(bits).hexdigest()}
(out/(tag+'_manifest.json')).write_text(json.dumps(manifest,indent=2))
print('B2_ONE_HUB_V01_REAL_RENDER_OK',manifest['socket_count'],manifest['hub_mesh_polygons'],flush=True)
