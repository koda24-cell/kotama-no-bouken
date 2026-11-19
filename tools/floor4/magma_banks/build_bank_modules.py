"""B4 standalone basalt bank and lava-channel candidates P1/P2/P3.
Approved V16 remains untouched. Blender 3.x+, Z-up. NOT_APPROVED.
"""
import bpy,math,random,sys,os,json,hashlib
import numpy as np
from math import sin,cos,pi,exp
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
def arg(k,d):return args[args.index(k)+1] if k in args else d
pattern=arg('--pattern','p1')
assert pattern in ('p1','p2','p3')
out=arg('--out','render-output')
os.makedirs(out,exist_ok=True)
rng=random.Random(20261117+int(pattern[-1])*197)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
root=bpy.data.objects.new('B4_BANK_'+pattern.upper(),None)
bpy.context.collection.objects.link(root)
def link(name,verts,faces,mat,uv=None,smooth=False):
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
 ob=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(ob)
 ob.parent=root;ob.data.materials.append(mat)
 if uv:
  lay=mesh.uv_layers.new(name='UVMap')
  for poly in mesh.polygons:
   for li in poly.loop_indices:
    vid=mesh.loops[li].vertex_index
    lay.data[li].uv=uv[vid]
 for poly in mesh.polygons:poly.use_smooth=smooth
 return ob
def material(name,color,rough=.9,emission=0,albedo=None,normal=None):
 m=bpy.data.materials.new(name);m.use_nodes=True
 nodes=m.node_tree.nodes;bs=nodes.get('Principled BSDF')
 bs.inputs['Base Color'].default_value=(*color,1)
 bs.inputs['Roughness'].default_value=rough
 if albedo:
  im=nodes.new('ShaderNodeTexImage');im.image=bpy.data.images.load(os.path.abspath(albedo),check_existing=True)
  shade=nodes.new('ShaderNodeMixRGB');shade.blend_type='MULTIPLY'
  shade.inputs[0].default_value=1.0
  factor=.32 if 'Crust' in name else (.48 if 'Basalt' in name else .56)
  shade.inputs[2].default_value=(factor,factor,factor,1)
  m.node_tree.links.new(im.outputs['Color'],shade.inputs[1])
  m.node_tree.links.new(shade.outputs['Color'],bs.inputs['Base Color'])
 if normal:
  im=nodes.new('ShaderNodeTexImage');im.image=bpy.data.images.load(os.path.abspath(normal),check_existing=True)
  im.image.colorspace_settings.name='Non-Color'
  nm=nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.55
  m.node_tree.links.new(im.outputs['Color'],nm.inputs['Color'])
  m.node_tree.links.new(nm.outputs['Normal'],bs.inputs['Normal'])
 if emission:
  try:bs.inputs['Emission'].default_value=(*color,1)
  except KeyError:bs.inputs['Emission Color'].default_value=(*color,1)
  bs.inputs['Emission Strength'].default_value=emission
 return m
tex='assets/3d/dungeons/b4_dragonfire/textures/'
basalt=material('B4_PBR_Existing_Basalt',(.11,.10,.095),.96,albedo=tex+'volcanic_basalt_albedo.png',normal=tex+'volcanic_basalt_normal.png')
ash=material('B4_PBR_Existing_Ash',(.10,.09,.085),.98,albedo=tex+'ashen_stone_albedo.png',normal=tex+'ashen_stone_normal.png')
crust=material('B4_Black_Cooling_Crust',(.038,.034,.031),.99,albedo=tex+'volcanic_basalt_albedo.png',normal=tex+'volcanic_basalt_normal.png')
glow=material('B4_RedHot_Fracture',(1,.18,.018),.86,emission=1.5)
# Original generated heat map, warped irregular cell fractures, no water-wave normal.
n=384
grid=np.random.default_rng(1157)
noise=grid.random((n,n)).astype(np.float32)
noise2=grid.random((n,n)).astype(np.float32)
xx,yy=np.meshgrid(np.arange(n)/n,np.arange(n)/n,indexing='ij')
wx=xx*6+(noise-.5)*.35;wy=yy*6+(noise2-.5)*.35
ix=np.floor(wx).astype(np.int32);iy=np.floor(wy).astype(np.int32)
jit=grid.random((6,6,2))
d1=np.full((n,n),100,dtype=np.float32)
d2=np.full((n,n),100,dtype=np.float32)
for a in (-1,0,1):
 for b in (-1,0,1):
  cx=ix+a;cy=iy+b
  px=cx+.15+.7*jit[cx%6,cy%6,0]
  py=cy+.15+.7*jit[cx%6,cy%6,1]
  d=(wx-px)**2+(wy-py)**2
  d2=np.where(d<d1,d1,np.minimum(d2,d))
  d1=np.minimum(d1,d)
