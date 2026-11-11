import bpy, math, random, os
from mathutils import Vector
random.seed(42)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
out='/work/render-output/b2-aqueduct';os.makedirs(out,exist_ok=True)
def mat(n,c,metal=0,rough=.65):
 m=bpy.data.materials.new(n);m.diffuse_color=(*c,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;return m
stone=mat('Ancient icy limestone',(.32,.4,.48));seam=mat('Weathered broken masonry',(.16,.23,.29));ice=mat('Deep glacial ice',(.09,.48,.75),.1,.17);frost=mat('Pale frost',(.53,.8,.9),0,.25);water=mat('Dark flowing water',(.04,.19,.29),.1,.12)
def cube(n,loc,dim,m):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=n;o.dimensions=dim;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m);return o
def prism(n,verts,faces,m):
 mesh=bpy.data.meshes.new(n);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(n,mesh);bpy.context.collection.objects.link(o);o.data.materials.append(m);return o
def icefang(x,y,z,L,r):
 vs=[]
 for h,scale,lean in [(0,1,0),(-L*.25,.8,.08),(-L*.7,.27,.3),(-L,.015,.5)]:
  for j in range(6):
   a=j*math.tau/6;vs.append((x+math.cos(a)*r*scale+lean,y+math.sin(a)*r*scale,z+h))
 fs=[(i*6+j,i*6+(j+1)%6,(i+1)*6+(j+1)%6,(i+1)*6+j) for i in range(3) for j in range(6)]
 fs.append(tuple(range(6)));fs.append(tuple(range(18,24)))
 prism('Uneven fused ice fang',vs,fs,ice if L>1 else frost)
# Massive three-bay stone aqueduct with central broken span and two tall buttresses
for cx in (-6,0,6):
 for side in (-1,1):
  x=cx+side*2.55
  for level in range(9):
   cube('Load bearing pier block',(x,0,.5+level*.8),(1.28,2.4,.75),stone if level%4 else seam)
  for z in (1,4,7.6):cube('Pier masonry collar',(x,0,z),(1.6,2.65,.26),seam)
 # segmented half-round stone arch ring
 for j in range(18):
  a=math.pi*j/18;b=math.pi*(j+1)/18
  v=[]
  for y in (-1.12,1.12):
   for radius,t in ((2.45,a),(3.08,a),(3.08,b),(2.45,b)):
    v.append((cx+radius*math.cos(t),y,4.65+radius*math.sin(t)))
  prism('Structural wedge voussoir',v,[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],stone if j%5 else seam)
# Long channel is fractured at right; not a continuous bridge deck
for j in range(22):
 x=-10.7+j*.95
 if 3.1<x<6.9:continue
 h=8.3+random.uniform(-.14,.12)
 cube('Aqueduct waterbed block',(x,0,h),(.91,2.8,.55),stone if j%5 else seam)
 for y in (-1.5,1.5):
  cube('Broken elevated canal parapet',(x,y,h+.65),(.85,.38,.92 if j%6 else .4),stone)
# Broken deck fragments hanging at jagged edges
for x in (2.7,3.1,6.9,7.3):
 for k in range(4):
  o=cube('Fractured bridge edge',(x+random.uniform(-.2,.2),random.uniform(-1,1),8.1-random.uniform(0,.5)),(.45,.55,random.uniform(.4,.85)),seam if k%2 else stone)
  o.rotation_euler[1]=random.uniform(-.35,.35)
# Frozen waterfall descends from broken elevated watercourse in several broad irregular sheets
for k in range(9):
 x=3.0+k*.27;y=random.uniform(-.95,.95);top=8.1-random.uniform(0,.3)
 L=random.uniform(2.1,6.9) if k%3 else random.uniform(.7,2)
 cube('Frozen waterfall rib',(x,y,top-L/2),(.18,.36,L),ice if k%3 else frost)
 icefang(x,y,top-L,L*.26,.18)
# Deep scattered collapsed bridge stones and larger fallen arch fragments
for k in range(85):
 x=random.uniform(-11,11);y=random.uniform(-3.3,3.3)
 o=cube('Embedded collapsed limestone',(x,y,random.uniform(.15,.52)),(random.uniform(.35,1.1),random.uniform(.3,1),random.uniform(.2,.65)),stone if k%4 else seam)
 o.rotation_euler=(random.uniform(-.25,.25),random.uniform(-.4,.4),random.uniform(-.4,.4))
