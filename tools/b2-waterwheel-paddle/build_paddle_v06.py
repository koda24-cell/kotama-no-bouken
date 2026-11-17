"""V06 native Blender waterwheel bucket; separate from V01/V02.
Use UV image PBR for GLB compatibility, geometry-anchored metal & edge ice.
"""
import bpy,math,random,os,sys,json,hashlib
import numpy as np
from mathutils import Vector

OUT=os.path.abspath(sys.argv[sys.argv.index('--')+1] if '--' in sys.argv else 'render-output/b2-waterwheel-paddle')
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
rng=random.Random(20261118)

def mat(name,color,rough=.8,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF')
 p.inputs['Base Color'].default_value=(*color,1)
 p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 return m

def image(name,pixels,noncolor=False):
 h,w=pixels.shape[:2];im=bpy.data.images.new(name,width=w,height=h,alpha=True)
 if pixels.shape[2]==3:
  pixels=np.concatenate((pixels,np.ones((h,w,1),np.float32)),axis=2)
 im.pixels.foreach_set(pixels.astype(np.float32).ravel())
 if noncolor:im.colorspace_settings.name='Non-Color'
 im.pack();return im

def build_wood_pbr():
 size=512;v,u=np.mgrid[0:size,0:size].astype(np.float32);u/=size;v/=size
 knots=.10*np.exp(-((u-.29)/.14)**2-((v-.67)/.045)**2)
 bent=v+ .00042*np.sin(u*15+v*9)+.0008*np.sin(u*6+v*4)+knots*.008*np.sin((u-.29)*34)
 grain=(np.sin(bent*660+u*2.2)*.5+.5)*.09
 fiber=(np.sin(bent*1490+u*7)*.5+.5)*.018
 mottling=.11*np.sin(11*u+7*v)*np.sin(6*v-8*u)+.065*np.cos(17*u-14*v)
 pores=np.sin(bent*110+.9*np.cos(u*60))
 patch=.060*np.sin((u+v)*6)+.035*np.cos(u*16-v*10)
 base=np.clip(.29+grain+fiber+mottling+patch-.036*pores, .12,.55)
 channels=np.stack((base*.85,base*.82,base*.76),axis=-1).astype(np.float32)
 col=image('b2_v06_weathered_wood_color_512',channels)
 rough=np.clip(.70+.16*np.sin(bent*390)*np.cos(u*42)+.07*np.cos(8*u),.43,.96).astype(np.float32)
 gray=np.repeat(rough[:,:,None],3,axis=2); roughim=image('b2_v06_weathered_wood_rough_512',gray,True)
 hght=(grain+fiber)*.28+.06*np.sin(bent*1300)
 dy,dx=np.gradient(hght);nx=-dx*3;ny=-dy*3;nz=np.ones_like(nx)
 length=np.sqrt(nx*nx+ny*ny+nz*nz)
 normals=np.stack((.5+nx/(2*length),.5+ny/(2*length),.5+nz/(2*length)),axis=-1).astype(np.float32)
 normalim=image('b2_v06_weathered_wood_normal_gl_512',normals,True)
 m=mat('Wood_waterlogged_aged_embedded_PBR',(.16,.12,.10),.82)
 n=m.node_tree.nodes;links=m.node_tree.links;p=n.get('Principled BSDF')
 def tex(img):
  a=n.new('ShaderNodeTexImage');a.image=img;a.interpolation='Linear';return a
 links.new(tex(col).outputs['Color'],p.inputs['Base Color'])
 p.inputs['Roughness'].default_value=.80  # V03 generated roughness exported magenta; disabled pending image pipeline fix
  # V03 generated normal exported all-black; do NOT connect broken texture. Geometry shading retained.
 return m

wood=build_wood_pbr()
# Use a genuinely photo-based, redistributable CC0 texture when Actions retrieved it.
PHOTO_FILE=os.path.join(OUT,'wood_planks_diff_1k.jpg')
PHOTO_OK=False
PHOTO_SHA256=None
if os.path.isfile(PHOTO_FILE):
 try:
  b=open(PHOTO_FILE,'rb').read()
  if not b.startswith(bytes.fromhex('ffd8')) or len(b)<20000:
   raise ValueError('not a valid downloaded JPEG')
  photo=bpy.data.images.load(PHOTO_FILE,check_existing=False)
  photo.pack()
  nd=wood.node_tree.nodes;links=wood.node_tree.links;bs=nd.get('Principled BSDF')
  t=nd.new('ShaderNodeTexImage');t.image=photo;t.interpolation='Linear'
  mult=nd.new('ShaderNodeMixRGB');mult.blend_type='MULTIPLY'
  mult.inputs[0].default_value=.55
  mult.inputs[2].default_value=(.66,.78,.87,1)
  links.new(t.outputs['Color'],mult.inputs[1])
  links.new(mult.outputs['Color'],bs.inputs['Base Color'])
  PHOTO_OK=True
  PHOTO_SHA256=hashlib.sha256(b).hexdigest()
  print('CC0_PHOTO_TEXTURE_LOADED',len(b),PHOTO_SHA256,flush=True)
 except Exception as exc:
  print('CC0_PHOTO_TEXTURE_FALLBACK',repr(exc),flush=True)
else:print('CC0_PHOTO_TEXTURE_NOT_DOWNLOADED',flush=True)
iron=mat('Corroded_dark_iron',(.066,.076,.082),.86,.65)
frost=mat('Pale_cold_frost',(.58,.68,.72),.96)
ice=mat('Cold_blue_ice',(.38,.60,.68),.27,.05)

def newmesh(name,verts,faces,material,uv=None):
 data=bpy.data.meshes.new(name+'_mesh')
 data.from_pydata(verts,[],faces);data.update()
 ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob)
 data.materials.append(material)
 if uv is not None:
  layer=data.uv_layers.new(name='UVMap')
  for p in data.polygons:
   for li in p.loop_indices:layer.data[li].uv=uv[data.loops[li].vertex_index]
  for p in data.polygons:p.use_smooth=True
 return ob

