"""Stage 4: non-rectilinear lava river with an upstream cascade, basalt banks and pool.
Blender 4.x/3.x, deterministic, no downloaded assets. Existing project PBR images used.
Source candidate only; no game integration or approval.
"""
import bpy, math, random, os, sys, json, hashlib
from mathutils import Vector
from math import sin, cos, pi
R=random.Random(7214)
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
out=args[args.index('--out')+1] if '--out' in args else 'render-output'
variant=args[args.index('--variant')+1] if '--variant' in args else 'v1'
os.makedirs(out,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for d in bpy.data.materials: bpy.data.materials.remove(d)
root=bpy.data.objects.new('B4_MAGMA_RIVER_BANK_'+variant,None);bpy.context.collection.objects.link(root)
def parent(obj):obj.parent=root;return obj
def mat(name,color,rough=.9,metal=0,em=0,texture=None,normal=None,roughmap=None,emmap=None):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 n=m.node_tree.nodes; bs=n.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1)
 bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
 if texture:
  im=n.new('ShaderNodeTexImage');im.image=bpy.data.images.load(os.path.abspath(texture),check_existing=True)
  m.node_tree.links.new(im.outputs['Color'],bs.inputs['Base Color'])
 if normal:
  im=n.new('ShaderNodeTexImage');im.image=bpy.data.images.load(os.path.abspath(normal),check_existing=True);im.image.colorspace_settings.name='Non-Color'
  nm=n.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.64
  m.node_tree.links.new(im.outputs['Color'],nm.inputs['Color']);m.node_tree.links.new(nm.outputs['Normal'],bs.inputs['Normal'])
 if roughmap:
  im=n.new('ShaderNodeTexImage');im.image=bpy.data.images.load(os.path.abspath(roughmap),check_existing=True);im.image.colorspace_settings.name='Non-Color'
  m.node_tree.links.new(im.outputs['Color'],bs.inputs['Roughness'])
 if emmap:
  im=n.new('ShaderNodeTexImage');im.image=bpy.data.images.load(os.path.abspath(emmap),check_existing=True)
  try:
   m.node_tree.links.new(im.outputs['Color'],bs.inputs['Emission'])
   bs.inputs['Emission Strength'].default_value=em
  except KeyError:
   m.node_tree.links.new(im.outputs['Color'],bs.inputs['Emission Color'])
   bs.inputs['Emission Strength'].default_value=em
 elif em:
  try:bs.inputs['Emission'].default_value=(*color,1);bs.inputs['Emission Strength'].default_value=em
  except KeyError:bs.inputs['Emission Color'].default_value=(*color,1);bs.inputs['Emission Strength'].default_value=em
 return m
