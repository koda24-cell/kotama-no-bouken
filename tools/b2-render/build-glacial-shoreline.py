import bpy,math,random,os
from mathutils import Vector
random.seed(20261112)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
out='/work/render-output/b2-shoreline'
os.makedirs(out,exist_ok=True)
def mat(name,color,rough=.6,metal=0,alpha=1,transmission=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,alpha);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF')
 p.inputs['Base Color'].default_value=(*color,alpha)
 p.inputs['Roughness'].default_value=rough
 p.inputs['Metallic'].default_value=metal
 p.inputs['Alpha'].default_value=alpha
 p.inputs['Transmission Weight'].default_value=transmission
 if alpha<1:m.surface_render_method='DITHERED'
 return m
rock=mat('Dark wet shale',(.13,.22,.28),.88)
stone=mat('Submerged carved ruins',(.37,.48,.51),.79)
ice=mat('Clear cyan fractured ice',(.26,.76,.89),.14,.03,.73,.18)
pale=mat('White frosted ice edge',(.72,.91,.96),.45)
water=mat('Glacial turquoise shallows',(.035,.35,.45),.12,.08,.82,.12)
crystal=mat('Deep blue luminous crystal',(.075,.33,.85),.19,.12)
sand=mat('Submerged pebbles',(.23,.38,.42),.9)
def mesh(name,verts,faces,material):
 d=bpy.data.meshes.new(name);d.from_pydata(verts,[],faces);d.update()
 o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.data.materials.append(material);return o
def cube(name,loc,scale,material,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
 o=bpy.context.object;o.name=name;o.dimensions=scale
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 o.data.materials.append(material)
 if bevel:
  m=o.modifiers.new('Worn edges','BEVEL');m.width=bevel;m.segments=2
  bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=m.name)
 return o
def irregular_slab(name,x,y,z,radius,thick,material,seed):
 rng=random.Random(seed);n=rng.randint(8,12);verts=[]
 for ring in (0,1):
  for j in range(n):
   a=2*math.pi*j/n;rad=radius*rng.uniform(.75,1.17)
   verts.append((x+math.cos(a)*rad,y+math.sin(a)*rad*.68,z-ring*thick+rng.uniform(-.06,.06)))
 faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
 for j in range(n):faces.append((j,(j+1)%n,(j+1)%n+n,j+n))
 return mesh(name,verts,faces,material)
def crystal_cluster(x,y,z,scale,seed):
 rng=random.Random(seed)
 # Each cluster has a broad fractured ice foot fused to shoreline rock.
 irregular_slab('Frozen ice root embedded in shoreline',x,y,z-.035,scale*rng.uniform(.38,.72),scale*.16,ice,seed+2000)
 irregular_slab('Opaque frost at crystal root',x,y,z+.018,scale*rng.uniform(.23,.42),scale*.06,pale,seed+2100)
 count=rng.randint(3,8)
 for k in range(count):
  dx=rng.uniform(-.45,.45)*scale;dy=rng.uniform(-.35,.35)*scale
  category=rng.choices(['stub','chunk','spire'],weights=[4,5,1])[0]
  if k==0:category=rng.choice(['chunk','spire'])
  if category=='stub':
   h=rng.uniform(.16,.48)*scale;radius=rng.uniform(.18,.35)*scale
  elif category=='chunk':
   h=rng.uniform(.45,1.15)*scale;radius=rng.uniform(.25,.52)*scale
  else:
   h=rng.uniform(1.2,2.0)*scale;radius=rng.uniform(.34,.58)*scale
  # Broad root, asymmetric shoulders, irregular truncated or chipped tips.
  n=rng.choice([5,6,7]);phase=rng.uniform(0,math.tau)
  leanx=rng.uniform(-.22,.22)*h;leany=rng.uniform(-.18,.18)*h
  base_z=z-rng.uniform(.035,.12)*scale
  top_ratio=rng.uniform(.09,.28) if category!='stub' else rng.uniform(.28,.48)
  heights=[0,.22,.58,.82,1.0]
  widths=[1.3,1.08,rng.uniform(.67,.94),rng.uniform(.38,.68),top_ratio]
  verts=[]
  angular=[rng.uniform(.78,1.18) for _ in range(n)]
  for level,(f,w) in enumerate(zip(heights,widths)):
   for j in range(n):
    theta=phase+math.tau*j/n
    radial=radius*w*angular[j]*rng.uniform(.93,1.07)
    ox=leanx*f+(.04*scale if level==3 else 0)
    oy=leany*f
    zz=base_z+h*f+(rng.uniform(-.09,.09)*h if level==4 else 0)
    verts.append((x+dx+ox+math.cos(theta)*radial,y+dy+oy+math.sin(theta)*radial,zz))
  faces=[tuple(range(n-1,-1,-1))]
  for level in range(len(heights)-1):
   for j in range(n):
    nj=(j+1)%n
    faces.append((level*n+j,level*n+nj,(level+1)*n+nj,(level+1)*n+j))
  # Flat irregular fractured top instead of every crystal terminating at a needle.
  faces.append(tuple((len(heights)-1)*n+j for j in range(n)))
  mesh('Asymmetric fractured broad ice formation',verts,faces,crystal if category=='spire' else ice)
  if category=='chunk' and rng.random()<.5:
   irregular_slab('Broken crystalline shoulder shelf',x+dx+leanx*.45,y+dy+leany*.45,base_z+h*.4,radius*.8,.06*scale,pale,seed*17+k)
