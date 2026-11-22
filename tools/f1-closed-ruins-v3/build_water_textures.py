"""Original periodic water normal/color and floating algae coverage. No image inputs."""
from pathlib import Path
import hashlib,json
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/3d/dungeons/b1_closed_ruins_v3/textures'
OUT.mkdir(parents=True,exist_ok=True)
def field(n,seed,bands):
 rng=np.random.default_rng(seed);fy,fx=np.meshgrid(np.fft.fftfreq(n)*n,np.fft.fftfreq(n)*n,indexing='ij');a=np.zeros((n,n))
 for sx,sz,amp in bands:
  f=np.fft.fft2(rng.normal(size=(n,n)));b=np.fft.ifft2(f*np.exp(-.5*((fx/sx)**2+(fy/sz)**2))).real;b-=b.mean();b/=b.std();a+=amp*b
 return a
n=256
h=field(n,38191,[(5,9,.6),(18,7,.22),(41,35,.10)])
dx=(np.roll(h,-1,1)-np.roll(h,1,1))*1.8;dy=(np.roll(h,-1,0)-np.roll(h,1,0))*1.8
v=np.stack([-dx,-dy,np.ones_like(h)],axis=-1);v/=np.linalg.norm(v,axis=-1,keepdims=True)
Image.fromarray(np.clip((v*.5+.5)*255,0,255).astype('uint8')).save(OUT/'water_micro_normal.png')
f=field(n,19019,[(2,3,.22),(7,5,.12),(25,21,.025)]);f=np.clip(.5+f,0,1)
col=np.stack([.21+f*.18,.34+f*.22,.24+f*.16],axis=-1)
Image.fromarray((col*255).astype('uint8')).save(OUT/'water_silt_color.png')
n=512
f=field(n,7810,[(3,5,.6),(13,8,.30),(44,37,.12),(92,104,.035)])
y,x=np.mgrid[-1:1:complex(n),-1:1:complex(n)];radial=(x*x*.84+y*y*1.2);alpha=np.clip((f+.9-radial*1.9)*3,0,1)
# Fine holes and a broken edge keep algae from reading as a disc or solid board.
grain=field(n,771,[(38,39,.3),(100,95,.2)]);alpha*=np.clip((grain+.65)*1.9,0,1)
green=np.clip(.5+f*.15+grain*.11,0,1)
rgba=np.stack([.13+green*.12,.21+green*.26,.065+green*.07,alpha],axis=-1)
Image.fromarray((np.clip(rgba,0,1)*255).astype('uint8')).save(OUT/'water_algae_cluster.png')
records=[]
for p in sorted(OUT.glob('water_*.png')):
 records.append({'file':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size,'size':list(Image.open(p).size)})
(OUT/'water-texture-sources.json').write_text(json.dumps({'schemaVersion':1,'authorship':'Original generated pixel data; no external image inputs','generator':'tools/f1-closed-ruins-v3/build_water_textures.py','license':'Project original work; same repository terms','normalConvention':'OpenGL +Y tangent-space, data texture','usage':'F1 closed ruins trial only','records':records},indent=2)+'\n')
print(json.dumps(records))