tex='assets/3d/dungeons/b4_dragonfire/textures/'
basalt=mat('Basalt_CC0_project_existing',(0.13,.095,.088),.95,texture=tex+'volcanic_basalt_albedo.png',normal=tex+'volcanic_basalt_normal.png',roughmap=tex+'volcanic_basalt_roughness.png')
ash=mat('Dark_ashen_banks',(0.13,.11,.10),.97,texture=tex+'ashen_stone_albedo.png',normal=tex+'ashen_stone_normal.png',roughmap=tex+'ashen_stone_roughness.png')
crust=mat('Black_cooling_crust',(.052,.046,.043),.97,texture=tex+'volcanic_basalt_albedo.png',normal=tex+'volcanic_basalt_normal.png')
lava=mat('Molten_lava_project_existing',(1,.22,.025),.35,em=1.55,texture=tex+'molten_lava_albedo.png',normal=tex+'molten_lava_normal.png',roughmap=tex+'molten_lava_roughness.png',emmap=tex+'molten_lava_emissive.png')
# Baked thermal map for real GLB PBR: uneven black cooling crust and
# connected molten channels, avoiding the repeated yellow swirl wallpaper.
# Existing project lava normal/roughness maps are still reused.
import numpy as np
def thermal_image(name,kind):
 n=512
 rng=np.random.default_rng(20261117)
 def noise(freq):
  grid=rng.random((freq,freq)).astype(np.float32)
  u=np.arange(n,dtype=np.float32)*freq/n
  a=np.floor(u).astype(np.int32);t=u-a;t=t*t*(3-2*t)
  ix=a[:,None];iy=a[None,:]
  tx=t[:,None];ty=t[None,:]
  a00=grid[ix%freq,iy%freq]
  a10=grid[(ix+1)%freq,iy%freq]
  a01=grid[ix%freq,(iy+1)%freq]
  a11=grid[(ix+1)%freq,(iy+1)%freq]
  return (a00*(1-tx)+a10*tx)*(1-ty)+(a01*(1-tx)+a11*tx)*ty
 n5=noise(5);n11=noise(11);n24=noise(24);n57=noise(57)
 yy,xx=np.mgrid[0:n,0:n].astype(np.float32)/n
 warp=n11-.5
 veins=np.abs(np.sin((xx+warp*.12)*21+yy*3.8+n24*1.7))
 heat=np.clip((.43*n5+.31*n11+.18*veins+.08*n57-.36)*3.6,0,1)**1.35
 heat*=1-.72*np.clip((n5-.61)*3.0,0,1)
 if kind=='color':
  rgb=np.stack((.055+.90*heat,.012+.34*heat**1.3,.005+.055*heat),axis=-1)
 else:
  rgb=np.stack((heat,.37*heat**1.4,.055*heat),axis=-1)
 rgba=np.concatenate((np.clip(rgb,0,1),np.ones((n,n,1),dtype=np.float32)),axis=-1)
 image=bpy.data.images.new(name,width=n,height=n,alpha=True)
 image.pixels.foreach_set(rgba.ravel())
 image.pack()
 return image
thermal_base=thermal_image('B4_V7_ThermalLava_BaseColor','color')
thermal_emission=thermal_image('B4_V7_ThermalLava_Emissive','emission')
lava_bs=lava.node_tree.nodes.get('Principled BSDF')
im=lava.node_tree.nodes.new('ShaderNodeTexImage');im.image=thermal_base
lava.node_tree.links.new(im.outputs['Color'],lava_bs.inputs['Base Color'])
im=lava.node_tree.nodes.new('ShaderNodeTexImage');im.image=thermal_emission
try:lava.node_tree.links.new(im.outputs['Color'],lava_bs.inputs['Emission'])
except KeyError:lava.node_tree.links.new(im.outputs['Color'],lava_bs.inputs['Emission Color'])
lava_bs.inputs['Emission Strength'].default_value=2.1
hot=mat('Bright_molten_fissures',(1,.26,.028),.38,em=3.8)
hot2=mat('Sulfur_yellow_core',(1,.61,.08),.35,em=5)
coal=mat('Charred_rock',(0.09,.075,.075),.95)
materials=[basalt,ash,crust,lava,hot,hot2,coal]
def objmesh(name,verts,faces,material,uv=None,smooth=True):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update()
 o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);parent(o);o.data.materials.append(material)
 if uv:
  layer=me.uv_layers.new(name='UVMap')
  for poly in me.polygons:
   for li in poly.loop_indices:
    vid=me.loops[li].vertex_index
    layer.data[li].uv=uv[vid]
 for p in me.polygons:p.use_smooth=smooth
 return o
def center(z):return .32*sin(z*.78)+.27*sin(z*1.92+.7)+.11*sin(z*3.15)
def halfwidth(z):return (.76+.16*sin(z*1.8+1.1)+.38*math.exp(-((z-1.95)/1.2)**2)+.07*sin(z*5.1))*(1-.56*math.exp(-((z+3.32)/.40)**2))
def edge(z,side):return center(z)+side*(halfwidth(z)+.055*sin(z*9+side*1.4))
def ground_y(x,z):
 return .24+.10*sin(x*1.7+z*.85)*sin(z*2.2-x*.48)+.035*sin(x*7.3+z*5.1)-.22*math.exp(-((x+1.42)/.82)**2-((z-1.72)/.74)**2)
