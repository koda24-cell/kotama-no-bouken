"""Standalone props related to the B2 ancient ice bridge, generated as independent GLBs."""
import bpy, math, os, random, json
from mathutils import Vector
OUT="render-output/b2-bridge-props"
os.makedirs(OUT,exist_ok=True)
rng=random.Random(20261115)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def material(name,color,roughness=.78,metallic=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=roughness;bs.inputs['Metallic'].default_value=metallic
 return m
stone=material('ancient weathered gray stone',(.37,.45,.49))
dark=material('dark fractured stone',(.24,.32,.36))
ice=material('glacial pale blue',(.43,.76,.89),.19)
frost=material('snow on stone',(.76,.87,.89),.65)
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
def crystal(name,loc,depth,radius):
 bpy.ops.mesh.primitive_cone_add(vertices=6,radius1=radius,radius2=0,depth=depth,location=loc);o=bpy.context.object;o.name=name;o.rotation_euler=(rng.uniform(-.25,.25),rng.uniform(-.25,.25),rng.uniform(0,6.28));o.data.materials.append(ice)
def prop(name):
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 if name=='broken_parapet':
  block('bridge edge masonry foundation',(0,0,.24),(3.3,.72,.48),stone)
  for i in range(7):
   x=-1.38+i*.45
   if i in (2,5):continue
   block(f'cracked parapet block {i}',(x,0,.65+rng.uniform(-.04,.04)),(.43,.64,rng.uniform(.35,.6)),stone,rng.uniform(-.09,.09))
  rubble('edge debris',16,(0,.35,0),1.4)
  for i in range(8):crystal('frost along parapet '+str(i),(rng.uniform(-1.4,1.4),rng.uniform(-.32,.32),.52),rng.uniform(.14,.36),.07)
 elif name=='fallen_pillar':
  rubble('column collapse',26,(0,0,0),1.1)
  block('carved column foot',(0,0,.22),(.7,.7,.44),stone,.12)
  bpy.ops.mesh.primitive_cylinder_add(vertices=10,radius=.18,depth=2.8,location=(.65,0,.45),rotation=(0,math.pi/2-.12,.12))
  o=bpy.context.object;o.name='fallen thin column';o.data.materials.append(stone)
  block('broken stone capital',(1.85,.1,.42),(.55,.6,.42),stone,.15)
  for i in range(8):crystal('ice shard '+str(i),(rng.uniform(-1.4,1.4),rng.uniform(-.8,.8),.18),rng.uniform(.25,.55),.09)
 elif name=='embedded_spire':
  rubble('embedded base',30,(0,0,0),.85)
  block('buried square footing',(0,0,.18),(.75,.75,.36),dark,.14)
  bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=.16,depth=3.25,location=(.08,0,1.75))
  o=bpy.context.object;o.name='thin standing column';o.rotation_euler[1]=.12;o.data.materials.append(stone)
  block('broken column top',(.26,0,3.36),(.43,.42,.19),stone,.14)
  for i in range(10):crystal('ice growing through rubble '+str(i),(rng.uniform(-.75,.75),rng.uniform(-.75,.75),.24),rng.uniform(.18,.52),.085)
 elif name=='rubble_ice_scatter':
  rubble('large rubble',44,(0,0,0),1.45)
  for i in range(20):crystal('ice fragment '+str(i),(rng.uniform(-1.3,1.3),rng.uniform(-1.3,1.3),rng.uniform(.14,.32)),rng.uniform(.18,.75),rng.uniform(.055,.13))
 else:raise ValueError(name)
names=['broken_parapet','fallen_pillar','embedded_spire','rubble_ice_scatter']
scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE'
scene.render.resolution_x=960;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast';scene.view_settings.exposure=.6
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.38,.47,.53,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.9
for name in names:
 prop(name)
 meshes=[o for o in scene.objects if o.type=='MESH']
 bpy.ops.object.select_all(action='DESELECT')
 for o in meshes:o.select_set(True)
 bpy.context.view_layer.objects.active=meshes[0]
 bpy.ops.export_scene.gltf(filepath=os.path.abspath(f'{OUT}/{name}.glb'),export_format='GLB',use_selection=True)
 for xyz,power,size in [((5,-5,9),1350,7),((-4,3,7),850,6)]:
  bpy.ops.object.light_add(type='AREA',location=xyz);lamp=bpy.context.object;lamp.data.energy=power;lamp.data.shape='DISK';lamp.data.size=size
 bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO'
 for view,offset in [('front',(0,-8,4)),('side',(8,0,4)),('angle',(6,-7,5.4))]:
  cam.location=offset;cam.rotation_euler=(Vector((0,0,1))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=5.7
  scene.render.filepath=os.path.abspath(f'{OUT}/{name}_{view}.png');bpy.ops.render.render(write_still=True)
with open(f'{OUT}/manifest.json','w') as f:json.dump({'source':'procedural standalone props inspired by ancient ice bridge v04','variants':names,'original_glb_modified':False,'vfx':'not yet implemented','review_required':True},f,indent=2)