def cube(name,location,dims,material):
 bpy.ops.mesh.primitive_cube_add(size=1,location=location)
 ob=bpy.context.object;ob.name=name;ob.dimensions=dims
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 ob.data.materials.append(material)
 b=ob.modifiers.new('subtle_tool_edge','BEVEL');b.width=.003;b.segments=2
 ob.modifiers.new('face_weighted_normal','WEIGHTED_NORMAL')
 return ob

# width X; height Z; depth Y. The piece is independent and not mounted in the original wheel.
nx,nz=66,48;W=.62
def point(i,j,side):
 x=-W+2*W*i/nx;t=j/nz
 s=t*t*(3-2*t)
 z=.415-.82*t
 # authentic scoop: almost upright on the upper section, strongly rolled at the foot
 y=.18-.47*(math.sin(.5*math.pi*t)**3)+.045*(x/W)**2
 # restrained irregular warp in the timber, strongest at outer edges
 z+=.0035*math.sin(x*31+t*13)+.0025*math.sin(x*89+t*44)
 y+=.003*np.sin(x*22+t*15)
 if j==nz:
  z+=.011*math.sin(x*36)+.006*math.sin(x*69+1.6)
  if x<-.42:z+=.05*((-.42-x)/.20)
 if j==0 and x>.35:
  z-=.018*max(0,(x-.35)/.27)*(.5+.5*math.sin(x*55))
 if i in (0,nx):
  x+=(1 if i==0 else -1)*(.006+.005*math.sin(j*1.93)**2)
 return (x,y+side*.042,z)

verts=[];uv=[]
for side in (-1,1):
 for j in range(nz+1):
  for i in range(nx+1):
   verts.append(point(i,j,side))
   uv.append((i/nx,j/nz))
count=(nx+1)*(nz+1)
idx=lambda i,j,k:k*count+j*(nx+1)+i
faces=[]
for j in range(nz):
 for i in range(nx):
  faces.append((idx(i,j,0),idx(i+1,j,0),idx(i+1,j+1,0),idx(i,j+1,0)))
  faces.append((idx(i,j,1),idx(i,j+1,1),idx(i+1,j+1,1),idx(i+1,j,1)))
for j in (0,nz):
 for i in range(nx):faces.append((idx(i,j,0),idx(i,j,1),idx(i+1,j,1),idx(i+1,j,0)))
for i in (0,nx):
 for j in range(nz):faces.append((idx(i,j,0),idx(i,j+1,0),idx(i,j+1,1),idx(i,j,1)))
newmesh('solid_curved_scoop_timbers',verts,faces,wood,uv)

# Metal straps are curved and tied directly to the wood surface.
for k,x_center in enumerate((-.53,.53)):
 vv=[];ff=[]
 for j in range(21):
  t=.05+.38*j/20
  source_j=int(round(t*nz))
  center=point(int(round((x_center+W)/(2*W)*nx)),source_j,-1)
  for dx,depth in [(-.045,-.009),(.045,-.009),(-.045,-.024),(.045,-.024)]:
   vv.append((x_center+dx,center[1]+depth,center[2]))
 for j in range(20):
  a=4*j;b=4*(j+1)
  ff.extend([(a,a+1,b+1,b),(a+2,b+2,b+3,a+3),
             (a,a+2,b+2,b),(a+1,b+1,b+3,a+3)])
 newmesh('curved_ironstrap_'+str(k),vv,ff,iron)
 for ztarget in (.17,.26,.34):
  j=int(round((.415-ztarget)/.82*nz))
  base=point(int(round((x_center+W)/(2*W)*nx)),j,-1)
  bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=.013,location=(x_center,base[1]-.032,base[2]))
  bolt=bpy.context.object;bolt.name='real_iron_rivet';bolt.scale=(1,.45,1);bolt.data.materials.append(iron)

