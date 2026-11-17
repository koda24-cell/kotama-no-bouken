# V2 visual corrections: asymmetrical confluence, volumetric fall, geological fissures.
"""Five standalone Stage-4 lava GLBs. No surrounding terrain; original thermal maps and cooling crust are integral lava only.
Run: blender -b -t 2 --python tools/floor4/lava_modules/build_lava_modules.py -- --out render-output --variant v1
"""
import bpy, math, random, os, sys, json, hashlib
import numpy as np
from math import sin, cos, pi
from mathutils import Vector
R=random.Random(20261117)
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
out=args[args.index('--out')+1] if '--out' in args else 'render-output'
variant=args[args.index('--variant')+1] if '--variant' in args else 'v1'
os.makedirs(out,exist_ok=True)
TEX='assets/3d/dungeons/b4_dragonfire/textures/'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for m in list(bpy.data.materials):bpy.data.materials.remove(m)
def make_thermal(name,emission=False):
 n=512; rng=np.random.default_rng(92001)
 def noise(freq):
  g=rng.random((freq,freq)).astype(np.float32)
  u=np.arange(n,dtype=np.float32)*freq/n;a=np.floor(u).astype(int);t=u-a;t=t*t*(3-2*t)
  ix=a[:,None];iy=a[None,:];tx=t[:,None];ty=t[None,:]
  return (g[ix%freq,iy%freq]*(1-tx)+g[(ix+1)%freq,iy%freq]*tx)*(1-ty)+(g[ix%freq,(iy+1)%freq]*(1-tx)+g[(ix+1)%freq,(iy+1)%freq]*tx)*ty
 a=noise(4);b=noise(11);c=noise(27);d=noise(65)
 yy,xx=np.mgrid[0:n,0:n].astype(np.float32)/n
 warp=.13*(b-.5)+.05*(c-.5)
 vein=np.maximum(0,1-np.abs(np.sin((xx+warp)*17+yy*4.3+c*2.1))/.35)
 heat=np.clip((.42*a+.25*b+.18*c+.15*vein-.27)*3.2,0,1)**1.55
 heat*=1-.65*np.clip((a-.65)*3.0,0,1)
 if emission: rgb=np.stack((heat,.35*heat**1.3,.045*heat),axis=-1)
 else:rgb=np.stack((.055+.93*heat,.012+.40*heat**1.35,.008+.065*heat),axis=-1)
 rgba=np.concatenate((np.clip(rgb,0,1),np.ones((n,n,1),dtype=np.float32)),axis=-1).astype(np.float32)
 img=bpy.data.images.new(name,width=n,height=n,alpha=True)
 img.pixels.foreach_set(rgba.ravel());img.file_format='PNG'
 img.filepath_raw=os.path.abspath(os.path.join(out,name+'.png'))
 img.save();return img
heat_color=make_thermal('b4_lava_thermal_base')
heat_emission=make_thermal('b4_lava_thermal_emission',True)
def mat(name,color,rough=.85,em=0,base_image=None,em_image=None,normal=None,rough_image=None):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 nodes=m.node_tree.nodes;links=m.node_tree.links;bs=nodes.get('Principled BSDF')
 bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough
 bs.inputs['Emission Color'].default_value=(*color,1);bs.inputs['Emission Strength'].default_value=em
 if base_image:
  t=nodes.new('ShaderNodeTexImage');t.image=base_image;links.new(t.outputs['Color'],bs.inputs['Base Color'])
 if em_image:
  t=nodes.new('ShaderNodeTexImage');t.image=em_image;links.new(t.outputs['Color'],bs.inputs['Emission Color'])
 if normal:
  t=nodes.new('ShaderNodeTexImage');t.image=bpy.data.images.load(os.path.abspath(TEX+normal),check_existing=True)
  t.image.colorspace_settings.name='Non-Color'
  n=nodes.new('ShaderNodeNormalMap');n.inputs['Strength'].default_value=.47
  links.new(t.outputs['Color'],n.inputs['Color']);links.new(n.outputs['Normal'],bs.inputs['Normal'])
 if rough_image:
  t=nodes.new('ShaderNodeTexImage');t.image=bpy.data.images.load(os.path.abspath(TEX+rough_image),check_existing=True)
  t.image.colorspace_settings.name='Non-Color';links.new(t.outputs['Color'],bs.inputs['Roughness'])
 m.use_backface_culling=False
 return m
