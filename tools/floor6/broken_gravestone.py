import bpy, math, random, sys, os
from mathutils import Vector
random.seed(61)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
def material(name,color,roughness=1):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 bs=m.node_tree.nodes.get("Principled BSDF");bs.inputs["Base Color"].default_value=(*color,1);bs.inputs["Roughness"].default_value=roughness
 return m
stone=material("weathered charcoal limestone",(.16,.18,.175))
edge=material("fresh fractured stone",(.27,.29,.27))
moss=material("uneven deep olive moss",(.065,.13,.055))
engrave=material("shadowed engraving",(.055,.065,.055))
def mesh(name,verts,faces,mat):
 m=bpy.data.meshes.new(name);m.from_pydata(verts,[],faces);m.update();o=bpy.data.objects.new(name,m);bpy.context.collection.objects.link(o);o.data.materials.append(mat);return o
def block(name,loc,scale,mat,bevel=.035):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 if bevel: mod=o.modifiers.new("worn stone edges","BEVEL");mod.width=bevel;mod.segments=2;o.modifiers.new("weighted normals","WEIGHTED_NORMAL")
 return o
# Reference image silhouette sampled at ~3x previous point density (48 vertices).
# Main shape retained; stepped shoulders and ornamental lobes added.
outline=[
 (-.43,.36),(-.45,.46),(-.46,.58),(-.47,.73),(-.47,.92),
 (-.48,1.12),(-.47,1.22),(-.49,1.30),(-.53,1.34),
 (-.55,1.39),(-.54,1.45),(-.51,1.50),(-.46,1.53),
 (-.41,1.53),(-.37,1.51),(-.34,1.55),(-.32,1.61),
 (-.28,1.67),(-.22,1.71),(-.15,1.74),(-.08,1.75),
 (-.01,1.74),(.06,1.70),(.12,1.65),(.17,1.58),
 (.19,1.52),(.24,1.54),(.30,1.54),(.35,1.51),
 (.39,1.47),(.41,1.42),(.40,1.37),(.37,1.33),
 (.35,1.29),(.39,1.25),(.42,1.20),(.44,1.12),
 (.45,1.02),(.45,.91),(.44,.81),(.43,.70),
 (.43,.60),(.42,.50),(.42,.40),(.42,.36)
]
# chipped upper right portion with broken zigzag profile
n=len(outline);verts=[]
for y in [-.13,.13]:
 for x,z in outline: verts.append((x+random.uniform(-.012,.012),y+random.uniform(-.013,.013),z))
faces=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]
for i in range(n):j=(i+1)%n;faces.append((i,j,j+n,i+n))
mesh("asymmetric fractured upright stone",verts,faces,stone)
block("lower cracked plinth",(0,0,.15),(1.14,.48,.30),stone,.055)
block("upper chipped plinth",(-.02,0,.34),(1.0,.37,.16),edge,.035)
# cracks as recessed dark narrow grooves with branching zigzags, surface attached
def groove(name,points,width=.012):
 for i,(a,b) in enumerate(zip(points,points[1:])):
  ax,az=a;bx,bz=b;dx=bx-ax;dz=bz-az
  o=block(name+" "+str(i),((ax+bx)/2,-.149,(az+bz)/2),(width,.008,math.hypot(dx,dz)),engrave,0)
  o.rotation_euler[1]=math.atan2(dx,dz)
groove("major fractured fissure",[(.04,1.57),(-.035,1.34),(.07,1.16),(-.02,.94),(.04,.76),(-.10,.51)],.018)
groove("branch fissure",[(.07,1.16),(.20,1.09),(.30,.91)],.012)
groove("secondary fissure",[(-.02,.94),(-.18,.83),(-.26,.67)],.009)
# faded inscription carved-looking shallow line geometry
for i in range(3):
 z=.72-i*.105
 groove("worn rune "+str(i),[(-.30,z),(-.23,z+.015),(-.16,z-.01)],.007)
# displaced broken fragments
for i,(x,y,z,s) in enumerate([(-.53,-.27,.12,.22),(.57,-.21,.11,.19),(.34,-.42,.09,.16),(-.21,-.39,.07,.12)]):
 o=block("fallen chipped fragment "+str(i),(x,y,z),(s,s*.65,s*.7),edge,.025);o.rotation_euler=(random.uniform(-.3,.3),random.uniform(-.4,.4),random.uniform(-.7,.7))