fissure=np.clip(1-(np.sqrt(d2)-np.sqrt(d1))*5.3,0,1)**2.0
heat=np.clip(.15+.68*fissure+.12*noise-.15*noise2,0,1)
rgb=np.stack((.07+.84*heat,.012+.27*heat**1.5,.004+.055*heat),axis=-1)
rgba=np.concatenate((rgb,np.ones((n,n,1),dtype=np.float32)),axis=-1)
image=bpy.data.images.new('B4_P1P3_Original_Thermal',width=n,height=n,alpha=True)
image.pixels.foreach_set(rgba.astype(np.float32).ravel());image.pack()
lava=material('B4_Viscous_Molten_Rock',(.7,.10,.015),.90)
bs=lava.node_tree.nodes.get('Principled BSDF')
im=lava.node_tree.nodes.new('ShaderNodeTexImage');im.image=image
lava.node_tree.links.new(im.outputs['Color'],bs.inputs['Base Color'])
im2=lava.node_tree.nodes.new('ShaderNodeTexImage');im2.image=image
try:lava.node_tree.links.new(im2.outputs['Color'],bs.inputs['Emission'])
except KeyError:lava.node_tree.links.new(im2.outputs['Color'],bs.inputs['Emission Color'])
bs.inputs['Emission Strength'].default_value=1.5
def smooth(t):
 t=max(0,min(1,t));return t*t*(3-2*t)
def shift(y):return .26*sin(y*1.23+.4)+.12*sin(y*2.8-.2)
def branches(y):
 if pattern=='p1':return [(shift(y),.24+.065*sin(y*2.2)**2)]
 if pattern=='p2':
  div=smooth((y+.20)/1.5)
  if y<-.15:return [(shift(y),.37)]
  return [(shift(y)-.72*div,.20+.025*sin(y*2.2)**2),(shift(y)+.72*div,.20+.03*sin(y*1.8)**2)]
 return [(shift(y)*.7,.38+.06*sin(y*1.6)**2)]
def terrace(y):return .54*smooth((y-.15)/.66) if pattern=='p3' else 0
def bed(x,y):
 low=.08+.065*sin(x*2.1+y*.8)*sin(y*2.3-x*.6)+.025*sin(x*8.1+y*5.6)
 # Bedrock rises above molten rock, with a recessed valley.
 gap=min(max(0,abs(x-c)-w) for c,w in branches(y))
 trench=.22*exp(-(gap/.16)**2)
 return low+terrace(y)+.21-trench
def molten_z(x,y):return .105+terrace(y)+.015*sin(y*2.2+x*.8)
# Solid terrain: top and perimeter walls, no floating infinitely thin floor.
verts=[];uv=[];faces=[];N=116
for j in range(N+1):
 y=-2.35+4.7*j/N
 for i in range(N+1):
  x=-2.35+4.7*i/N
  z=bed(x,y)
  verts.append((x,y,z));uv.append((x*.25,y*.25))
for j in range(N):
 for i in range(N):
  a=j*(N+1)+i;b=a+N+1
  faces.append((a,a+1,b+1,b))
link('B4_SOLID_ERODED_BASALT_BANK',verts,faces,basalt,uv,True)
# Underlying rock volume walls have irregular lower contour.
for side in (-1,1):
 vs=[];uv=[];fs=[]
 for j in range(N+1):
  y=-2.35+4.7*j/N;x=side*2.35
  vs.extend(((x,y,bed(x,y)),(x,y,-.30-.05*sin(y*3.3+side))))
  uv.extend(((y*.2,0),(y*.2,1)))
 for j in range(N):
  a=2*j;fs.append((a,a+1,a+3,a+2))
 link('B4_BANK_SOLID_SIDEWALL',vs,fs,ash,uv)
for side in (-1,1):
 vs=[];uv=[];fs=[]
 for j in range(N+1):
  x=-2.35+4.7*j/N;y=side*2.35
  vs.extend(((x,y,bed(x,y)),(x,y,-.30-.05*sin(x*3.1+side))))
  uv.extend(((x*.2,0),(x*.2,1)))
 for j in range(N):
  a=2*j;fs.append((a,a+1,a+3,a+2))
 link('B4_BANK_SOLID_ENDWALL',vs,fs,ash,uv)
