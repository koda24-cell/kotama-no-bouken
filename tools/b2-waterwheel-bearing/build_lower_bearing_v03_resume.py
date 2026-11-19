"""V03 timber saddle finishing: verified Blender edit checkpoint and UV correction.
Tame conspicuous side UV pale photo bands while preserving saddle and all geometry.
"""
import bpy,sys,json,hashlib,math
from pathlib import Path
from mathutils import Vector
a=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
assert len(a)==2
out=Path(a[0]).resolve();out.mkdir(parents=True,exist_ok=True)
src=Path(a[1]).resolve()
SOURCE='c404c9187e1c029e789237453e2beac5cb2eb3fba19d54eb58d7260b5e787cf3'
assert hashlib.sha256(src.read_bytes()).hexdigest()==SOURCE,'incorrect V01 edit checkpoint'
bpy.ops.wm.open_mainfile(filepath=str(src))
obj=bpy.data.objects['B2_Lower_Axle_Bearing_One_Timber']
orig_verts=len(obj.data.vertices)
orig_faces=len(obj.data.polygons)
source_mat=bpy.data.materials['Cold wet aged oak - actual CC0 photo if retrieved']
dark=source_mat.copy()
dark.name='V03 Weather-darkened UV-corrected Long Oak Side Grain'
nodes=dark.node_tree.nodes;links=dark.node_tree.links
bs=nodes.get('Principled BSDF')
assert bs
im=next((n for n in nodes if n.type=='TEX_IMAGE' and n.image and n.image.packed_file),None)
assert im
# Reduce the washout without discarding V11 photographic details.
mix=nodes.new('ShaderNodeMixRGB')
mix.blend_type='MULTIPLY';mix.inputs['Fac'].default_value=.60
mix.inputs[2].default_value=(.67,.61,.56,1)
mix.location=(bs.location.x-230,bs.location.y+70)
links.new(im.outputs['Color'],mix.inputs[1])
links.new(mix.outputs[0],bs.inputs['Base Color'])
bs.inputs['Roughness'].default_value=.88
slot=len(obj.data.materials);obj.data.materials.append(dark)
uv=obj.data.uv_layers.active
assert uv
side_faces=0
for poly in obj.data.polygons:
    c=poly.center;n=poly.normal
    # Match only exterior lateral faces; preserve real contact saddle material.
    if abs(n.y)>.24 and abs(c.y)>.39 and c.z<.065:
        side_faces+=1
        poly.material_index=slot
        for li in poly.loop_indices:
            v=obj.data.vertices[obj.data.loops[li].vertex_index].co
            # Wood grain follows X; narrow V avoids a conspicuous photo stripe.
            uv.data[li].uv=(.18+(v.x+.60)*.65,.34+(v.z+.70)*.12)
assert side_faces>=12,side_faces
assert len(obj.data.vertices)==orig_verts and len(obj.data.polygons)==orig_faces,'V01 geometry changed'
bpy.ops.object.select_all(action='DESELECT')
obj.select_set(True);bpy.context.view_layer.objects.active=obj
tag='b2_single_timber_lower_axle_bearing_v03'
glb=out/(tag+'.glb')
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True)
obj.select_set(False)
scene=bpy.context.scene
scene.cycles.samples=54
scene.render.resolution_x=850;scene.render.resolution_y=850
scene.render.resolution_percentage=100
cam=scene.camera
files=[glb]
for name,at in [('front',(2.5,1.5,1.2)),('side',(0,2.7,.8)),
                ('angle',(2.0,-2.0,1.45)),('back',(-2.6,-1.7,.9))]:
    cam.location=at;cam.rotation_euler=(Vector((0,0,-.28))-cam.location).to_track_quat('-Z','Y').to_euler()
    path=out/(tag+'_'+name+'.png')
    scene.render.filepath=str(path);bpy.ops.render.render(write_still=True)
    files.append(path)
blend=out/(tag+'.blend');bpy.ops.wm.save_as_mainfile(filepath=str(blend));files.append(blend)
manifest={'asset':tag,'approval':'NOT_APPROVED','v01_blend_sha256':SOURCE,
 'geometry_unchanged':True,'source_vertices':orig_verts,'source_polygons':orig_faces,
 'side_photo_correction_polygons':side_faces,'corrected_material':'UV-specific photo darkening',
 'original_saddle_radius_m':.318,'original_shaft_radius_m':.300,
 'test_assembly':'NOT_TESTED','files':{}}
for f in files:
    data=f.read_bytes()
    manifest['files'][f.name]={'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
(out/(tag+'_manifest.json')).write_text(json.dumps(manifest,indent=2))
print('B2_BEARING_V03_UNIFIED_WOOD_SIDE_RENDER_SUCCESS',side_faces,flush=True)
