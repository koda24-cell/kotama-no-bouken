"""Diagnostic only: inspect whether source VRoid Body contains the posterior cranium.
No old Assassin prototypes, no mesh modification, no GLB redistribution.
Blender -b --python audit_shibu_body_scalp.py -- original.vrm output_dir
"""
import bpy,os,sys,json,math,collections
from mathutils import Vector
a=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if len(a)!=2:raise SystemExit('expected Shibu.vrm output_dir')
src,out=a;os.makedirs(out,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=src)
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
audit=[]
for ob in meshes:
    co=[ob.matrix_world@v.co for v in ob.data.vertices]
    if not co:continue
    high=[p for p in co if p.z>=1.35]
    scalp=[p for p in high if 1.38<=p.z<=1.60 and abs(p.x)<.14 and p.y<-.03]
    audit.append({'name':ob.name,'all_vertices':len(co),'all_polygons':len(ob.data.polygons),
      'head_level_vertices_z_ge_1_35':len(high),'posterior_head_candidate_vertices':len(scalp),
      'bbox_min':[min(v[j] for v in co) for j in range(3)],
      'bbox_max':[max(v[j] for v in co) for j in range(3)],
      'posterior_head_bbox_min':[min(v[j] for v in scalp) for j in range(3)] if scalp else None,
      'posterior_head_bbox_max':[max(v[j] for v in scalp) for j in range(3)] if scalp else None})
with open(os.path.join(out,'mesh_region_audit.json'),'w') as f:json.dump(audit,f,indent=2)
face=next((o for o in meshes if o.name.lower()=='face'),None)
body=next((o for o in meshes if o.name.lower()=='body'),None)
if face is None or body is None:raise RuntimeError('Body or Face object missing')

# Recompare the exact Shibu rim (fixed validated source IDs from 2026-11-19
# run 44436213466) with original Body vertices. This audits correspondence,
# not a claim that source objects are welded.
rim_ids=[1472,1877,1880,1759,1758,2077,2074,2075,2071,1711,1710,1708,1709,2067,1698,1693,1692,2046,2044,2042,2034,2035,2037,2039,1577,1578,1585,1587,1519,1518,1520,1505,1506,2057,2056,2058]
assert len(set(rim_ids))==36 and max(rim_ids)<len(face.data.vertices)
face_world=face.matrix_world;body_world=body.matrix_world
body_positions=[body_world@v.co for v in body.data.vertices]
match=[]
for j,idx in enumerate(rim_ids):
    p=face_world@face.data.vertices[idx].co
    distance,v=min(((p-q).length,k) for k,q in enumerate(body_positions))
    match.append({'rim_order':j,'face_vertex_id':idx,'nearest_body_vertex_id':v,
       'distance_m':round(distance,8),'face_world_xyz':[round(c,7) for c in p]})
distances=[m['distance_m'] for m in match]
summary={'count':len(match),'distance_min_m':min(distances),
         'distance_max_m':max(distances),'distance_mean_m':sum(distances)/36,
         'count_within_0_1mm':sum(d<=0.0001 for d in distances),
         'count_within_1mm':sum(d<=0.001 for d in distances),
         'point_matches':match,
         'note':'Nearest source Body vertex only; do not claim Face and Body are welded or contact-free without triangle-to-surface and visual checks'}
with open(os.path.join(out,'face_body_rim_correspondence.json'),'w') as fp:json.dump(summary,fp,indent=2)
print('FACE_BODY_RIM_CORRESPONDENCE',summary['distance_min_m'],summary['distance_max_m'],summary['count_within_0_1mm'])

# Vertex gaps can be false positives if Face points lie on Body polygons
# away from their vertex corners. Audit actual Body triangles independently.
import bmesh
from mathutils.bvhtree import BVHTree
bm=bmesh.new();bm.from_mesh(body.data)
bmesh.ops.transform(bm,matrix=body.matrix_world,verts=bm.verts)
bm.normal_update()
tree=BVHTree.FromBMesh(bm)
surface=[]
for j,idx in enumerate(rim_ids):
    p=face_world@face.data.vertices[idx].co
    hit=tree.find_nearest(p)
    if hit is None:raise RuntimeError('No Body nearest triangle')
    pos,normal,face_index,distance=hit
    surface.append({'rim_order':j,'face_vertex_id':idx,
        'body_face_index':face_index,'nearest_surface_distance_m':round(distance,9),
        'nearest_body_surface_xyz':[round(x,7) for x in pos]})
bm.free()
sd=[x['nearest_surface_distance_m'] for x in surface]
surface_report={'count':len(sd),'distance_min_m':min(sd),
 'distance_max_m':max(sd),'distance_mean_m':sum(sd)/len(sd),
 'count_within_0_1mm':sum(d<=.0001 for d in sd),
 'count_within_1mm':sum(d<=.001 for d in sd),'samples':surface,
 'note':'Distance to Body triangle surfaces in Blender-world coordinates; proximity does not mean faces are welded, normals/weights preserved or licenses verified'}
with open(os.path.join(out,'face_body_rim_surface_distances.json'),'w') as fp:
    json.dump(surface_report,fp,indent=2)
print('FACE_BODY_SURFACE_DISTANCE',surface_report['distance_max_m'],
    surface_report['count_within_0_1mm'])


mat=bpy.data.materials.new('Shibu_source_audit_clay');mat.use_nodes=True
shader=mat.node_tree.nodes.get('Principled BSDF');shader.inputs['Base Color'].default_value=(.72,.68,.65,1)
bpy.context.view_layer.material_override=mat
for ob in meshes:
    ob.hide_render=ob not in [face,body]
    if ob in [face,body]:
        for poly in ob.data.polygons:poly.use_smooth=True
sc=bpy.context.scene
eng={x.identifier for x in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items}
sc.render.engine='BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in eng else 'BLENDER_EEVEE'
sc.render.resolution_x=600;sc.render.resolution_y=600;sc.render.resolution_percentage=100
sc.render.image_settings.file_format='PNG'
target=Vector((0,0,1.47))
for p,energy,size in [((1,1.2,2.6),380,1.5),((-1,-1,2.0),220,2)]:
    loc=target+Vector(p);bpy.ops.object.light_add(type='AREA',location=loc)
    ob=bpy.context.object;ob.data.energy=energy;ob.data.size=size
    ob.rotation_euler=(target-loc).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;sc.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=.43
views=[('body_only_back',(0,-1,0),False),('body_only_left',(-1,0,0),False),
('body_only_right',(1,0,0),False),('body_only_back_upper',(1,-1,.6),False),
('face_body_left',(-1,0,0),True),('face_body_back',(0,-1,0),True)]
for name,d,showface in views:
    face.hide_render=not showface
    cam.location=target+Vector(d).normalized()*1.6
    cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
    sc.render.filepath=os.path.join(out,name+'.png')
    bpy.ops.render.render(write_still=True)
print('BODY_SCALP_AUDIT',json.dumps(audit))
