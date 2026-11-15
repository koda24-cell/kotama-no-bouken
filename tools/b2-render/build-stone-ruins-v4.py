"""Standalone props related to the B2 ancient ice bridge, generated as independent GLBs."""
import bpy, math, os, random, json
from mathutils import Vector
OUT="render-output/b2-stone-ruins-v4"
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
  # Uneven coursed masonry: variable lengths, staggered joints, missing stones,
  # rotated broken fragments and irregular silhouettes rather than repeated cubes.
  def weathered_masonry(label,center,dims,mat):
   x,y,z=center;dx,dy,dz=dims
   # 8-corner stone mesh with independent irregularity per corner.
   verts=[]
   for zz in (-1,1):
    for yy in (-1,1):
     for xx in (-1,1):
      verts.append((xx*dx*.5+rng.uniform(-.035,.035),
                    yy*dy*.5+rng.uniform(-.028,.028),
                    zz*dz*.5+rng.uniform(-.035,.035)))
   faces=[(0,1,3,2),(4,6,7,5),(0,4,5,1),(2,3,7,6),(0,2,6,4),(1,5,7,3)]
   mesh=bpy.data.meshes.new(label);mesh.from_pydata(verts,[],faces);mesh.update()
   obj=bpy.data.objects.new(label,mesh);bpy.context.collection.objects.link(obj)
   obj.location=center;obj.rotation_euler=(rng.uniform(-.035,.035),rng.uniform(-.04,.04),rng.uniform(-.045,.045))
   obj.data.materials.append(mat)
   bevel=obj.modifiers.new('rough eroded edges','BEVEL');bevel.width=rng.uniform(.018,.048);bevel.segments=2
   obj.modifiers.new('weighted stone normals','WEIGHTED_NORMAL')
   return obj
  # Lower foundation of two uneven stone courses, with offset seams.
  for row,z in enumerate((.18,.47)):
   cursor=-1.75+(0.13 if row else 0)
   while cursor<1.62:
    length=min(rng.uniform(.30,.76),1.77-cursor)
    if length<.12:break
    if rng.random()>.11:
     weathered_masonry('foundation row %d weathered stone'%row,
       (cursor+length*.5,rng.uniform(-.045,.045),z+rng.uniform(-.025,.025)),
       (length-.024,rng.uniform(.68,.84),rng.uniform(.25,.31)),
       stone if rng.random()>.32 else dark)
    cursor+=length+rng.uniform(.018,.065)
  # Broken parapet, intentionally incomplete; varied height and stone sizes.
  for row,z in enumerate((.75,1.07)):
   cursor=-1.62+(0.26 if row else 0)
   while cursor<1.48:
    length=min(rng.uniform(.24,.69),1.57-cursor)
    if length<.12:break
    missing=(row==1 and (cursor>-.65 and cursor<.1 or cursor>1.05)) or rng.random()<(.20 if row else .12)
    if not missing:
     weathered_masonry('broken parapet course %d'%row,
       (cursor+length*.5,rng.uniform(-.055,.055),z+rng.uniform(-.055,.035)),
       (length-.025,rng.uniform(.43,.65),rng.uniform(.23,.37)),
       (stone,dark,ice)[rng.randrange(3)])
    cursor+=length+rng.uniform(.02,.075)
  # Distinctively shaped displaced blocks, slabs, sharp chips and granular debris.
  for i in range(12):
   size=rng.uniform(.12,.42)
   weathered_masonry('dislodged block %02d'%i,
     (rng.uniform(-1.75,1.75),rng.uniform(-.8,.85),size*.38),
     (size*rng.uniform(1,1.9),size*rng.uniform(.6,1.3),size*rng.uniform(.55,1.1)),
     stone if i%3 else dark)
  rubble('masonry grit',24,(0,.24,0),1.55)
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
with open(f'{OUT}/manifest.json','w') as f:json.dump({'source':'actual material base colors extracted from ancient_ice_bridge_v04.glb','revision':'V4 irregular staggered stone masonry, variable count and missing courses','source_palette_rgb':palette,'variants':names,'original_glb_modified':False,'vfx':'dust and fog planned; not simulated in static Blender preview','review_required':True},f,indent=2)