# Ground contours: uneven overlapping shale banks, central navigable water channel.
for i in range(36):
 x=-10.4+i*.59
 for side in (-1,1):
  y=side*(2.3+random.uniform(-.4,.4))
  irregular_slab('Worn sloping rock shoreline',x,y,-.13,random.uniform(.75,1.3),.28,rock,i*2+(side+1))
  if i%3==0:
   irregular_slab('Translucent shelf ice on shoreline',x,side*1.9,.08,random.uniform(.65,1.3),.11,ice,200+i*7+side)
  if i%4==0:
   irregular_slab('Snow frost over ice lip',x,side*2.15,.13,random.uniform(.32,.62),.035,pale,300+i*5+side)
# Water is flat for placement; decorative geometry can be integrated without changing collision.
cube('Turquoise water channel',(0,0,-.26),(22,4.35,.06),water)
# Floating jagged ice floes, with varied tilt and true thickness.
for i in range(24):
 x=random.uniform(-10.2,10.2);y=random.uniform(-1.55,1.55)
 o=irregular_slab('Broken floating glacial plate',x,y,.04,random.uniform(.38,1.05),random.uniform(.08,.2),ice,400+i)
 o.rotation_euler=(random.uniform(-.09,.09),random.uniform(-.09,.09),random.uniform(-.3,.3))
 if i%3==0:irregular_slab('Opaque frost center',x,y,.10,.25,.025,pale,500+i)
# Submerged masonry, carved worn stones and columns under water.
for i in range(20):
 x=random.uniform(-9.5,9.5);y=random.uniform(-1.6,1.6)
 o=cube('Submerged ruined stone block',(x,y,-.19),(random.uniform(.25,.8),random.uniform(.25,.55),random.uniform(.13,.35)),stone,.06)
 o.rotation_euler[2]=random.uniform(-.65,.65)
for i in range(5):
 x=-8.2+i*4.1;y=(-1)**i*1.25
 o=cube('Fallen ancient carved column',(x,y,-.11),(.5,1.2,.42),stone,.09)
 o.rotation_euler[2]=random.uniform(-.7,.7)
 for t in (-.4,.4):cube('Column ring molding',(x,y+t,-.1),(.65,.13,.54),stone,.04)
# Ice crystal clusters near banks, varied heights.
for i in range(21):
 x=-9.8+i*.97+random.uniform(-.45,.45);y=(-1)**i*random.uniform(2.15,3.25)
 scale=random.choices([random.uniform(.25,.5),random.uniform(.6,1.15),random.uniform(1.45,2.15)],[5,11,5])[0]
 crystal_cluster(x,y,.12,scale,700+i)
# Scattered pebbles and erosion fragments.
for i in range(90):
 x=random.uniform(-10.5,10.5);y=random.choice((-1,1))*random.uniform(1.8,3.1)
 irregular_slab('Eroded shoreline gravel',x,y,.035,random.uniform(.07,.23),.06,sand,900+i)
# Foam patches along ice edge; keep mesh simple for game use.
foam=mat('Pale river foam',(.75,.94,.96),.45,0,.78)
for i in range(22):
 x=-10.2+i*.96
 for side in (-1,1):
  y=side*random.uniform(1.5,1.9)
  irregular_slab('Small water-edge foam patch',x,y,.015,random.uniform(.15,.34),.012,foam,1100+i*2+side)
bpy.context.view_layer.update()
tri=0;count=0
for o in bpy.context.scene.objects:
 if o.type=='MESH':
  o.data.calc_loop_triangles();tri+=len(o.data.loop_triangles);count+=1
with open(out+'/mesh_stats.txt','w') as f:f.write('version=v03\\nmesh_objects=%s\\ntriangles=%s\\n'%(count,tri))
print('B2 SHORELINE',count,tri)
bpy.ops.wm.save_as_mainfile(filepath=out+'/b2_glacial_shoreline_v03.blend')
bpy.ops.export_scene.gltf(filepath=out+'/b2_glacial_shoreline_v03.glb',export_format='GLB')
world=bpy.context.scene.world or bpy.data.worlds.new('Cavern');bpy.context.scene.world=world
world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Color'].default_value=(.045,.085,.14,1)
for loc,power,size in [((2,-9,13),2600,10),((-9,5,11),1700,8)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.size=size
 o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.context.scene.render.engine='CYCLES';bpy.context.scene.cycles.samples=24
bpy.context.scene.render.resolution_x=1100;bpy.context.scene.render.resolution_y=760;bpy.context.scene.render.resolution_percentage=100
for name,pos in [('front',(0,-18,12)),('side',(24,0,12)),('angle',(18,-19,15))]:
 bpy.ops.object.camera_add(location=pos);cam=bpy.context.object
 cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler()
 cam.data.type='ORTHO';cam.data.ortho_scale=27;bpy.context.scene.camera=cam
 bpy.context.scene.render.filepath=out+'/'+name+'.png';bpy.ops.render.render(write_still=True)
 bpy.data.objects.remove(cam,do_unlink=True)
