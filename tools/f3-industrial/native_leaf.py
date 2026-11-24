"""Original vein finish for the retained native leaf geometry and original leaf UVs."""
def material(c):
 import bpy,numpy as np
 folder=c.OUT/'sources/generated_materials';folder.mkdir(parents=True,exist_ok=True);n=256;y,x=np.mgrid[0:n,0:n].astype(np.float32)/(n-1);rng=np.random.default_rng(48127)
 vein=np.exp(-((x-.5)/.009)**2)*(1-y*.65)
 for side in[-1,1]:
  for j in range(1,7):
   a=np.array([.5,j*.12]);b=np.array([.5+side*(.22+.08*np.sin(j*.42)),j*.12+.16]);d=b-a;t=np.clip(((x-a[0])*d[0]+(y-a[1])*d[1])/np.dot(d,d),0,1)
   dist=(x-a[0]-t*d[0])**2+(y-a[1]-t*d[1])**2;vein=np.maximum(vein,np.exp(-dist/.0035**2)*.55)
 grain=rng.normal(0,.007,(n,n));rgb=np.clip(np.array([.28,.42,.19])[None,None,:]+(grain+np.sin(x*18)*np.sin(y*23)*.015)[...,None]+vein[...,None]*np.array([.075,.085,.035]),0,1)
 gy,gx=np.gradient(vein*.008);normal=np.stack([-gx*24,-gy*24,np.ones_like(x)],axis=2);normal/=np.linalg.norm(normal,axis=2,keepdims=True);normal=normal*.5+.5
 paths={}
 for name,data in [('basecolor',rgb),('normal',normal)]:
  im=bpy.data.images.new('native_veined_leaf_'+name,width=n,height=n,alpha=False);im.colorspace_settings.name='Non-Color'if name=='normal'else'sRGB';rgba=np.concatenate([data,np.ones((n,n,1))],axis=2).astype(np.float32);im.pixels.foreach_set(rgba.ravel());path=folder/(im.name+'.png');im.filepath_raw=str(path);im.file_format='PNG';im.save();bpy.data.images.remove(im);paths[name]=path
 return c.material('f3_native_veined_leaf',texture_set=paths)