lava=mat('Lava_thermal_PBR',(1,.28,.03),.56,1.8,heat_color,heat_emission,'molten_lava_normal.png','molten_lava_roughness.png')
crust=mat('Lava_cooling_crust_PBR',(.055,.046,.042),.94,0,bpy.data.images.load(os.path.abspath(TEX+'volcanic_basalt_albedo.png'),check_existing=True),normal='volcanic_basalt_normal.png',rough_image='volcanic_basalt_roughness.png')
hot=mat('Fresh_rupture_hot',(1,.24,.016),.48,3.3)
hotdim=mat('Cooling_crust_internal_fissure',(.93,.17,.018),.61,1.65)
coal=mat('REVIEW_studio_floor',(.045,.046,.055),.92)
def mesh(name,verts,faces,material,uv=None):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update()
 ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob);ob.data.materials.append(material)
 if uv:
  layer=me.uv_layers.new()
  for poly in me.polygons:
   for li in poly.loop_indices:
    v=me.loops[li].vertex_index;layer.data[li].uv=uv[v]
 for f in me.polygons:f.use_smooth=True
 return ob
def path_ribbon(name,fn,wfn,material=lava,N=144,M=22,offset=0,uvscale=1.0):
 verts=[];uv=[];faces=[]
 for j in range(N+1):
  t=j/N;x,y,z=fn(t)
  t0=max(0,t-.002);t1=min(1,t+.002)
  a=fn(t0);b=fn(t1);dx=b[0]-a[0];dy=b[1]-a[1];ll=max(.0001,math.hypot(dx,dy))
  nx=-dy/ll;ny=dx/ll
  w=wfn(t)
  for i in range(M+1):
   u=i/M;side=2*u-1
   jitter=1+.045*sin(t*45+u*9)+.035*sin(t*111-u*5)
   xx=x+nx*side*w*jitter;yy=y+ny*side*w*jitter
   zz=z+offset+.014*sin(t*28+u*13)+.008*cos(t*71-u*21)
   verts.append((xx,yy,zz));uv.append((u*uvscale,t*2.1))
 for j in range(N):
  for i in range(M):
   a=j*(M+1)+i;b=a+M+1;faces.append((a,a+1,b+1,b))
 return mesh(name,verts,faces,material,uv)
def edge_cooling(prefix,fn,wfn,count=15):
 for side in (-1,1):
  for k in range(count):
   if k%5==3:continue
   t0=(k+.17)/count;t1=min(1,(k+.85)/count)
   verts=[];faces=[];uv=[]
   for j in range(9):
    t=t0+(t1-t0)*j/8;x,y,z=fn(t)
    a=fn(max(0,t-.003));b=fn(min(1,t+.003))
    dx=b[0]-a[0];dy=b[1]-a[1];ll=max(.0001,math.hypot(dx,dy))
    nx=-dy/ll;ny=dx/ll
    for u in (0,1):
     frac=.77+.19*u+.035*sin(j*1.8+k)
     verts.append((x+nx*side*wfn(t)*frac,y+ny*side*wfn(t)*frac,z+.038))
     uv.append((j/8,u))
   for j in range(8):a=2*j;faces.append((a,a+1,a+3,a+2))
   mesh(prefix+'_COOLED_EDGE_'+str(side)+'_'+str(k),verts,faces,crust,uv)
def pool(name,cx,cy,rx,ry,z=.07,material=lava,seed=1):
 verts=[];uv=[];faces=[];N=112;M=32
 for j in range(M+1):
  r=j/M
  for i in range(N+1):
   a=i*2*pi/N
   radius=1+.13*sin(a*5+seed)+.085*sin(a*9-seed*.7)+.038*sin(a*17+seed)
   x=cx+rx*r*radius*cos(a);y=cy+ry*r*radius*sin(a)
   verts.append((x,y,z+.014*sin(a*5+r*19)*r))
   uv.append((.5+(x-cx)/(rx*2.6),.5+(y-cy)/(ry*2.6)))
 for j in range(M):
  for i in range(N):
   a=j*(N+1)+i;b=a+N+1;faces.append((a,a+1,b+1,b))
 return mesh(name,verts,faces,material,uv)
