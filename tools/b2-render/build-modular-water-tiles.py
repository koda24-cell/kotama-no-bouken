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
 rng=random.Random(seed)
 rock=material==stone
 n=rng.choice([11,13,15,17]) if rock else rng.choice([9,11,13,15])
 phase=rng.uniform(-.4,.4)
 boundary=[]
 for i in range(n):
  angle=phase+i*math.tau/n+rng.uniform(-.1,.1)
  boundary.append((math.cos(angle)*sx*.5*rng.uniform(.72,1.19),math.sin(angle)*sy*.5*rng.uniform(.72,1.19)))
 if not rock:
  vs=[]
  for layer in [0,1]:
   for rx,ry in boundary:vs.append((x+rx,y+ry,z-layer*th+rng.uniform(-.003,.003)))
  fs=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
  for i in range(n):fs.append((i,(i+1)%n,(i+1)%n+n,i+n))
  return objmesh(name,vs,fs,material)
 # Dense surface only on stone: four radial rings and 3 angular subdivisions.
 seg=3;rings=4;count=n*seg;vs=[];fs=[]
 high=rng.uniform(.065,.135);phase2=rng.uniform(0,math.tau)
 for ring in range(rings+1):
  radius=ring/rings
  for j in range(count):
   k=j//seg;frac=(j%seg)/seg
   bx=boundary[k][0]*(1-frac)+boundary[(k+1)%n][0]*frac
   by=boundary[k][1]*(1-frac)+boundary[(k+1)%n][1]*frac
   rx=bx*radius;ry=by*radius
   angle=math.atan2(ry,rx)
   ridge=math.sin(angle*3+phase2)*.027+math.cos(angle*7+radius*8)*.015
   jag=rng.uniform(-.016,.021)*(1-.35*radius)
   height=high*(1-radius**1.5)+ridge*(1-.5*radius)+jag
   if ring==rings:height=rng.uniform(-.007,.012)
   vs.append((x+rx,y+ry,z+height+.12*rx-.10*ry))
 for j in range(count):
  rx=vs[rings*count+j][0]-x;ry=vs[rings*count+j][1]-y
  vs.append((x+rx*rng.uniform(.76,.91),y+ry*rng.uniform(.76,.91),z-th-rng.uniform(.016,.04)))
 for ring in range(rings):
  for j in range(count):
   k=(j+1)%count;a=ring*count+j;b=ring*count+k;c=(ring+1)*count+j;d=(ring+1)*count+k
   fs.extend([(a,c,d),(a,d,b)])
 for j in range(count):
  k=(j+1)%count
  fs.extend([(rings*count+j,(rings+1)*count+j,(rings+1)*count+k),(rings*count+j,(rings+1)*count+k,rings*count+k)])
 fs.append(tuple(range((rings+1)*count,(rings+2)*count)))
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
    wobble=.052*math.sin(along*12+bit*2)+.031*math.sin(along*23+bit)+.015*math.sin(along*43+bit*.7)
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
 # Shoreline erosion: broad rock shelves with angular cuts, variable scale.
 for bit,side in [(8,'N'),(2,'E'),(1,'S'),(4,'W')]:
  if mask&bit:continue
  for k in range(4):
   t=rng.uniform(-.43,.43)
   depth=rng.uniform(.27,.43)
   x,y=(t,depth) if side=='N' else ((t,-depth) if side=='S' else ((depth,t) if side=='E' else (-depth,t)))
   sx=rng.uniform(.13,.33);sy=rng.uniform(.11,.30)
   if side in ('N','S'):sx*=1.2
   else:sy*=1.2
   slab('angular fractured shoreline ledge',x,y,.015+rng.uniform(-.008,.012),sx,sy,rng.uniform(.018,.055),stone,mask*911+k*79+bit)
  # Shallow water fingers extend over land; no periodic row of puddles.
  for k in range(5):
   t=rng.uniform(-.44,.44)
   depth=rng.uniform(.36,.51)
   x,y=(t,depth) if side=='N' else ((t,-depth) if side=='S' else ((depth,t) if side=='E' else (-depth,t)))
   sx=rng.uniform(.08,.26);sy=rng.uniform(.04,.16)
   if side in ('E','W'):sx,sy=sy,sx
   slab('erosion water finger above land',x,y,.031+rng.uniform(-.004,.004),sx,sy,.001,puddle,mask*631+k*37+bit)
  # Detached pools extend beyond main water body, into bank fissures.
  for k in range(2):
   t=rng.uniform(-.40,.40)
   depth=rng.uniform(.40,.48)
   x,y=(t,depth) if side=='N' else ((t,-depth) if side=='S' else ((depth,t) if side=='E' else (-depth,t)))
   slab('isolated flooded rock depression',x,y,.030,rng.uniform(.09,.18),rng.uniform(.08,.17),.001,water,mask*1331+k*61+bit)
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
 f.write('v0.7: dense rock-only triangulation and exaggerated uplift; 16 masks. Awaiting approval.\\n')
