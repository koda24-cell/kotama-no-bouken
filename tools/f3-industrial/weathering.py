"""Object-space weathering atlas from scanned CC0 photographs, not reference Pins."""
def wall_atlas(out,textures):
 from pathlib import Path
 from PIL import Image,ImageFilter
 import numpy as np
 out=Path(out);out.mkdir(parents=True,exist_ok=True);w,h=1024,2048;rng=np.random.default_rng(33711)
 def tile(name):
  a=np.asarray(Image.open(textures/name).convert('RGB').resize((512,512)),dtype=np.float32)/255
  ys=(np.arange(h)*6.5*512/h).astype(int)%512;xs=(np.arange(w)*4*512/w).astype(int)%512
  return a[ys[:,None],xs[None,:]]
 base=tile('chipped_concrete_diffuse.jpg');green=tile('concrete_moss_diffuse.jpg');iron=tile('rusty_iron_diffuse.jpg')
 def noise(nx,ny):
  a=Image.fromarray((rng.random((ny,nx))*255).astype('uint8')).resize((w,h),Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(4))
  return np.asarray(a,dtype=np.float32)/255
 u=np.arange(w)[None,:]/w;z=1-np.arange(h)[:,None]/h;cloud=noise(13,21);fine=noise(55,91)
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
 image=out/'wall_diffuse.jpg';Image.fromarray((np.clip(result,0,1)*255).astype('uint8')).save(image,quality=92)
 rough=out/'wall_roughness.jpg';Image.fromarray((np.clip(.84+fine*.12-wet*.08,0,1)*255).astype('uint8')).save(rough,quality=94)
 return image,rough