# Connected lava surfaces and embedded cooling shoulders.
segments=[(-2.33,2.33)] if pattern!='p2' else [(-2.33,-.13),(-.13,2.33)]
for seg_index,(start,end) in enumerate(segments):
 channel_count=2 if pattern=='p2' and seg_index==1 else 1
 for channel in range(channel_count):
  vs=[];uv=[];fs=[];nx=18;ny=154
  for j in range(ny+1):
   y=start+(end-start)*j/ny
   ch=branches(y)
   c,w=ch[min(channel,len(ch)-1)]
   for i in range(nx+1):
    t=i/nx;x=c+(2*t-1)*w
    z=molten_z(x,y)+.008*sin(y*6.1+x*2.4)
    vs.append((x,y,z));uv.append((t*.95,(y+2.35)*.36))
  for j in range(ny):
   for i in range(nx):
    a=j*(nx+1)+i;b=a+nx+1;fs.append((a,a+1,b+1,b))
  link('B4_MOLTEN_CHANNEL_'+str(channel),vs,fs,lava,uv,True)
  for side in (-1,1):
   vs=[];uv=[];fs=[]
   for j in range(ny+1):
    y=start+(end-start)*j/ny
    ch=branches(y);c,w=ch[min(channel,len(ch)-1)]
    for u in (0,.55,1):
     x=c+side*(w*(.85+u*.45))
     z=molten_z(x,y)+.018+(u*.12)
     z+=.014*sin(y*9+side*3+u*7)
     vs.append((x,y,z));uv.append((y*.2,u*.4))
   for j in range(ny):
    for i in range(2):
     a=j*3+i;b=a+3;fs.append((a,a+1,b+1,b))
   link('B4_CONTACT_COOLING_CRUST',vs,fs,crust,uv)
# V2: broad irregular cooling crust rafts over the molten surface, rather
# than uninterrupted thin red stripes that resemble flowing water.
for i in range(28):
 y=rng.uniform(-2.15,2.15)
 ch=branches(y)
 c,w=ch[i%len(ch)]
 x=c+rng.uniform(-.47,.47)*w
 rx=rng.uniform(.075,.17)*min(1,w/.25)
 ry=rng.uniform(.11,.28)
 verts=[(x, y, molten_z(x,y)+.024)]
 uv=[(x*.27,y*.27)]
 for k in range(16):
  a=2*pi*k/16
  r=1+.17*sin(a*5+i*.7)+.10*sin(a*9+i)
  px=x+rx*cos(a)*r;py=y+ry*sin(a)*r
  near=branches(py)
  if min(abs(px-cc)-ww for cc,ww in near)>.01:
   px=x+(px-x)*.78
  verts.append((px,py,molten_z(px,py)+.025+.004*sin(a*7)))
  uv.append((px*.27,py*.27))
 faces=[(0,k+1,k+2) for k in range(0,15)]
 faces.append((0,16,1))
 link('B4_V2_LARGE_COOLING_CRUST_RAFT',verts,faces,crust,uv,False)
# Irregular extruded stone plates, embedded into existing ground.
def stone(name,x,y,rx,ry,height,seed,mat):
 R=random.Random(seed);n=13;vs=[];uv=[];fs=[]
 z=bed(x,y)-.15
 angle=R.uniform(-pi,pi)
 for layer in (0,1):
  for k in range(n):
   a=2*pi*k/n
   rad=1+.14*sin(a*5+seed)+R.uniform(-.13,.13)
   xx=x+rx*rad*cos(a+angle)
   yy=y+ry*rad*sin(a+angle)
   zz=z+(height if layer else -.12)+.025*sin(a*7+seed)
   vs.append((xx,yy,zz));uv.append((xx*.27,yy*.27))
 for k in range(1,n-1):fs.append((n,n+k,n+k+1))
 for k in range(n):
  a=k;b=(k+1)%n;fs.append((a,b,b+n,a+n))
 return link(name,vs,fs,mat,uv,False)
for i in range(50):
 y=rng.uniform(-2.2,2.2);x=rng.uniform(-2.25,2.25)
 clearance=min(abs(x-c)-w for c,w in branches(y))
 if clearance<.14:continue
 scale=rng.uniform(.15,.43)
 if i%9==0:scale*=1.55
 stone('B4_BURIED_FRACTURED_BASALT',x,y,scale*rng.uniform(.75,1.55),
       scale*rng.uniform(.7,1.45),rng.uniform(.13,.22),i+50,basalt)
