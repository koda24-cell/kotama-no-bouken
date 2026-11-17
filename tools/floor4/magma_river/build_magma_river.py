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
 image.pixels.foreach_set(rgba.astype(np.float32).ravel())
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
lava_bs.inputs['Emission Strength'].default_value=1.45
# V14: thick, crusting basaltic melt rather than shiny water.
for link in list(lava.node_tree.links):
 if link.to_socket==lava_bs.inputs['Roughness']:lava.node_tree.links.remove(link)
lava_bs.inputs['Roughness'].default_value=.86
dense_lava=mat('V14_Viscous_Molten_Basalt',(.5,.075,.012),.9,normal=tex+'molten_lava_normal.png')
dbs=dense_lava.node_tree.nodes.get('Principled BSDF')
for image,socket in [(thermal_base,'Base Color'),(thermal_emission,'Emission Color')]:
 node=dense_lava.node_tree.nodes.new('ShaderNodeTexImage');node.image=image
 try:dense_lava.node_tree.links.new(node.outputs['Color'],dbs.inputs[socket])
 except KeyError:
  if socket=='Emission Color':dense_lava.node_tree.links.new(node.outputs['Color'],dbs.inputs['Emission'])
  else:raise
dbs.inputs['Emission Strength'].default_value=1.75
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
# V14: a cooled recessed lip connects river surface to bank geometry.
for side in (-1,1):
 verts=[];uv=[];faces=[];nz=175
 for j in range(nz+1):
  z=-3.31+j*6.62/nz;e=edge(z,side)
  for i in range(5):
   u=i/4;x=e+side*(u*.23-.055)
   y=lava_y(e,z)+.016+u**1.7*(ground_y(x,z)-lava_y(e,z)+.025)
   y+=.011*sin(z*10+side*2+u*3)
   verts.append((x,y,z));uv.append((z*.26,u))
 for j in range(nz):
  for i in range(4):
   a=j*5+i;b=a+5;faces.append((a,a+1,b+1,b))
 objmesh('V14_BANK_CONTACT_COOLING_RIM',verts,faces,crust,uv,smooth=False)
# Sluggish dark crust tongues across the hot river, no water-like smooth sheet.
for k in range(19):
 z=-2.9+k*.32+R.uniform(-.06,.06)
 x=center(z)+R.uniform(-.44,.44)*halfwidth(z)
 r=.11+R.uniform(.03,.16)
 vs=[];uvs=[];fs=[];n=13
 for j in range(n):
  a=2*pi*j/n
  xx=x+r*cos(a)*(1+.23*sin(3*a+k))
  zz=z+r*1.8*sin(a)*(1+.14*cos(5*a+k))
  xx=max(edge(zz,-1)+.06,min(edge(zz,1)-.06,xx))
  vs.append((xx,lava_y(xx,zz)+.034+.011*sin(a*4+k),zz));uvs.append((xx*.27,zz*.27))
 vs.insert(0,(x,lava_y(x,z)+.045,z));uvs.insert(0,(x*.27,z*.27))
 for j in range(n):fs.append((0,j+1,1 if j==n-1 else j+2))
 objmesh('V14_VISCOUS_COOLING_TONGUE',vs,fs,crust,uvs,smooth=False)

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
def rock(name,xyz,scale,material,seed=0,subdiv=4):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=max(4,subdiv),radius=1,location=xyz)
 o=bpy.context.object;o.name=name;parent(o)
 for v in o.data.vertices:
  x,y,z=v.co;h=1+.14*sin(x*4.3+seed)*sin(z*5.7-seed*.4)+.075*sin(y*11+z*8+seed)+.045*sin(x*19+y*17+z*12+seed)+.027*sin((x+y-z)*31+seed)
  # Retain the original ico-sphere topology; geological shearing reshapes
  # only its surface. Broad near-planar bedding breaks the inflated-pillow look.
  strata=round((y+.08*sin(x*3.4+z*2.1+seed*.23))*4.8)/4.8
  shear=.045*sin(x*3.1+z*2.3+seed*.17)*sin(y*4.6+seed*.21)
  cut=.055*max(0,sin(x*2.8+y*3.2-z*1.6+seed*.27))**4
  v.co=(x*h*(1-cut)+shear*.25,y*h*.73+strata*.27+shear,z*h*(1-cut))
 o.scale=scale;o.rotation_euler=(R.uniform(-.23,.23),R.uniform(-.26,.26),R.uniform(-.65,.65));o.data.materials.append(material)
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
for i in range(10):
 side=-1 if i%2 else 1
 z=-3.25+R.random()*6.7
 x=side*(3.38+R.uniform(-.18,.28))
 h=R.uniform(.38,.86)
 rock('CAVERN_ROCK_FACE',(x,h*.34,z),(.59,h*.68,.72),ash,seed=i+90,subdiv=3)
