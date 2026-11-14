import bpy, math, random, os, json, hashlib
from mathutils import Vector
from pathlib import Path

OUT = Path('render-output/floor6/nature')
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.context.scene.render.engine = 'BLENDER_EEVEE'
bpy.context.scene.render.resolution_x=960
bpy.context.scene.render.resolution_y=960
bpy.context.scene.render.resolution_percentage=100
bpy.context.scene.render.image_settings.file_format='PNG'
bpy.context.scene.view_settings.view_transform='Standard'
bpy.context.scene.world.color=(0.18,0.2,0.21)
def mat(name,color,rough=0.95):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough
 return m
stone=[mat('granite_gray',(0.26,0.29,0.27)),mat('slate_shadow',(0.17,0.20,0.19)),mat('warm_rock',(0.32,0.31,0.26))]
moss=[mat('moss_sage',(0.23,0.36,0.18)),mat('moss_olive',(0.19,0.29,0.13))]
# Deterministic baked image textures: image nodes are portable in exported GLB.
def textured_material(material, base, seed):
 rng=random.Random(seed)
 image=bpy.data.images.new(material.name+'_albedo',width=128,height=128,alpha=True)
 pixels=[]
 for y in range(128):
  for x in range(128):
   coarse=math.sin(x*.13+seed)*math.cos(y*.17-seed)*.065
   grain=rng.uniform(-.035,.035)
   v=max(.55,min(1.4,1+coarse+grain))
   pixels.extend([min(1,base[0]*v),min(1,base[1]*v),min(1,base[2]*v),1])
 image.pixels[:]=pixels
 image.pack()
 nodes=material.node_tree.nodes
 tex=nodes.new('ShaderNodeTexImage');tex.image=image
 bsdf=nodes.get('Principled BSDF')
 material.node_tree.links.new(tex.outputs['Color'],bsdf.inputs['Base Color'])
for i,m in enumerate(stone): textured_material(m,[(.30,.32,.30),(.22,.24,.23),(.34,.31,.27)][i],110+i)
for i,m in enumerate(moss): textured_material(m,[(.20,.32,.16),(.17,.26,.12)][i],210+i)
def add_uv(obj):
 bpy.ops.object.select_all(action='DESELECT')
 obj.select_set(True);bpy.context.view_layer.objects.active=obj
 bpy.ops.object.mode_set(mode='EDIT')
 bpy.ops.mesh.select_all(action='SELECT')
 bpy.ops.uv.smart_project(island_margin=.02)
 bpy.ops.object.mode_set(mode='OBJECT')
def rock_part(name,loc,scale,seed,materials):
 rng=random.Random(seed)
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1, location=loc)
 obj=bpy.context.object;obj.name=name
 for v in obj.data.vertices:
  co=v.co;angle=math.atan2(co.y,co.x)
  macro=1+0.30*math.sin(angle*2.7+seed)+0.19*math.cos(co.z*3.8+seed*0.7)\n  # A directional fracture trench with depth on one face\n  trench=math.exp(-((co.x*.8+co.y*.6-.12)**2)/.009) * max(0,1-abs(co.z)*.65)\n  macro-=.25*trench
  micro=rng.uniform(-0.15,0.15)
  v.co=(co.x*(macro+micro),co.y*(macro+micro),co.z*(1+micro*0.55))
 obj.scale=scale
 for m in materials:obj.data.materials.append(m)
 for poly in obj.data.polygons:poly.material_index=rng.choices(range(len(materials)),weights=[8]+[2]*(len(materials)-1))[0]
 return obj
def angular_shard(name, location, radius, height, seed):
 rng=random.Random(seed)
 bpy.ops.mesh.primitive_cone_add(vertices=5, radius1=radius, radius2=radius*.22, depth=height, location=location)
 obj=bpy.context.object;obj.name=name
 obj.rotation_euler=(rng.uniform(-.5,.5),rng.uniform(-.5,.5),rng.uniform(-3.14,3.14))
 obj.data.materials.append(stone[seed%len(stone)])
 return obj
def surface_patch(name,center,sx,sy,seed):
 rng=random.Random(seed)
 verts=[]
 for i in range(7):
  a=math.tau*i/7
  verts.append((center[0]+math.cos(a)*sx*rng.uniform(.7,1.15),center[1]+math.sin(a)*sy*rng.uniform(.7,1.15),center[2]+rng.uniform(-.003,.003)))
 verts.append(center)
 mesh=bpy.data.meshes.new(name+'_mesh');mesh.from_pydata(verts,[],[(7,i,(i+1)%7) for i in range(7)]);mesh.update()
 obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
 obj.data.materials.append(moss[seed%len(moss)])
 return obj
