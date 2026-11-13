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
water=mat('Deep blue turquoise water v04',(.009,.105,.17),.32,0,1)
ripple=mat('Soft turquoise water caustic lines',(.07,.32,.41),.22,0,.10)
stone=mat('Cold dark carved stone',(.085,.13,.17),.92)
wet=mat('Waterlogged slate',(.12,.24,.31),.25)
ice=mat('Translucent icy edge',(.25,.51,.60),.47,0,1)
frost=mat('Frosted white ice',(.46,.69,.76),.62)
puddle=mat('Thin water film on weathered stone',(.02,.12,.16),.46,0,1)
def objmesh(name,vs,fs,material):
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(vs,[],fs);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.data.materials.append(material);return o
def slab(name,x,y,z,sx,sy,th,material,seed):
 rng=random.Random(seed);n=40;vs=[]
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
    wobble=.047*math.sin(along*12+bit*2)+.024*math.sin(along*23+bit)+.009*math.sin(along*43+bit*.7)
    limits.append(.32-coord+wobble)
  return min(limits) if limits else 1.
 n=109;vs=[];fs=[];land_vs=[];land_fs=[]
 for j in range(n):
  y=-.5+j/(n-1)
  for i in range(n):
   x=-.5+i/(n-1);d=coast(x,y)
   z=.0015*math.sin(x*21+y*13)+.001*math.sin(y*26-x*11)
   vs.append((x,y,z))
   land_vs.append((x,y,.007+.015*max(0,-d)+.004*math.sin(x*29+y*17)))
   if i<n-1 and j<n-1:
    a=j*n+i
    corners=[(x,y),(x+1/(n-1),y),(x+1/(n-1),y+1/(n-1)),(x,y+1/(n-1))]
    center=(x+.5/(n-1),y+.5/(n-1))
    if coast(*center)>=0:fs.append((a,a+1,a+1+n,a+n))
    else:land_fs.append((a,a+1,a+1+n,a+n))
 objmesh('deep water cut to shoreline %02d'%mask,vs,fs,water)
 objmesh('single continuous dark slate shoreline',land_vs,land_fs,stone)
 # Distinct larger, asymmetric rock shelves; thin water patches stay inside tile.
 for bit,side in [(8,'N'),(2,'E'),(1,'S'),(4,'W')]:
  if mask&bit:continue
  for i in range(3):
   t=-.34+i*.34
   x,y=(t,.40) if side=='N' else ((t,-.40) if side=='S' else ((.40,t) if side=='E' else (-.40,t)))
   sx,sy=(.32,.16) if side in ('N','S') else (.16,.32)
   slab('large fractured bank shelf',x,y,.024,sx,sy,.023,stone,mask*123+i*31+bit)
   if i!=1:
    slab('irregular shallow water in rock fissure',x,y,.037,sx*.63,sy*.65,.002,puddle,mask*173+i*37+bit)
  # Broad wet fringe, not regularly spaced pebbles.
  for i in range(2):
   t=-.23+i*.46
   x,y=(t,.455) if side=='N' else ((t,-.455) if side=='S' else ((.455,t) if side=='E' else (-.455,t)))
   sx,sy=(.30,.07) if side in ('N','S') else (.07,.30)
   slab('receding thin puddle on shore',x,y,.031,sx,sy,.001,puddle,mask*219+i*41+bit)
 # Water-only decorations never cross the tile boundary, so adjacent tiles remain seamless.
 for k in range(9):
  x=rng.uniform(-.29,.29);y=rng.uniform(-.29,.29)
  if coast(x,y)<.04:continue
  slab('submerged gravel',x,y,-.017,rng.uniform(.025,.09),rng.uniform(.025,.09),.016,stone,mask*1000+k)
 # No white overlay glints or floating ice; avoid distracting striped speculars.
 objects=[o for o in bpy.context.scene.objects if o not in start]
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 bpy.ops.export_scene.gltf(filepath=OUT+'/water_tile_%02d.glb'%mask,export_format='GLB',use_selection=True)
 for o in objects:
  o.location.x+=(mask%4)*1.32-1.98;o.location.y+=(mask//4)*1.32-1.98
 return objects
for mask in range(16):
 tile(mask)
world=bpy.context.scene.world or bpy.data.worlds.new('Blue cavern')
bpy.context.scene.world=world
world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.06,.12,.19,1)
for loc,power,size in [((0,-5,9),750,7),((-4,4,7),420,6)]:
 bpy.ops.object.light_add(type='AREA',location=loc)
 o=bpy.context.object
 o.data.energy=power
 o.data.size=size
 o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.samples=36
scene.view_settings.view_transform='Standard'
scene.view_settings.look='Medium High Contrast'
scene.view_settings.exposure=-0.5
scene.render.resolution_x=1300
scene.render.resolution_y=1100
scene.render.resolution_percentage=100
for name,pos,scale in [('top',(0,0,12),7.3),('angle',(7,-9,10),8.2),('side',(0,-12,5),8.4)]:
 bpy.ops.object.camera_add(location=pos)
 cam=bpy.context.object
 cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler()
 cam.data.type='ORTHO'
 cam.data.ortho_scale=scale
 scene.camera=cam
 scene.render.filepath=OUT+'/'+name+'.png'
 bpy.ops.render.render(write_still=True)
 bpy.data.objects.remove(cam,do_unlink=True)
with open(OUT+'/README.txt','w') as f:
 f.write('v0.4: matte opaque dark turquoise water; large broken slate banks, broad shallow puddles; no white glints; 109x109 water grid; 16 tiles N8 E2 S1 W4. Awaiting approval.\\n')
