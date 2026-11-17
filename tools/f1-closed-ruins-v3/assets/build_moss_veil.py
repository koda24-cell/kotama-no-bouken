"""One irregular creeping moss cap, authored independently of any level."""
from pathlib import Path
import sys,math,random
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from asset_common import *
reset_scene();m=materials();rng=random.Random(7301)
N=64;R=6;verts=[(0,0,.043)];faces=[]
boundary=[1+.13*math.sin(i*math.tau/N*3+.4)+.09*math.sin(i*math.tau/N*7)+rng.uniform(-.04,.04) for i in range(N)]
for j in range(1,R+1):
  q=j/R
  for i in range(N):
    a=i*math.tau/N;r=q*boundary[i]
    verts.append((math.cos(a)*1.55*r,math.sin(a)*1.08*r,.009+.034*(1-q*q)+rng.uniform(0,.009)*(1-q)))
for i in range(N):faces.append((0,1+i,1+(i+1)%N))
for j in range(R-1):
  for i in range(N):
    a=1+j*N+i;b=1+j*N+(i+1)%N;d=a+N;e=b+N
    faces.extend([(a,d,e),(a,e,b)])
o=mesh('creeping moss uneven feathered edge',verts,faces,m['moss']);uv_world(o,.72)
for i in range(17):
  a=rng.random()*math.tau;r=rng.uniform(.65,1.1)
  o=cube('small submerged flake', (math.cos(a)*r,math.sin(a)*r*.65,.017),(rng.uniform(.04,.14),rng.uniform(.03,.1),.02),m['stone'],.008);o.rotation_euler.z=a
finish('v3_moss_veil','幅約3.8mの不定形苔cap。4m床境界を跨いで薄く重ねる。自作形状、既存CC0土写真から緑色調派生。歩行面高さ最大6cm未満。')