def make_asset(asset,idx):
 rng=random.Random(711+idx)
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 sizes=[(.22,.19,.14),(.32,.25,.23),(.39,.32,.35)]
 sx,sy,sz=sizes[idx]
 pieces=[rock_part(asset+'_core',(0,0,sz*.64),(sx,sy,sz),idx+9,stone)]
 if idx>0:
  pieces.append(rock_part(asset+'_fracture',(-sx*.38,sy*.23,sz*.66),(sx*.48,sy*.63,sz*.76),idx+22,stone))
 if idx==2:
  pieces.append(rock_part(asset+'_shoulder',(sx*.48,-sy*.27,sz*.52),(sx*.47,sy*.56,sz*.59),idx+33,stone))
 # Extra angular fractures and sharp rock protrusions; original core remains intact
 for i in range([3,6,10][idx]):
  a=rng.uniform(0,math.tau);rr=rng.uniform(.45,.87)
  x=math.cos(a)*sx*rr;y=math.sin(a)*sy*rr
  pieces.append(angular_shard(asset+'_shard_%02d'%i,(x,y,sz*.64+sz*.4),rng.uniform(.035,.09),rng.uniform(.10,.22)*(idx+1)/2,idx*40+i))
 # Flat irregular moss patches, conforming approximately to the upper rock surface
 for i in range([5,9,14][idx]):
  a=rng.uniform(0,math.tau);rr=rng.uniform(.08,.68)
  x=math.cos(a)*sx*rr;y=math.sin(a)*sy*rr
  z=sz*.64+sz*math.sqrt(max(.05,1-rr*rr))*.90
  pieces.append(surface_patch(asset+'_moss_patch_%02d'%i,(x,y,z),sx*rng.uniform(.055,.12),sy*rng.uniform(.06,.15),idx*80+i))
 # moss clusters embedded into upper rock surface, not floating foliage
 for i in range([2,3,4][idx]):
  theta=rng.uniform(0,math.tau);rr=rng.uniform(.1,.78)
  x=rr*math.cos(theta)*sx;y=rr*math.sin(theta)*sy
  z=sz*.64+sz*math.sqrt(max(.05,1-rr*rr))*.88
  obj=rock_part(asset+'_moss_%02d'%i,(x,y,z),(rng.uniform(.014,.028),rng.uniform(.014,.032),rng.uniform(.002,.005)),idx*100+i,moss)
  pieces.append(obj)
 bpy.ops.object.select_all(action='DESELECT')
 for obj in pieces:obj.select_set(True)
 bpy.context.view_layer.objects.active=pieces[0]
 # glb export only rock geometry
 target=OUT/asset;target.mkdir(parents=True,exist_ok=True)
 bpy.ops.export_scene.gltf(filepath=str((target/(asset+'.glb')).resolve()),export_format='GLB',use_selection=True)
 bpy.ops.object.select_all(action='DESELECT')
 # camera and lighting only for PNG review
 light_data=bpy.data.lights.new('softbox','AREA');light=bpy.data.objects.new('softbox',light_data);bpy.context.collection.objects.link(light);light.location=(2,-3,5);light_data.energy=480;light_data.size=4
 world=bpy.context.scene.world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Color'].default_value=(0.35,0.39,0.43,1)
 def camera_at(name,position):
  cam_data=bpy.data.cameras.new('review_'+name);cam=bpy.data.objects.new('review_'+name,cam_data);bpy.context.collection.objects.link(cam)
  target_pos=Vector((0,0,sz*.6));cam.location=position;direction=target_pos-cam.location;cam.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
  cam_data.type='ORTHO';cam_data.ortho_scale=1.5
  bpy.context.scene.camera=cam
  bpy.context.scene.render.filepath=str((target/(name+'.png')).resolve());bpy.ops.render.render(write_still=True)
 for name,pos in [('front',(0,-2,1.0)),('side',(2,0,1.0)),('angle',(1.5,-2,1.6)),('top',(0,-0.01,3))]:
  camera_at(name,pos)
 files=[]
 for p in sorted(target.iterdir()):
  if p.suffix in ('.glb','.png'):
   files.append(dict(name=p.name,bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
 (target/'manifest.json').write_text(json.dumps(dict(asset_id=asset,status='preview_unapproved',tile_size=[1,1],source='tools/floor6/nature_rocks_v1.py',files=files),indent=2)+'\n')
 print('F6_ROCK_DONE',asset)
for idx,name in enumerate(('rock_small','rock_medium','rock_large')):make_asset(name,idx)
