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
water=mat('Clear glacial turquoise water',(.045,.36,.44),.16,0,.52)
water.use_nodes=True
wp=water.node_tree.nodes.get('Principled BSDF')
wp.inputs['Transmission Weight'].default_value=.34
wp.inputs['IOR'].default_value=1.333
water.surface_render_method='DITHERED'
shallow=mat('Pale mineral shallows',(.16,.38,.39),.88)
deepbed=mat('Deep riverbed teal',(.025,.10,.12),.91)
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
 n=109;vs=[];fs=[];land_vs=[];land_fs=[];bed_vs=[];bed_fs=[];shoal_fs=[]
 for j in range(n):
  y=-.5+j/(n-1)
  for i in range(n):
   x=-.5+i/(n-1);d=coast(x,y)
   z=.0012*math.sin(x*13+y*9)+.0008*math.sin(y*31-x*17)+.0004*math.sin(x*59+y*37)
   vs.append((x,y,z))
   land_vs.append((x,y,.007+.015*max(0,-d)+.004*math.sin(x*29+y*17)))
   depth=.025+.13*min(1,max(0,d)/.23)
   bed_vs.append((x,y,-depth+.006*math.sin(x*17+y*11)+.004*math.sin(y*37-x*21)))
   if i<n-1 and j<n-1:
    a=j*n+i
    corners=[(x,y),(x+1/(n-1),y),(x+1/(n-1),y+1/(n-1)),(x,y+1/(n-1))]
    center=(x+.5/(n-1),y+.5/(n-1))
    if coast(*center)>=0:
     fs.append((a,a+1,a+1+n,a+n))
     if coast(*center)<.085:shoal_fs.append((a,a+1,a+1+n,a+n))
     else:bed_fs.append((a,a+1,a+1+n,a+n))
    else:land_fs.append((a,a+1,a+1+n,a+n))
 objmesh('glacial water surface %02d'%mask,vs,fs,water)
 objmesh('submerged mineral riverbed',bed_vs,bed_fs,deepbed)
 objmesh('visible shallow mineral shelves',bed_vs,shoal_fs,shallow)
 objmesh('single continuous dark slate shoreline',land_vs,land_fs,stone)
 # Fractured shoreline blocks are positioned by aperiodic hashed offsets.
 # Rocks follow the signed shore field instead of regular three-per-edge rows.
 for bit,side in [(8,'N'),(2,'E'),(1,'S'),(4,'W')]:
  if mask&bit:continue
  for k in range(5):
   t=-.43+(k+.28*rng.uniform(-1,1))*.20
   depth=.31+.05*rng.uniform(-1,1)
   x,y=(t,depth) if side=='N' else ((t,-depth) if side=='S' else ((depth,t) if side=='E' else (-depth,t)))
   if coast(x,y)<-.11:continue
   sx=rng.uniform(.14,.29);sy=rng.uniform(.12,.26)
   if side in ('N','S'):sx*=1.3
   else:sy*=1.3
   slab('fractured irregular glacial bank',x,y,.018+rng.uniform(-.007,.008),sx,sy,rng.uniform(.012,.035),stone,mask*911+k*79+bit)
  for k in range(3):
   t=rng.uniform(-.38,.38)
   depth=.405+rng.uniform(-.035,.045)
   x,y=(t,depth) if side=='N' else ((t,-depth) if side=='S' else ((depth,t) if side=='E' else (-depth,t)))
   sx=rng.uniform(.11,.26);sy=rng.uniform(.065,.14)
   slab('irregular waterlogged bank pocket',x,y,.026,sx,sy,.001,puddle,mask*631+k*37+bit)
 # Sparse submerged boulders remain below the water plane, avoiding white bands.
 for k in range(5):
  x=rng.uniform(-.30,.30);y=rng.uniform(-.30,.30)
  if coast(x,y)<.13:continue
  slab('underwater worn boulder',x,y,-.052,rng.uniform(.04,.10),rng.uniform(.035,.09),.026,stone,mask*1009+k)
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
scene.cycles.samples=40
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
 f.write('v0.5: translucent glacial water with shallow/deep riverbed geometry, multi-frequency wave normals, irregular shoreline rocks, 16 masks. Awaiting approval.\\n')
