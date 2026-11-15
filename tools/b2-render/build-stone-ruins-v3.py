"""Standalone props related to the B2 ancient ice bridge, generated as independent GLBs."""
import bpy, math, os, random, json
from mathutils import Vector
OUT="render-output/b2-stone-ruins-v3"
os.makedirs(OUT,exist_ok=True)
rng=random.Random(20261115)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def material(name,color,roughness=.78,metallic=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=roughness;bs.inputs['Metallic'].default_value=metallic
 return m
stone=material('weathered sandstone gray',(.43,.39,.32))
dark=material('dark brown fractured stone',(.27,.23,.20))
ice=material('sandstone dust and chipped stone',(.57,.49,.39),.92)
frost=material('pale worn sandstone',(.67,.59,.47),.86)
# Extract the actual source bridge material palette instead of guessing RGB values.
SOURCE_BRIDGE="assets/3d/dungeons/b2_water_source/models/ancient_ice_bridge/ancient_ice_bridge_v04.glb"
bpy.ops.import_scene.gltf(filepath=os.path.abspath(SOURCE_BRIDGE))
source_meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
if not source_meshes: raise RuntimeError('Original bridge GLB contains no mesh')
palette=[]
for obj in source_meshes:
 for mat in obj.data.materials:
  if mat is None: continue
  node=mat.node_tree.nodes.get('Principled BSDF') if mat.use_nodes else None
  rgba=node.inputs['Base Color'].default_value if node else mat.diffuse_color
  rgb=tuple(float(c) for c in rgba[:3])
  if not any(sum(abs(rgb[i]-v[i]) for i in range(3))<.015 for v in palette):palette.append(rgb)
if not palette:raise RuntimeError('Original bridge GLB has no readable materials')
# Keep original source colors, ordered by brightness, across stone variants.
palette.sort(key=lambda c:sum(c[i]*w for i,w in enumerate((.2126,.7152,.0722))))
def apply_color(mat,rgb):
 mat.diffuse_color=(*rgb,1)
 mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*rgb,1)
apply_color(dark,palette[0])
apply_color(stone,palette[len(palette)//2])
apply_color(ice,palette[min(len(palette)-1,(len(palette)*3)//4)])
apply_color(frost,palette[-1])
print('SOURCE_BRIDGE_PALETTE',palette)
for obj in source_meshes:bpy.data.objects.remove(obj,do_unlink=True)
def block(name,loc,dim,mat,angle=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=dim
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.rotation_euler[2]=angle;o.data.materials.append(mat)
 b=o.modifiers.new('uneven chipped corners','BEVEL');b.width=min(dim)*.085;b.segments=1
 o.modifiers.new('corner normals','WEIGHTED_NORMAL')
 return o
def rubble(prefix,n,center=(0,0,0),spread=1):
 for i in range(n):
  x=center[0]+rng.uniform(-spread,spread);y=center[1]+rng.uniform(-spread,spread)
  size=rng.uniform(.10,.36);z=center[2]+size*.35
  bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=(x,y,z))
  o=bpy.context.object;o.name=f'{prefix}_stone_{i:02d}';o.scale=(size*rng.uniform(.8,1.8),size*rng.uniform(.55,1.15),size*rng.uniform(.35,.8));o.rotation_euler=(rng.random(),rng.random(),rng.random()*math.pi);o.data.materials.append(stone if i%3 else dark)
def broken_chip(name,loc,depth,radius):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=loc);o=bpy.context.object;o.name=name;o.scale=(radius*2,radius*1.3,depth*.55);o.rotation_euler=(rng.uniform(-.5,.5),rng.uniform(-.5,.5),rng.uniform(0,6.28));o.data.materials.append(ice)
def prop(name):
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 if name=='broken_parapet':
  block('bridge edge masonry foundation',(0,0,.24),(3.3,.72,.48),stone)
  for i in range(7):
   x=-1.38+i*.45
   if i in (2,5):continue
   block(f'cracked parapet block {i}',(x,0,.65+rng.uniform(-.04,.04)),(.43,.64,rng.uniform(.35,.6)),stone,rng.uniform(-.09,.09))
  rubble('edge debris',16,(0,.35,0),1.4)
  for i in range(8):broken_chip('loose stones along parapet '+str(i),(rng.uniform(-1.4,1.4),rng.uniform(-.32,.32),.52),rng.uniform(.14,.36),.07)
 elif name=='fallen_pillar':
  rubble('column collapse',26,(0,0,0),1.1)
  block('carved column foot',(0,0,.22),(.7,.7,.44),stone,.12)
  bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=.18,depth=2.8,location=(.65,0,.45),rotation=(0,math.pi/2-.12,.12))
  o=bpy.context.object;o.name='fallen thin column';o.data.materials.append(stone)
  block('broken stone capital',(1.85,.1,.42),(.55,.6,.42),stone,.15)
  for i in range(8):broken_chip('broken stone chip '+str(i),(rng.uniform(-1.4,1.4),rng.uniform(-.8,.8),.18),rng.uniform(.25,.55),.09)
 elif name=='embedded_spire':
  rubble('embedded base',30,(0,0,0),.85)
  block('buried square footing',(0,0,.18),(.75,.75,.36),dark,.14)
  bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=.16,depth=3.25,location=(.08,0,1.75))
  o=bpy.context.object;o.name='thin standing column';o.rotation_euler[1]=.12;o.data.materials.append(stone)
  block('broken column top',(.26,0,3.36),(.43,.42,.19),stone,.14)
  for i in range(10):broken_chip('stone fragments at base '+str(i),(rng.uniform(-.75,.75),rng.uniform(-.75,.75),.24),rng.uniform(.18,.52),.085)
 elif name=='rubble_ice_scatter':
  rubble('large rubble',44,(0,0,0),1.45)
  for i in range(20):broken_chip('small chipped gravel '+str(i),(rng.uniform(-1.3,1.3),rng.uniform(-1.3,1.3),rng.uniform(.14,.32)),rng.uniform(.18,.75),rng.uniform(.055,.13))
 else:raise ValueError(name)
names=['broken_parapet','fallen_pillar','embedded_spire','rubble_ice_scatter']
scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE'
scene.render.resolution_x=960;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast';scene.view_settings.exposure=.15
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.35,.36,.38,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.9
for name in names:
 prop(name)
 meshes=[o for o in scene.objects if o.type=='MESH']
 bpy.ops.object.select_all(action='DESELECT')
 for o in meshes:o.select_set(True)
 bpy.context.view_layer.objects.active=meshes[0]
 bpy.ops.export_scene.gltf(filepath=os.path.abspath(f'{OUT}/{name}.glb'),export_format='GLB',use_selection=True)
 for xyz,power,size in [((5,-5,9),900,7),((-4,3,7),550,6)]:
  bpy.ops.object.light_add(type='AREA',location=xyz);lamp=bpy.context.object;lamp.data.energy=power;lamp.data.shape='DISK';lamp.data.size=size
 bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO'
 for view,offset in [('front',(0,-8,4)),('side',(8,0,4)),('angle',(6,-7,5.4))]:
  cam.location=offset;cam.rotation_euler=(Vector((0,0,1))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=7.3
  scene.render.filepath=os.path.abspath(f'{OUT}/{name}_{view}.png');bpy.ops.render.render(write_still=True)
with open(f'{OUT}/manifest.json','w') as f:json.dump({'source':'actual material base colors extracted from ancient_ice_bridge_v04.glb','source_palette_rgb':palette,'variants':names,'original_glb_modified':False,'vfx':'dust and fog planned; not simulated in static Blender preview','review_required':True},f,indent=2)
