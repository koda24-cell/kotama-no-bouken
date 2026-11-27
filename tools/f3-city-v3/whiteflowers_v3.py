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
 # The licensed specimen is sparse/wilted in the first actual bake. Retain it
 # intact as reference, but author a flowering white groundcover for this court.
 for o in objects:o.hide_render=True
 source_objects=set(objects);authored=[];rng=e['rng']
 petal=bpy.data.materials.new('ivory white living petal');petal.use_nodes=True;p=petal.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.84,.86,.78,1);p.inputs['Roughness'].default_value=.64;p.inputs['Subsurface Weight'].default_value=.08
 leaf=bpy.data.materials.new('silver green white garden leaf');leaf.use_nodes=True;p=leaf.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.24,.32,.22,1);p.inputs['Roughness'].default_value=.82
 pollen=bpy.data.materials.new('pale cream pollen');pollen.diffuse_color=(.60,.52,.24,1)
 def blade(name,center,angle,length,width,material,lift=.02):
  from mathutils import Vector
  x,y,z=center;axis=Vector((math.cos(angle),math.sin(angle),0));side=Vector((-axis.y,axis.x,0));base=Vector(center)
  points=[]
  for t,w,h in[(0,0,0),(.35,width,.025),(.75,width*.7,lift),(1,0,lift*.5)]:
   for sign in[-1,0,1]:points.append(base+axis*length*t+side*w*sign+Vector((0,0,h+(.012 if sign==0 else 0))))
  faces=[]
  for j in range(3):
   for k in range(2):a=j*3+k;faces.append((a,a+1,a+4,a+3))
  mesh=bpy.data.meshes.new(name);mesh.from_pydata(points,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);mesh.materials.append(material);o.modifiers.new('petal surface curvature','SUBSURF').levels=1;o.modifiers.new('petal thickness','SOLIDIFY').thickness=.001;authored.append(o)
 for k in range(42):
  a=rng.random()*math.tau;r=.62*math.sqrt(rng.random());x,y=math.cos(a)*r,math.sin(a)*r;z=.16+rng.random()*.18
  stem=e['rod']('slender whiteflower stem',(x*.92,y*.92,.02),(x,y,z),.004,leaf,8);authored.append(stem)
  for j in range(3):blade('silver groundcover leaf',(x,y,.035+j*.025),a+j*2.2,.11+rng.random()*.09,.025,leaf,.025)
  for j in range(5):blade('curved white flower petal',(x,y,z),j*math.tau/5+a,.075+rng.random()*.025,.027,petal,.012)
  bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=6,radius=.013,location=(x,y,z+.014));o=bpy.context.object;o.name='cream flower heart';o.data.materials.append(pollen);authored.append(o)
 bpy.context.view_layer.update()
 corners=[o.matrix_world@Vector(p)for o in authored for p in o.bound_box]
 lo=Vector([min(v[k]for v in corners)for k in range(3)]);hi=Vector([max(v[k]for v in corners)for k in range(3)]);center=(lo+hi)*.5;size=hi-lo
 transform=Matrix.Translation((-center.x,-center.y,-lo.z))
 for o in authored:
  if not o.parent:o.matrix_world=transform@o.matrix_world
 bpy.context.view_layer.update()
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=20;scene.cycles.device='CPU';scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.use_border=False;scene.render.resolution_x=512;scene.render.resolution_y=512;scene.render.resolution_percentage=100
 world=scene.world or bpy.data.worlds.new('flower bake diffuse sky');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.8,.85,.9,1);world.node_tree.nodes['Background'].inputs[1].default_value=.8
 camera_data=bpy.data.cameras.new('four view flower bake');camera=bpy.data.objects.new('flower bake camera',camera_data);scene.collection.objects.link(camera);scene.camera=camera;camera_data.type='ORTHO';camera_data.ortho_scale=max(size.x,size.y,size.z)*1.12
 light_data=bpy.data.lights.new('soft bake area','AREA');light_data.energy=350;light_data.shape='DISK';light_data.size=5;light=bpy.data.objects.new('soft bake area',light_data);scene.collection.objects.link(light);light.location=(0,-2,4)
 focus=Vector((0,0,size.z*.5));light.rotation_euler=(focus-light.location).to_track_quat('-Z','Y').to_euler()
 atlas=bpy.data.images.new('whiteflower four view RGBA atlas',width=2048,height=512,alpha=True);pixels=[0.]*(2048*512*4);view_heights=[]
 for i,pos in enumerate([(0,-6,size.z*.65),(5,-4,size.z*.65),(-5,-4,size.z*.65),(0,0,7)]):
  camera.location=pos;camera.rotation_euler=(focus-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(c.OUT/('sources/whiteflower-bake-view-'+str(i)+'.png'));bpy.ops.render.render(write_still=True)
  rendered=bpy.data.images.load(scene.render.filepath,check_existing=False);rgba=list(rendered.pixels)
  assert len(rgba)==512*512*4
  occupied=[i for i in range(512*512)if rgba[i*4+3]>.03];assert occupied
  x0=max(0,min(i%512 for i in occupied)-6);x1=min(511,max(i%512 for i in occupied)+6);y0=max(0,min(i//512 for i in occupied)-6);y1=min(511,max(i//512 for i in occupied)+6)
  width,height=x1-x0+1,y1-y0+1;view_heights.append(1.4*height/width)
  cropped=bpy.data.images.new('cropped flower view '+str(i),width=width,height=height,alpha=True);crop=[]
  for row in range(y0,y1+1):crop.extend(rgba[(row*512+x0)*4:(row*512+x1+1)*4])
  cropped.pixels.foreach_set(crop);cropped.scale(512,512);rgba=list(cropped.pixels)
  for row in range(512):pixels[(row*2048+i*512)*4:(row*2048+i*512+512)*4]=rgba[row*512*4:(row+1)*512*4]
 atlas.pixels.foreach_set(pixels);atlas.update();atlas.filepath_raw=str(c.OUT/'sources/whiteflower-four-view-atlas.png');atlas.file_format='PNG';atlas.save();atlas.pack()
 # Keep every original vertex, UV and raw download in its own authoring scene.
 original=bpy.data.scenes.new('ORIGINAL_CC0_WHITEFLOWERS_UNMODIFIED_GEOMETRY')
 for o in source_objects:
  original.collection.objects.link(o)
  for collection in list(o.users_collection):
   if collection!=original.collection:collection.objects.unlink(o)
 assert sum(len(o.data.vertices)for o in original.objects if o.type=='MESH')==vertices
 authored_scene=bpy.data.scenes.new('ORIGINAL_AUTHORED_WHITE_GROUNDCOVER_FOR_ATLAS')
 for o in authored:
  authored_scene.collection.objects.link(o)
  for collection in list(o.users_collection):
   if collection!=authored_scene.collection:collection.objects.unlink(o)
 bpy.data.objects.remove(camera,do_unlink=True);bpy.data.objects.remove(light,do_unlink=True)
 material=bpy.data.materials.new('v3 whiteflower atlas MASK');material.use_nodes=True;material.use_backface_culling=False;material.surface_render_method='DITHERED';p=material.node_tree.nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=.9
 texture=material.node_tree.nodes.new('ShaderNodeTexImage');texture.image=atlas;material.node_tree.links.new(texture.outputs['Color'],p.inputs['Base Color']);material.node_tree.links.new(texture.outputs['Alpha'],p.inputs['Alpha'])
 # Each view gets its own UV tile; three upright cards and one horizontal crown.
 for i in range(4):
  if i<3:
   angle=i*math.pi/3;dx,dy=math.cos(angle)*.70,math.sin(angle)*.70;h=view_heights[i];points=[(-dx,-dy,0),(dx,dy,0),(dx,dy,h),(-dx,-dy,h)]
  else:points=[(-.7,-.7,.17),(.7,-.7,.17),(.7,.7,.17),(-.7,.7,.17)]
  mesh=bpy.data.meshes.new('photographic flower card');mesh.from_pydata(points,[],[(0,1,2,3)]);mesh.update();uv=mesh.uv_layers.new(name='UVMap');coords=[(i/4,0),((i+1)/4,0),((i+1)/4,1),(i/4,1)]
  for loop in mesh.loops:uv.data[loop.index].uv=coords[loop.vertex_index]
  o=bpy.data.objects.new('whiteflower photographed view '+str(i),mesh);scene.collection.objects.link(o);mesh.materials.append(material)
 (c.OUT/'sources/whiteflower-atlas-provenance.json').write_text(json.dumps({'status':'NOT_APPROVED','referenceSource':'https://polyhaven.com/a/flower_heliophila','referenceLicense':'CC0','referenceAuthor':'Jenelle van Heerden','production':'Original modeled ivory petals and silver-green groundcover, source baked to RGBA; sparse licensed specimen preserved separately, not falsely described as the dense flower output','views':4,'resolution':[2048,512],'originalVertices':vertices,'originalSceneRetained':True,'authoredFlowerCount':42,'croppedViewHeights':view_heights,'cardTriangles':8,'wind':'Runtime vertex displacement with per-instance phase, alpha tested'},indent=2))
