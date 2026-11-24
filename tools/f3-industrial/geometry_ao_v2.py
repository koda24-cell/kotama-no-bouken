"""Bake real structural ambient occlusion on a separate UV set inside Blender.
Photographic colour/normal/roughness UVs remain unchanged. Original deliveries
and downloaded kit archives remain intact; this only authors a new candidate.
"""
def bake(c,bpy):
 import json,hashlib
 from pathlib import Path
 import numpy as np
 meshes=c._apply_and_join();assert meshes
 bpy.ops.object.select_all(action='DESELECT')
 for o in meshes:o.select_set(True)
 bpy.context.view_layer.objects.active=meshes[0]
 if len(meshes)>1:bpy.ops.object.join()
 obj=bpy.context.object;obj.name='city_structural_ao_authoring'
 primary=obj.data.uv_layers.active.name;before=[tuple(x.uv)for x in obj.data.uv_layers[primary].data]
 ao_uv=obj.data.uv_layers.new(name='CityAO');obj.data.uv_layers.active=ao_uv
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
 bpy.ops.uv.smart_project(angle_limit=1.151917,island_margin=.004,area_weight=.4)
 bpy.ops.object.mode_set(mode='OBJECT')
 # Keep the original UV as the default for every existing material sampler.
 obj.data.uv_layers.active=obj.data.uv_layers[primary];obj.data.uv_layers[primary].active_render=True
 assert before==[tuple(x.uv)for x in obj.data.uv_layers[primary].data]
 image=bpy.data.images.new('city_geometry_ao',width=1024,height=2048,alpha=False)
 image.colorspace_settings.name='Non-Color'
 for material in obj.data.materials:
  node=material.node_tree.nodes.new('ShaderNodeTexImage');node.name='baked structural AO';node.image=image;material.node_tree.nodes.active=node
 previous=bpy.context.scene.render.engine;bpy.context.scene.render.engine='CYCLES';bpy.context.scene.cycles.samples=32
 bpy.context.scene.render.bake.use_selected_to_active=False
 bpy.ops.object.bake(type='AO',margin=4,use_clear=True,uv_layer='CityAO')
 bpy.context.scene.render.engine=previous
 out=c.OUT/'sources/generated_materials';out.mkdir(parents=True,exist_ok=True);file=out/'city_geometry_ao.png';image.filepath_raw=str(file);image.file_format='PNG';image.save()
 group=bpy.data.node_groups.get('glTF Material Output')
 if group is None:
  group=bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree');group.interface.new_socket(name='Occlusion',in_out='INPUT',socket_type='NodeSocketFloat');group.nodes.new('NodeGroupInput')
 for material in obj.data.materials:
  nodes=material.node_tree.nodes;links=material.node_tree.links;node=nodes.get('baked structural AO')
  uv=nodes.new('ShaderNodeUVMap');uv.uv_map='CityAO';links.new(uv.outputs['UV'],node.inputs['Vector'])
  settings=next((n for n in nodes if n.type=='GROUP'and n.node_tree==group),None)
  if settings is None:settings=nodes.new('ShaderNodeGroup');settings.node_tree=group
  for link in list(settings.inputs['Occlusion'].links):links.remove(link)
  links.new(node.outputs['Color'],settings.inputs['Occlusion'])
 values=np.empty(len(image.pixels),dtype=np.float32);image.pixels.foreach_get(values)
 (c.OUT/'sources/geometry-ao-bake.json').write_text(json.dumps(dict(status='NOT_APPROVED',engine='Cycles',samples=32,resolution=[1024,2048],uv='CityAO',originalUV=primary,originalUVUnchanged=True,imageSha256=hashlib.sha256(file.read_bytes()).hexdigest(),range=[float(values[::4].min()),float(values[::4].max())],note='Geometry occlusion replaces derivative AO socket only; original source files preserved.'),indent=2))