def lava_y(x,z):return .13+.024*sin(z*5.5+x*3.7)+.015*sin(x*11-z*4.3)
# Non-rectangular bank boundaries; no square tiled river silhouette.
for side in (-1,1):
 verts=[];uv=[];faces=[];nz=190;nx=44
 for j in range(nz+1):
  z=-3.35+j*6.7/nz
  e=edge(z,side)
  for i in range(nx+1):
   t=i/nx
   x=e+side*t*(3.15-side*e if side>0 else 3.15+e)
   dist=abs(x-e)
   y=ground_y(x,z)+.20*math.exp(-dist*2.8)-.20*math.exp(-dist*12)
   verts.append((x,y,z));uv.append((x*.25,z*.25))
 for j in range(nz):
  for i in range(nx):
   a=j*(nx+1)+i;b=a+nx+1
   faces.append((a,a+1,b+1,b) if side<0 else (a,b,b+1,a+1))
 objmesh('ERODED_BASALT_BANK_'+str(side),verts,faces,basalt,uv)
# Winding channel surface with pool widening at near end.
verts=[];uv=[];faces=[];nz=240;nx=56
for j in range(nz+1):
 z=-3.35+j*6.7/nz
 left=edge(z,-1);right=edge(z,1)
 for i in range(nx+1):
  t=i/nx;x=left+(right-left)*t
  y=lava_y(x,z)
  verts.append((x,y,z));uv.append((t*1.6,z*.48))
for j in range(nz):
 for i in range(nx):
  a=j*(nx+1)+i;b=a+nx+1;faces.append((a,b,b+1,a+1))
objmesh('MEANDERING_MOLTEN_CHANNEL',verts,faces,lava,uv)
# Broad pool on downstream section: irregular surface, not a perfect ellipse.
verts=[];uv=[];faces=[];N=100;M=32
cx=center(1.95)
for j in range(M+1):
 r=j/M
 for i in range(N+1):
  a=2*pi*i/N
  rad=(1+.085*sin(a*7)+.06*sin(a*13+1.1))
  x=cx+r*1.50*rad*cos(a);z=1.95+r*1.15*rad*sin(a)
  verts.append((x,.145+.015*sin(a*4+r*14),z));uv.append((.5+r*cos(a)*.45,.5+r*sin(a)*.45))
for j in range(M):
 for i in range(N):
  a=j*(N+1)+i;b=a+N+1;faces.append((a,a+1,b+1,b))
objmesh('MOLTEN_POOL_WIDENING',verts,faces,lava,uv)
# Off-channel side basin in a genuine eroded depression connected to the river.
verts=[];uv=[];faces=[];N=88;M=27
for j in range(M+1):
 r=j/M
 for i in range(N+1):
  a=2*pi*i/N
  jag=1+.11*sin(a*5+1.2)+.06*sin(a*11)
  x=-1.42+r*.92*jag*cos(a)
  z=1.72+r*.74*jag*sin(a)
  verts.append((x,.15+.011*sin(a*3+r*11),z));uv.append((.5+r*cos(a)*.48,.5+r*sin(a)*.48))
for j in range(M):
 for i in range(N):
  a=j*(N+1)+i;b=a+N+1;faces.append((a,a+1,b+1,b))
