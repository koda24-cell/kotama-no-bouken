"""Standalone additive B5 corruption-rock prototype. No game runtime changes."""
import bpy, math, random, os, sys
from mathutils import Vector
random.seed(51)
out=os.path.abspath("render-output/b5-gloom")
os.makedirs(out,exist_ok=True)
bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
def mat(name,color,metal=0,rough=.8,emit=None,power=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get("Principled BSDF")
 p.inputs["Base Color"].default_value=(*color,1)
 p.inputs["Metallic"].default_value=metal;p.inputs["Roughness"].default_value=rough
 if emit:
  p.inputs["Emission Color"].default_value=(*emit,1)
  p.inputs["Emission Strength"].default_value=power
 return m
black=mat("B5 obsidian corruption",(.027,.022,.041),.22,.79)
purple=mat("B5 violet mineral",(.12,.037,.17),.24,.65)
glow=mat("B5 dim magenta cracks",(.48,.017,.13),.1,.45,(.95,.018,.21),3.5)
stone=mat("B5 weathered masonry",(.28,.26,.31),0,.91)
def ico(name,loc,scale,material,sub=1):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub,radius=1,location=loc)
 o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(material);return o
def link(name,pts,radius,material):
 curve=bpy.data.curves.new(name,"CURVE");curve.dimensions="3D";curve.resolution_u=16
 curve.bevel_depth=radius;curve.bevel_resolution=3
 sp=curve.splines.new("POLY");sp.points.add(len(pts)-1)
 for p,v in zip(sp.points,pts):p.co=(*v,1)
 obj=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(obj);obj.data.materials.append(material)
 return obj
# Stone base: chipped blocks visible under the added invasion.
for i in range(8):
 a=i*math.tau/8
 ico("original-style masonry %02d"%i,(math.cos(a)*.87,math.sin(a)*.75,.18),(.49,.42,.27),stone,1)
# Root masses and crusty uneven silhouettes, asymmetrical to avoid perfect rosettes.
for i in range(19):
 a=i*2.399+random.uniform(-.3,.3)
 rad=random.uniform(.12,1.0)
 z=random.uniform(.22,.53)
 ico("black growth %02d"%i,(math.cos(a)*rad,math.sin(a)*rad,z),
     (random.uniform(.20,.48),random.uniform(.18,.42),random.uniform(.18,.55)),
     black if i%4 else purple,2)
# Mineral teeth growing upward with irregular heights.
for i in range(14):
 a=i*2.399
 r=random.uniform(.22,.93)
 x,y=math.cos(a)*r,math.sin(a)*r
 height=random.uniform(.25,.92)
 bpy.ops.mesh.primitive_cone_add(vertices=5,radius1=random.uniform(.12,.23),radius2=.008,depth=height,location=(x,y,.37+height/2))
 o=bpy.context.object;o.name="jagged mineral tooth %02d"%i
 o.rotation_euler=(random.uniform(-.24,.24),random.uniform(-.22,.22),a)
 o.data.materials.append(black if i%3 else purple)
# Glowing fissures run along top of the black crust; not neon tubes in empty space.
for i in range(9):
 a=i*math.tau/9+.22
 r=random.uniform(.12,.35)
 pts=[]
 for j in range(6):
  t=j/5
  rr=r+t*random.uniform(.55,.72)
  aa=a+math.sin(t*8+i)*.10
  pts.append((math.cos(aa)*rr,math.sin(aa)*rr,.68-.22*t+.025*math.sin(t*14+i)))
 link("embedded fissure %02d"%i,pts,.012,glow)
# Thin hooked roots crawling outward.
for i in range(8):
 a=i*math.tau/8
 pts=[]
 for j in range(9):
  t=j/8
  r=.52+t*.83
  pts.append((math.cos(a+.11*math.sin(t*5+i))*r,math.sin(a+.11*math.sin(t*5+i))*r,.19+.18*math.sin(math.pi*t)))
 link("creeping root %02d"%i,pts,.042,black)
# Export only geometry; preview plane/lights created later.
bpy.ops.export_scene.gltf(filepath=os.path.join(out,"b5-gloom-corruption-prototype.glb"),export_format="GLB",export_apply=True)
floor=mat("preview floor",(.11,.105,.14),0,.96)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.09));bpy.context.object.data.materials.append(floor)
world=bpy.context.scene.world
world.color=(.09,.07,.12)
def aim(obj,pt):obj.rotation_euler=(Vector(pt)-obj.location).to_track_quat("-Z","Y").to_euler()
for loc,energy,color in [((-3,-4,6),850,(.65,.65,1)),((4,3,4),600,(1,.22,.4))]:
 bpy.ops.object.light_add(type="AREA",location=loc);o=bpy.context.object;o.data.energy=energy;o.data.color=color;o.data.shape="DISK";o.data.size=5;aim(o,(0,0,.4))
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type="ORTHO";cam.data.ortho_scale=3.8;bpy.context.scene.camera=cam
scene=bpy.context.scene;scene.render.engine="CYCLES";scene.cycles.samples=24
scene.render.resolution_x=960;scene.render.resolution_y=720
scene.render.image_settings.file_format="PNG"
scene.view_settings.view_transform="AgX"
for name,pos in [("front",(0,-5,2.0)),("side",(5,0,2.0)),("top-oblique",(4,-5,5))]:
 cam.location=pos;aim(cam,(0,0,.4));scene.render.filepath=os.path.join(out,"b5-gloom-"+name+".png")
 bpy.ops.render.render(write_still=True)
 assert os.path.getsize(scene.render.filepath)>1000
 print("RENDER_OK",name,flush=True)