def crust_islands(name,cx,cy,rx,ry,count,seed):
 rng=random.Random(seed)
 for k in range(count):
  ang=rng.uniform(0,2*pi);r=rng.uniform(.26,.84)
  x=cx+rx*r*cos(ang);y=cy+ry*r*sin(ang)
  sx=rng.uniform(.085,.27);sy=rng.uniform(.07,.20)
  vs=[(x,y,.12)];uv=[(.5,.5)];n=17
  for i in range(n+1):
   a=2*pi*i/n;rr=1+.16*sin(a*5+k)+.11*sin(a*9-k)
   vs.append((x+sx*rr*cos(a),y+sy*rr*sin(a),.115+.009*sin(a*3+k)))
   uv.append((.5+.48*cos(a),.5+.48*sin(a)))
  fs=[(0,i+1,i+2) for i in range(n)]
  mesh(name+'_CRUST_'+str(k),vs,fs,crust,uv)
def flow(name,fn,wfn):
 path_ribbon(name,fn,wfn)
 edge_cooling(name,fn,wfn)
def build_a():
 def fn(t):return (.52*sin(t*pi*2.1)+.19*sin(t*pi*5.4),-2.9+5.8*t,.065+.013*sin(t*18))
 def w(t):return .32+.16*sin(t*pi)**2+.085*sin(t*7*pi+.7)
 flow('A_SINUOUS_LAVA_STREAM',fn,w)
def build_b():
 def main(t):return (.19*sin(t*pi*2.1),-2.9+5.8*t,.064)
 def w(t):return .34+.10*sin(t*4*pi)**2
 flow('B_MAIN_CONFLUENCE',main,w)
 for side in (-1,1):
  def tributary(t,side=side):
   y=(-2.38 if side<0 else -1.76)+(3.18 if side<0 else 3.55)*t
   x=side*(2.50 if side<0 else 2.05)*(1-t)**(1.75 if side<0 else 2.65)+.19*sin((y+2.9)/5.8*2.1*pi)+.12*sin(t*9+side)*sin(t*pi)
   return (x,y,.078+.014*sin(t*12))
  def ww(t,side=side):return (.16 if side<0 else .20)+.08*t+.055*sin(t*pi)+.018*sin(t*12+side)
  flow('B_TRIBUTARY_'+str(side),tributary,ww)
def build_c():
 pool('C_IRREGULAR_MOLTEN_LAKE',0,0,2.28,1.77,seed=5)
 crust_islands('C_COOLING_RAFT',0,0,2.28,1.77,24,119)
 # A molten tongue connects the basin to a tile boundary.
 def outlet(t):return (.30+.24*sin(t*2.5),1.10+1.80*t,.065)
 flow('C_POOL_OUTLET',outlet,lambda t:.27+.13*t)
