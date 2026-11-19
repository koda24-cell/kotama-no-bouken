"""B2 ONE lower timber bearing block — real Cycles four-view render, GLB and Blend.
Design: docs/3d/B2_WATERWHEEL_TIMBER_LOWER_BEARING_V01_DESIGN.md
Never modifies or exports any prior wheel mesh.
"""
import bpy,math,sys,json,hashlib
from pathlib import Path
from mathutils import Vector
a=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
assert len(a)==2,'render-output folder and rim V11 Blend reference required'
out=Path(a[0]).resolve();out.mkdir(parents=True,exist_ok=True)
src=Path(a[1]).resolve()
SRC_SHA='addae90dd199b9f6d0417c70f5152a32bd504e83e2deffa8e0965a0fdf5e2c67'
assert hashlib.sha256(src.read_bytes()).hexdigest()==SRC_SHA,'approved-look V11 source mismatch'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
WOOD='Cold wet aged oak - actual CC0 photo if retrieved'
END='Exposed weathered end grain'
with bpy.data.libraries.load(str(src),link=False) as (available,want):
    assert WOOD in available.materials and END in available.materials
    want.materials=[WOOD,END]
wood=bpy.data.materials[WOOD]
end=bpy.data.materials[END]
assert any(n.type=='TEX_IMAGE' and n.image and n.image.packed_file for n in wood.node_tree.nodes)
# A long planed but imperfect timber cross-section with small asymmetric shaving
# rather than a single Blender cube.
stations=[(-.60,0.98),(-.57,1.0),(-.44,1.0),(-.18,.995),
          (.29,1.002),(.51,.992),(.58,.985),(.60,.975)]
verts=[];faces=[];mattypes=[]
# Cross-section is yz, starting at bottom left, progressing counter-clockwise.
def ring(x,fac):
    l=-.55*fac;rr=.55*fac;zmin=-.70
    return [(x,l+.038,zmin),(x,rr-.042,zmin),(x,rr,zmin+.045),
      (x,rr,-.035),(x,rr-.052,.055),
      (x,l+.064,.055),(x,l,-.029),(x,l,zmin+.042)]
for x,fac in stations:verts.extend(ring(x,fac))
for i in range(len(stations)-1):
    for j in range(8):
        t=(j+1)%8
        faces.append((8*i+j,8*i+t,8*(i+1)+t,8*(i+1)+j))
        mattypes.append(0)
faces.append(tuple(reversed(range(8))));mattypes.append(1)
faces.append(tuple((len(stations)-1)*8+j for j in range(8)));mattypes.append(1)
mesh=bpy.data.meshes.new('Single_Bearing_Old_Oak_Timber')
mesh.from_pydata(verts,[],faces);mesh.update()
obj=bpy.data.objects.new('B2_Lower_Axle_Bearing_One_Timber',mesh)
bpy.context.collection.objects.link(obj)
mesh.materials.append(wood);mesh.materials.append(end)
for face,material in zip(mesh.polygons,mattypes):
    face.material_index=material
    face.use_smooth=False
uv=mesh.uv_layers.new(name='TimberLength_UV')
for f in mesh.polygons:
    for li in f.loop_indices:
        vi=mesh.loops[li].vertex_index
        v=mesh.vertices[vi].co
        if f.material_index==1:uv.data[li].uv=(.5+v.y*.7,.5+v.z*.7)
        else:uv.data[li].uv=((v.x+.6)*.64,(v.z+.70)*.9+v.y*.1)
# Real U-shaped bearing seat. Roller-axis=X, radius .318, cuts through upper face.
bpy.ops.mesh.primitive_cylinder_add(vertices=128,radius=.318,depth=1.6,location=(0,0,0))
cut=bpy.context.object;cut.name='TEMP_real_shaft_bore'
cut.rotation_euler=(0,math.pi/2,0)
bpy.context.view_layer.objects.active=obj
mod=obj.modifiers.new('Real concave half-cylinder seat radius 318mm','BOOLEAN')
mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cut
bpy.ops.object.modifier_apply(modifier=mod.name)
bpy.data.objects.remove(cut,do_unlink=True)
# Two independent ragged end chips. They must remain outside the saddle shell.
chip_data=[(-.593,.49,-.46,.077,.068,.066),(.597,-.48,-.31,.069,.072,.081)]
for i,(x,y,z,sx,sy,sz) in enumerate(chip_data):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=(x,y,z))
    c=bpy.context.object
    c.name='TEMP_cut_damage_%02d'%i
    c.scale=(sx,sy,sz)
    c.rotation_euler=(.33+i*.6,.18+i*.35,.47)
    bpy.context.view_layer.objects.active=c
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    bpy.context.view_layer.objects.active=obj
    m=obj.modifiers.new('Asymmetrical old endgrain chip %02d'%i,'BOOLEAN')
    m.operation='DIFFERENCE';m.solver='EXACT';m.object=c
    bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.data.objects.remove(c,do_unlink=True)
