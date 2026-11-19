"""Assassin V18 native Shibu Face/Body shading A/B. Review ONLY.
Original Face+Body topology / positions / UV / weights are never changed.
Data Transfer of corner normals is attempted on a duplicated Face around
ear-lower seam source IDs; no geometry creation or merge by distance.
"""
import bpy,math,json,os,sys,hashlib
from mathutils import Vector
argv=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if len(argv)!=2: raise SystemExit("Expected SOURCE.vrm OUT_DIR")
source,out=argv;os.makedirs(out,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=source)
face=next((o for o in bpy.data.objects if o.type=='MESH' and o.name.lower()=='face'),None)
body=next((o for o in bpy.data.objects if o.type=='MESH' and o.name.lower()=='body'),None)
if not face or not body:raise RuntimeError("Shibu Face or Body is missing")
ids=[2071,1506]
base_hashes={}
def coordinate_hash(ob):
    h=hashlib.sha256()
    for v in ob.data.vertices:
        h.update(("%d,%.9f,%.9f,%.9f;"%(v.index,*v.co)).encode())
    for p in ob.data.polygons:h.update(("%s;"%','.join(str(k) for k in p.vertices)).encode())
    return h.hexdigest()
for ob in (face,body):base_hashes[ob.name]=coordinate_hash(ob)
orig_counts={'Face':(len(face.data.vertices),len(face.data.polygons)),'Body':(len(body.data.vertices),len(body.data.polygons))}
baseline_uvs={o.name:len(o.data.uv_layers) for o in (face,body)}
base_shape_keys={o.name:len(o.data.shape_keys.key_blocks) if o.data.shape_keys else 0 for o in (face,body)}
base_vgroups={o.name:len(o.vertex_groups) for o in (face,body)}
source_sha=hashlib.sha256(open(source,'rb').read()).hexdigest()
# Use a duplicate Face and original Body as source. Neither original source
# object is altered; ensure source hashes unchanged after render.
face_ab=face.copy();face_ab.data=face.data.copy();face_ab.name="V18_FACE_LOCAL_NORMAL_AB_REVIEW"
bpy.context.collection.objects.link(face_ab)
# Setup a local weighted vertex group near both ear-base outliers.
local=face_ab.vertex_groups.new(name="V18_EAR_LOWER_ONLY")
targets=[face_ab.matrix_world@face_ab.data.vertices[k].co for k in ids]
affected=[]
for v in face_ab.data.vertices:
    wp=face_ab.matrix_world@v.co
    distance=min((wp-p).length for p in targets)
    if distance<=0.037:
        weight=max(0.05,1.0-distance/0.037)
        local.add([v.index],weight,'REPLACE')
        affected.append(v.index)
if len(affected)<2:raise RuntimeError("Unexpected local selection")
# Actual Blender Data Transfer custom loop-normal workflow from references.
# API may differ by Blender version: do NOT claim technique tested if rejected.
modifier=face_ab.modifiers.new("V18_LOCAL_EAR_BODY_NORMAL_TRANSFER","DATA_TRANSFER")
modifier.object=body
modifier.vertex_group=local.name
modifier.mix_mode='REPLACE'
modifier.mix_factor=.60
modifier.use_loop_data=True
modifier.data_types_loops={'CUSTOM_NORMAL'}
modifier.loop_mapping='POLYINTERP_NEAREST'
# Material override for matched clay review (does not modify original).
mat=bpy.data.materials.new("V18_CLAY_REVIEW");mat.use_nodes=True
bsdf=mat.node_tree.nodes.get('Principled BSDF')
bsdf.inputs['Base Color'].default_value=(.70,.64,.60,1)
bsdf.inputs['Roughness'].default_value=.78
scene=bpy.context.scene
engine={e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items}
scene.render.engine="BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in engine else "BLENDER_EEVEE"
scene.render.resolution_x=640;scene.render.resolution_y=640;scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
bpy.context.view_layer.material_override=mat
target=Vector((0,0,1.475))
for offset,power,size in [((.8,1.5,2.2),420,1.6),((-.8,-1.3,2.0),320,1.8)]:
    pos=target+Vector(offset)
    bpy.ops.object.light_add(type='AREA',location=pos)
    lamp=bpy.context.object;lamp.data.energy=power;lamp.data.size=size
    lamp.rotation_euler=(target-pos).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam
cam.data.type="ORTHO";cam.data.ortho_scale=.42
allmeshes=[o for o in bpy.context.scene.objects if o.type=="MESH"]
for o in allmeshes:o.hide_render=o not in (face,body)
samples=[]
for srcid in ids:
    focus=face.matrix_world@face.data.vertices[srcid].co
    side=1 if focus.x>=0 else -1
    samples.extend([(srcid,'side',Vector((side,0,0)),focus),
                    (srcid,'rear',Vector((side,-.70,.22)),focus)])
for variant in ("baseline","transfer"):
    face.hide_render=variant!="baseline"
    face_ab.hide_render=variant!="transfer"
    body.hide_render=False
    for srcid,view,d,focus in samples:
        cam.data.ortho_scale=.135
        cam.location=focus+d.normalized()*1.0
        cam.rotation_euler=(focus-cam.location).to_track_quat('-Z','Y').to_euler()
        scene.render.filepath=os.path.join(out,f"{variant}_{srcid}_{view}.png")
        bpy.ops.render.render(write_still=True)
# Preserve exact original source positions/faces.
assert coordinate_hash(face)==base_hashes[face.name]
assert coordinate_hash(body)==base_hashes[body.name]
# Candidate is review only and may contain nonportable modifier; save Blend
# and QA for inspectability, *not* a production GLB.
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,"shibu_v18_local_normal_ab_NOT_APPROVED.blend"))
report={'source_vrm_sha256':source_sha,'approval':'NOT_APPROVED',
 'method':'Local Face copy Data Transfer of BODY custom corner normals',
 'tested_modifier':modifier.type,'mix_factor':modifier.mix_factor,
 'affected_face_vertices':len(affected),'ear_ids':ids,
 'source_coordinate_hashes':base_hashes,'source_counts':orig_counts,
 'source_uv_layers':baseline_uvs,'source_shape_keys':base_shape_keys,
 'source_vertex_groups':base_vgroups,
 'source_mesh_geometry_unchanged':True,
 'limitation':'Normals-only candidate cannot close an actual Face-Body geometry gap; skinning evaluation not yet performed'}
with open(os.path.join(out,'qa.json'),'w') as f:json.dump(report,f,indent=2)
print('V18_LOCAL_NORMAL_AB_REPORT',json.dumps(report))
