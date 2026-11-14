#!/usr/bin/env python3
"""Generate original, tileable basalt PBR PNG maps; stdlib only, no external textures."""
import math,os,struct,zlib,random
from pathlib import Path
N=256
OUT=Path('assets/textures/floor4/basalt-charcoal-01')
OUT.mkdir(parents=True,exist_ok=True)
rng=random.Random(261114)
# Periodic Fourier layers: tileable, coarse rock mottling + fine pores.
layers=[(kx,ky,rng.random()*math.tau,rng.uniform(.5,1.0)) for kx,ky in [(1,1),(2,3),(3,2),(5,4),(8,7),(13,11),(23,19)]]
def f(x,y):
 v=0.;den=0.
 for i,(kx,ky,p,a) in enumerate(layers):
  w=a/(1+i*.72);v+=w*math.sin(math.tau*(kx*x+ky*y)/N+p);den+=w
 return v/den
h=[[f(x,y) for x in range(N)] for y in range(N)]
def clamp(v):return max(0,min(255,round(v)))
def png(name,rows,channels):
 def chunk(tag,data):return struct.pack('>I',len(data))+tag+data+struct.pack('>I',zlib.crc32(tag+data)&0xffffffff)
 raw=b''.join(b'\0'+bytes(row) for row in rows)
 color={1:0,3:2}[channels]
 data=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',N,N,8,color,0,0,0))+chunk(b'IDAT',zlib.compress(raw,9))+chunk(b'IEND',b'')
 (OUT/name).write_bytes(data)
base=[];rough=[];normal=[]
for y in range(N):
 b=[];r=[];n=[]
 for x in range(N):
  v=h[y][x];warm=max(0,v+.13)
  b.extend([clamp(39+39*v+22*warm),clamp(33+28*v+9*warm),clamp(31+25*v+4*warm)])
  r.append(clamp(222+15*v))
  dx=(h[y][(x+1)%N]-h[y][(x-1)%N])*.85
  dy=(h[(y+1)%N][x]-h[(y-1)%N][x])*.85
  nx,ny,nz=-dx,-dy,1.
  length=math.sqrt(nx*nx+ny*ny+nz*nz)
  n.extend([clamp(127.5+127.5*nx/length),clamp(127.5+127.5*ny/length),clamp(127.5+127.5*nz/length)])
 base.append(b);rough.append(r);normal.append(n)
png('basecolor.png',base,3)
png('roughness.png',rough,1)
png('normal.png',normal,3)
print('BASALT_PBR_GENERATED',*[str(p) for p in sorted(OUT.glob('*.png'))])
