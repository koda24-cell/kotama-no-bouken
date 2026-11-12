import bpy, math, random, sys, os
from mathutils import Vector
random.seed(61)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
stone=bpy.data.materials.new("weathered charcoal limestone"); stone.diffuse_color=(.19,.205,.205,1)
edge=bpy.data.materials.new("fresh fractured stone"); edge.diffuse_color=(.27,.28,.275,1)
moss=bpy.data.materials.new("dark green moss"); moss.diffuse_color=(.095,.17,.09,1)
engrave=bpy.data.materials.new("eroded inscription"); engrave.diffuse_color=(.12,.125,.12,1)
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
area((3,-4,6),750,4);area((-3,2,4),450,3)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32
scene.render.resolution_x=900;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.view_settings.view_transform='Standard'
for name,loc in [('front',(0,-4.8,1.65)),('side',(4.8,0,1.6)),('angle',(3.3,-4.0,2.25))]:
 bpy.ops.object.camera_add(location=loc);cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,.8))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=2.75;scene.camera=cam
 scene.render.filepath="render-output/floor6/broken_gravestone_v1_"+name+".png";bpy.ops.render.render(write_still=True);bpy.data.objects.remove(cam,do_unlink=True)