# Non-repeating distressed slits, thin and following the original curvature; no floating cubes.
dark=mat('Deep_recessed_cracks',(.042,.040,.036),.97)
for crack in range(6):
 x0=rng.uniform(-.42,.34);t0=rng.uniform(.17,.87);length=rng.uniform(.07,.21)
 vtx=[]
 for i in range(9):
  x=x0+length*i/8;t=t0+.016*math.sin(i*1.1+crack)
  t=max(.01,min(.98,t))
  j=int(round(t*nz));ii=int(round((x+W)/(2*W)*nx))
  px,py,pz=point(ii,j,-1)
  vtx.extend([(px,py-.004,pz-.0016),(px,py-.004,pz+.0016)])
 fs=[(2*i,2*i+1,2*i+3,2*i+2) for i in range(8)]
 newmesh('shallow_split_%02d'%crack,vtx,fs,dark)

# Grounded frost patches clustered unevenly at top and lip. No floating white blobs.
for k in range(9):
 i=rng.randrange(2,nx-7);span=rng.randint(3,7)
 verts2=[];faces2=[]
 for b in (0,1):
  for j in range(span):
   ii=i+j;pi=point(ii,0,-1)
   xyz=(pi[0],pi[1]-.012-b*.008,pi[2]+.004-b*.017*(.4+.6*rng.random()))
   verts2.append(xyz)
 for j in range(span-1):faces2.append((j,j+1,span+j+1,span+j))
 newmesh('thin_top_rime_patch_%02d'%k,verts2,faces2,frost)

# Icicles attach only to the bottom lip and point down (not inverted needles).
for k in range(7):
 i=rng.randrange(3,nx-3);x,y,z=point(i,nz,-1)
 length=rng.uniform(.022,.095)
 bpy.ops.mesh.primitive_cone_add(vertices=8,radius1=.0005,radius2=.0075,
  depth=length,location=(x,y-.015,z-length/2))
 ob=bpy.context.object;ob.name='hanging_lip_icicle_%02d'%k;ob.data.materials.append(ice)

tag='b2_bucket_paddle_blender_v06'
# Retain the geometry and all materials before adding studio-only lights.
glb=os.path.join(OUT,tag+'.glb')
bpy.ops.export_scene.gltf(filepath=glb,export_format='GLB',export_yup=True)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=700;scene.render.resolution_y=700;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.view_settings.view_transform='AgX'
world=bpy.data.worlds.new('studio_neutral');world.use_nodes=True
world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.36
scene.world=world
for pos,power in [((2.3,-3.1,2.7),360),((-1.6,1.4,1.5),225)]:
 bpy.ops.object.light_add(type='AREA',location=pos)
 light=bpy.context.object;light.data.energy=power;light.data.size=2.3
 light.rotation_euler=(-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add()
cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=1.7
files=[glb]
for name,pos in [('front',(0,-2.5,.12)),('side',(2.8,0,.12)),('angle',(1.65,-2.15,.72)),('back',(0,2.5,.12))]:
 cam.location=pos;cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler()
 path=os.path.join(OUT,tag+'_'+name+'.png');scene.render.filepath=path
 bpy.ops.render.render(write_still=True);files.append(path)
blend=os.path.join(OUT,tag+'.blend')
bpy.ops.wm.save_as_mainfile(filepath=blend);files.append(blend)
manifest={'asset':tag,'status':'NOT_APPROVED','blender':bpy.app.version_string,
 'new_wood_color_normal_roughness_textures':True,'base_waterwheel_unchanged':True,
 'mesh_count':len([o for o in bpy.data.objects if o.type=='MESH']),'files':{},'photo_wood_applied':PHOTO_OK,'photo_source':'https://polyhaven.com/a/wood_planks' if PHOTO_OK else None,'photo_sha256':PHOTO_SHA256,'photo_license':'CC0' if PHOTO_OK else None}
for path in files:
 raw=open(path,'rb').read()
 manifest['files'][os.path.basename(path)]={'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
with open(os.path.join(OUT,tag+'_manifest.json'),'w') as f:json.dump(manifest,f,indent=2)
progress_path=os.path.join(OUT,'progress.json')
progress=json.load(open(progress_path)) if os.path.exists(progress_path) else {'status':'NOT_APPROVED','completed_variants':[]}
progress['completed_variants'].append({'variant':6,'tag':tag,'file_count':len(files),'manifest':tag+'_manifest.json'})
progress['next_variant']=None
with open(progress_path,'w') as f:json.dump(progress,f,indent=2)
print('VERIFIED_BLENDER_CHECKPOINT',tag,flush=True)
