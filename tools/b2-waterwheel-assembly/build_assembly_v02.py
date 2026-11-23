"""V02 review: preserve source GLBs and explicitly place both ±1.02m bearing pairs."""
import bpy,sys,json,hashlib,math
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
assert len(args)==2
input_root=Path(args[0]).resolve()
out=Path(args[1]).resolve();out.mkdir(parents=True,exist_ok=True)
inputs={
 'hub':('hub','b2_waterwheel_single_wooden_hub_v11.glb'),
 'ferrule':('ferrule','b2_single_iron_axle_ferrule_v01.glb'),
 'lower':('lower','b2_single_timber_lower_axle_bearing_v03.glb'),
 'upper':('upper','b2_one_upper_timber_bearing_cap_v05.glb'),
 'axle':('axle','b2_single_oak_waterwheel_axle_v02.glb')}
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
originals={}
for key,(sub,file) in inputs.items():
    path=input_root/sub/file
    assert path.exists(),str(path)
    old=set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    new=[o for o in bpy.data.objects if o not in old and o.type=='MESH']
    assert len(new)==1,(key,[o.name for o in new])
    obj=new[0]
    obj.name='B2_ASSEMBLY_SOURCE_'+key.upper()
    originals[key]=obj
# No original vertex positions, faces, materials or textures are edited.
initial={key:{'vertices':len(o.data.vertices),'polygons':len(o.data.polygons),
              'original_bound':[[round(v,6) for v in o.bound_box[0]],
                                [round(v,6) for v in o.bound_box[6]]]}
         for key,o in originals.items()}
# Keep wheel center at local origin. Axle shaft along X.
# Position two complete sets of timber bearing assemblies outside hub, no cutting.
parts=dict(originals)
for side,post in [('right',1.02),('left',-1.02)]:
    for role in ('lower','upper'):
        if side=='right':
            obj=originals[role]
        else:
            obj=originals[role].copy()
            obj.data=originals[role].data.copy()
            bpy.context.collection.objects.link(obj)
        obj.name='B2_REVIEW_'+side.upper()+'_'+role.upper()
        obj.location.x=post
        parts[side+'_'+role]=obj
# Remove dictionary aliases to avoid treating the right object twice during selective export.
parts.pop('lower');parts.pop('upper')
bpy.context.view_layer.update()
for key,o in originals.items():
    assert len(o.data.vertices)==initial[key]['vertices'] and len(o.data.polygons)==initial[key]['polygons']
# BVH uses actual triangles transformed into world space, not just proximity AABB.
def bbox(obj):
    xyz=[obj.matrix_world @ Vector(c) for c in obj.bound_box]
    return [[round(min(p[i] for p in xyz),5) for i in range(3)],
            [round(max(p[i] for p in xyz),5) for i in range(3)]]
def tree(obj):
    verts=[obj.matrix_world @ v.co for v in obj.data.vertices]
    polys=[tuple(p.vertices) for p in obj.data.polygons]
    return BVHTree.FromPolygons(verts,polys,all_triangles=False,epsilon=1e-6)
trees={key:tree(o) for key,o in parts.items()}
pairs=[
 ('axle','hub'),('axle','ferrule'),('hub','ferrule'),
 ('axle','right_lower'),('axle','right_upper'),
 ('axle','left_lower'),('axle','left_upper'),
 ('hub','right_lower'),('hub','right_upper'),
 ('hub','left_lower'),('hub','left_upper'),
 ('ferrule','right_lower'),('ferrule','right_upper'),
 ('right_lower','right_upper'),('left_lower','left_upper')]
checks={}
for a,b in pairs:
    overlap=trees[a].overlap(trees[b])
    checks[a+'__'+b]={'intersecting_triangle_pairs':len(overlap),
                       'note':'Triangle intersection only; no overlap does not prove containment free'}
