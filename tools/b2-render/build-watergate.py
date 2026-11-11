import bpy, math, random, os, sys
from mathutils import Vector
random.seed(24)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
out='/work/render-output/b2-watergate'; os.makedirs(out,exist_ok=True)
def mat(name,color,metal=0,rough=.7):
 m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 return m
stone=mat('Cold worn limestone',(.34,.42,.51));dark=mat('Weathered seams',(.17,.23,.3));iron=mat('Oxidized iron',(.16,.21,.26),.75);ice=mat('Frozen cyan crystal',(.08,.58,.86),.15,.16);water=mat('Icy water',(.06,.26,.43),.3,.12)
def cube(name,loc,scale,material):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material);return o
def beam(name,a,b,r,material,verts=12):
 a,b=Vector(a),Vector(b);d=b-a
 bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r,depth=d.length,location=(a+b)/2);o=bpy.context.object;o.name=name;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();o.data.materials.append(material);return o
for s in [-1,1]:
 x=s*4.5
 for j in range(9):cube('Pillar masonry %s %s'%(s,j),(x,0,.5+j*.8),(1.65,1.65,.76),stone if j%3 else dark)
 for h in [1.2,3.6,6.4,7.65]:cube('Pillar cornice',(x,0,h),(2,1.95,.22),dark)
 for k in range(9):cube('Broken parapet',(s*(5.6+k*.31),.35,random.uniform(2.4,4.8)),(.36,1.3,random.uniform(.4,1.2)),stone)
for i in range(28):
 a=math.pi*i/28;b=math.pi*(i+1)/28
 v=[]
 for y in [-.82,.82]:
  for r,t in [(3.05,a),(3.95,a),(3.95,b),(3.05,b)]:v.append((r*math.cos(t),y,4.0+r*math.sin(t)))
 faces=[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)]
 mesh=bpy.data.meshes.new('arch stone');mesh.from_pydata(v,[],faces);mesh.update();o=bpy.data.objects.new('Segmented arch voussoir %02d'%i,mesh);bpy.context.collection.objects.link(o);o.data.materials.append(stone if i%4 else dark)
for i in range(16):
 x=-2.85+i*.38;top=4+math.sqrt(max(0,3**2-x*x))-.55
 beam('Portcullis bar %02d'%i,(x,-.95,.45),(x,-.95,top),.073,iron)
for z in [1.3,2.5,3.7,4.9]:cube('Gate horizontal brace',(0,-1,z),(5.8,.18,.18),iron)
for name,x,y,z,r in [('Main drive',0,-1.45,5.1,1.12),('Side drive',-6.2,-1.25,3.2,1.38)]:
 beam(name+' axle',(x,y-.25,z),(x,y+.25,z),.24,iron)
 for i in range(16):
  a=i*2*math.pi/16;b=(i+1)*2*math.pi/16
  beam(name+' spoke',(x,y,z),(x+r*math.cos(a),y,z+r*math.sin(a)),.085,iron)
  beam(name+' rim',(x+r*math.cos(a),y,z+r*math.sin(a)),(x+r*math.cos(b),y,z+r*math.sin(b)),.13,iron)
  cube(name+' tooth',(x+(r+.1)*math.cos(a),y,z+(r+.1)*math.sin(a)),(.21,.35,.21),dark)
for s in [-1,1]:
 for i in range(10):
  a=(s*2.5,-1.2,6.5-i*.35);b=(s*2.5+math.sin(i*.6)*.11,-1.2,6.15-i*.35)
  beam('Suspension chain',a,b,.055,iron,8)
for i in range(22):
 x=-8+i*.75
 cube('Broken canal stone',(x,-2.5,random.uniform(.05,.22)),(.69,2.2,.35),stone if i%4 else dark)
cube('Water channel',(0,-2.6,.05),(15,3.8,.08),water)
for i in range(55):
 x=random.choice([-1,1])*random.uniform(4.8,8.6);y=random.uniform(-2.9,2)
 cube('Collapsed masonry',(x,y,random.uniform(.12,.42)),(random.uniform(.2,.8),random.uniform(.25,.8),random.uniform(.2,.6)),stone)