def build_d():
 # Vertical cascade in Z-up, no cliff geometry, for attachment to any rock wall.
 vs=[];uv=[];fs=[];N=110;M=28
 def center(t):return (-.25+.15*sin(t*5.5)+.055*sin(t*17),.10+.17*sin(t*2.8)+.24*t*t,3.15-3.05*t)
 def width(t):return .26+.11*sin(t*pi)+.22*t*t+.025*sin(t*23)
 for j in range(N+1):
  t=j/N;cx,cy,cz=center(t)
  for i in range(M+1):
   u=i/M;x=cx+(u-.5)*2*width(t)*(1+.045*sin(t*28+u*14))
   y=cy+.07*sin(u*pi*2+t*14)+.028*sin(t*38+u*19)
   vs.append((x,y,cz));uv.append((u,t*2.0))
 for j in range(N):
  for i in range(M):
   a=j*(M+1)+i;b=a+M+1;fs.append((a,a+1,b+1,b))
 mesh('D_VERTICAL_MAGMA_CASCADE',vs,fs,lava,uv)
 # Physical thickness is essential: the previous waterfall was nearly invisible edge-on.
 back=[(x,y+.19+.035*sin(z*5.1),z) for x,y,z in vs]
 back_faces=[tuple(reversed(f)) for f in fs]
 mesh('D_CASCADE_BACK_VOLUME',back,back_faces,lava,uv)
 walls=[];wall_uv=[];wall_faces=[]
 for edge in (0,M):
  for j in range(N+1):
   idx=j*(M+1)+edge
   walls.extend([vs[idx],back[idx]])
   wall_uv.extend([(0,j/N),(1,j/N)])
  base=len(walls)-2*(N+1)
  for j in range(N):
   a=base+j*2;wall_faces.append((a,a+1,a+3,a+2))
 mesh('D_CASCADE_LIQUID_SIDE_VOLUME',walls,wall_faces,lava,wall_uv)
 # Uneven raised streams break up the curtain silhouette without a rectangular sheet.
 for strand in range(3):
  ss=[];su=[];sf=[];steps=96
  for j in range(steps+1):
   t=j/steps;cx,cy,cz=center(t)
   for u in (0,1):
    xx=cx+(strand-1)*width(t)*.53+(u-.5)*(.075+.04*sin(t*9+strand))
    ss.append((xx,cy-.075-.03*sin(t*23+strand),cz));su.append((u,t*2))
  for j in range(steps):
   a=j*2;sf.append((a,a+1,a+3,a+2))
  mesh('D_RAISED_MOLTEN_RIVULET_'+str(strand),ss,sf,lava,su)
 for side in (-1,1):
  for k in range(13):
   if k%4==0:continue
   vs=[];uv=[];fs=[]
   for j in range(8):
    t=(k+.16+.62*j/7)/13;cx,cy,cz=center(t)
    for u in (0,1):
     x=cx+side*width(t)*(.78+.17*u)
     vs.append((x,cy+.08*sin(t*18)+.016,cz));uv.append((u,t))
   for j in range(7):a=j*2;fs.append((a,a+1,a+3,a+2))
   mesh('D_FALL_EDGE_COOLING_'+str(side)+'_'+str(k),vs,fs,crust,uv)
 pool('D_IMPACT_BASIN',-.18,.34,1.12,.90,.052,seed=12)
 for i in range(23):
  a=R.uniform(0,2*pi);r=R.uniform(.08,.58)
  bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=R.uniform(.015,.045),location=(-.18+r*cos(a),.35+r*sin(a),R.uniform(.13,.68)))
  o=bpy.context.object;o.name='D_STATIC_MOLTEN_SPRAY_'+str(i);o.data.materials.append(hot)
def build_e():
 pool('E_SUBSURFACE_GLOW',0,0,2.45,2.25,.025,seed=8)
 pool('E_DARK_COOLING_SHEET',0,0,2.42,2.22,.060,material=crust,seed=8)
 # Irregular fault network: offset fissures, branches and broken endpoints, not a radial magic sigil.
 faults=[
  ((-2.05,-.90),(-.55,-.28),(1.62,.36)),
  ((-.63,-1.88),(.18,-.42),(1.02,1.78)),
  ((-1.78,1.02),(-.32,.52),(.82,1.55)),
  ((.28,-1.52),(.82,-.78),(2.03,-.51)),
  ((-1.03,.16),(-1.48,1.05),(-1.18,1.85)),
  ((.66,.12),(1.37,.78),(1.83,1.31)),
  ((-1.85,-.12),(-1.42,-.40),(-.65,-.34)),
  ((.52,.75),(1.00,1.12),(1.28,1.83)),
 ]
 for k,(a,b,c) in enumerate(faults):
  def crack(t,a=a,b=b,c=c,k=k):
   u=1-t
   x=u*u*a[0]+2*u*t*b[0]+t*t*c[0]+.04*sin(t*21+k)*sin(t*pi)
   y=u*u*a[1]+2*u*t*b[1]+t*t*c[1]+.04*sin(t*17-k)*sin(t*pi)
   return (x,y,.091)
  path_ribbon('E_IRREGULAR_FAULT_'+str(k),crack,lambda t,k=k:.015+.026*sin(t*pi)**2+.009*sin(t*17+k)**2,hotdim,N=94,M=7)
 crust_islands('E_BROKEN_COOLING_PLATES',0,0,2.3,2.1,13,920)
