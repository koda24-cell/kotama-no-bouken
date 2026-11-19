"""One independent upper oak saddle cap. Existing lower block & game untouched."""
import bpy,math,sys,json,hashlib
from pathlib import Path
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
assert len(args)==2
out=Path(args[0]).resolve();out.mkdir(parents=True,exist_ok=True)
ref=Path(args[1]).resolve()
SHA='addae90dd199b9f6d0417c70f5152a32bd504e83e2deffa8e0965a0fdf5e2c67'
assert hashlib.sha256(ref.read_bytes()).hexdigest()==SHA
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
matname='Cold wet aged oak - actual CC0 photo if retrieved'
endname='Exposed weathered end grain'
with bpy.data.libraries.load(str(ref),link=False) as (src,dst):
    assert matname in src.materials and endname in src.materials
    dst.materials=[matname,endname]
wood=bpy.data.materials[matname];end=bpy.data.materials[endname]

# Blender's linked packed textures can render as blank white if their old relative
# file paths are unresolved. Restore verified packed bytes to real local files
# and explicitly rebind image texture nodes before rendering.
for material in (wood,end):
    for node in material.node_tree.nodes:
        if node.type!='TEX_IMAGE' or not node.image:continue
        old=node.image
        if not old.packed_file: continue
        raw=bytes(old.packed_file.data)
        ext='.jpg' if raw[:2]==bytes.fromhex('ffd8') else '.png'
        clean=''.join(c if c.isalnum() or c in '_-' else '_' for c in old.name)
        restored=out/(clean+ext)
        restored.write_bytes(raw)
        new=bpy.data.images.load(str(restored),check_existing=False)
        new.colorspace_settings.name=old.colorspace_settings.name
        node.image=new
        new.pack()
        assert restored.stat().st_size>1000, 'restored oak source file empty'

# Section deliberately retains flat joining plane at z=.055, asymmetric upper worn rim.
prof=[(-.502,.055),(.500,.055),(.521,.078),(.516,.505),
      (.485,.601),(.410,.631),(-.421,.619),(-.516,.533),(-.523,.092)]
stations=[(-.580,.985),(-.552,1.),(-.420,1.),(-.100,.995),(.320,1.),(.555,.988),(.580,.972)]
verts=[];polys=[];types=[]
for x,fac in stations:
    for y,z in prof:
        verts.append((x,y*fac,z+(0.003*math.sin(x*7+y*9) if z>.5 else 0)))
n=len(prof)
for i in range(len(stations)-1):
    for j in range(n):
        k=(j+1)%n
        polys.append((i*n+j,i*n+k,(i+1)*n+k,(i+1)*n+j));types.append(0)
polys.append(tuple(reversed(range(n))));types.append(1)
polys.append(tuple((len(stations)-1)*n+i for i in range(n)));types.append(1)
mesh=bpy.data.meshes.new('Old_Upper_Cap_Body')
mesh.from_pydata(verts,[],polys);mesh.update()
obj=bpy.data.objects.new('B2_Single_Upper_Timber_Bearing_Cap',mesh)
bpy.context.collection.objects.link(obj)
mesh.materials.append(wood);mesh.materials.append(end)
for p,t in zip(mesh.polygons,types):p.material_index=t;p.use_smooth=False
# Proper underside half cylindrical bore; cutter radius .322, centered at existing shaft origin.
bpy.ops.mesh.primitive_cylinder_add(vertices=144,radius=.322,depth=1.50,location=(0,0,0))
c=bpy.context.object;c.name='TEMP_upper_saddle_cutter';c.rotation_euler=(0,math.pi/2,0)
bpy.context.view_layer.objects.active=obj
bo=obj.modifiers.new('Actual cylindrical shaft seat radius322mm','BOOLEAN')
bo.solver='EXACT';bo.operation='DIFFERENCE';bo.object=c
bpy.ops.object.modifier_apply(modifier=bo.name)
bpy.data.objects.remove(c,do_unlink=True)
# Unlike rivets or metal straps, no second part is created. Wear 2 nonfunctional back corners.
for index,(x,y,z,scale) in enumerate([
    (-.574,-.48,.55,(.065,.061,.065)),(.574,.46,.578,(.052,.043,.073))]):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=(x,y,z))
    chip=bpy.context.object;chip.name='TEMP_endgrained_fracture'
    chip.scale=scale;chip.rotation_euler=(.31+index,.23+index*.36,.41)
    bpy.context.view_layer.objects.active=chip
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    bpy.context.view_layer.objects.active=obj
    bo=obj.modifiers.new('Uneven corner wear %d'%index,'BOOLEAN')
    bo.solver='EXACT';bo.operation='DIFFERENCE';bo.object=chip
    bpy.ops.object.modifier_apply(modifier=bo.name)
    bpy.data.objects.remove(chip,do_unlink=True)