for i in range(65):
 x=random.choice([-1,1])*random.uniform(4.6,8.3);y=random.uniform(-3.0,1.7)
 bpy.ops.mesh.primitive_cone_add(vertices=5,radius1=random.uniform(.1,.32),radius2=0,depth=random.uniform(.35,1.7),location=(x,y,.8));bpy.context.object.name='Blue ice crystal';bpy.context.object.data.materials.append(ice)
for i in range(34):
 a=random.uniform(.15,math.pi-.15);x=3.5*math.cos(a);z=4+3.5*math.sin(a)
 bpy.ops.mesh.primitive_cone_add(vertices=7,radius1=0,radius2=random.uniform(.07,.16),depth=random.uniform(.3,1.2),location=(x,-.85,z-.4));bpy.context.object.name='Arch hanging icicle';bpy.context.object.data.materials.append(ice)

# v03: Structural additions retained on top of v02 geometry
bronze=mat('Ancient bronze mechanical fittings',(.32,.23,.13),.7,.42)
frost=mat('Layered frost deposits',(.62,.83,.92),.05,.32)
def ring(name,x,y,z,r,thickness,material):
 for j in range(32):
  a=2*math.pi*j/32;b=2*math.pi*(j+1)/32
  beam(name,(x+r*math.cos(a),y,z+r*math.sin(a)),(x+r*math.cos(b),y,z+r*math.sin(b)),thickness,material,10)
# Mechanism gains layered wheel rims, shaft bearings, bolted plates and actual teeth
for name,x,y,z,r in [('Main drive',0,-1.45,5.1,1.12),('Side drive',-6.2,-1.25,3.2,1.38)]:
 for depth,rad in [(-.17,r*.78),(.19,r*.92)]:
  ring(name+' layered rim',x,y+depth,z,rad,.085,bronze)
 for offset in [-.3,.3]:
  beam(name+' shaft collar',(x,y+offset-.06,z),(x,y+offset+.06,z),.34,bronze,20)
 for j in range(16):
  a=2*math.pi*j/16
  bx=x+r*math.cos(a);bz=z+r*math.sin(a)
  beam(name+' face rivet',(bx,y-.23,bz),(bx,y-.32,bz),.045,bronze,8)
  beam(name+' tooth depth',(bx,y-.19,bz),(bx,y+.2,bz),.11,iron,8)
# Reinforced gate: hinges, pointed iron bar ends and bracing plates
for i in range(16):
 x=-2.85+i*.38
 cube('Gate iron spike', (x,-.96,.38),(.19,.19,.26),bronze)
for z in [1.3,2.5,3.7,4.9]:
 for x in [-2.4,-1.2,0,1.2,2.4]:
  beam('Gate brace rivet',(x,-1.13,z),(x,-1.23,z),.075,bronze,10)
for s in [-1,1]:
 for z in [1.1,3.3,5.8]:
  cube('Stone wall buttress',(s*5.6,.55,z),(1.05,1.65,.6),stone)
  cube('Recessed carved stone panel',(s*4.5,-.91,z),(.82,.11,.65),dark)
  for k in range(3):
   cube('Panel relief grooves',(s*4.5+(k-1)*.21,-.99,z),(.045,.07,.48),frost)
# Repair floating ruins by linking outer pieces to structural retaining courses
for side in [-1,1]:
 for j in range(9):
  x=side*(5.3+j*.34)
  cube('Ruined outer retaining wall',(x,.48,1.25+j*.13),(.39,1.6,.55),stone)
 for j in range(8):
  x=side*(5.6+j*.36)
  cube('Collapsed upper masonry',(x,.65,4.7+random.uniform(-.4,.4)),(.38,1.25,.5),dark if j%3==0 else stone)