for i in range(5):
 x=-2.4+i*1.15+R.uniform(-.35,.35)
 y=2.20+R.uniform(-.22,.16)
 z=-3.77+R.uniform(-.22,.12)
 rock('REAR_IRREGULAR_BASALT_OVERHANG',(x,y,z),(R.uniform(.48,.77),R.uniform(.23,.42),R.uniform(.34,.61)),basalt,seed=i+120,subdiv=3)
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
# V14: a closed thick lava body clings to the rock wall, then rolls outward.
# V13 was a paper-thin sheet too far forward of the rear cliff.
def fall_path(t):
 cx=-.42+.085*t+.025*sin(t*pi)
 yy=2.42-2.2*t
 zz=-3.25+.075*t+.10*t**3+.23*t**8
 width=.18+.035*sin(t*pi)+.23*t*t
 return cx,yy,zz,width
def fall_xyz(t,u,front=True):
 cx,y,z,w=fall_path(t)
 thick=.075+.05*sin(t*pi)**2+.08*t*t
 fold=.028*sin(t*8+u*3.2)+.014*sin(t*19+u*7.5)
 edge_rough=.025*sin(t*9+u*5.1)+.012*sin(t*21+u*8.2)
 x=cx+(u-.5)*2*w*(1+edge_rough)
 z+= (thick*.48+fold) if front else (-thick*.55+fold*.22)
 y+=.012*sin(u*9+t*8)*sin(t*pi)
 return x,y,z
N=32;M=112;verts=[];uv=[];faces=[]
for surface in range(2):
 for j in range(M+1):
  t=j/M
  for i in range(N+1):
   u=i/N;verts.append(fall_xyz(t,u,surface==0));uv.append((u,t*1.8))
stride=(N+1)*(M+1)
for j in range(M):
 for i in range(N):
  a=j*(N+1)+i;b=a+N+1
  faces.append((a,a+1,b+1,b))
  faces.append((stride+a,stride+b,stride+b+1,stride+a+1))
for j in range(M):
 a=j*(N+1);b=(j+1)*(N+1)
 faces.extend([(a,b,stride+b,stride+a),(a+N,stride+a+N,stride+b+N,b+N)])
for i in range(N):
 faces.extend([(i,stride+i,stride+i+1,i+1),
               (M*(N+1)+i,M*(N+1)+i+1,stride+M*(N+1)+i+1,stride+M*(N+1)+i)])
objmesh('FALLING_MAGMA_CASCADE',verts,faces,dense_lava,uv,smooth=True)

# V15: real supporting basalt volume between the old cliff and the lava.
# This restores a readable molten face without a hovering side-view sheet.
# Keep every original cliff/rock mesh and add a locally eroded vertical bed.
back_verts=[];back_uv=[];back_faces=[];rows=96;cols=12
for surface in range(2):
 for j in range(rows+1):
  t=j/rows;cx,yy,zz,w=fall_path(t)
  for i in range(cols+1):
   u=i/cols
   x=cx+(u-.5)*2*w*1.48
   # Fractured supporting bed protrudes from the old rear cliff.
   noise=.045*sin(t*13+u*7)+.024*sin(t*31-u*13)
   z=zz-(.12 if surface==0 else .60)+noise
   y=yy+.05*sin(u*6+t*7)
   back_verts.append((x,y,z));back_uv.append((x*.32,yy*.42))
bs=(rows+1)*(cols+1)
for j in range(rows):
 for i in range(cols):
  a=j*(cols+1)+i;b=a+cols+1
  back_faces.append((a,a+1,b+1,b))
  back_faces.append((bs+a,bs+b,bs+b+1,bs+a+1))