# moss patches at base, deliberately discrete and sparse
for i in range(26):
 x=random.uniform(-.5,.5);z=random.uniform(.31,.58);y=-.155
 o=block("moss patch "+str(i),(x,y,z),(random.uniform(.02,.07),.014,random.uniform(.015,.055)),moss,.008)
# Architectural raised perimeter, assembled from irregular chipped border segments.
# Border follows the front silhouette and is visibly raised rather than a flat texture.
for i in range(len(outline)-1):
 a,b=outline[i],outline[i+1]
 dx,dz=b[0]-a[0],b[1]-a[1]
 seg=block("raised gravestone frame %02d"%i,((a[0]+b[0])/2,-.158,(a[1]+b[1])/2),
           (.058,.068,math.hypot(dx,dz)+.012),edge,.008)
 seg.rotation_euler[1]=math.atan2(dx,dz)
# Reference-derived relief grooves: triple-density sampling of shoulders, arch, and frame.
# These are surface-mounted recessed-looking lines, not destructive booleans.
def sampled_arc(name,cx,cz,rx,rz,start,stop,count,width):
 pts=[(cx+rx*math.cos(start+(stop-start)*i/(count-1)),
       cz+rz*math.sin(start+(stop-start)*i/(count-1))) for i in range(count)]
 groove(name,pts,width)
# Main concentric arch: 33 samples, 3x the former coarse perimeter rhythm.
sampled_arc("inner arched relief",-.04,1.38,.265,.245,.08,math.pi-.08,33,.012)
sampled_arc("outer arched relief",-.04,1.38,.335,.315,.10,math.pi-.10,33,.008)
# Circular shoulder scroll carvings, sampled at 24 points each.
for side,cx in [("left",-.41),("right",.32)]:
 sampled_arc(side+" shoulder volute",cx,1.41,.065,.069,0,math.pi*1.86,24,.010)
 sampled_arc(side+" inner volute",cx,1.41,.033,.036,0,math.pi*1.75,18,.007)
# Inner rectangular frame: 3x sampled edges with weathered offsets.
for side,x in [("left",-.345),("right",.335)]:
 pts=[(x+random.uniform(-.003,.003),.48+(1.01*i/29)) for i in range(30)]
 groove("inner frame "+side,pts,.009)
# Mineral runoff and stone scratches, concentrated below ornamental scrolls.
for k in range(26):
 x=random.uniform(-.35,.35);top=random.uniform(.83,1.44)
 length=random.uniform(.055,.22)
 pts=[(x+random.uniform(-.009,.009),top-length*i/5) for i in range(6)]
 groove("eroded vertical streak %02d"%k,pts,.0035)
# Lower transverse ornamental frame band
block("lower frame rail",(0,-.158,.43),(.78,.065,.052),edge,.009)
# Six differently sized fractured rocks. Icospheres subdivision 1 => 20 triangular faces each.
rock_specs=[(-.62,-.30,.14,.19),(-.42,.30,.13,.15),(.58,-.27,.12,.17),(.49,.31,.11,.12),(-.12,-.48,.10,.105),(.12,.44,.10,.14)]
for i,(x,y,z,radius) in enumerate(rock_specs):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=radius,location=(x,y,z))
 o=bpy.context.object;o.name="ten-plus-face root rock %02d"%i
 o.scale=(random.uniform(.85,1.3),random.uniform(.7,1.15),random.uniform(.55,.9))
 o.rotation_euler=(random.uniform(-.5,.5),random.uniform(-.5,.5),random.uniform(-1,1))
 o.data.materials.append(edge if i%2 else stone)
 assert len(o.data.polygons)>=10
# Tiny clustered moss nodules: irregular patch distribution, never blanket cover.
for patch in range(20):
 cx=random.uniform(-.38,.38);cz=random.choice([random.uniform(.42,.70),random.uniform(1.02,1.43)])
 for k in range(random.randint(5,12)):
  x=cx+random.gauss(0,.035);z=cz+random.gauss(0,.033)
  if abs(x)>.40 or z>1.48:continue
  bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=random.uniform(.006,.016),
     location=(x,-.179-random.uniform(0,.006),z))
  o=bpy.context.object;o.name="fine lumpy moss %02d_%02d"%(patch,k)
  o.scale=(1,random.uniform(.45,.9),random.uniform(.5,1.6))
  o.data.materials.append(moss)