objmesh('SIDE_ERODED_MOLTEN_BASIN',verts,faces,lava,uv)
# Two irregular narrow tributaries travel across the rock banks to the main river.
for side,z0 in [(1,-.72),(-1,.58)]:
 verts=[];uv=[];faces=[];N=95;M=12
 for j in range(N+1):
  t=j/N
  z=z0+1.02*t+.11*sin(t*2*pi)
  x0=side*2.62
  x1=edge(z,side)
  x=x0*(1-t)+x1*t+.09*sin(t*8.0)
  width=(.13+.09*sin(t*pi))*(1+.12*sin(t*15))
  for i in range(M+1):
   u=i/M;px=x+(u-.5)*2*width
   y=(1-t)*ground_y(px,z)+t*lava_y(px,z)+.018
   verts.append((px,y,z+.035*sin(u*pi*2+t*10)))
   uv.append((u*.8,t*1.2))
 for j in range(N):
  for i in range(M):
   a=j*(M+1)+i;b=a+M+1;faces.append((a,b,b+1,a+1))
 objmesh('SIDE_TRIBUTARY_MOLTEN_VEIN',verts,faces,lava,uv)
# Rock masses: high-poly displaced with multiple frequencies, not tetrahedron stones.
def rock(name,xyz,scale,material,seed=0,subdiv=3):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdiv,radius=1,location=xyz)
 o=bpy.context.object;o.name=name;parent(o)
 for v in o.data.vertices:
  x,y,z=v.co;h=1+.17*sin(x*4.3+seed)*sin(z*5.7-seed*.4)+.09*sin(y*11+z*8+seed)
  v.co=(x*h,y*h,z*h)
 o.scale=scale;o.data.materials.append(material)
 for p in o.data.polygons:p.use_smooth=True
 return o
for side in (-1,1):
 for i in range(18):
  z=-3.0+i*.36+R.uniform(-.12,.12)
  x=edge(z,side)+side*(.35+R.uniform(0,.75))
  s=R.uniform(.18,.38)
  rock('BANK_LARGE_WEATHERED_ROCK', (x,.28+R.uniform(-.04,.13),z),(s*R.uniform(.9,1.4),s*.50,s*R.uniform(.8,1.4)),basalt,seed=i+side*19,subdiv=3)
# Black crust islands, embedded in the stream with emissive cracks between them.
for i in range(23):
 z=R.uniform(-2.95,3.1)
 x=center(z)+R.uniform(-.65,.65)*halfwidth(z)
 size=R.uniform(.075,.23)
 if i%6==0:size*=1.55
 rock('FLOATING_COOLING_CRUST',(x,.17,z),(size,.025+size*.12,size*R.uniform(.5,1.7)),crust,seed=i+3,subdiv=2)
# Thin cooled rafts cover parts of the molten surface, making hot cracks legible.
# Each irregular sheet follows the meander, rather than forming polygonal confetti.
for i in range(35):
 z=R.uniform(-2.95,3.15)
 c=center(z);width=halfwidth(z)
 x=c+R.choice([-1,1])*R.uniform(.40,.83)*width
 rx=R.uniform(.08,.20);rz=R.uniform(.12,.29)
 vs=[];fs=[];n=15
 for k in range(n):
  a=k*2*pi/n
  rough=1+.18*sin(a*3+i*2.2)+.09*sin(a*7+i)
  px=x+rx*cos(a)*rough
  pz=z+rz*sin(a)*rough
  if abs(px-center(pz))>halfwidth(pz)*.91:continue
  vs.append((px,lava_y(px,pz)+.045,pz))
 if len(vs)>=4:
  mx=sum(v[0] for v in vs)/len(vs);mz=sum(v[2] for v in vs)/len(vs)
  vs.insert(0,(mx,lava_y(mx,mz)+.047,mz))
  for k in range(1,len(vs)):fs.append((0,1 if k==len(vs)-1 else k+1,k))
  objmesh('COOLED_LAVA_CRUST_RAFT',vs,fs,crust,[(x*.18,z*.18) for x,y,z in vs])
# Side cave rock cliffs and rear basalt overhang.
for i in range(14):
 side=-1 if i%2 else 1
 z=-3.25+R.random()*6.7
 x=side*(3.38+R.uniform(-.18,.28))
 h=R.uniform(.65,1.30)
 rock('CAVERN_ROCK_FACE',(x,h*.38,z),(.48,h,.56),ash,seed=i+90,subdiv=3)