for j in range(rows):
 a=j*(cols+1);b=(j+1)*(cols+1)
 back_faces.extend([(a,b,bs+b,bs+a),
                    (a+cols,bs+a+cols,bs+b+cols,b+cols)])
for i in range(cols):
 back_faces.extend([(i,bs+i,bs+i+1,i+1),
                    (rows*(cols+1)+i,rows*(cols+1)+i+1,bs+rows*(cols+1)+i+1,bs+rows*(cols+1)+i)])
objmesh('V15_FRACTURED_CLIFF_SUPPORT_BEHIND_FALL',
        back_verts,back_faces,basalt,back_uv,smooth=False)
# Two banks of dark cooling crust obscure the hard edge where the
# molten stream meets the basalt support, but leave the center molten.
for side in (-1,1):
 v=[];uvs=[];f=[]
 for j in range(65):
  t=j/64;cx,y,z,w=fall_path(t)
  for u in (.82,.99):
   x=cx+side*w*u
   v.append((x,y,z+.015+.022*sin(t*14+side*3)));uvs.append((u,t))
 for j in range(64):f.append((2*j,2*j+1,2*j+3,2*j+2))
 objmesh('V15_ATTACHED_COOLING_MARGIN',v,f,crust,uvs,smooth=False)

# Solidifying irregular crust embedded in the flow, not floating line work.
for k in range(16):
 t0=.045+R.uniform(0,.82);u0=R.uniform(.11,.89)
 dt=R.uniform(.028,.115);du=R.uniform(.055,.20)
 n=9;v=[];f=[];uvs=[]
 for j in range(n):
  a=2*pi*j/n
  t=min(.97,max(.02,t0+dt*cos(a)*(1+.20*sin(a*3+k))))
  u=min(.97,max(.03,u0+du*sin(a)*(1+.14*sin(a*5+k))))
  x,y,z=fall_xyz(t,u,True)
  v.append((x,y,z+.009));uvs.append((u,t))
 cx=sum(q[0] for q in v)/n;cy=sum(q[1] for q in v)/n;cz=sum(q[2] for q in v)/n
 v.insert(0,(cx,cy,cz+.014));uvs.insert(0,(u0,t0))
 for j in range(1,n+1):f.append((0,j,1 if j==n else j+1))
 objmesh('V14_EMBEDDED_COOLING_SKIN',v,f,crust,uvs,smooth=False)
# Few short fissures, not continuous luminous rods.
for k in range(8):
 t0=.075+R.uniform(0,.78);span_t=R.uniform(.045,.15);u0=R.uniform(.17,.83)
 v=[];uvs=[];f=[]
 for j in range(14):
  t=t0+span_t*j/13;u=u0+.02*sin(j*.38+k)
  for sign in (-1,1):
   x,y,z=fall_xyz(t,u+sign*(.006+.004*sin(j*.31+k)),True)
   v.append((x,y,z+.019));uvs.append((j/13,0 if sign<0 else 1))
 for j in range(13):f.append((2*j,2*j+1,2*j+3,2*j+2))
 objmesh('V14_INTERRUPTED_MOLTEN_FISSURE',v,f,hot if k%3 else hot2,uvs)
# Rounded, heavy melt lobes sink into the receiving pool.
for k in range(12):
 a=2*pi*k/12;cx,yy,zz,w=fall_path(1)
 x=cx+.33*cos(a);z=zz+.28*sin(a)
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=(x,.16+.018*sin(k*1.9),z))
 o=bpy.context.object;o.name='V14_VISCOUS_IMPACT_LOBE';parent(o)
 o.scale=(.12+.035*sin(k),.036+.012*cos(k*2),.16+.04*cos(k))
 o.data.materials.append(dense_lava if k%3 else crust)
# Bright thin rivulets in fissures of the upper wall and near the riverbank.
for i in range(16):
 z=R.uniform(-2.9,2.8);side=R.choice([-1,1])
 x=edge(z,side)+side*.05
 bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=1,location=(x,.23,z))
 o=bpy.context.object;o.name='BANK_RED_HOT_FISSURE';parent(o);o.scale=(.025,.015,R.uniform(.10,.26));o.data.materials.append(hot)
# Small glowing lava splashes near cascade impact; subtle not glitter storm.
for i in range(14):
 x=-.42+R.gauss(0,.28);z=-2.75+R.gauss(0,.28)
 y=.30+R.random()*.70
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=R.uniform(.015,.043),location=(x,y,z))
 o=bpy.context.object;o.name='MOLTEN_SPRAY';parent(o);o.data.materials.append(hot2)

