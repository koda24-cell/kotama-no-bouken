import bpy, math, random, os
from mathutils import Vector
random.seed(20261112)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
def mat(name,color,metal=0,rough=.75,trans=0):
 m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1); p.inputs['Metallic'].default_value=metal; p.inputs['Roughness'].default_value=rough
 if trans: p.inputs['Transmission Weight'].default_value=trans; p.inputs['IOR'].default_value=1.31
 return m
stone=[mat('weathered limestone '+str(i),c) for i,c in enumerate(((.22,.27,.30),(.29,.32,.33),(.36,.38,.37),(.27,.32,.36),(.40,.39,.35),(.23,.29,.34)))]
lichen=mat('dark mineral weathering',(.10,.17,.17))
crack=mat('fractured stone fissures',(.09,.12,.14))
ice=mat('clear glacier ice',(.13,.65,.94),.06,.13,.42)
ice2=mat('deep cobalt ice',(.035,.34,.73),.04,.17,.36)
snow=mat('snow deposits',(.76,.88,.96),0,.9)
rune=mat('ancient rune grooves',(.075,.18,.28))
def cube(name,loc,scale,ma,bevel=.05,rot=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc); o=bpy.context.object;o.name=name;o.dimensions=scale;o.rotation_euler[2]=rot;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(ma)
 if bevel:
  b=o.modifiers.new('chipped edges','BEVEL');b.width=bevel;b.segments=2
  o.modifiers.new('weighted normals','WEIGHTED_NORMAL')
 return o
def cylinder(name,loc,r,depth,ma,verts=48):
 bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r,depth=depth,location=loc);o=bpy.context.object;o.name=name;o.data.materials.append(ma)
 b=o.modifiers.new('worn stone rim','BEVEL');b.width=.065;b.segments=2;o.modifiers.new('weighted normals','WEIGHTED_NORMAL');return o
def crystal(name,loc,r,h,ma):
 n=random.choice([5,6,7]); phase=random.random()*6.28; z=loc[2]
 verts=[]
 for k in range(n):
  a=phase+2*math.pi*k/n;verts.append((loc[0]+r*math.cos(a),loc[1]+r*math.sin(a),z))
 for k in range(n):
  a=phase+2*math.pi*k/n;verts.append((loc[0]+r*.85*math.cos(a),loc[1]+r*.85*math.sin(a),z+h*random.uniform(.48,.87)))
 verts.append((loc[0]+random.uniform(-.55,.55)*r,loc[1]+random.uniform(-.55,.55)*r,z+h))
 faces=[tuple(range(n-1,-1,-1))]
 for k in range(n):faces.append((k,(k+1)%n,(k+1)%n+n,k+n));faces.append((k+n,(k+1)%n+n,2*n))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.data.materials.append(ma)
 # secondary splinter growth, deliberately unequal and off-axis
 if h>1.3 and random.random()<.72:
  for j in range(random.randint(1,3)):
   a=random.random()*math.tau
   sx=loc[0]+math.cos(a)*r*random.uniform(.55,1.3)
   sy=loc[1]+math.sin(a)*r*random.uniform(.55,1.3)
   small_h=h*random.uniform(.22,.58)
   # independent irregular shard; recursion prevented by small height threshold in most cases
   if small_h<1.3: crystal(name+' splinter',(sx,sy,z+.08),r*.24,small_h,ma)
def ring_blocks(radius,z,count,thick,width,ma=None):
 for i in range(count):
  a=2*math.pi*i/count; rr=radius+random.uniform(-.06,.06)
  cube('individually jointed circular paving stone',(rr*math.cos(a),rr*math.sin(a),z),(width,thick,random.uniform(.22,.34)),ma or random.choice(stone),.055,a+math.pi/2)
