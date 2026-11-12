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
water=mat('Deep blue turquoise water',(.025,.32,.48),.13,.18,.86)
ripple=mat('Soft turquoise water caustic lines',(.15,.76,.91),.23,0,.48)
stone=mat('Cold dark carved stone',(.17,.27,.34),.84)
wet=mat('Waterlogged slate',(.12,.24,.31),.25)
ice=mat('Translucent icy edge',(.39,.76,.89),.24,.05,.8)
frost=mat('Frosted white ice',(.77,.91,.95),.62)
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
 # N=8 E=2 S=1 W=4; four-way edge-matched water.
 n=25;vs=[];fs=[]
 for j in range(n):
  y=-.5+j/(n-1)
  for i in range(n):
   x=-.5+i/(n-1)
   z=.005*math.sin(x*24+y*13)+.003*math.sin(y*33-x*12)
   vs.append((x,y,z))
   if i<n-1 and j<n-1:
    a=j*n+i;fs.append((a,a+1,a+1+n,a+n))
 objmesh('continuous water tile %02d'%mask,vs,fs,water)
 # Land-facing banks are inset to keep the water edges connected only where intended.
 for bit,side in [(8,'N'),(2,'E'),(1,'S'),(4,'W')]:
  if mask&bit:continue
  for i in range(9):
   t=-.47+i*.115
   if side=='N':x,y=t,.435
   elif side=='S':x,y=t,-.435
   elif side=='E':x,y=.435,t
   else:x,y=-.435,t
   sx,sy=(.16,.14) if side in ('N','S') else (.14,.16)
   slab('eroded stone shoreline',x,y,.036,sx,sy,.06,stone,mask*100+i*7+bit)
   if i%2==0:
    slab('interlocking ice lip',x+rng.uniform(-.03,.03),y+rng.uniform(-.03,.03),.055,sx*.9,sy*.8,.025,ice,mask*200+i*11+bit)
   if i%3==0:
    slab('frost deposit',x,y,.064,sx*.6,sy*.65,.015,frost,mask*300+i*13+bit)
  # Thin wet areas between rock and the water; visually blend into shallow puddles.
  for i in range(5):
   t=-.38+i*.19
   x,y=(t,.33) if side=='N' else ((t,-.33) if side=='S' else ((.33,t) if side=='E' else (-.33,t)))
   slab('shallow flooded stone shelf',x,y,.012,.12,.11,.01,wet,mask*400+i*17+bit)
 # Water-only decorations never cross the tile boundary, so adjacent tiles remain seamless.
 for k in range(12):
  x=rng.uniform(-.39,.39);y=rng.uniform(-.39,.39)
  slab('submerged gravel',x,y,-.017,rng.uniform(.025,.09),rng.uniform(.025,.09),.016,stone,mask*1000+k)
 for k in range(7):
  x=rng.uniform(-.35,.35);y=rng.uniform(-.35,.35)
  slab('glint on water surface',x,y,.014,rng.uniform(.045,.13),.008,.001,ripple,mask*2000+k)
 if mask in [0,1,4,8,2,5,10]:
  for k in range(3):
   x=rng.uniform(-.24,.24);y=rng.uniform(-.24,.24)
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