builders={'a_sinuous':build_a,'b_confluence':build_b,'c_pool':build_c,'d_cascade':build_d,'e_cooling':build_e}
world=bpy.context.scene.world or bpy.data.worlds.new('B4_Lava_Module_Studio');bpy.context.scene.world=world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.045,.055,.070,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.58
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16
scene.render.resolution_x=840;scene.render.resolution_y=630;scene.render.resolution_percentage=100
scene.view_settings.view_transform='Filmic';scene.view_settings.look='Medium High Contrast'
def area(name,xyz,power,color,size):
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.color=color;d.shape='DISK';d.size=size
 o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.location=xyz
 o.rotation_euler=(Vector((0,0,.4))-o.location).to_track_quat('-Z','Y').to_euler()
area('WARM_REFLECTED_LIGHT',(0,-2,5),230,(1,.34,.10),4.5)
area('COLD_EDGE_LIGHT',(3,3,6),700,(.27,.43,.68),5.5)
def camera(label,loc,target,lens=45):
 d=bpy.data.cameras.new('REVIEW_'+label);o=bpy.data.objects.new('REVIEW_'+label,d);bpy.context.collection.objects.link(o)
 o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();d.lens=lens;scene.camera=o;return o
for key,build in builders.items():
 # Keep original material/image data, remove only geometry from previous variant.
 for o in list(bpy.data.objects):
  if o.type=='MESH':bpy.data.objects.remove(o,do_unlink=True)
 build()
 model_objects=[o for o in bpy.data.objects if o.type=='MESH']
 assert model_objects and len(model_objects)>3,key
 # Export only the independent lava module (no floor, light, camera).
 bpy.ops.object.select_all(action='DESELECT')
 for o in model_objects:o.select_set(True)
 bpy.context.view_layer.objects.active=model_objects[0]
 stem='b4-lava-'+key+'-'+variant
 bpy.ops.export_scene.gltf(filepath=os.path.join(out,stem+'.glb'),export_format='GLB',use_selection=True,export_apply=True)
 # Studio floor is a render-only context surface.
 bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.13))
 floor=bpy.context.object;floor.name='REVIEW_FLOOR_ONLY';floor.data.materials.append(coal)
 target=(0,0,1.2 if key=='d_cascade' else .12)
 views={'angle':((5.6,-7.5,6.2),40),'front':((0,-9,3.5),44),'side':((9,0,3.4),44),'top':((0,-.1,9.4),47)}
 for label,(loc,lens) in views.items():
  cam=camera(label,loc,target,lens)
  scene.render.filepath=os.path.join(out,stem+'-'+label+'.png')
  bpy.ops.render.render(write_still=True)
  bpy.data.objects.remove(cam,do_unlink=True)
 bpy.data.objects.remove(floor,do_unlink=True)
 bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,stem+'.blend'))
 paths=[stem+'.glb',stem+'.blend']+[stem+'-'+v+'.png' for v in views]
 files=[{'file':f,'size':os.stat(os.path.join(out,f)).st_size,'sha256':hashlib.sha256(open(os.path.join(out,f),'rb').read()).hexdigest()} for f in paths]
 with open(os.path.join(out,'manifest-'+key+'-'+variant+'.json'),'w') as f:
  json.dump({'variant':variant,'asset':key,'approval':'NOT_APPROVED','coordinate_system':'Blender Z-up; GLB export is Three.js compatible','standalone':True,'no_environment_geometry':True,'animated_vfx':False,'thermal_images':'original procedural 512px maps; GLB embedded','normal_roughness':'existing project molten_lava PBR','files':files},f,indent=2)
 print('MODULE_VERIFIED_RENDER_OUTPUT',key,len(model_objects),len(files),flush=True)