# V13: emissive droplets with restrained size/height variation at the impact.
# Static render proof; real-time motion requires separate Three.js implementation.
for i in range(18):
 angle=R.uniform(0,2*math.pi)
 rr=R.uniform(.06,.42)
 x=-.345+rr*math.cos(angle)
 z=-2.78+rr*math.sin(angle)
 y=.26+R.random()**2*.92
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=R.uniform(.009,.028),location=(x,y,z))
 o=bpy.context.object;o.name='V13_IMPACT_EMBER';parent(o)
 o.data.materials.append(hot if i%4 else hot2)
# Heat haze: transparent cards are excluded from the GLB to avoid fake static fog;
# animated distortion will be specified in Claude's VFX handoff.

# V10 geological detail: original river, bank and every V9 rock remain intact.
# Add real stepped strata, fractured basalt slabs and local contact rubble,
# rather than a new blanket of smooth spheres or random triangle confetti.
fracture=mat('Recessed_fracture_dark',(.043,.036,.034),.99)
weathered=mat('Weathered_shear_face',(.115,.105,.099),.93,
 texture=tex+'ashen_stone_albedo.png',normal=tex+'ashen_stone_normal.png',roughmap=tex+'ashen_stone_roughness.png')
def slab(name,x,y,z,rx,rz,depth,seed,material=basalt):
 rng=random.Random(seed)
 # Polygonal shear slab: near-planar weathered top, steep broken sidewalls.
 n=11;verts=[];uv=[];faces=[]
 ang0=rng.uniform(-pi,pi)
 for j in range(2):
  for i in range(n):
   a=2*pi*i/n+ang0
   k=1+.16*sin(a*3+seed*.17)+.095*sin(a*5-seed*.31)+rng.uniform(-.065,.065)
   xx=x+rx*cos(a)*k
   zz=z+rz*sin(a)*k
   yy=y+(0 if j==0 else -depth)+.028*sin(a*4+seed)+.019*sin(a*9-seed)
   verts.append((xx,yy,zz));uv.append((xx*.28,zz*.28))
 for i in range(1,n-1):faces.append((0,i,i+1))
 for i in range(n):
  a=i;b=(i+1)%n;faces.append((a,b,b+n,a+n))
 ob=objmesh(name,verts,faces,material,uv,smooth=False)
 return ob
# Banks have long weathered bedrock ledges rather than piles of identical rounded stones.
for side in (-1,1):
 for k in range(18):
  z=-3.04+k*.36+R.uniform(-.12,.12)
  x=edge(z,side)+side*(.24+R.uniform(.05,.78))
  y=ground_y(x,z)+.065+R.uniform(.015,.13)
  slab('V10_BEDROCK_SHEAR_PLATE',(x),y,z,
       R.uniform(.18,.44),R.uniform(.27,.66),R.uniform(.045,.16),500+k+side*57,
       basalt if k%5 else weathered)
 # Buried fragments around large masses; not bright floating pebbles.
 for k in range(12):
  z=R.uniform(-3.10,3.08)
  x=edge(z,side)+side*R.uniform(.24,1.60)
  y=ground_y(x,z)+.017
  slab('V10_BURIED_TALUS',x,y,z,R.uniform(.075,.20),
       R.uniform(.12,.31),R.uniform(.045,.12),830+k+side*93,basalt)
# Add eroded horizontal seams and displaced plates to the continuous rear cliff.
# These are shallow interlocking rock strata with variable thickness and stagger.
for band in range(5):
 y0=.44+band*.47+R.uniform(-.055,.055)
 for k in range(6):
  x=-2.05+k*.79+R.uniform(-.12,.12)
  z=-3.65+.09*sin(x*2.2+band)
  slab('V10_REAR_BASALT_STRATUM',x,y0,z,
       R.uniform(.38,.61),R.uniform(.14,.25),R.uniform(.055,.13),
       1000+band*17+k,weathered if (k+band)%6==0 else basalt)
