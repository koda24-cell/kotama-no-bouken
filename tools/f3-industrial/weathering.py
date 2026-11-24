"""Object-space weathering atlas from scanned CC0 photographs, not reference Pins."""
def wall_atlas(out,textures):
 from pathlib import Path
 import bpy
 import numpy as np
 out=Path(out);out.mkdir(parents=True,exist_ok=True);w,h=1024,2048;rng=np.random.default_rng(33711)
 def tile(name):
  image=bpy.data.images.load(str(textures/name),check_existing=True);a=np.empty(len(image.pixels),dtype=np.float32);image.pixels.foreach_get(a);a=a.reshape(image.size[1],image.size[0],4)[...,:3]
  ys=(np.arange(h)*6.5*image.size[1]/h).astype(int)%image.size[1];xs=(np.arange(w)*4*image.size[0]/w).astype(int)%image.size[0]
  return a[ys[:,None],xs[None,:]]
 base=tile('chipped_concrete_diffuse.jpg');green=tile('concrete_moss_diffuse.jpg');iron=tile('rusty_iron_diffuse.jpg')
 def noise(nx,ny):
  small=rng.random((ny+1,nx+1),dtype=np.float32);x=np.arange(w,dtype=np.float32)*nx/w;y=np.arange(h,dtype=np.float32)*ny/h
  ix=x.astype(int);iy=y.astype(int);fx=x-ix;fy=y-iy;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy)
  return (small[iy[:,None],ix[None,:]]*(1-fx)+small[iy[:,None],ix[None,:]+1]*fx)*(1-fy[:,None])+(small[iy[:,None]+1,ix[None,:]]*(1-fx)+small[iy[:,None]+1,ix[None,:]+1]*fx)*fy[:,None]
 u=np.arange(w)[None,:]/w;z=np.arange(h)[:,None]/h;cloud=noise(13,21);fine=noise(55,91)
 # Moisture rises unevenly through pores instead of forming a painted green stripe.
 wet=np.clip((.17+cloud*.10-z)*7,0,1);moss=np.clip((cloud*.80+fine*.30-.53)*3,0,1)*np.clip((.19-z)*8,0,1)
 result=base*(1-wet[...,None]*.28);result=result*(1-moss[...,None]*.72)+green*moss[...,None]*.72
 rain=np.zeros((h,w),dtype=np.float32)
 for k in range(25):
  x=rng.uniform(.03,.97);a=rng.uniform(.02,.64);b=rng.uniform(.72,1.02);width=rng.uniform(.005,.022)
  band=np.exp(-((u-x)/width)**2)*np.clip((z-a)*7,0,1)*np.clip((b-z)*9,0,1)
  rain+=band*rng.uniform(.03,.13)
 result*=1-np.clip(rain,0,.24)[...,None]*(.6+cloud[...,None]*.4)
 for x,top in [(-1.78,.94),(-1.40,.98),(1.45,.87)]:
  streak=np.exp(-((u-(x/4+.5))/.013)**2)*np.clip((top-z)*9,0,1)*np.clip((z-top+.30)*12,0,1)
  result=result*(1-streak[...,None]*.45)+iron*streak[...,None]*.45
 def save(name,data,noncolor=False):
  image=bpy.data.images.new(name,width=w,height=h,alpha=False);image.colorspace_settings.name='Non-Color' if noncolor else 'sRGB'
  if data.ndim==2:data=np.repeat(data[...,None],3,axis=2)
  rgba=np.concatenate([np.clip(data,0,1),np.ones((h,w,1),dtype=np.float32)],axis=2).astype(np.float32)
  image.pixels.foreach_set(rgba.reshape(-1));path=out/name;image.filepath_raw=str(path);image.file_format='JPEG';image.save();return path
 diffuse=save('wall_diffuse.jpg',result)
 rough=save('wall_roughness.jpg',np.clip(.84+fine*.12-wet*.08,0,1),True)
 return diffuse,rough
