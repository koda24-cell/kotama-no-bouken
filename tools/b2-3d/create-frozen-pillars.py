import bpy, math, os, random
from mathutils import Vector
random.seed(22012)
OUT=os.path.abspath('render-output')
os.makedirs(OUT,exist_ok=True)
def mat(name,color,metal=0,rough=.85,emission=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Metallic'].default_value=metal;bs.inputs['Roughness'].default_value=rough
 if emission:bs.inputs['Emission Color'].default_value=(*color,1);bs.inputs['Emission Strength'].default_value=emission
 return m
stone=mat('ancient blue limestone',(.29,.37,.42));dark=mat('weathered joints',(.15,.23,.28));rim=mat('carved highlights',(.42,.51,.54));ice=mat('milky glacier ice',(.48,.78,.9),.1,.2);glow=mat('glowing crystal',(.14,.64,.95),.1,.19,1.2);moss=mat('frozen moss',(.2,.32,.29))
def cube(name,loc,scale,ma,bev=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(ma)
 if bev:mod=o.modifiers.new('worn corners','BEVEL');mod.width=bev;mod.segments=2;o.modifiers.new('weighted normals','WEIGHTED_NORMAL')
 return o
def cyl(name,loc,r,depth,ma,verts=10,r2=None):
 bpy.ops.mesh.primitive_cone_add(vertices=verts,radius1=r,radius2=r if r2 is None else r2,depth=depth,location=loc);o=bpy.context.object;o.name=name;o.data.materials.append(ma);return o
def shard(name,loc,r,h,ma,up=True):
 o=cyl(name,loc,r,h,ma,7,0 if up else r);o.rotation_euler.z=random.uniform(-.5,.5);return o
def ring(name,z,r,depth,ma):
 return cyl(name,(0,0,z),r,depth,ma,12)
def pillar(kind):
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 # segmented, cracked ruin pillars with broken caps and three degrees of glaciation
 cube('stone plinth',(0,0,.18),(2.15,2.15,.36),stone,.12)
 cube('lower carved base',(0,0,.51),(1.8,1.8,.28),rim,.075)
 ring('lower torus stone',.75,.85,.22,stone)
 for i in range(5 if kind!=1 else 3):
  z=1.04+i*.65
  seg=cyl('individual irregular stone drum',(.045*math.sin(i*2),.035*math.cos(i*3),z),.66,.62,stone,12)
  seg.rotation_euler.z=i*.11
  for j in range(8):
   a=j*math.tau/8
   c=cube('deep carved fluting',(.67*math.cos(a),.67*math.sin(a),z),(.065,.09,.45),dark,.018)
   c.rotation_euler.z=a
  if i%2==0: ring('thin stone seam',z+.32,.7,.065,dark)
 top=3.95 if kind!=1 else 2.65
 cube('capital lower',(0,0,top),(1.7,1.7,.3),rim,.08)
 cube('capital sculpted crown',(0,0,top+.3),(2.05,2.05,.34),stone,.12)
 for a in range(4):
  ang=a*math.pi/2
  c=cube('capital incised ornament',(.88*math.cos(ang),.88*math.sin(ang),top+.25),(.18,.19,.19),dark,.025);c.rotation_euler.z=ang
 if kind==1:
  # damaged broken upper half: irregular chunks and fracture ridge
  for i in range(7):
   a=random.uniform(0,math.tau);r=random.uniform(.1,.65)
   o=cube('fracture chunk',(r*math.cos(a),r*math.sin(a),2.84+random.uniform(-.1,.24)),(.32,.4,.26),stone,.04);o.rotation_euler=(random.random(),random.random(),random.random())
  for i in range(9):
   o=cube('fallen stone block',(random.uniform(-1.5,1.5),random.uniform(-1.3,1.4),.14),(.25,.33,.25),stone,.035);o.rotation_euler.z=random.random()*2
 if kind==2:
  cube('overhanging translucent ice cap',(.05,0,top+.52),(2.2,2.2,.25),ice,.12)
  for i in range(17):
   a=random.uniform(0,math.tau);r=random.uniform(.58,1.05);h=random.uniform(.3,1.5)
   o=shard('hanging uneven icicle',(r*math.cos(a),r*math.sin(a),top+.42-h/2),random.uniform(.06,.19),h,ice,False)
  for i in range(9):
   a=random.uniform(0,math.tau);r=random.uniform(.75,1.35);h=random.uniform(.4,1.2)
   shard('ice growing from ground',(r*math.cos(a),r*math.sin(a),h/2),random.uniform(.11,.25),h,ice,True)
  for i in range(3):
   shard('blue glowing crystal',(random.uniform(-1.2,1.2),random.uniform(-1.2,1.2),.42),.2,.84,glow)
 if kind!=2:
  for i in range(7):
   a=random.uniform(0,math.tau);r=random.uniform(.7,1.15);h=random.uniform(.15,.5)
   shard('scattered frost',(r*math.cos(a),r*math.sin(a),h/2),.11,h,ice)
 for o in bpy.context.scene.objects:
  if o.type=='MESH':o.select_set(True)
 bpy.context.view_layer.objects.active=next(o for o in bpy.context.scene.objects if o.type=='MESH')
 bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,['b2-ancient-pillar','b2-ruined-pillar','b2-glaciated-pillar'][kind]+'.glb'),export_format='GLB',use_selection=True)
def render(kind):
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
 corners=[o.matrix_world@Vector(v) for o in meshes for v in o.bound_box]
 lo=[min(v[i] for v in corners) for i in range(3)];hi=[max(v[i] for v in corners) for i in range(3)]
 center=Vector([(lo[i]+hi[i])/2 for i in range(3)]);size=max(hi[i]-lo[i] for i in range(3))
 def aim(o):o.rotation_euler=(center-o.location).to_track_quat('-Z','Y').to_euler()
 bpy.ops.object.camera_add();camera=bpy.context.object;camera.data.type='ORTHO';camera.data.ortho_scale=size*1.65;bpy.context.scene.camera=camera
 for vec,power in [((3,-4,6),1200),((-4,2,4),800)]:
  bpy.ops.object.light_add(type='AREA',location=center+Vector(vec)*size);l=bpy.context.object;l.data.energy=power*size;l.data.size=size*1.7;aim(l)
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=900;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
 stem=['b2-ancient-pillar','b2-ruined-pillar','b2-glaciated-pillar'][kind]
 for name,vec in [('front',(0,-1,.35)),('side',(1,0,.35)),('angle',(1,-1,.6))]:
  camera.location=center+Vector(vec).normalized()*size*2.5;aim(camera);scene.render.filepath=os.path.join(OUT,stem+'-'+name+'.png');bpy.ops.render.render(write_still=True)
for kind in range(3):pillar(kind);render(kind);print('COMPLETE',kind)