# Sparse black recessed fracture wedges, following changes in bedding direction.
# Keep cracks local and discontinuous; avoid painted repeated parallel lines.
for side in (-1,1):
 for k in range(9):
  z=-2.85+k*.68+R.uniform(-.17,.17)
  x=edge(z,side)+side*R.uniform(.48,1.23)
  yy=ground_y(x,z)+.06
  length=R.uniform(.17,.47)
  dx=side*R.uniform(.03,.13)
  vs=[(x,yy,z),(x+dx,yy-.014,z+length*.45),
      (x+dx+side*.019,yy-.015,z+length*.48),
      (x+side*.026,yy,z+.025)]
  objmesh('V10_LOCAL_BASALT_FRACTURE',vs,[(0,1,2,3)],fracture,
          [(0,0),(.8,1),(1,1),(.15,0)],smooth=False)


# V11 color/normal realism: project-original dark charcoal basalt PBR.
# Keep original rock geometry and V10 added strata, but replace the pale
# clay-like boulder surface with the project's own dark weathered volcanic stone.
charcoal_dir='assets/textures/floor4/basalt-charcoal-01/'
dark_basalt=mat('V11_Dark_Charcoal_Basalt',(0.13,.115,.109),.94,
 texture=charcoal_dir+'basecolor.png',normal=charcoal_dir+'normal.png',
 roughmap=charcoal_dir+'roughness.png')
dark_boulder_names={
 'BANK_LARGE_WEATHERED_ROCK','CAVERN_ROCK_FACE',
 'REAR_IRREGULAR_BASALT_OVERHANG','FALL_SOURCE_EMBEDDED_BASALT',
 'V10_BEDROCK_SHEAR_PLATE','V10_BURIED_TALUS','V10_REAR_BASALT_STRATUM'
}
for o in bpy.data.objects:
 if o.type=='MESH' and o.name.split('.')[0] in dark_boulder_names:
  if len(o.data.materials):o.data.materials[0]=dark_basalt
  else:o.data.materials.append(dark_basalt)


# V12: integrate fractured caps with the retained original large boulders.
# Earlier strata lay on the ground; these caps break the smooth boulder silhouettes.
for o in list(bpy.data.objects):
 if o.type!='MESH':continue
 if o.name.split('.')[0]=='BANK_LARGE_WEATHERED_ROCK':
  x,y,z=o.location;sx,sy,sz=o.scale
  # Two asymmetrical fractured faces, both embedded into the source boulder.
  capseed=sum(ord(c) for c in o.name)+int(z*113)
  slab('V12_EMBEDDED_BASALT_CLEAVAGE',x+sx*.18,y+sy*.68,z+sz*.12,
       sx*.85,sz*.91,sy*1.04,capseed,dark_basalt)
# Broken rear-cliff faces: vertical, stepped and oblique, not horizontal shelves.
def wall_shear(name,x,y,z,w,h,thick,seed):
 rng=random.Random(seed)
 n=12;vs=[];uv=[];fs=[]
 # Front and rear contours with irregular angular facets.
 for layer in range(2):
  for i in range(n):
   a=2*pi*i/n
   rad=1+.11*sin(a*4+seed*.3)+rng.uniform(-.08,.08)
   xx=x+w*.5*cos(a)*rad
   yy=y+h*.5*sin(a)*rad
   zz=z+(thick*.5 if layer==0 else -thick*.5)+.045*sin(a*5+seed)
   vs.append((xx,yy,zz));uv.append((xx*.29,yy*.29))
 for i in range(1,n-1):fs.append((0,i,i+1))
 for i in range(n):
  a=i;b=(i+1)%n
  fs.append((a,b,b+n,a+n))
 return objmesh(name,vs,fs,dark_basalt,uv,smooth=False)
for k in range(15):
 x=-2.0+(k%5)*.96+R.uniform(-.13,.13)
 y=.48+(k//5)*.83+R.uniform(-.13,.13)
 z=-3.60+R.uniform(-.13,.15)
 wall_shear('V12_CLIFF_SHEAR_FACE',x,y,z,
            R.uniform(.45,.88),R.uniform(.43,.89),R.uniform(.06,.20),
            1600+k)

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
area('V13_LAVA_FALL_WARM_RIM',(-.4,1.30,-3.05),240,(1,.21,.035),2.1)
area('V13_IMPACT_BOUNCE',(-.35,.46,-2.60),155,(1,.29,.06),2.5)
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
