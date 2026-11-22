"""Feather an original moss finish mask; RGB derives from recorded CC0 photo."""
from pathlib import Path
import numpy as np
from PIL import Image
import json,hashlib
ROOT=Path(__file__).resolve().parents[2];T=ROOT/'assets/3d/dungeons/b1_closed_ruins_v3/textures'
a=np.asarray(Image.open(T/'moss_color.jpg').convert('RGB'),dtype=np.float32)/255;n=a.shape[0]
y,x=np.mgrid[0:n,0:n];u=(x/n-.5)*2;v=(y/n-.5)*2
rng=np.random.default_rng(73031);field=np.zeros((n,n));freq=np.fft.fftfreq(n)*n;fy,fx=np.meshgrid(freq,freq,indexing='ij')
for scale,weight in [(3,.55),(11,.25),(38,.14),(130,.06)]:
    f=np.fft.ifft2(np.fft.fft2(rng.normal(size=(n,n)))*np.exp(-.5*(fx*fx+fy*fy)/(scale*scale))).real
    f=(f-f.mean())/f.std();field+=weight*f
radius=np.sqrt(u*u+v*v);edge=np.clip((1.03-radius)/.22,0,1)
# The mask erodes small breaks through the surface and softens the perimeter.
alpha=edge*np.clip((field+.95)*.95,0,1)
rgb=a*(.78+np.clip(field,-1,1)[...,None]*.20)
out=np.dstack([np.clip(rgb,0,1),alpha]);p=T/'moss_feathered.png';Image.fromarray(np.uint8(out*255)).save(p)
(T/'moss-feathered-source.json').write_text(json.dumps({'source':'moss_color.jpg','sourceSha256':hashlib.sha256((T/'moss_color.jpg').read_bytes()).hexdigest(),'file':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'mask':'Original seeded multi-scale Gaussian field and radial feather; threshold 0.45; RGB preserves recorded CC0 photo derivative','license':'RGB source CC0-1.0; mask original'},indent=2))