# layered circular plinth, stone slabs with distinct joints
cylinder('broken lower foundation',(0,0,.28),4.55,.55,stone[0],64)
cylinder('raised circular dais',(0,0,.67),3.65,.28,stone[1],64)
ring_blocks(3.85,.61,28,.75,.87)
ring_blocks(2.95,.84,25,.66,.83)
ring_blocks(2.12,.85,17,.5,.72)
cylinder('central ancient sigil disk',(0,0,.94),1.32,.10,stone[2],48)
for i in range(12):
 a=i*math.tau/12
 cube('sunburst carved rune',(math.cos(a)*.85,math.sin(a)*.85,1.001),(.52,.065,.025),rune,.008,a)
for rad in (.48,1.14):
 for i in range(16):
  a=i*math.tau/16
  cube('carved perimeter rune',(math.cos(a)*rad,math.sin(a)*rad,1.002),(.14,.045,.018),rune,.006,a)
# front stairway down towards negative Y, distinct irregular blocks
for row in range(4):
 y=-3.62-row*.60
 z=.63-row*.14
 for i in range(6):
  x=(i-2.5)*.69
  if (row,i) not in ((2,0),(3,4),(1,5)):
   cube('independent worn stair block',(x+random.uniform(-.11,.11),y+random.uniform(-.08,.08),z+random.uniform(-.06,.05)),(.58+random.random()*.12,.51+random.random()*.11,.21+random.random()*.1),random.choice(stone),.035,random.uniform(-.11,.11))
# altar table on rear half
for i in range(3):
 cube('altar masonry footing',(0,1.2,1.16+i*.23),(2.15-i*.08,.88,.22),stone[(i+1)%4],.055)
cube('sacrificial altar carved fascia',(0,.71,1.65),(1.88,.15,.44),stone[1],.045)
for x in (-.57,0,.57):
 cube('diamond rune on altar front',(x,.616,1.68),(.25,.038,.25),rune,.015,math.pi/4)
# freestanding broken columns, staggered height
columns=[(-3.1,1.2,3.65),(-2.7,-1.7,2.55),(3.0,1.15,3.85),(3.1,-1.4,2.35),(-1.65,2.65,3.15),(1.75,2.65,3.45)]
for x,y,h in columns:
 cube('column square foundation',(x,y,1.02),(.94,.94,.42),stone[0],.08)
 cube('column shaft',(x,y,1.27+h*.36),(.57,.59,h*.72),stone[2],.055)
 cube('cracked column capital',(x,y,1.31+h*.72),(.86,.85,.30),stone[1],.07)
 cube('frost cap on column',(x,y,1.5+h*.72),(.77,.78,.09),snow,.035)
# chipped stone corners, dark fracture lines and lichen pockets
for i in range(125):
 a=random.random()*math.tau;rr=random.choice([2.95,3.83,4.4])
 x,y=rr*math.cos(a),rr*math.sin(a)
 cube('weathered mineral patch',(x,y,random.choice([.46,.76,.91])),(.08+random.random()*.25,.09+random.random()*.21,.018),random.choice([lichen,crack]),.005,a)
for i in range(30):
 x=random.uniform(-2.2,2.2);y=-random.uniform(3.5,5.9)
 cube('fallen stair fragment',(x,y,.14),(.12+random.random()*.35,.15+random.random()*.35,.12+random.random()*.18),random.choice(stone),.025,random.uniform(-.7,.7))
# central altar: stepped sculptural shrine, radial glyphs and broken relief panels
for i in range(8):
 a=i*math.tau/8
 cube('raised carved sigil spokes',(.69*math.cos(a),.69*math.sin(a),1.065),(.48,.095,.11),stone[i%len(stone)],.016,a)
for i in range(12):
 a=i*math.tau/12
 cube('stone relief plaques',(1.11*math.cos(a),1.11*math.sin(a),1.065),(.22,.14,.075),stone[(i+2)%len(stone)],.015,a)
