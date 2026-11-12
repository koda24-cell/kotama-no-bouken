"""Floor 6 white flower carpet: repeatable 2x2 m ground tile.
Blender 3.x; render front/side/angle and export GLB.
"""
import bpy, math, random, os
from mathutils import Vector
random.seed(612)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
OUT=os.path.abspath("render-output/floor6/white-flower-ground")
os.makedirs(OUT,exist_ok=True)
def mat(name,color,rough=0.86):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 bs=m.node_tree.nodes.get("Principled BSDF");bs.inputs["Base Color"].default_value=(*color,1);bs.inputs["Roughness"].default_value=rough
 return m
soil=mat("dark moist soil",(.12,.105,.085))
green=[mat("grass green %d"%i,c) for i,c in enumerate([(.13,.23,.10),(.17,.29,.12),(.21,.32,.15)])]
white=[mat("petal ivory %d"%i,c) for i,c in enumerate([(.96,.95,.88),(.87,.91,.84),(.99,.98,.94)])]
yellow=mat("soft pale flower center",(.73,.65,.27))
def mesh(name,verts,faces,material):
 m=bpy.data.meshes.new(name);m.from_pydata(verts,[],faces);m.update()
 ob=bpy.data.objects.new(name,m);bpy.context.collection.objects.link(ob);m.materials.append(material)
 return ob
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,-.06))
ground=bpy.context.object;ground.name="ground tile 2m";ground.dimensions=(2,2,.12)
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
ground.data.materials.append(soil)
# Each batch is one draw-call friendly mesh; every flower has five petals and a center.
stems=[([],[]) for _ in range(3)]
petals=[([],[]) for _ in range(3)]
centers=([],[])
def add_quad(batch,p0,p1,p2,p3):
 vs,fs=batch;start=len(vs);vs.extend([p0,p1,p2,p3]);fs.append((start,start+1,start+2,start+3))
def add_flower(x,y,h,size,group):
 # 48 quads per flower: 2 crossed stem quads, 5 petals x 8 curved
 # quads (4 longitudinal sections x 2 halves), 6 raised center quads.
 stem=stems[group];w=.004
 add_quad(stem,(x-w,y,0),(x+w,y,0),(x+w,y,h),(x-w,y,h))
 add_quad(stem,(x,y-w,0),(x,y+w,0),(x,y+w,h),(x,y-w,h))
 for k in range(5):
  a=2*math.pi*k/5+random.uniform(-.10,.10)
  u=Vector((math.cos(a),math.sin(a),0))
  v=Vector((-math.sin(a),math.cos(a),0))
  c=Vector((x,y,h))
  # Broad overlapping petals, subtly cupped and irregular in height.
  stations=[]
  for t in (0,.27,.54,.78,1.):
   width=size*(.10+.78*math.sin(math.pi*t)**.75)
   lift=size*(.06*math.sin(math.pi*t)+.13*t*t)
   left=c+u*size*t+v*width+Vector((0,0,lift))
   mid=c+u*size*t+Vector((0,0,lift-size*.09*math.sin(math.pi*t)))
   right=c+u*size*t-v*width+Vector((0,0,lift))
   stations.append((left,mid,right))
  for i in range(4):
   p,q=stations[i],stations[i+1]
   add_quad(petals[group],tuple(p[0]),tuple(q[0]),tuple(q[1]),tuple(p[1]))
   add_quad(petals[group],tuple(p[1]),tuple(q[1]),tuple(q[2]),tuple(p[2]))
 # Six golden facets with a raised center.
 radius=size*.17
 for k in range(6):
  a0=k*math.tau/6;a1=(k+1)*math.tau/6
  edge0=(x+radius*math.cos(a0),y+radius*math.sin(a0),h+.005)
  edge1=(x+radius*math.cos(a1),y+radius*math.sin(a1),h+.005)
  inner0=(x+radius*.3*math.cos(a0),y+radius*.3*math.sin(a0),h+.018)
  inner1=(x+radius*.3*math.cos(a1),y+radius*.3*math.sin(a1),h+.018)
  add_quad(centers,inner0,edge0,edge1,inner1)
# 10 x 10 = 100 flowers; 48 polygons per flower; 194 grass; 6 ground.
# Exactly 100*48 + 194 + 6 = 5000 source quads.
NX,NY=10,10
for i in range(NX):
 for j in range(NY):
  x=-1+(i+.5+random.uniform(-.38,.38))*2/NX
  y=-1+(j+.5+random.uniform(-.38,.38))*2/NY
  add_flower(x,y,random.uniform(.035,.085),random.uniform(.12,.17),random.randrange(3))
for k in range(194):
 x=random.uniform(-.99,.99);y=random.uniform(-.99,.99);h=random.uniform(.055,.15)
 batch=stems[k%3]
 add_quad(batch,(x-.012,y,0),(x+.012,y,0),(x+.002,y,h),(x-.002,y,h))
for i,(v,f) in enumerate(stems):mesh("grass stems batch %d"%i,v,f,green[i])
for i,(v,f) in enumerate(petals):mesh("white petals batch %d"%i,v,f,white[i])
mesh("flower centers",*centers,yellow)
# Mandatory preflight: exactly 5000 source mesh polygons, including the ground.
poly_count=sum(len(o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH')
assert poly_count==5000, f'Expected 5000 polygons, got {poly_count}'
print('SOURCE_POLYGON_COUNT:',poly_count,flush=True)
print('FLOWER_COUNT: 100',flush=True)
# Export only geometry, never studio equipment.
bpy.ops.object.select_all(action='DESELECT')
for ob in bpy.context.scene.objects:
 if ob.type=='MESH':ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,"white_flower_ground_v4.glb"),export_format='GLB',use_selection=True)
bpy.ops.object.select_all(action='DESELECT')
world=bpy.context.scene.world;world.color=(.28,.28,.28)
world.use_nodes=True;world.node_tree.nodes["Background"].inputs["Strength"].default_value=.75
def light(loc,power,size):
 data=bpy.data.lights.new("studio softbox","AREA");data.energy=power;data.shape='DISK';data.size=size
 obj=bpy.data.objects.new("studio softbox",data);bpy.context.collection.objects.link(obj);obj.location=loc
light((1,-2,4),420,4);light((-2,1,2.5),230,3)
camdata=bpy.data.cameras.new("camera");cam=bpy.data.objects.new("camera",camdata)
bpy.context.collection.objects.link(cam);bpy.context.scene.camera=cam
camdata.type='ORTHO';camdata.ortho_scale=3.1
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=900;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast'
for view,loc in [('front',(0,-3,1.25)),('side',(3,0,1.3)),('angle',(2.6,-3,2.4)),('top',(0,-.001,4))]:
 cam.location=loc;direction=Vector((0,0,.05))-cam.location
 cam.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=os.path.join(OUT,"white_flower_ground_v2_"+view+".png")
 bpy.ops.render.render(write_still=True)
print("WHITE_FLOWER_GROUND_DONE")