# Reference: heavier, irregular moss on plinth and near the lower side edges.
# ~3x more moss clusters than V2, with 3-6 tiny nodules per micro-cluster.
for patch in range(75):
 base_x=random.uniform(-.54,.54)
 base_z=random.choices([random.uniform(.27,.53),random.uniform(.53,1.55)],[.72,.28])[0]
 if base_z>.60 and abs(base_x)<.26: continue  # keep central epitaph partially exposed
 base_y=-.185 if base_z>.38 else -.28
 for k in range(random.randint(6,13)):
  x=base_x+random.gauss(0,.028)
  z=base_z+random.gauss(0,.022)
  if abs(x)>.55: continue
  bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,
     radius=random.uniform(.004,.013),location=(x,base_y-random.uniform(0,.012),z))
  o=bpy.context.object;o.name="reference moss tuft %02d_%02d"%(patch,k)
  o.scale=(random.uniform(.8,1.4),random.uniform(.45,.8),random.uniform(.6,1.6))
  o.data.materials.append(moss)
# Dense green clumps atop the base ledge.
for patch in range(95):
 x=random.uniform(-.55,.55);y=random.uniform(-.20,.18)
 z=random.uniform(.305,.365)
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=random.uniform(.009,.024),
   location=(x,y,z))
 o=bpy.context.object;o.name="ledge moss tuft %03d"%patch
 o.scale=(1.4,1.0,random.uniform(.45,1.2));o.data.materials.append(moss)
# English epitaph. Deliberately weathered and tiny; not required to be legible.
epitaph=[
 "THE HERO OF OUR AGE",
 "RESTS HERE",
 "DID WE PROTECT",
 "WHAT WE LONGED TO SAVE?",
 "MAY ONE ARISE",
 "TO DISPEL THE DARKNESS",
 "BORN OF THIS AGE."
]
for i,line in enumerate(epitaph):
 bpy.ops.object.text_add(location=(-.32,-.188,1.12-i*.075))
 o=bpy.context.object;o.name="weathered epitaph %02d"%i
 o.data.body=line;o.data.size=.032;o.data.extrude=.0006;o.data.space_character=1.0
 o.rotation_euler=(math.pi/2,0,0)
 o.data.materials.append(engrave)
# Lean the monument and its attached details backward by 12 degrees.
# The surrounding rocks stay in the ground, as do the detached fragments.
attached=[o for o in bpy.context.scene.objects if (
 o.name.startswith(("asymmetric fractured","raised gravestone frame","lower frame rail",
 "major fractured","branch fissure","secondary fissure","worn rune","moss patch",
 "fine lumpy moss","reference moss tuft","ledge moss tuft","weathered epitaph","upper chipped plinth","lower cracked plinth")))]
pivot=bpy.data.objects.new("leaning gravestone pivot",None)
bpy.context.collection.objects.link(pivot);pivot.location=(0,0,.12)
for o in attached:
 matrix=o.matrix_world.copy();o.parent=pivot;o.matrix_world=matrix
pivot.rotation_euler[0]=math.radians(12)
# export only assets
os.makedirs("render-output/floor6",exist_ok=True)
asset=list(bpy.context.scene.objects)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath="render-output/floor6/broken_gravestone_v1.glb",export_format='GLB',use_selection=True)
# ground is render-only
ground=block("render-only floor",(0,0,-.075),(5,5,.12),edge,.02)
world=bpy.context.scene.world;world.color=(.18,.18,.18)
def area(loc,power,size):
 bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.data.energy=power;l.data.shape='DISK';l.data.size=size;l.rotation_euler=(Vector((0,0,.8))-l.location).to_track_quat('-Z','Y').to_euler()
area((3,-4,6),450,5);area((-3,2,4),250,4)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=48
scene.render.resolution_x=900;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
scene.view_settings.look='AgX - Medium High Contrast'
for name,loc in [('front',(0,-4.8,1.65)),('side',(4.8,0,1.6)),('angle',(3.3,-4.0,2.25))]:
 bpy.ops.object.camera_add(location=loc);cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,.8))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=2.75;scene.camera=cam
 scene.render.filepath="render-output/floor6/broken_gravestone_v1_"+name+".png";bpy.ops.render.render(write_still=True);bpy.data.objects.remove(cam,do_unlink=True)