# Fewer, larger oblique fractured plates, not pebble confetti.
for i in range(10):
 y=-2.1+i*.45+rng.uniform(-.18,.18)
 side=-1 if i%2 else 1
 c,w=branches(y)[0]
 x=c+side*(w+.48+rng.uniform(0,.40))
 stone('B4_LARGE_EMBEDDED_STRATA',x,y,rng.uniform(.32,.57),
       rng.uniform(.22,.42),rng.uniform(.14,.24),300+i,ash)
# Thermal seams are mostly buried; avoid floating glow spheres.
for i in range(12):
 y=rng.uniform(-2.1,2.1)
 c,w=branches(y)[0]
 side=-1 if i%2 else 1
 x=c+side*(w+.14+rng.uniform(0,.15))
 z=bed(x,y)+.009
 verts=[(x-.018,y-.11,z),(x+.02,y-.12,z+.004),
        (x+.03,y+.11,z),(x-.01,y+.13,z+.002)]
 link('B4_EMBEDDED_HEAT_FISSURE',verts,[(0,1,2,3)],glow,
      [(0,0),(1,0),(1,1),(0,1)])
# Distinct P3 basalt step with extra broken overhang.
if pattern=='p3':
 for i in range(9):
  x=-2.05+i*.49+rng.uniform(-.10,.10)
  y=.36+.08*sin(i*2.1)
  stone('B4_STEPPED_BASALT_LEDGE',x,y,.22+rng.random()*.15,.25,.19,710+i,basalt)
# Lighting and camera, review only (excluded from export).
world=bpy.data.worlds.new('B4_Cavern_World');bpy.context.scene.world=world
world.use_nodes=True
world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.055,.063,.075,1)
world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.55
def area(name,loc,power,color,size):
 ld=bpy.data.lights.new(name,'AREA');ld.energy=power;ld.color=color;ld.shape='DISK';ld.size=size
 o=bpy.data.objects.new(name,ld);bpy.context.collection.objects.link(o)
 o.location=loc;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
area('Lava_warm_light',(0,0,3.8),650,(1,.37,.12),5)
area('Cave_cold_fill',(3.8,-1.5,4.2),900,(.38,.48,.70),6)
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=18;scene.cycles.use_denoising=False;bpy.context.view_layer.cycles.use_denoising=False
scene.render.resolution_x=840;scene.render.resolution_y=630;scene.render.resolution_percentage=100
scene.view_settings.view_transform='Filmic'
def camera(name,loc,target,lens=41):
 data=bpy.data.cameras.new(name);o=bpy.data.objects.new(name,data)
 bpy.context.collection.objects.link(o);o.location=loc
 o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
 data.lens=lens;return o
views=[
 ('angle',(5.7,-7.0,5.6),(0,0,.12)),
 ('front',(0,-8.2,3.8),(0,0,.13)),
 ('side',(8.2,0,2.7),(0,0,.11)),
 ('top',(0,0,10),(0,0,.11))
]
stem='b4-magma-bank-'+pattern+'-v2'
for view,loc,target in views:
 scene.camera=camera('REVIEW_'+view,loc,target)
 scene.render.filepath=os.path.join(out,stem+'-'+view+'.png')
 bpy.ops.render.render(write_still=True)
bpy.ops.object.select_all(action='DESELECT')
objects=[o for o in bpy.data.objects if o.type=='MESH' and not o.name.startswith('REVIEW_')]
for o in objects:o.select_set(True)
bpy.context.view_layer.objects.active=objects[0]
bpy.ops.export_scene.gltf(filepath=os.path.join(out,stem+'.glb'),export_format='GLB',use_selection=True,export_apply=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,stem+'.blend'))
files=[]
for f in sorted(os.listdir(out)):
 if f.startswith(stem):
  p=os.path.join(out,f)
  files.append({'file':f,'bytes':os.path.getsize(p),'sha256':hashlib.sha256(open(p,'rb').read()).hexdigest()})
with open(os.path.join(out,'manifest-'+pattern+'.json'),'w') as f:
 json.dump({'asset_id':stem,'approval':'NOT_APPROVED','pattern':pattern,
 'source':'tools/floor4/magma_banks/build_bank_modules.py',
 'parent_approved':'assets/models/floor4/b4-magma-river-v16.glb',
 'game_integration':'NOT_STARTED','files':files},f,indent=2)
print('B4 bank candidate exported',pattern,len(files),'files')