# Varied broken canal walls with a visibly stepped bed
for j in range(12):
 x=-7.2+j*1.3
 cube('Raised watercourse edging',(x,-3.5,.43),(.96,.4,.65),stone)
 if j%3==0:
  cube('Broken canal cap',(x,-3.5,.83),(.55,.62,.19),dark)
# Fewer uniform crystal silhouettes by clustering smaller angled prismatic formations
for side in [-1,1]:
 for group in range(5):
  cx=side*(5.1+group*.6);cy=random.uniform(-2.2,1.3)
  for k in range(4):
   x=cx+random.uniform(-.28,.28);y=cy+random.uniform(-.3,.3)
   bpy.ops.mesh.primitive_cone_add(vertices=6,radius1=random.uniform(.11,.23),radius2=0,depth=random.uniform(.35,1.25),location=(x,y,.8))
   obj=bpy.context.object;obj.name='Clustered irregular ice prism';obj.rotation_euler[1]=random.uniform(-.25,.25);obj.data.materials.append(ice)


# v04: mechanical load path and architectural depth; all v03 geometry retained
# Rear-facing guide rails and two horizontal load-transfer axles
for side in [-1,1]:
 x=side*2.9
 for z in [1.0,2.6,4.2,5.8]:
  cube('Gate sliding guide clamp',(x,-.38,z),(.44,.85,.28),bronze)
 beam('Continuous gate guide rail',(x,-.37,.45),(x,-.37,6.55),.15,iron,12)
 for z in [2.0,5.65]:
  cube('Guide rail mounting socket',(x,-.1,z),(.65,.7,.48),dark)
for z in [5.6,6.45]:
 beam('Cross-shaft reinforcement',(-3.3,.3,z),(3.3,.3,z),.14,iron,16)
 for x in [-2.9,0,2.9]:
  cube('Cross shaft bearing block',(x,.3,z),(.58,.66,.56),bronze)
# Counterweight frames physically anchored to the outer pylons
for side in [-1,1]:
 x=side*5.6
 for z in [2.4,4.6]:
  cube('Counterweight wall anchor',(x,-.48,z),(.8,.9,.45),dark)
 for y in [-.55,.12]:
  beam('Counterweight suspension', (x,y,5.8),(x,y,2.05),.085,iron,12)
 cube('Heavy counterweight',(x,-.22,1.9),(.95,.95,1.6),dark)
 for z in [1.3,2.55]:
  cube('Counterweight band',(x,-.22,z),(1.07,1.07,.17),bronze)
# Recessed architectural arches add real wall thickness behind the main arch
for depth,rad in [(.48,4.08),(.95,4.35)]:
 for i in range(28):
  a=math.pi*i/28;b=math.pi*(i+1)/28
  beam('Rear arch masonry course',(rad*math.cos(a),depth,4+rad*math.sin(a)),
       (rad*math.cos(b),depth,4+rad*math.sin(b)),.22,stone,8)
# Frost deposits on lintels, bearing blocks, gate and canal
for side in [-1,1]:
 x=side*4.5
 for k in range(12):
  xx=x+random.uniform(-.75,.75)
  bpy.ops.mesh.primitive_cone_add(vertices=7,radius1=0,radius2=random.uniform(.05,.12),
      depth=random.uniform(.2,.75),location=(xx,-.87,7.4-random.uniform(.1,.4)))
  bpy.context.object.name='Pillar frost icicle';bpy.context.object.data.materials.append(frost)
for j in range(24):
 x=-7.2+j*.6
 cube('Canal rim frost',(x,-3.55,.91),(.35,.43,random.uniform(.05,.14)),frost)
# Rockfall embedded into broken wall bases, not floating independent debris
for side in [-1,1]:
 for k in range(18):
  x=side*random.uniform(5.1,8.3);y=random.uniform(-.1,1.2)
  o=cube('Embedded fallen voussoir',(x,y,random.uniform(.2,.65)),
    (random.uniform(.4,.9),random.uniform(.35,.85),random.uniform(.25,.6)),stone)
  o.rotation_euler[1]=random.uniform(-.25,.25)


