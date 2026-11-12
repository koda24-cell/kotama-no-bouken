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
# Irregular headstone perimeter; front y negative
outline=[(-.43,.36),(-.47,.68),(-.43,1.12),(-.36,1.44),(-.23,1.67),(-.09,1.73),(.015,1.62),(.11,1.47),(.18,1.49),(.24,1.31),(.34,1.25),(.39,1.11),(.45,.82),(.42,.36)]
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
 "fine lumpy moss","weathered epitaph","upper chipped plinth","lower cracked plinth")))]
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
scene.view_settings.view_transform='AgX'\nscene.view_settings.look='Medium High Contrast'\nscene.view_settings.view_settings if False else None
for name,loc in [('front',(0,-4.8,1.65)),('side',(4.8,0,1.6)),('angle',(3.3,-4.0,2.25))]:
 bpy.ops.object.camera_add(location=loc);cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,.8))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=2.75;scene.camera=cam
 scene.render.filepath="render-output/floor6/broken_gravestone_v1_"+name+".png";bpy.ops.render.render(write_still=True);bpy.data.objects.remove(cam,do_unlink=True)
