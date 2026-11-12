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

def jagged_mesh(name, rings, material, sides=12, seed=0):
 # rings: (z, radial_scale, irregularity, x_offset, y_offset) form a genuinely uneven silhouette
 rng=random.Random(8000+seed)
 verts=[];faces=[]
 noise=[rng.uniform(-1,1) for _ in range(sides)]
 for z,rad,rough,dx,dy in rings:
  for j in range(sides):
   a=math.tau*j/sides
   radius=rad*(1+rough*noise[j]+rng.uniform(-rough*.12,rough*.12))
   verts.append((dx+math.cos(a)*radius,dy+math.sin(a)*radius,z+rng.uniform(-rough*.11,rough*.11)))
 for i in range(len(rings)-1):
  for j in range(sides):
   k=i*sides+j;n=i*sides+(j+1)%sides
   faces.append((k,n,n+sides,k+sides))
 faces.append(tuple(reversed(range(sides))))
 faces.append(tuple((len(rings)-1)*sides+j for j in range(sides)))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
 obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);obj.data.materials.append(material)
 return obj
def stone_relief(z,kind):
 # angular interlocking friezes, offset carved keystones, incised vines and chips
 for level in range(3):
  zz=z+level*.18
  for face in range(4):
   ang=face*math.pi/2
   x=.74*math.cos(ang);y=.74*math.sin(ang)
   o=cube('raised ancient geometric frieze',(x,y,zz),(.12,.21,.065),rim,.018)
   o.rotation_euler.z=ang
 for i in range(8):
  a=i*math.tau/8
  x=.73*math.cos(a);y=.73*math.sin(a)
  o=cube('weathered sculpted stone chip',(x,y,z-.19),(.16,.12,.11),dark,.015)
  o.rotation_euler.z=a+.18
def ice_cascade(x,y,z,width,height,seed):
 rng=random.Random(seed)
 # irregular translucent ice-sheet, tapering and meandering rather than repeated cone sticks
 rings=[]
 for j in range(7):
  t=j/6
  rings.append((z-height*t,width*(1-.88*t),.12+.14*t,x+.15*math.sin(t*4+seed),y+.12*math.sin(t*3+seed)))
 return jagged_mesh('layered frozen meltwater sheet',rings,ice,9,seed)


def broken_stump():
 # One continuous wall whose top ring is diagonally fractured, not stones piled on a flat stump.
 sides=15;verts=[];faces=[];rng=random.Random(151)
 for z,rad in [(.83,.67),(1.36,.67),(1.96,.64),(2.30,.63)]:
  for j in range(sides):
   a=j*math.tau/sides
   zz=z if z<2.3 else (2.48+.52*math.cos(a+.38)+rng.uniform(-.09,.09))
   rr=rad*(1+rng.uniform(-.055,.055))
   verts.append((rr*math.cos(a),rr*math.sin(a),zz))
 for i in range(3):
  for j in range(sides):
   k=i*sides+j;n=i*sides+(j+1)%sides
   faces.append((k,n,n+sides,k+sides))
 faces.append(tuple(reversed(range(sides))))
 faces.append(tuple(3*sides+j for j in range(sides)))
 mesh=bpy.data.meshes.new('slashed diagonal fracture mesh');mesh.from_pydata(verts,[],faces);mesh.update()
 ob=bpy.data.objects.new('genuinely angled broken column',mesh);bpy.context.collection.objects.link(ob);mesh.materials.append(stone)
 # Dark exposed rock interior, aligned to the sloping fracture.
 for i in range(9):
  a=math.tau*i/9;rad=.22+.23*(i%3)/3
  o=cube('deep fractured stone edge',(rad*math.cos(a),rad*math.sin(a),2.45+.52*math.cos(a+.38)),(.19,.18,.1),dark,.015)
  o.rotation_euler=(.15,.3,.4*a)
