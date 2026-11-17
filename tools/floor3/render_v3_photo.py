"""F3 Ruined Building V3 photo-PBR enhancement.
Imports previous V2 GLB verbatim; doesn't remove or resculpt any old geometry.
Uses existing CC0 photo maps from approved V10 stairs on development.
Bakes external sources into exported GLB images (no external network dependency).
"""
import bpy,sys,os,math,json
from mathutils import Vector
IN='/work/render-output/ruined_building_v2.glb'
OUT='/work/render-output/'
TEX='/work/reference/assets/models/floor3/double_flight/textures/'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=IN)
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
assert len(meshes)>200

def pbr(name,diff,normal,rough=None,base=(1,1,1),metal=0):
 mat=bpy.data.materials.new(name)
 mat.use_nodes=True
 n=mat.node_tree.nodes;l=mat.node_tree.links
 bs=n.get('Principled BSDF')
 bs.inputs['Metallic'].default_value=metal
 bs.inputs['Roughness'].default_value=.9
 bs.inputs['Base Color'].default_value=(*base,1)
 tex=n.new('ShaderNodeTexImage');tex.label='CC0 photo base color'
 tex.image=bpy.data.images.load(TEX+diff,check_existing=True);tex.image.pack()
 l.new(tex.outputs['Color'],bs.inputs['Base Color'])
 if normal:
  normal_tex=n.new('ShaderNodeTexImage')
  normal_tex.label='CC0 OpenGL normal'
  normal_tex.image=bpy.data.images.load(TEX+normal,check_existing=True)
  normal_tex.image.colorspace_settings.name='Non-Color'
  normal_tex.image.pack()
  nm=n.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.68
  l.new(normal_tex.outputs['Color'],nm.inputs['Color'])
  l.new(nm.outputs['Normal'],bs.inputs['Normal'])
 if rough:
  rt=n.new('ShaderNodeTexImage')
  rt.image=bpy.data.images.load(TEX+rough,check_existing=True)
  rt.image.colorspace_settings.name='Non-Color'
  rt.image.pack();l.new(rt.outputs['Color'],bs.inputs['Roughness'])
 return mat

stone=pbr('V3 Photo weathered chipped concrete','chipped_concrete_diffuse.jpg','chipped_concrete_normal.jpg','chipped_concrete_roughness.jpg')
mossed=pbr('V3 CC0 damp concrete','concrete_moss_diffuse.jpg','concrete_moss_normal.jpg','concrete_moss_roughness.jpg')
rust=bpy.data.materials.new('V3 old oxidation rust')
rust.diffuse_color=(.21,.08,.04,1)
rust.use_nodes=True
node=rust.node_tree.nodes.get('Principled BSDF')
node.inputs['Base Color'].default_value=(.23,.085,.039,1)
node.inputs['Metallic'].default_value=.48
node.inputs['Roughness'].default_value=.86
plant=bpy.data.materials.new('V3 dark desaturated ivy')
plant.diffuse_color=(.10,.19,.075,1);plant.use_nodes=True
node=plant.node_tree.nodes.get('Principled BSDF')
node.inputs['Base Color'].default_value=(.09,.18,.067,1)
node.inputs['Roughness'].default_value=.99
# World-space planar UVs are repeatable and texture density stays roughly fixed.
# Use mesh face dominant axis to avoid stretching narrow upright columns.
for obj in meshes:
 n=obj.name.lower()
 if any(x in n for x in ('ivy','grass')):
  material=plant
 elif any(x in n for x in ('rust','steel','rebar','rail','joist','tank','bolt','gusset','brace','roof_post')):
  material=rust
 elif any(x in n for x in ('ledge','wall','slab','pier','broken','collapse','facade','floor','column','beam','stair')):
  material=mossed if ('lower' in n or 'ground' in n or 'base' in n) else stone
 else:material=stone
 obj.data.materials.clear();obj.data.materials.append(material)
 if material in (stone,mossed):
  layer=obj.data.uv_layers.active or obj.data.uv_layers.new(name='meterscale_uv')
  for poly in obj.data.polygons:
   normal=poly.normal
   axis=max(range(3),key=lambda i:abs(normal[i]))
   for i in poly.loop_indices:
    pt=obj.data.vertices[obj.data.loops[i].vertex_index].co
    if axis==2:u,v=pt.x,pt.y
    elif axis==1:u,v=pt.x,pt.z
    else:u,v=pt.y,pt.z
    layer.data[i].uv=(u*.34,v*.34)

# Reexport EXACT same scene hierarchy/geometry with real photographic PBR images.
bpy.ops.object.select_all(action='DESELECT')
for o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=meshes[0]
bpy.ops.export_scene.gltf(filepath=OUT+'ruined_building_v3.glb',export_format='GLB',use_selection=True)
bpy.ops.object.select_all(action='DESELECT')
# Save fully editable Blender file including packed photo textures.
bpy.ops.wm.save_as_mainfile(filepath=OUT+'ruined_building_v3.blend',compress=True)

# Shared neutral lighting, consistent front/side/angle distance.
coords=[o.matrix_world@Vector(corner) for o in meshes for corner in o.bound_box]
center=sum(coords,Vector())/len(coords)
size=max(max(p[i] for p in coords)-min(p[i] for p in coords) for i in range(3))
bpy.ops.object.camera_add()
camera=bpy.context.object
camera.data.type='ORTHO'
camera.data.ortho_scale=size*1.75
bpy.context.scene.camera=camera
for loc,energy in [((3,-5,7),1250),((-5,2,6),1050),((1,4,7),600)]:
 bpy.ops.object.light_add(type='AREA',location=center+Vector(loc)*size*.56)
 light=bpy.context.object;light.data.energy=energy*max(1,size*.5)
 light.data.size=size*.7
 light.rotation_euler=(center-light.location).to_track_quat('-Z','Y').to_euler()
scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE'
scene.render.resolution_x=960;scene.render.resolution_y=720
scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
scene.render.image_settings.file_format='PNG'
for view,vec in [('front',(0,-1.6,.5)),('side',(1.5,0,.6)),('angle',(1.4,-1.5,.9))]:
 camera.location=center+Vector(vec).normalized()*size*2.5
 camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=OUT+'ruined_building_v3-'+view+'.png'
 bpy.ops.render.render(write_still=True)
print('F3_RUINED_BUILDING_V3_PBR_RENDER_COMPLETE')