for i in range(7):
 x=-2.65+i*.87+R.uniform(-.22,.22)
 y=2.42+R.uniform(-.18,.38)
 z=-3.77+R.uniform(-.22,.12)
 rock('REAR_IRREGULAR_BASALT_OVERHANG',(x,y,z),(R.uniform(.39,.72),R.uniform(.30,.56),R.uniform(.38,.68)),basalt,seed=i+120,subdiv=3)
# Continuous rear basalt cliff: the lavafall emerges from a real cliff,
# rather than a floating row of boulders. The top edge is eroded.
verts=[];uv=[];faces=[];nx=74;ny=50
for j in range(ny+1):
 t=j/ny
 for i in range(nx+1):
  u=i/nx;x=-2.25+4.5*u
  top=2.7+.16*sin(x*3.1)+.08*sin(x*8.3)
  y=.13+t*(top-.13)
  z=-3.83+.13*sin(x*2.7+y*1.8)+.065*sin(x*9.1-y*6.2)
  verts.append((x,y,z));uv.append((u*1.7,t*1.3))
for j in range(ny):
 for i in range(nx):
  a=j*(nx+1)+i;b=a+nx+1
  faces.append((a,a+1,b+1,b))
objmesh('CONTINUOUS_FRACTURED_BASALT_CLIFF',verts,faces,basalt,uv)
# Large embedded basalt shoulders framing the source of the fall.
for i in range(14):
 side=-1 if i%2 else 1
 x=side*(.74+R.uniform(0,1.32))
 y=R.uniform(1.0,2.55)
 rock('FALL_SOURCE_EMBEDDED_BASALT',(x,y,-3.58+R.uniform(-.15,.12)),(.34,.30,.35),basalt,seed=i+301,subdiv=3)
# Cascading flow from a fractured wall: bending ribbon with variable width.
verts=[];uv=[];faces=[];N=26;M=100
for j in range(M+1):
 t=j/M;y=2.42-t*2.2
 z=-3.18+.28*sin(t*2.8)+.38*t*t
 cx=-.42+.13*sin(t*5.3)+.08*sin(t*13.1)
 w=.28+.13*sin(t*pi)+.08*t
 for i in range(N+1):
  u=i/N;x=cx+(u-.5)*2*w*(1+.06*sin(t*19+u*11))
  verts.append((x,y,z+.09*sin(u*pi*2+t*12)));uv.append((u,t*1.8))
for j in range(M):
 for i in range(N):
  a=j*(N+1)+i;b=a+N+1;faces.append((a,a+1,b+1,b))
objmesh('FALLING_MAGMA_CASCADE',verts,faces,lava,uv)
# Bright thin rivulets in fissures of the upper wall and near the riverbank.
for i in range(16):
 z=R.uniform(-2.9,2.8);side=R.choice([-1,1])
 x=edge(z,side)+side*.05
 bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=1,location=(x,.23,z))
 o=bpy.context.object;o.name='BANK_RED_HOT_FISSURE';parent(o);o.scale=(.025,.015,R.uniform(.10,.26));o.data.materials.append(hot)
# Small glowing lava splashes near cascade impact; subtle not glitter storm.
for i in range(28):
 x=-.42+R.gauss(0,.28);z=-2.75+R.gauss(0,.28)
 y=.30+R.random()*.70
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=R.uniform(.015,.043),location=(x,y,z))
 o=bpy.context.object;o.name='MOLTEN_SPRAY';parent(o);o.data.materials.append(hot2)
