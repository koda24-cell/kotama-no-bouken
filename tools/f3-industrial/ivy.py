"""Original lobed ivy with authored vein atlas; no reference-image redistribution."""
def build(e):
 import bpy,numpy as np,math
 from pathlib import Path
 c,rng,moss,rubber=[e[k]for k in ['c','rng','moss','dark']]
 folder=c.OUT/'sources/generated_materials';folder.mkdir(parents=True,exist_ok=True)
 size=512;yy,xx=np.mgrid[0:size,0:size].astype(np.float32);u=xx/(size-1);v=yy/(size-1);rand=np.random.default_rng(331119)
 colors=[];normals=[]
 for seed in range(3):
  grain=rand.normal(0,.012,(size,size));mottle=np.sin(u*28+np.sin(v*16))*np.sin(v*25+u*8)*.022
  veins=np.zeros_like(u)
  def line(a,b,width):
   ax,ay=a;bx,by=b;dx,dy=bx-ax,by-ay;t=np.clip(((u-ax)*dx+(v-ay)*dy)/(dx*dx+dy*dy),0,1);d=(u-ax-t*dx)**2+(v-ay-t*dy)**2
   return np.exp(-d/(width*width))
  for a,b in [((.5,.03),(.5,.95)),((.5,.33),(.08,.4)),((.5,.33),(.91,.4)),((.5,.46),(.28,.76)),((.5,.46),(.74,.76)),((.5,.19),(.22,.12)),((.5,.19),(.79,.12))]:
   veins=np.maximum(veins,line(a,b,.005))
   for j in range(2,6):
    t=j/7;px=a[0]+(b[0]-a[0])*t;py=a[1]+(b[1]-a[1])*t
    for side in[-1,1]:veins=np.maximum(veins,line((px,py),(px+side*.075,py+.06),.0017)*.43)
  edge=np.abs(u-.5)**1.4*.06
  base=np.array([.13+seed*.016,.24+seed*.019,.068+seed*.008],np.float32)
  rgb=np.clip(base+(grain+mottle-edge)[...,None]+veins[...,None]*np.array([.12,.14,.055]),.015,.46)
  rgba=np.concatenate([rgb,np.ones((*rgb.shape[:2],1),np.float32)],axis=2);colors.append(rgba)
  h=veins*.010+np.sin(v*120)*.0005;gy,gx=np.gradient(h);n=np.stack([-gx*45,-gy*45,np.ones_like(h)],axis=2);n/=np.linalg.norm(n,axis=2,keepdims=True);normals.append(np.concatenate([n*.5+.5,np.ones((*h.shape,1))],axis=2).astype(np.float32))
 def save(name,arr):
  image=bpy.data.images.new(name,width=size*3,height=size,alpha=False);image.pixels.foreach_set(np.concatenate(arr,axis=1).astype(np.float32).ravel());path=folder/(name+'.png');image.filepath_raw=str(path);image.file_format='PNG';image.save();bpy.data.images.remove(image);return path
 diffuse=save('original_ivy_vein_color',colors);normal=save('original_ivy_vein_normal',normals)
 mat=c.material('f3_lobed_ivy_veined',texture_set={'basecolor':diffuse,'normal':normal});mat.use_backface_culling=False
 outline=[(.5,.04),(.29,.12),(.17,.08),(.22,.31),(.04,.40),(.29,.53),(.27,.77),(.44,.65),(.5,.96),(.57,.65),(.74,.79),(.72,.55),(.96,.4),(.8,.3),(.82,.08),(.64,.12)]
 for k in range(5):
  x=k*.36-.72;pts=[(x+math.sin(j*1.27+k)*.075,.0,j*.30)for j in range(10)];c.tube('branching climbing ivy stem',pts,.008,rubber,6)
  for j in range(1,10):
   px,py,pz=pts[j];side=(-1)**(j+k);w=rng.uniform(.22,.34);height=w*rng.uniform(1.0,1.18);angle=side*rng.uniform(.20,.65)
   origin=(px+side*.12,-.055,pz-.02);points=outline+[(.5,.42)];verts=[]
   for a,b in points:
    lx=(a-.5)*w;lz=b*height;verts.append((origin[0]+lx*math.cos(angle)-lz*math.sin(angle),origin[1]-.045*math.sin(b*math.pi)-.025*abs(a-.5),origin[2]+lx*math.sin(angle)+lz*math.cos(angle)))
   o=c.mesh('folded five lobed ivy blade',verts,[(16,i,(i+1)%16)for i in range(16)],mat);uv=o.data.uv_layers.new(name='UVMap');variant=(j+k)%3
   for poly in o.data.polygons:
    for li in poly.loop_indices:
     vi=o.data.loops[li].vertex_index;uv.data[li].uv=((points[vi][0]+variant)/3,points[vi][1])
   c.tube('ivy petiole',[(px,-.004,pz),verts[0]],.0035,rubber,5)
 for j in range(3):e['box']('damp root pocket stone',(j*.48-.5,.12,.075),(.53,.44,.15),moss,.065)
