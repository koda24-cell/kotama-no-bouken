import bpy,math,random,os
from mathutils import Vector
OUT='/work/render-output/b2-water-tiles'
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(name,col,rough=.6,metal=0,alpha=1):
 m=bpy.data.materials.new(name);m.diffuse_color=(*col,alpha);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*col,alpha);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;p.inputs['Alpha'].default_value=alpha
 if alpha<1:m.surface_render_method='DITHERED'
 return m
water=mat('Deep blue turquoise water',(.018,.19,.31),.075,.12,.95)
ripple=mat('Soft turquoise water caustic lines',(.13,.56,.69),.21,0,.19)
stone=mat('Cold dark carved stone',(.17,.27,.34),.84)
wet=mat('Waterlogged slate',(.12,.24,.31),.25)
ice=mat('Translucent icy edge',(.39,.76,.89),.24,.05,.8)
frost=mat('Frosted white ice',(.62,.81,.87),.62)
puddle=mat('Thin water film on weathered stone',(.045,.24,.31),.18,.06,.58)
def objmesh(name,vs,fs,material):
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(vs,[],fs);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.data.materials.append(material);return o
def slab(name,x,y,z,sx,sy,th,material,seed):
 rng=random.Random(seed);n=8;vs=[]
 for layer in [0,1]:
  for i in range(n):
   a=i*math.tau/n;rx=math.cos(a)*sx*.5*rng.uniform(.86,1.12);ry=math.sin(a)*sy*.5*rng.uniform(.86,1.12)
   vs.append((x+rx,y+ry,z-layer*th+rng.uniform(-.008,.008)))
 fs=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
 for i in range(n):fs.append((i,(i+1)%n,(i+1)%n+n,i+n))
 return objmesh(name,vs,fs,material)