cylinder('central pedestal',(0,0,1.20),.34,.43,stone[1],12)
crystal('altar sacred broken core',(0,0,1.40),.29,1.12,ice2)
# one half-ruined arc spanning rear-left pillars
for i in range(10):
 t=i/9; x=-3.05+2.0*t; y=1.35+1.0*t
 z=4.45+.72*math.sin(math.pi*t)
 if i in (7,8,9):continue
 # stone wedges are rotated along arch tangent, not stacked square bricks
 tangent=math.atan2(.72*math.pi*math.cos(math.pi*t),2.0)
 o=cube('radial wedge voussoir',(x,y,z),(.61,.77,.51+random.random()*.14),random.choice(stone),.045,math.atan2(1,2))
 o.rotation_euler[1]=tangent*.35
 cube('stone joint and chipped edge',(x+.07,y-.03,z+.24),(.31,.28,.10),stone[0],.018,math.atan2(1,2))
# tall asymmetric crystal mass behind altar
for i in range(24):
 x=random.gauss(.65,.9); y=random.gauss(2.25,.43)
 crystal('asymmetric rear glacier spire',(x,y,.97),random.uniform(.22,.65),random.uniform(1.2,5.3),ice if i%3 else ice2)
# smaller crystals cluster at uneven outer positions
for center in [(-3.95,.3),(3.7,2.1),(-2.7,3.1),(2.95,-2.9),(-4.15,-2.4)]:
 for i in range(random.randint(4,7)):
  x=center[0]+random.uniform(-.48,.48);y=center[1]+random.uniform(-.45,.45)
  crystal('peripheral ice shards',(x,y,.25),random.uniform(.10,.47),random.uniform(.45,2.65),random.choice([ice,ice2]))
# chipped rubble and thin icy floes
for i in range(45):
 a=random.random()*math.tau;r=random.uniform(3.5,5.0)
 x,y=r*math.cos(a),r*math.sin(a)
 cube('scattered broken stone fragment',(x,y,.19),(.22+random.random()*.48,.22+random.random()*.55,.17+random.random()*.27),random.choice(stone),.035,random.random()*6)
for i in range(25):
 a=random.random()*math.tau;r=random.uniform(3.2,5.2)
 x,y=r*math.cos(a),r*math.sin(a)
 cube('irregular frozen water shelf',(x,y,.075),(.4+random.random()*.75,.3+random.random()*.65,.10),ice2,.04,random.random()*6)
# icicles at arch and columns
for x,y,z in [(-3,1.2,4.25),(-2.6,1.5,4.6),(-2.2,1.7,4.8),(-1.7,2.0,4.95),(-3.1,-1.7,3.25),(3.0,1.15,4.55)]:
 for k in range(3):
  crystal('hanging icicle',(x+random.uniform(-.18,.18),y+random.uniform(-.15,.15),z-random.uniform(.5,1.2)),.07,random.uniform(.55,1.25),ice)
# export ONLY asset geometry
os.makedirs('render-output',exist_ok=True)
bpy.ops.export_scene.gltf(filepath='render-output/b2-frozen-ancient-altar.glb',export_format='GLB')
# studio lighting and 3 views
world=bpy.context.scene.world;world.color=(.12,.16,.23)
def area(name,loc,power,size):
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size
area('large softbox',(-5,-6,9),2200,8);area('cold rim light',(3,5,9),1800,7)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=1152;scene.render.resolution_y=864;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
def render(name,loc,target=(0,0,1.6)):
 bpy.ops.object.camera_add(location=loc);cam=bpy.context.object
 direction=Vector(target)-cam.location;cam.rotation_euler=direction.to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=12.9;scene.camera=cam
 scene.render.filepath='render-output/b2-frozen-ancient-altar-'+name+'.png';bpy.ops.render.render(write_still=True);bpy.data.objects.remove(cam,do_unlink=True)
render('front',(9,-12,7))
render('side',(13,2,6))
render('high-angle',(9,-10,13))