# Dominant huge icicles and clusters; nonuniform silhouettes
for j in range(72):
 x=random.uniform(-9.5,9.5);y=random.choice((-1.3,1.3))+random.uniform(-.2,.2)
 if 3.2<x<6.8:continue
 top=8.25+random.uniform(-.12,.15)
 L=random.uniform(2.6,4.7) if j%17==0 else random.uniform(.15,.5) if j%4==0 else random.uniform(.6,1.8)
 icefang(x,y,top,L,.32 if L>2 else random.uniform(.045,.15))
# Ice accumulation at bases
for k in range(40):
 x=random.choice((-8.5,-2.55,2.55,8.5))+random.uniform(-.6,.6)
 y=random.uniform(-1.4,1.4);L=random.uniform(.4,1.9)
 icefang(x,y,L+.15,L,random.uniform(.1,.3))
# v0.2: Japanese masonry bridge reference: layered spandrel stonework, railings and warm lanterns
bronze=mat('Weathered lantern bronze',(.12,.11,.10),.7,.32)
glow=mat('Amber lantern glass',(1,.48,.13),.1,.22)
glow.use_nodes=True
gp=glow.node_tree.nodes.get('Principled BSDF')
gp.inputs['Emission Color'].default_value=(1,.32,.055,1)
gp.inputs['Emission Strength'].default_value=4.0
for cx in (-6,0,6):
 for side in (-1,1):
  y=side*1.18
  # The arch-ring remains visible: stone courses occupy the spandrels above each arch.
  for row in range(3):
   z=7.55+row*.34
   for k in range(13):
    x=cx-2.85+k*.47+(.23 if row%2 else 0)
    if abs(x-cx)<(1.55-row*.28):continue
    cube('Staggered spandrel masonry',(x,y,z),(.44,.26,.3),stone if (k+row)%5 else seam)
# Continuous pedestrian bridge restoration over the previous broken channel, with fractured seams retained underneath
for j in range(23):
 x=-10.65+j*.95
 cube('Bridge walking surface',(x,0,8.82),(.9,2.42,.18),stone if j%7 else seam)
 for y in (-1.46,1.46):
  cube('Bridge coping stone',(x,y,9.07),(.93,.38,.24),stone)
  for n in range(3):
   cube('Balustrade upright',(x-.31+n*.31,y,9.47),(.13,.24,.63),stone if n!=1 else seam)
  cube('Upper stone handrail',(x,y,9.83),(.94,.37,.22),stone)
# Warm lights attached to bridge piers, contrasting with the cold blue ice
for x in (-8.8,-3.1,2.9,8.6):
 for y in (-1.6,1.6):
  cube('Lantern wall bracket',(x,y,6.65),(.16,.48,.12),bronze)
  cube('Lantern metal cap',(x,y*1.12,6.98),(.46,.42,.15),bronze)
  cube('Lantern luminous amber core',(x,y*1.12,6.67),(.3,.27,.48),glow)
  cube('Lantern lower base',(x,y*1.12,6.39),(.4,.38,.13),bronze)
\ncube('Frozen pool',(0,-2,.035),(23,5,.07),water)
bpy.context.view_layer.update()
tri=0;count=0
for o in bpy.context.scene.objects:
 if o.type=='MESH':
  o.data.calc_loop_triangles();tri+=len(o.data.loop_triangles);count+=1
with open(out+'/mesh_stats.txt','w') as f:f.write('version=v02\\nmesh_objects=%s\\ntriangles=%s\\n'%(count,tri))
print('ICE BRIDGE V02',count,tri)
bpy.ops.wm.save_as_mainfile(filepath=out+'/ancient_ice_bridge_v02.blend')
bpy.ops.export_scene.gltf(filepath=out+'/ruined_aqueduct_v01.glb',export_format='GLB')
world=bpy.context.scene.world or bpy.data.worlds.new('World');bpy.context.scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Color'].default_value=(.03,.06,.12,1)
for loc,power in [((1,-8,15),2600),((-10,4,10),1600)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=9;o.rotation_euler=(Vector((0,0,4))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.context.scene.render.engine='CYCLES';bpy.context.scene.cycles.samples=24
bpy.context.scene.render.resolution_x=1100;bpy.context.scene.render.resolution_y=760;bpy.context.scene.render.resolution_percentage=100
for name,pos in [('front',(0,-31,15)),('side',(30,-2,15)),('angle',(24,-30,17))]:
 bpy.ops.object.camera_add(location=pos);cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,4.5))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=27;bpy.context.scene.camera=cam
 bpy.context.scene.render.filepath=out+'/'+name+'.png';bpy.ops.render.render(write_still=True);bpy.data.objects.remove(cam,do_unlink=True)