assert not any(x.name.startswith('TEMP_') for x in bpy.data.objects)
# Select concave saddle faces (face centers near the cylindrical radius) and
# assign a dark, oily oak derivative to visually emphasize actual contact wear.
saddle=wood.copy()
saddle.name='Waterworn Bearing Contact (dark oak)'
p=saddle.node_tree.nodes.get('Principled BSDF')
p.inputs['Roughness'].default_value=.66
saddle_slot=len(obj.data.materials)
obj.data.materials.append(saddle)
count=0
for f in obj.data.polygons:
    c=f.center;r=math.hypot(c.y,c.z)
    if -.42<c.z<.035 and .305<r<.334 and abs(c.y)<.33:
        f.material_index=saddle_slot;count+=1
assert count>50, f'No saddle geometry detected: {count}'
# Ensure long length UVs exist even for boolean-generated surfaces.
uv=obj.data.uv_layers.active or obj.data.uv_layers.new(name='TimberLength_UV')
for poly in obj.data.polygons:
    for li in poly.loop_indices:
        v=obj.data.vertices[obj.data.loops[li].vertex_index].co
        if poly.material_index==1:
            uv.data[li].uv=(.5+v.y*.71,.5+v.z*.72)
        elif poly.material_index==saddle_slot:
            uv.data[li].uv=((v.x+.60)*.76,(math.atan2(v.z,v.y)+math.pi)/(2*math.pi))
        else:
            uv.data[li].uv=((v.x+.6)*.74,(v.z+.70)*.85+v.y*.1)
# Separate a slight edge chamfer with controlled angles, no destructive global subdivision.
bevel=obj.modifiers.new('Wear on worked timber long edges','BEVEL')
bevel.width=.004;bevel.segments=2
bevel.limit_method='ANGLE';bevel.angle_limit=.70
# Export only original one-piece timber (no helper meshes, lamps or camera).
bpy.ops.object.select_all(action='DESELECT')
obj.select_set(True);bpy.context.view_layer.objects.active=obj
tag='b2_single_timber_lower_axle_bearing_v01'
glb=out/(tag+'.glb')
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True)
obj.select_set(False)
world=bpy.data.worlds.new('Cold neutral bearing review');world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.5
bpy.context.scene.world=world
for loc,power,size in [((2,-2,3),550,3),((-3,2,1.7),420,2.7)]:
    bpy.ops.object.light_add(type='AREA',location=loc)
    light=bpy.context.object;light.data.energy=power;light.data.size=size
    light.rotation_euler=(Vector((0,0,-.26))-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add()
cam=bpy.context.object;bpy.context.scene.camera=cam
cam.data.type='ORTHO';cam.data.ortho_scale=2.4
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=48
scene.render.resolution_x=850;scene.render.resolution_y=850
scene.render.resolution_percentage=100
files=[glb]
for name,at in [('front',(2.5,1.5,1.2)),('side',(0,2.7,.8)),
                ('angle',(2.0,-2.0,1.45)),('back',(-2.6,-1.7,.9))]:
    cam.location=at
    cam.rotation_euler=(Vector((0,0,-.28))-cam.location).to_track_quat('-Z','Y').to_euler()
    path=out/(tag+'_'+name+'.png');scene.render.filepath=str(path)
    bpy.ops.render.render(write_still=True);files.append(path)
blend=out/(tag+'.blend')
bpy.ops.wm.save_as_mainfile(filepath=str(blend));files.append(blend)
m={'asset':tag,'approval':'NOT_APPROVED','independent_piece_count':1,
 'one_piece_timber_geometry':True,'shaft_axis':'X',
 'nominal_shaft_radius_m':.300,'saddle_radius_m':.318,
 'axial_span_m':1.2,'y_width_m':1.10,'lower_z_m':-.70,
 'real_u_saddle_polygons':count,'localized_cut_chips':len(chip_data),
 'packed_photo_wood_v11_source_sha256':SRC_SHA,
 'saddle_fit_to_real_hub':'NOT_TESTED','glb_performance_audit':'PENDING',
 'files':{}}
for f in files:
    bits=f.read_bytes()
    m['files'][f.name]={'bytes':len(bits),'sha256':hashlib.sha256(bits).hexdigest()}
(out/(tag+'_manifest.json')).write_text(json.dumps(m,indent=2))
print('B2_LOWER_BEARING_V01_REAL_CYCLES_OK',count,flush=True)