def tile(mask):
 rng=random.Random(9000+mask);start=set(bpy.context.scene.objects)
 # Connected-edge bitmask N=8 E=2 S=1 W=4. 2D shoreline field
 # is shared by water, submerged stone and wet-shelf geometry.
 def coast(x,y):
  # Signed water occupancy; positive inside the water, negative on land.
  limits=[]
  for bit,coord in [(8,y),(1,-y),(2,x),(4,-x)]:
   if not mask&bit:
    along=x if bit in (8,1) else y
    wobble=.025*math.sin(along*17+bit*2)+.013*math.sin(along*29+bit)
    limits.append(.32-coord+wobble)
  return min(limits) if limits else 1.
 n=49;vs=[];fs=[];land_vs=[];land_fs=[]
 for j in range(n):
  y=-.5+j/(n-1)
  for i in range(n):
   x=-.5+i/(n-1);d=coast(x,y)
   z=.003*math.sin(x*21+y*13)+.002*math.sin(y*26-x*11)
   vs.append((x,y,z))
   land_vs.append((x,y,.012+.014*max(0,-d)+.004*math.sin(x*29+y*17)))
   if i<n-1 and j<n-1:
    a=j*n+i
    corners=[(x,y),(x+1/(n-1),y),(x+1/(n-1),y+1/(n-1)),(x,y+1/(n-1))]
    center=(x+.5/(n-1),y+.5/(n-1))
    if coast(*center)>=0:fs.append((a,a+1,a+1+n,a+n))
    else:land_fs.append((a,a+1,a+1+n,a+n))
 objmesh('deep water cut to shoreline %02d'%mask,vs,fs,water)
 objmesh('single continuous dark slate shoreline',land_vs,land_fs,stone)
 # Wet stone and shallow puddles flow onto land without adding a pebble fence.
 for bit,side in [(8,'N'),(2,'E'),(1,'S'),(4,'W')]:
  if mask&bit:continue
  for i in range(6):
   t=-.4+i*.16
   x,y=(t,.39) if side=='N' else ((t,-.39) if side=='S' else ((.39,t) if side=='E' else (-.39,t)))
   slab('irregular wet stone film',x,y,.031,.17,.14,.008,puddle,mask*100+i*7+bit)
   if i%3==0:
    slab('frost embedded in bank',x,y,.038,.12,.10,.012,ice,mask*200+i*11+bit)
  for i in range(3):
   t=-.29+i*.28
   x,y=(t,.46) if side=='N' else ((t,-.46) if side=='S' else ((.46,t) if side=='E' else (-.46,t)))
   slab('thin puddle extending into dry ground',x,y,.037,.19,.08,.004,puddle,mask*300+i*13+bit)
 # Water-only decorations never cross the tile boundary, so adjacent tiles remain seamless.
 for k in range(9):
  x=rng.uniform(-.29,.29);y=rng.uniform(-.29,.29)
  if coast(x,y)<.04:continue
  slab('submerged gravel',x,y,-.017,rng.uniform(.025,.09),rng.uniform(.025,.09),.016,stone,mask*1000+k)
 for k in range(4):
  x=rng.uniform(-.28,.28);y=rng.uniform(-.28,.28)
  if coast(x,y)<.08:continue
  slab('glint on water surface',x,y,.014,rng.uniform(.045,.13),.008,.001,ripple,mask*2000+k)
 if mask in [0,1,4,8,2,5,10]:
  for k in range(3):
   x=rng.uniform(-.24,.24);y=rng.uniform(-.24,.24)
   if coast(x,y)<.11:continue
   slab('floating broken ice',x,y,.027,rng.uniform(.09,.2),rng.uniform(.08,.18),.035,ice,mask*3000+k)
 objects=[o for o in bpy.context.scene.objects if o not in start]
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 bpy.ops.export_scene.gltf(filepath=OUT+'/water_tile_%02d.glb'%mask,export_format='GLB',use_selection=True)
 for o in objects:
  o.location.x+=(mask%4)*1.32-1.98;o.location.y+=(mask//4)*1.32-1.98
 return objects
for mask in range(16):tile(mask)
# A compact, repeatable three-view review sheet.
world=bpy.context.scene.world or bpy.data.worlds.new('Blue cavern');bpy.context.scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Color'].default_value=(.06,.12,.19,1)
for loc,power,size in [((0,-5,9),1600,7),((-4,4,7),950,6)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.size=size;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=1300;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
for name,pos,scale in [('top',(0,0,12),7.3),('angle',(7,-9,10),8.2),('side',(0,-12,5),8.4)]:
 bpy.ops.object.camera_add(location=pos);cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=scale;scene.camera=cam
 scene.render.filepath=OUT+'/'+name+'.png';bpy.ops.render.render(write_still=True);bpy.data.objects.remove(cam,do_unlink=True)
with open(OUT+'/README.txt','w') as f:f.write('16 water tile GLBs. Bitmask N=8 E=2 S=1 W=4. 1x1 tile, centered at origin; shorelines on disconnected edges. Geometry only; not integrated into game.\\n')
for mask in range(16):tile(mask)
# A compact, repeatable three-view review sheet.
world=bpy.context.scene.world or bpy.data.worlds.new('Blue cavern');bpy.context.scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Color'].default_value=(.06,.12,.19,1)
for loc,power,size in [((0,-5,9),1600,7),((-4,4,7),950,6)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.size=size;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=1300;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
for name,pos,scale in [('top',(0,0,12),7.3),('angle',(7,-9,10),8.2),('side',(0,-12,5),8.4)]:
 bpy.ops.object.camera_add(location=pos);cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=scale;scene.camera=cam
 scene.render.filepath=OUT+'/'+name+'.png';bpy.ops.render.render(write_still=True);bpy.data.objects.remove(cam,do_unlink=True)
with open(OUT+'/README.txt','w') as f:f.write('16 water tile GLBs. Bitmask N=8 E=2 S=1 W=4. 1x1 tile, centered at origin; shorelines on disconnected edges. Geometry only; not integrated into game.\\n')
