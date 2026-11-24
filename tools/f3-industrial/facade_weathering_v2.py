"""Bake licensed photographic surfaces into metre-scaled facade atlases in Blender.
Macro weathering follows the authored sills, ledges and downpipe, not random dots.
No Pinterest/reference pixels; no runtime procedural shader dependency.
"""
def make(c,bpy,textures):
 import numpy as np
 from pathlib import Path
 out=c.OUT/'sources/generated_materials';out.mkdir(parents=True,exist_ok=True)
 w,h=1024,4096
 x=np.arange(w,dtype=np.float32)[None,:]*4/w-2
 z=np.arange(h,dtype=np.float32)[:,None]*16.4/h
 rng=np.random.default_rng(77291)
 def noise(nx,ny):
  field=rng.random((ny+1,nx+1),dtype=np.float32)
  u=np.arange(w)*nx/w;v=np.arange(h)*ny/h;ix=u.astype(int);iy=v.astype(int);fx=u-ix;fy=v-iy;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy)
  return ((field[iy[:,None],ix]*(1-fx)+field[iy[:,None],ix+1]*fx)*(1-fy[:,None])+(field[iy[:,None]+1,ix]*(1-fx)+field[iy[:,None]+1,ix+1]*fx)*fy[:,None]).astype(np.float32)
 cloud=noise(9,33);fine=noise(47,131)
 def sample(kind,role,noncolor=False):
  p=Path(textures)/(kind+'_'+role+'.jpg');im=bpy.data.images.load(str(p),check_existing=True)
  if noncolor:im.colorspace_settings.name='Non-Color'
  pixels=np.empty(len(im.pixels),dtype=np.float32);im.pixels.foreach_get(pixels);pixels=pixels.reshape(im.size[1],im.size[0],4)[...,:3]
  # Each official 1m photograph occupies one world metre; atlas texel density256/m.
  xx=(np.arange(w)*4*im.size[0]/w).astype(int)%im.size[0]
  yy=(np.arange(h)*16.4*im.size[1]/h).astype(int)%im.size[1]
  return pixels[yy[:,None],xx]
 moisture=np.clip((.65+cloud*.45-z)*1.5,0,1)
 rain=np.zeros((h,w),dtype=np.float32);ledge=np.zeros_like(rain)
 for floor in [.18,3.22,6.26,9.30,12.34]:
  below=np.clip((floor+.87-z)*3,0,1)*np.clip((z-floor+1.8)/1.8,0,1)
  for edge in [-1.49,-.31,.31,1.49]:
   streak=np.exp(-((x-edge-(cloud-.5)*.065)/(.035+fine*.035))**2)
   rain+=streak*below*.48
  # Damp moss grows at horizontal ledges and sheltered spandrel bases.
  ledge+=np.clip((.22+cloud*.20-abs(z-floor-.17))*3,0,1)
 rain=np.clip(rain+np.exp(-((x+1.62)/.11)**2)*.34,0,.66)
 green=np.clip((cloud*.8+fine*.25-.38)*2,0,1)*np.clip(moisture+ledge*.65,0,1)
 paths={}
 for label,kind in [('render','worn_mossy_plasterwall'),('structure','chipped_concrete')]:
  base=sample(kind,'diffuse');moss=sample('concrete_moss','diffuse')
  # Photographic variation retained, with damp soot/rain stain under real bearings.
  base*=np.array([.65,.68,.65],dtype=np.float32)*(1-.40*rain[...,None])
  base=base*(1-green[...,None]*.72)+moss*green[...,None]*.48
  rough=np.clip(sample(kind,'roughness',True)[...,0]*(1-moisture*.13),.55,.99)
  normal=sample(kind,'normal',True)
  maps={}
  for role,pixels in [('basecolor',base),('normal',normal),('roughness',np.repeat(rough[...,None],3,axis=2))]:
   im=bpy.data.images.new('v2_'+label+'_'+role,width=w,height=h,alpha=False)
   im.colorspace_settings.name='sRGB' if role=='basecolor' else 'Non-Color'
   rgba=np.ones((h,w,4),dtype=np.float32);rgba[...,:3]=np.clip(pixels,0,1);im.pixels.foreach_set(rgba.ravel())
   path=out/('v2_'+label+'_'+role+'.jpg');im.filepath_raw=str(path);im.file_format='JPEG';im.save();maps[role]=path
  paths[label]=c.material('f3_v2_aged_'+label,texture_set=maps)
 return paths

def map_surfaces(bpy,materials):
 bpy.context.view_layer.update()
 for obj in list(bpy.data.objects):
  if obj.type!='MESH':continue
  ids={i for i,m in enumerate(obj.data.materials)if m in materials}
  if not ids:continue
  uv=obj.data.uv_layers.active or obj.data.uv_layers.new(name='UVMap')
  for poly in obj.data.polygons:
   if poly.material_index not in ids:continue
   axis=max(range(3),key=lambda i:abs(poly.normal[i]))
   for li in poly.loop_indices:
    co=obj.matrix_world@obj.data.vertices[obj.data.loops[li].vertex_index].co
    uv.data[li].uv=((co.y if axis==0 else co.x)/4+.5,(co.y+2)/16.4 if axis==2 else co.z/16.4)