# v05: physically legible lifting drum and sculpted stone damage
# A paired overhead winch assembly links both counterweights to the gate
for side in [-1,1]:
 x=side*2.3
 beam('Overhead winch drum axle',(x,-.72,7.05),(x,.62,7.05),.21,iron,20)
 for y in [-.63,.58]:
  ring('Winch flange',x,y,7.05,.54,.11,bronze)
 for j in range(18):
  a=2*math.pi*j/18
  beam('Winch barrel stave',(x+.35*math.cos(a),-.55,7.05+.35*math.sin(a)),
       (x+.35*math.cos(a),.55,7.05+.35*math.sin(a)),.065,dark,8)
 for k in range(12):
  a=math.pi*1.6*k/12
  beam('Wound lifting cable',(x+.43*math.cos(a),-.49+k*.085,7.05+.43*math.sin(a)),
       (x+.43*math.cos(a+.28),-.44+k*.085,7.05+.43*math.sin(a+.28)),.043,iron,8)
 # cable visibly descends to the iron gate beam
 beam('Gate lifting cable',(x,-.79,6.55),(x,-.91,5.0),.052,iron,10)
 cube('Gate lifting eye',(x,-.94,5.0),(.36,.22,.34),bronze)
# Horizontal structural courses behind the arch connect the side pylons
for z in [6.85,7.35,8.0]:
 for side in [-1,1]:
  cube('Arch spandrel bonded course',(side*3.7,.65,z),(2.15,1.3,.31),stone)
# Individual chipped stonework with angled fractured edges; retain all old stones
for side in [-1,1]:
 for j in range(12):
  x=side*(4.9+j*.28);z=5.8+random.uniform(-.6,.8)
  bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=(x,random.uniform(.3,.8),z))
  o=bpy.context.object;o.name='Irregular broken wall core'
  o.scale=(random.uniform(.18,.42),random.uniform(.24,.46),random.uniform(.16,.45))
  o.rotation_euler=(random.uniform(-.3,.3),random.uniform(-.5,.5),random.uniform(-.4,.4))
  o.data.materials.append(stone if j%3 else dark)
# Angled braces make the counterweight frames look load bearing
for side in [-1,1]:
 x=side*5.6
 for z in [3.0,4.3]:
  beam('Diagonal frame brace',(x-.43,-.68,z-.52),(x+.43,-.68,z+.52),.11,iron,10)
# Irregular frost shelves where ice meets masonry, not free-standing cones
for side in [-1,1]:
 for j in range(15):
  x=side*random.uniform(3.95,5.0);z=random.uniform(.8,7.5)
  cube('Adhered frost ledge',(x,-.87,z),(random.uniform(.16,.43),.18,random.uniform(.08,.22)),frost)

# Save native Blender and GLB before adding render-only helpers
bpy.ops.wm.save_as_mainfile(filepath=out+'/frozen_watergate_v05.blend')
bpy.ops.export_scene.gltf(filepath=out+'/frozen_watergate_v05.glb',export_format='GLB')
world=bpy.context.scene.world or bpy.data.worlds.new('World');bpy.context.scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Color'].default_value=(.035,.07,.13,1)
def area(loc,power,size):
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,3))-o.location).to_track_quat('-Z','Y').to_euler()
area((1,-5,12),2100,9);area((-8,2,7),1200,7)
bpy.context.scene.render.engine='CYCLES';bpy.context.scene.cycles.samples=24
bpy.context.scene.render.resolution_x=1000;bpy.context.scene.render.resolution_y=760;bpy.context.scene.render.resolution_percentage=100
for name,pos in [('front',(0,-23,10)),('side',(22,-3,10)),('angle',(17,-21,12))]:
 bpy.ops.object.camera_add(location=pos);cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,3.8))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=20;bpy.context.scene.camera=cam
 bpy.context.scene.render.filepath=out+'/'+name+'.png';bpy.ops.render.render(write_still=True);bpy.data.objects.remove(cam,do_unlink=True)
print('B2 watergate v05 Blender/GLB/3 renders exported')