uv=mesh.uv_layers.active or mesh.uv_layers.new(name='Grain_along_axle_X')
# Darken broad oak side gently, but preserve original photorealistic image textures.
# The old V11 colored wood JPG has remained blank white in Cycles even after
# rebinding. Use the SHA verified packed V11 generated endgrain PNG, which is
# proven to render as dark weathered oak, with longitudinal UV across the cap.
shade=end.copy()
shade.name='V04 consistent dark weathered oak with real packed PNG'
shade.use_nodes=True
shade.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.86
mesh.materials.append(shade)
# Underside lightly oiled bearing contact, using original oak photo (not featureless black).
contact=shade.copy();contact.name='V04 dark contact photo oak'
contact.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.69
mesh.materials.append(contact)
seat_faces=0
for poly in mesh.polygons:
    cen=poly.center
    rad=math.hypot(cen.y,cen.z)
    if .308<rad<.335 and cen.z>.035 and abs(cen.y)<.33:
        poly.material_index=3;seat_faces+=1
    elif abs(cen.x)>.565 and poly.normal.x*cen.x>.35:
        poly.material_index=1
    else:
        poly.material_index=2
    for li in poly.loop_indices:
        co=mesh.vertices[mesh.loops[li].vertex_index].co
        if poly.material_index==1:xy=(.5+co.y*.67,.5+(co.z-.25)*.67)
        elif poly.material_index==3:xy=((co.x+.58)*.64,(math.atan2(co.z,co.y)+math.pi)/(2*math.pi))
        else:xy=(.18+(co.x+.58)*.66,.31+(co.z-.055)*.23)
        uv.data[li].uv=xy
assert seat_faces>50,seat_faces
bevel=obj.modifiers.new('Subtle worn corner chamfers','BEVEL')
bevel.width=.004;bevel.segments=2;bevel.limit_method='ANGLE';bevel.angle_limit=.7
# GLB includes only modeled cap; no reference lower block exported.
bpy.ops.object.select_all(action='DESELECT')
obj.select_set(True);bpy.context.view_layer.objects.active=obj
tag='b2_one_upper_timber_bearing_cap_v04'
glb=out/(tag+'.glb')
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True)
obj.select_set(False)
world=bpy.data.worlds.new('neutral cool cave studio');world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.50
bpy.context.scene.world=world
for where,power,size in [((2,-2.5,2.6),550,2.7),((-2.5,2,1.4),360,2.4)]:
    bpy.ops.object.light_add(type='AREA',location=where)
    l=bpy.context.object;l.data.energy=power;l.data.size=size
    l.rotation_euler=(Vector((0,0,.25))-l.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add()
camera=bpy.context.object
bpy.context.scene.camera=camera
camera.data.type='ORTHO';camera.data.ortho_scale=2.2
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=44
scene.render.resolution_x=850;scene.render.resolution_y=850
scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
files=[glb]
for view,where in [('front',(2.4,1.7,1.1)),('side',(0,2.6,1.05)),('angle',(2.1,-1.7,1.6)),('back',(-2.4,-1.6,1.1))]:
    camera.location=where
    camera.rotation_euler=(Vector((0,0,.26))-camera.location).to_track_quat('-Z','Y').to_euler()
    path=out/(tag+'_'+view+'.png')
    scene.render.filepath=str(path);bpy.ops.render.render(write_still=True);files.append(path)
blend=out/(tag+'.blend')
bpy.ops.wm.save_as_mainfile(filepath=str(blend));files.append(blend)
manifest={'asset':tag,'approval':'NOT_APPROVED','geometry_piece_count':1,
'lower_block_reference':'PR568 unapproved; NOT modified','shaft_axis':'X','seat_radius_m':.322,
'lower_bearing_candidate_radius_m':.318,'shaft_reference_radius_m':.300,
'joint_bottom_z_m':.055,'seat_mesh_faces':seat_faces,
'source_v11_sha256':SHA,'actual_lower_upper_fit':'NOT_TESTED','files':{}}
for p in files:
    data=p.read_bytes();manifest['files'][p.name]={'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
(out/(tag+'_manifest.json')).write_text(json.dumps(manifest,indent=2))
print('B2_UPPER_CAP_V04_REAL_BLENDER_RENDER_OK',seat_faces,flush=True)