def fused_ice_mantle():
 # Interlocked broad sheets, asymmetrical and fused into one mantle, not thin vertical spikes.
 for j in range(10):
  a=math.tau*j/10
  x=.64*math.cos(a);y=.64*math.sin(a)
  height=[1.55,.72,1.92,1.1,.42,1.38,.91,1.77,.65,1.22][j]
  width=[.42,.32,.53,.37,.3,.48,.4,.55,.34,.46][j]
  ice_cascade(x,y,4.65,width,height,300+j)
  ice_cascade(x*.86,y*.86,4.28,width*.76,height*.62,400+j)
 # Continuous interlocking frozen overflow running down the shaft.
 for j in range(6):
  a=j*math.tau/6+.2
  ice_cascade(.66*math.cos(a),.66*math.sin(a),3.3,.4,1.35+.24*(j%3),500+j)

def pillar(kind):
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 # segmented, cracked ruin pillars with broken caps and three degrees of glaciation
 cube('stone plinth',(0,0,.18),(2.15,2.15,.36),stone,.12)
 cube('lower carved base',(0,0,.51),(1.8,1.8,.28),rim,.075)
 ring('lower torus stone',.75,.85,.22,stone)
 for i in range(5 if kind!=1 else 0):
  z=1.04+i*.65
  seg=cyl('individual irregular stone drum',(.045*math.sin(i*2),.035*math.cos(i*3),z),.66,.62,stone,12)
  seg.rotation_euler.z=i*.11
  for j in range(8):
   a=j*math.tau/8
   c=cube('deep carved fluting',(.67*math.cos(a),.67*math.sin(a),z),(.065,.09,.45),dark,.018)
   c.rotation_euler.z=a
  if i%2==0: ring('thin stone seam',z+.32,.7,.065,dark)
 top=3.95 if kind!=1 else 2.65
 if kind==1:
  broken_stump()
 else:
  stone_relief(1.12,kind)
  stone_relief(2.08,kind)
 if kind!=1:
  cube('capital lower',(0,0,top),(1.7,1.7,.3),rim,.08)
  cube('capital sculpted crown',(0,0,top+.3),(2.05,2.05,.34),stone,.12)
 else:
  # fractured stump generated above as a single slanted continuous mesh
  # toppled upper column and crown rest to the side, with visible diagonal break
  fallen=cyl('fallen upper column section',(1.52,.4,.42),.57,1.55,stone,11)
  fallen.rotation_euler=(.32,1.24,.18)
  cap=cube('fallen broken carved capital',(2.35,.42,.35),(1.2,1.3,.42),rim,.11)
  cap.rotation_euler=(.25,.42,.45)
 for a in range(4 if kind!=1 else 0):
  ang=a*math.pi/2
  c=cube('capital incised ornament',(.88*math.cos(ang),.88*math.sin(ang),top+.25),(.18,.19,.19),dark,.025);c.rotation_euler.z=ang
 if kind==1:
  # damaged broken upper half: irregular chunks and fracture ridge
  # No artificial pebbles piled on the fracture plane.
  for i in range(9):
   o=cube('fallen stone block',(random.uniform(-1.5,1.5),random.uniform(-1.3,1.4),.14),(.25,.33,.25),stone,.035);o.rotation_euler.z=random.random()*2
 if kind==2:
  fused_ice_mantle()
  # Wide layered icicles with organic uneven lengths and branching frozen water flows.
  for idx,(xx,yy,hh,ww) in enumerate([(-.72,-.69,1.35,.42),(-.2,-.83,1.85,.5),(.48,-.73,.76,.33),(.84,.05,1.62,.4),(-.83,.34,.98,.37),(.15,.85,1.1,.43)]):
   ice_cascade(xx,yy,top+.6,ww,hh,idx+17)
  for idx in range(5):
   ang=idx*math.tau/5
   ice_cascade(.65*math.cos(ang),.65*math.sin(ang),2.65,.28,.45+idx*.17,idx+41)
  cube('overhanging translucent ice cap',(.05,0,top+.52),(2.2,2.2,.25),ice,.12)
  for i in range(3):
   a=random.uniform(0,math.tau);r=random.uniform(.58,1.05);h=random.uniform(.3,1.5)
   o=shard('hanging uneven icicle',(r*math.cos(a),r*math.sin(a),top+.42-h/2),random.uniform(.06,.19),h,ice,False)
  for i in range(7):
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
 bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,['b2-ancient-pillar-v3','b2-ruined-pillar-v3','b2-glaciated-pillar-v3'][kind]+'.glb'),export_format='GLB',use_selection=True)
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
for kind in range(3):pillar(kind);render(kind);print('COMPLETE_V3',kind)
