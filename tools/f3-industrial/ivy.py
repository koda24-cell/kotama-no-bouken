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
  base=np.array([.18+seed*.016,.29+seed*.019,.10+seed*.008],np.float32)
  rgb=np.clip(base+(grain+mottle-edge)[...,None]+veins[...,None]*np.array([.12,.14,.055]),.015,.46)
  rgba=np.concatenate([rgb,np.ones((*rgb.shape[:2],1),np.float32)],axis=2);colors.append(rgba)
  h=veins*.010+np.sin(v*120)*.0005;gy,gx=np.gradient(h);n=np.stack([-gx*45,-gy*45,np.ones_like(h)],axis=2);n/=np.linalg.norm(n,axis=2,keepdims=True);normals.append(np.concatenate([n*.5+.5,np.ones((*h.shape,1))],axis=2).astype(np.float32))
 def save(name,arr):
  image=bpy.data.images.new(name,width=size*3,height=size,alpha=False);image.pixels.foreach_set(np.concatenate(arr,axis=1).astype(np.float32).ravel());path=folder/(name+'.png');image.filepath_raw=str(path);image.file_format='PNG';image.save();bpy.data.images.remove(image);return path
 diffuse=save('original_ivy_vein_color',colors);normal=save('original_ivy_vein_normal',normals)
 mat=c.material('f3_lobed_ivy_veined',texture_set={'basecolor':diffuse,'normal':normal});mat.use_backface_culling=False
 stem=c.material('f3_ivy_woody_stem',(.085,.105,.045,1),.95)
 control=[(.5,.04),(.29,.12),(.23,.31),(.06,.42),(.29,.53),(.27,.75),(.44,.65),(.5,.96),(.57,.65),(.73,.75),(.71,.55),(.94,.42),(.77,.31),(.71,.12)]
 outline=[]
 for i in range(len(control)):
  p0,p1,p2,p3=[np.array(control[k%len(control)])for k in[i-1,i,i+1,i+2]]
  for t in[0,.333,.667]:
   q=.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t);outline.append(tuple(q))
 def blade(p,k,j,maturity=1):
  px,py,pz=p;side=(-1)**(j+k);w=rng.uniform(.20,.34)*maturity;height=w*rng.uniform(1.0,1.18);angle=side*rng.uniform(.20,.85)
  origin=(px+side*.055,py-.025,pz-.02);points=outline+[(.5,.42)];verts=[];center=len(outline);curl=rng.uniform(.024,.048)
  for a,b in points:
   lx=(a-.5)*w;lz=b*height;verts.append((origin[0]+lx*math.cos(angle)-lz*math.sin(angle),origin[1]-curl*math.sin(b*math.pi)-.035*abs(a-.5),origin[2]+lx*math.sin(angle)+lz*math.cos(angle)))
  o=c.mesh('curled rounded five lobed ivy blade',verts,[(center,i,(i+1)%center)for i in range(center)],mat);uv=o.data.uv_layers.new(name='UVMap');variant=(j+k)%3
  for poly in o.data.polygons:
   for li in poly.loop_indices:
    vi=o.data.loops[li].vertex_index;uv.data[li].uv=((points[vi][0]+variant)/3,points[vi][1])
  c.tube('living ivy petiole',[(px,py,pz),verts[0]],.0032,stem,5)
 for k in range(5):
  rootx=rng.uniform(-.31,.31);height=rng.uniform(1.65,2.9);drift=rng.uniform(-.8,.8);count=rng.randint(8,12)
  pts=[(rootx+drift*(j/(count-1))**.8+math.sin(j*.92+k)*.075,-.008*math.sin(j),height*j/(count-1))for j in range(count)]
  c.tube('asymmetric climbing ivy leader',pts,.0065,stem,7)
  for j,p in enumerate(pts[1:],1):
   blade(p,k,j,.64 if j>=count-2 else 1)
   if j%3==1:
    px,py,pz=p;c.tube('adherent ivy rootlet',[(px,py,pz),(px+.03,.035,pz-.025)],.0019,stem,4)
  if k in[0,2,3]:
   p=pts[count//2];side=(-1)**k;branch=[(p[0]+side*j*.12,p[1],p[2]+j*.10)for j in range(4)];c.tube('lateral ivy branch',branch,.0042,stem,6)
   for j,p in enumerate(branch[1:],1):blade(p,k+1,j,.72)
 for j in range(4):
  bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=(rng.uniform(-.55,.55),rng.uniform(.01,.16),.055));o=bpy.context.object;o.name='loose concrete chip at ivy roots';o.scale=(rng.uniform(.13,.24),rng.uniform(.12,.19),rng.uniform(.035,.065));o.rotation_euler[2]=rng.random()*math.tau
  for v in o.data.vertices:v.co*=rng.uniform(.8,1.1)
  o.data.materials.append(moss);c.uv_world(o)