# Circumferential shaft cross-section extrema at each X in important contact ranges,
# plus nominal radius of each real target bore seat. Cross section sampling is independent
# of triangle intersection and reveals if nominal tolerance is contradicted by vertices.
axle=originals['axle']
samples={}
for region,lo,hi,target in [('hub',-.17,.17,.303),
                             ('ferrule',.185,.225,.306),
                             ('right_bearing',.48,1.56,.318),
                             ('left_bearing',-1.56,-.48,.318)]:
    radii=[]
    for v in axle.data.vertices:
        p=axle.matrix_world @ v.co
        if lo<=p.x<=hi:radii.append(math.hypot(p.y,p.z))
    samples[region]={'count':len(radii),'shaft_r_min':round(min(radii),6) if radii else None,
                     'shaft_r_max':round(max(radii),6) if radii else None,
                     'target_inner_radius_m':target,
                     'min_nominal_radial_gap_m':round(target-max(radii),6) if radii else None}
report={'status':'NOT_APPROVED','version':'V02','assembly_is_temporary_review_only':True,
        'source_glb_files':{k:file for k,(sub,file) in inputs.items()},
        'source_mesh_preserved':initial,
        'shaft_axis':'X','bearing_centers_x_m':[-1.02,1.02],
        'left_duplicate_world_transform_fixed':True,
        'world_aabbs':{name:bbox(obj) for name,obj in parts.items()},
        'bvh_triangle_intersection_checks':checks,
        'radial_vertex_checks':samples,
        'real_game_physics_test':'NOT_TESTED',
        'bolt_nut_washer_integration':'DEFERRED_UNTIL_HOLES_APPROVED',
        'critical_note':'BVH tests triangle intersections only and may miss geometric containment; do not interpret empty BVH pair as complete clearance proof.'}
(out/'b2_axle_core_assembly_v02_collision_report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False))
print('B2_ASSEMBLY_BVH_SUMMARY',[(k,v['intersecting_triangle_pairs']) for k,v in checks.items()],flush=True)
# Selected-only GLB is review scene; it is not the source of truth for the game engine.
bpy.ops.object.select_all(action='DESELECT')
for obj in parts.values():obj.select_set(True)
bpy.context.view_layer.objects.active=originals['axle']
asset='b2_axle_core_assembly_v02_review'
glb=out/(asset+'.glb')
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True)
bpy.ops.object.select_all(action='DESELECT')
# Review studio, never included in game GLB.
world=bpy.data.worlds.new('B2_assembly_neutral_studio')
world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.24,.28,.32,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.66
bpy.context.scene.world=world
# Backdrop floor makes side positioning easy to understand.
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.75))
ground=bpy.context.object;ground.name='REVIEW_ONLY_grey_floor'
gm=bpy.data.materials.new('Studio neutral ground');gm.diffuse_color=(.29,.33,.38,1)
ground.data.materials.append(gm)
for p,power,size in [((2.7,-3.8,6),1000,5.5),((-3.2,3,4),730,4.2)]:
    bpy.ops.object.light_add(type='AREA',location=p)
    l=bpy.context.object;l.data.energy=power;l.data.size=size
    l.rotation_euler=(Vector((0,0,0))-l.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add()
cam=bpy.context.object;cam.data.type='ORTHO'
scene=bpy.context.scene;scene.camera=cam;scene.render.engine='CYCLES'
scene.cycles.samples=52;scene.render.resolution_x=950;scene.render.resolution_y=850
scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
files=[glb,out/'b2_axle_core_assembly_v02_collision_report.json']
views=[('front',(5.9,1.7,2.7),4.5),
       ('side',(.6,-7,2.5),5.2),
       ('angle',(5.1,-5.1,4.3),5.7),
       ('top',(.15,-.3,8),5.1)]
for name,location,scale in views:
    cam.location=location;cam.data.ortho_scale=scale
    cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler()
    f=out/(asset+'_'+name+'.png')
    scene.render.filepath=str(f);bpy.ops.render.render(write_still=True);files.append(f)
blend=out/(asset+'.blend')
bpy.ops.wm.save_as_mainfile(filepath=str(blend));files.append(blend)
manifest={'asset':asset,'approval':'NOT_APPROVED','input_model_types':5,
          'rendered_components':len(parts),'files':{},
          'bvh_collision_count':sum(v['intersecting_triangle_pairs']>0 for v in checks.values())}
for f in files:
    data=f.read_bytes()
    manifest['files'][f.name]={'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
(out/(asset+'_manifest.json')).write_text(json.dumps(manifest,indent=2))
print('B2_ASSEMBLY_V02_REAL_RENDER_SUCCESS',len(parts),flush=True)