# The modeling convention above uses Y-up (as in Three.js).
# Blender is Z-up: convert every mesh to Z-up BEFORE lighting and cameras.
# This also makes the lava river a horizontal ground surface and the fall vertical.
from mathutils import Matrix
Y_UP_TO_Z_UP=Matrix.Rotation(math.pi/2,4,'X')
bpy.context.view_layer.update()
for o in bpy.data.objects:
 if o.type=='MESH':o.matrix_world=Y_UP_TO_Z_UP @ o.matrix_world
def to_blender(v):return Y_UP_TO_Z_UP @ Vector(v)
# Add a non-exported ground catch-plane for grounded Blender review shots.
bpy.ops.mesh.primitive_plane_add(size=2,location=(0,0,-.10))
review_ground=bpy.context.object;review_ground.name='REVIEW_GROUND_ONLY'
review_ground.scale=(6.0,6.5,1);review_ground.data.materials.append(coal)
# Stage lighting: molten orange motivates the scene, blue-black ambient fill.
world=bpy.context.scene.world or bpy.data.worlds.new('B4_Cavern_World');bpy.context.scene.world=world;world.use_nodes=True
world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.045,.054,.071,1)
world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.65
def area(name,loc,power,color,size):
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.color=color;d.shape='DISK';d.size=size
 o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.location=to_blender(loc)
 o.rotation_euler=(to_blender((0,.1,0))-o.location).to_track_quat('-Z','Y').to_euler()
area('MAGMA_LIGHT_WARM',(0,1.65,.9),420,(1,.24,.045),5.4)
area('UPSTREAM_CASCADE_LIGHT',(-.4,2.4,-2.9),340,(1,.35,.075),3.2)
area('COLD_CAVE_FILL',(2.2,5,3.5),1150,(.25,.36,.58),6)
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=1024;scene.render.resolution_y=768;scene.render.resolution_percentage=100
scene.view_settings.view_transform='Filmic';scene.view_settings.look='Medium High Contrast'
scene.camera=None
def camera(name,loc,target,focal=42):
 data=bpy.data.cameras.new(name);o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o)
 o.location=to_blender(loc);o.rotation_euler=(to_blender(target)-o.location).to_track_quat('-Z','Y').to_euler()
 data.type='PERSP';data.lens=focal;scene.camera=o;return o
# save editable project with materials, source geometry and 3 cameras.
cams=[('angle',(6.9,5.8,9.5),(0,.60,0),37),('front',(0,5.0,11.7),(0,.65,-.35),40),('side',(11.5,5.2,0),(0,.6,0),41),('top',(0,11,0),(0,.2,0),46)]
for label,loc,target,focal in cams:
 camera('REVIEW_'+label,loc,target,focal)
 scene.render.filepath=os.path.join(out,'b4-magma-river-'+variant+'-'+label+'.png')
 bpy.ops.render.render(write_still=True)
# Only geometry, not cameras/lights, in game GLB.
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.data.objects:
 if o.type=='MESH' and not o.name.startswith('REVIEW_'):o.select_set(True)
bpy.context.view_layer.objects.active=next(o for o in bpy.data.objects if o.type=='MESH' and not o.name.startswith('REVIEW_'))
bpy.ops.export_scene.gltf(filepath=os.path.join(out,'b4-magma-river-'+variant+'.glb'),export_format='GLB',use_selection=True,export_apply=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'b4-magma-river-'+variant+'.blend'))
files=[]
for f in sorted(os.listdir(out)):
 if f.startswith('b4-magma-river-'+variant):
  p=os.path.join(out,f);files.append({'file':f,'size':os.path.getsize(p),'sha256':hashlib.sha256(open(p,'rb').read()).hexdigest()})
with open(os.path.join(out,'manifest-'+variant+'.json'),'w') as f:
 json.dump({'approval':'NOT_APPROVED','variant':variant,'geometry':'meandering lava river, pool, cascade, eroded basalt banks','textures':'existing repo assets/3d/dungeons/b4_dragonfire/textures','files':files},f,indent=2)
print('B4 magma river exported',variant,len(files),'files')
