import bpy,os,json,math
from mathutils import Vector
src=os.environ.get('SOURCE_VRM','/tmp/Sendagaya_Shibu.vrm')
out=os.environ.get('OUTPUT_DIR','output/vroid-shibu')
os.makedirs(out,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
# VRM 0.x embeds glTF 2.0 binary, so geometry can be read as GLB.
bpy.ops.import_scene.gltf(filepath=src)
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
if not meshes:raise RuntimeError('No mesh objects found in downloaded VRM')
manifest={'source':'Sendagaya_Shibu.vrm','license':'CC0 per pixiv beta AvatarSample_1',
          'meshes':[],'hidden':[]}
# Keep the original source intact. Render a body-only trial by excluding
# obvious hair, garment, eye and accessory objects when named separately.
for obj in meshes:
 name=obj.name.lower()
 hide=name=='icosphere' or any(token in name for token in ('hair','skirt','dress','cloth','outfit','shoe','accessory','ribbon'))
 manifest['meshes'].append({'name':obj.name,'vertices':len(obj.data.vertices),
                           'polygons':len(obj.data.polygons),'hidden':hide, 'materials':[{'index':i,'name':m.name if m else 'None','faces':sum(1 for p in obj.data.polygons if p.material_index==i)} for i,m in enumerate(obj.data.materials)]})
 if hide:
  obj.hide_render=True
  manifest['hidden'].append(obj.name)
visible=[o for o in meshes if not o.hide_render]
if not visible:raise RuntimeError('Body-only filtering removed all meshes')
# World-space bounds and calibrated camera framing, no destructive geometry edits.
coords=[o.matrix_world @ Vector(corner) for o in visible for corner in o.bound_box]
mn=Vector(tuple(min(v[i] for v in coords) for i in range(3)))
mx=Vector(tuple(max(v[i] for v in coords) for i in range(3)))
center=(mn+mx)/2;span=mx-mn
manifest['bounds_min']=list(mn);manifest['bounds_max']=list(mx)
manifest['height']=span.z
# Importer coordinates vary; preserve unmodified original and render four views.
mat=bpy.data.materials.new('Solid_clay');mat.diffuse_color=(.72,.73,.77,1)
for obj in visible:
 obj.data.materials.clear();obj.data.materials.append(mat)
world=bpy.context.scene.world or bpy.data.worlds.new('World')
bpy.context.scene.world=world
world.color=(.65,.65,.65)
for loc,power in [((3,-5,7),900),((-4,2,5),500)]:
 bpy.ops.object.light_add(type='AREA',location=center+Vector(loc))
 lamp=bpy.context.object;lamp.data.energy=power;lamp.data.size=5
 lamp.rotation_euler=(center-lamp.location).to_track_quat('-Z','Y').to_euler()
scene=bpy.context.scene
engines={e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items}
scene.render.engine='BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in engines else 'BLENDER_EEVEE'
scene.render.resolution_x=720;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
distance=max(3.0,span.length*2.4)
for name,offset in [('front',(0,1,0)),('back',(0,-1,0)),('right_side',(1,0,0)),('left_side',(-1,0,0)),('three_quarter',(1,1,.22))]:
 bpy.ops.object.camera_add(location=center+distance*Vector(offset).normalized())
 cam=bpy.context.object
 cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
 cam.data.type='ORTHO';cam.data.ortho_scale=max(span.z*1.16,span.x*1.7,span.y*1.7,.5)
 scene.camera=cam
 scene.render.filepath=os.path.join(out,name+'.png')
 bpy.ops.render.render(write_still=True)
 bpy.data.objects.remove(cam,do_unlink=True)
with open(os.path.join(out,'source_manifest.json'),'w') as f:json.dump(manifest,f,ensure_ascii=False,indent=2)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'vroid_shibu_import.blend'))
print('IMPORTED_MESHES',len(meshes),'VISIBLE',len(visible))
