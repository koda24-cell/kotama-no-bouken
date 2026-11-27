"""Bake original licensed white flowers into four RGBA views, retain original scene."""
def build(e):
 import math,json
 from mathutils import Vector,Matrix
 from licensed_gltf_v2 import load
 bpy,c,scan=[e[k]for k in['bpy','c','scan']]
 objects,raw=load(c,bpy,scan,'flower_heliophila',extras=['Alpha'])
 meshes=[o for o in objects if o.type=='MESH'];assert meshes
 vertices=sum(len(o.data.vertices)for o in meshes)
 alpha=bpy.data.images.load(str(c.OUT/'sources/polyhaven_flower_heliophila_original/textures/flower_heliophila_Alpha_1k.png'),check_existing=True);alpha.colorspace_settings.name='Non-Color'
 for o in meshes:
  for m in o.data.materials:
   m.use_backface_culling=False;m.surface_render_method='DITHERED'
   p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');node=m.node_tree.nodes.new('ShaderNodeTexImage');node.image=alpha;m.node_tree.links.new(node.outputs['Color'],p.inputs['Alpha']);p.inputs['Roughness'].default_value=.82
 corners=[o.matrix_world@Vector(p)for o in meshes for p in o.bound_box]
 lo=Vector([min(v[k]for v in corners)for k in range(3)]);hi=Vector([max(v[k]for v in corners)for k in range(3)]);center=(lo+hi)*.5;size=hi-lo
 transform=Matrix.Translation((-center.x,-center.y,-lo.z))
 for o in objects:
  if not o.parent:o.matrix_world=transform@o.matrix_world
 bpy.context.view_layer.update()
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=20;scene.render.film_transparent=True;scene.render.resolution_x=512;scene.render.resolution_y=512;scene.render.resolution_percentage=100
 world=scene.world or bpy.data.worlds.new('flower bake diffuse sky');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.8,.85,.9,1);world.node_tree.nodes['Background'].inputs[1].default_value=.8
 camera_data=bpy.data.cameras.new('four view flower bake');camera=bpy.data.objects.new('flower bake camera',camera_data);scene.collection.objects.link(camera);scene.camera=camera;camera_data.type='ORTHO';camera_data.ortho_scale=max(size.x,size.y,size.z)*1.12
 light_data=bpy.data.lights.new('soft bake area','AREA');light_data.energy=350;light_data.shape='DISK';light_data.size=5;light=bpy.data.objects.new('soft bake area',light_data);scene.collection.objects.link(light);light.location=(0,-2,4)
 focus=Vector((0,0,size.z*.5));light.rotation_euler=(focus-light.location).to_track_quat('-Z','Y').to_euler()
 atlas=bpy.data.images.new('whiteflower four view RGBA atlas',width=2048,height=512,alpha=True);pixels=[0.]*(2048*512*4)
 for i,pos in enumerate([(0,-6,size.z*.65),(5,-4,size.z*.65),(-5,-4,size.z*.65),(0,0,7)]):
  camera.location=pos;camera.rotation_euler=(focus-camera.location).to_track_quat('-Z','Y').to_euler();bpy.ops.render.render()
  rgba=list(bpy.data.images['Render Result'].pixels)
  assert len(rgba)==512*512*4
  for row in range(512):pixels[(row*2048+i*512)*4:(row*2048+i*512+512)*4]=rgba[row*512*4:(row+1)*512*4]
 atlas.pixels.foreach_set(pixels);atlas.update();atlas.filepath_raw=str(c.OUT/'sources/whiteflower-four-view-atlas.png');atlas.file_format='PNG';atlas.save();atlas.pack()
 # Keep every original vertex, UV and raw download in its own authoring scene.
 original=bpy.data.scenes.new('ORIGINAL_CC0_WHITEFLOWERS_UNMODIFIED_GEOMETRY')
 for o in objects:
  original.collection.objects.link(o)
  for collection in list(o.users_collection):
   if collection!=original.collection:collection.objects.unlink(o)
 assert sum(len(o.data.vertices)for o in original.objects if o.type=='MESH')==vertices
 bpy.data.objects.remove(camera,do_unlink=True);bpy.data.objects.remove(light,do_unlink=True)
 material=bpy.data.materials.new('v3 whiteflower atlas MASK');material.use_nodes=True;material.use_backface_culling=False;material.surface_render_method='DITHERED';p=material.node_tree.nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=.9
 texture=material.node_tree.nodes.new('ShaderNodeTexImage');texture.image=atlas;material.node_tree.links.new(texture.outputs['Color'],p.inputs['Base Color']);material.node_tree.links.new(texture.outputs['Alpha'],p.inputs['Alpha'])
 # Each view gets its own UV tile; three upright cards and one horizontal crown.
 for i in range(4):
  if i<3:
   angle=i*math.pi/3;dx,dy=math.cos(angle)*.70,math.sin(angle)*.70;points=[(-dx,-dy,0),(dx,dy,0),(dx,dy,1.05),(-dx,-dy,1.05)]
  else:points=[(-.7,-.7,.38),(.7,-.7,.38),(.7,.7,.38),(-.7,.7,.38)]
  mesh=bpy.data.meshes.new('photographic flower card');mesh.from_pydata(points,[],[(0,1,2,3)]);mesh.update();uv=mesh.uv_layers.new(name='UVMap');coords=[(i/4,0),((i+1)/4,0),((i+1)/4,1),(i/4,1)]
  for loop in mesh.loops:uv.data[loop.index].uv=coords[loop.vertex_index]
  o=bpy.data.objects.new('whiteflower photographed view '+str(i),mesh);scene.collection.objects.link(o);mesh.materials.append(material)
 (c.OUT/'sources/whiteflower-atlas-provenance.json').write_text(json.dumps({'status':'NOT_APPROVED','source':'https://polyhaven.com/a/flower_heliophila','license':'CC0','author':'Jenelle van Heerden','views':4,'resolution':[2048,512],'originalVertices':vertices,'originalSceneRetained':True,'cardTriangles':8,'wind':'Runtime vertex displacement with per-instance phase, alpha tested'},indent=2))
