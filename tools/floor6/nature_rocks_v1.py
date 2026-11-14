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
def rock_part(name,loc,scale,seed,materials):
 rng=random.Random(seed)
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1, location=loc)
 obj=bpy.context.object;obj.name=name
 for v in obj.data.vertices:
  co=v.co;angle=math.atan2(co.y,co.x)
  macro=1+0.18*math.sin(angle*3+seed)+0.12*math.cos(co.z*4+seed*0.7)
  micro=rng.uniform(-0.09,0.09)
  v.co=(co.x*(macro+micro),co.y*(macro+micro),co.z*(1+micro*0.55))
 obj.scale=scale
 for m in materials:obj.data.materials.append(m)
 for poly in obj.data.polygons:poly.material_index=rng.choices(range(len(materials)),weights=[8]+[2]*(len(materials)-1))[0]
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
 # moss clusters embedded into upper rock surface, not floating foliage
 for i in range([7,14,24][idx]):
  theta=rng.uniform(0,math.tau);rr=rng.uniform(.1,.78)
  x=rr*math.cos(theta)*sx;y=rr*math.sin(theta)*sy
  z=sz*.64+sz*math.sqrt(max(.05,1-rr*rr))*.88
  obj=rock_part(asset+'_moss_%02d'%i,(x,y,z),(rng.uniform(.025,.055),rng.uniform(.025,.065),rng.uniform(.006,.013)),idx*100+i,moss)
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
