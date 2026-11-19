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
