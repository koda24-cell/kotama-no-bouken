"""Additive rock, tributary and cliff details, evaluated inside V16 source.

V16's existing meshes, PBR, emissive thermal maps and cameras are preserved.
Coordinates here are the original V16 Y-up model coordinates.
"""
import random
import math
from math import sin, cos, pi
from pathlib import Path
p=variant.split('-')[0]
assert p in ('p1','p2','p3') and variant.endswith('-v4'), variant
rng=random.Random(20261117+{'p1':1,'p2':2,'p3':3}[p]*499)
def bankrock(name,x,y,z,sx,sy,sz,seed,material=dark_basalt):
 return rock(name,(x,y,z),(sx,sy,sz),material,seed=seed,subdiv=4)
def buried_plate(name,x,z,rx,rz,depth,seed,raise_by=.07):
 return slab(name,x,ground_y(x,z)+raise_by,z,rx,rz,depth,seed,dark_basalt)
def rim_segment(name,side,z0,z1,offset,seed):
 # An actual broken basalt shoulder; embedded in existing V16 ground.
 for k in range(8):
  z=z0+(z1-z0)*(k+.35)/8+.075*sin(k*2.1+seed)
  x=edge(z,side)+side*(offset+.16*sin(k*1.1+seed)**2)
  y=ground_y(x,z)+.02
  bankrock(name,x,y,z,.29+.06*sin(k*1.7)**2,.24,.40+.12*sin(k*1.3)**2,seed+k)
  if k%2==0:
   buried_plate(name+'_BEDDING',x+side*.15,z+.11,.28,.42,.13,seed+100+k,.09)
# Shared quality: interlocking bank rock, raised shoulder and rough contact
# geometry, all using V16's existing dark charcoal basalt PBR.
for side in (-1,1):
 rim_segment('V3_BASALT_SHOULDER',side,-1.5,1.9,.28,5000+side*200)
# Only a few large, fully embedded angular blocks, not uniform polygon confetti.
if p=='p1':
 # Constricted meander: large fractured bank shoulders protrude toward the
 # existing molten channel. The river and its thermal cracks remain intact.
 for side in (-1,1):
  for k in range(6):
   z=-1.95+k*.68+.12*sin(k*1.7+side)
   x=edge(z,side)-side*(.11+.11*sin(k*1.9)**2)
   bankrock('P1_CONSTRICTED_BASALT_BANK',x,.15,z,
      .32+.06*sin(k)**2,.24,.38+.09*sin(k*1.6)**2,
      5200+k+side*11)
   buried_plate('P1_BROKEN_BANK_CAP',x+side*.15,z+.08,.30,.42,.14,
      5300+k+side*17,.12)
 # Three natural boulders interrupt the flow and make a narrower side channel.
 for k,(z,dx,scale) in enumerate(((-1.12,-.48,.27),(.10,.43,.28),(1.34,-.38,.31))):
  x=center(z)+dx
  bankrock('P1_SUBMERGED_MOLTEN_CHANNEL_OBSTACLE',x,.105,z,
    scale,.18,scale*1.10,5400+k)
  buried_plate('P1_COOLING_BASALT_TOP',x,z,.22,.30,.09,5500+k,.03)
elif p=='p2':
 # Natural river fork: a coherent central basalt island splits the approved
 # main channel in two, with rooted dark masses and a staggered rock rim.
 for k in range(6):
  z=.05+k*.34
  x=center(z)+.06*sin(k*.82)
  sy=.22+.035*sin(k*.9)**2
  bankrock('P2_EMBEDDED_FORK_ISLAND',x,.09,z,.23+.035*sin(k*.8)**2,sy*.85,
     .28+.07*sin(k*1.1)**2,6000+k)
 for k in range(5):
  z=.13+k*.42
  x=center(z)+.04*sin(k*.8)
  buried_plate('P2_SPLIT_FLOW_BASALT_SHEAR',x,z,.24,.30,.13,6100+k,.05)
 for side in (-1,1):
  for k in range(5):
   z=.13+k*.43
   x=center(z)+side*(halfwidth(z)*.65)
   bankrock('P2_FORK_EDGE_CRUST',x,.12,z,.14,.085,.26,6200+k+side*17,crust)
elif p=='p3':
 # Stepped, deeply eroded basalt shoulder at the foot of the V16 cascade.
 # Preserve original wall, falling magma, and side supports.
 for side in (-1,1):
  for row in range(3):
   for k in range(5):
    z=-2.95+row*.56+.12*sin(k*1.5+row)
    x=edge(z,side)+side*(.22+k*.29+.08*sin(k*2+row))
    y=ground_y(x,z)+.10+row*.035
    bankrock('P3_DEEP_BASALT_LEDGE',x,y,z,
       .33+.07*sin(k+row)**2,.26+.055*sin(k*1.2)**2,
       .39+.09*sin(row*2+k)**2,7000+row*31+k+side*130)
    if k%2==0:
     buried_plate('P3_FRACTURED_SHEAR_CAP',x,z,.36,.41,.17,
       7100+row*23+k+side*99,.15)
 # Cliff-side fractured rock outcrops, aligned with original V16 overhang.
 for k in range(12):
  side=-1 if k%2 else 1
  x=side*(.85+(k%3)*.50)
  y=.48+(k//3)*.53+.10*sin(k*1.8)
  z=-3.59+.09*sin(k*1.4)
  wall_shear('P3_DEEP_CLIFF_JOINTS',x,y,z,
    .56+.13*sin(k*.9)**2,.47+.16*sin(k*1.1)**2,.14,7300+k)
# P3 V4: second minor lavafall, physically rooted into the original rear
# cliff and flanked by the same charcoal-basalt PBR. This is additive and
# intentionally smaller than the V16 main cascade.
if p=='p3':
 n=96;m=24;vs=[];uv=[];fs=[]
 for j in range(n+1):
  t=j/n
  y=1.92-1.58*t
  z=-3.55+.53*t+.045*sin(t*4.3)
  cx=1.47+.11*sin(t*4.2)
  width=.115+.075*t+.022*sin(t*pi)
  for i in range(m+1):
   u=i/m
   x=cx+(u-.5)*2*width*(1+.07*sin(t*11+u*8))
   zz=z+.024*sin(u*5.8+t*12)
   vs.append((x,y,zz));uv.append((u,t*1.6))
 for j in range(n):
  for i in range(m):
   a=j*(m+1)+i;b=a+m+1;fs.append((a,a+1,b+1,b))
 objmesh('P3_V4_SECONDARY_VISCOUS_CASCADE',vs,fs,lava,uv,True)
 # Backing volume: broad dark rock wedge with broken profile, no suspended sheet.
 vs=[];uv=[];fs=[]
 for j in range(n+1):
  t=j/n;y=1.92-1.58*t
  z=-3.55+.53*t+.045*sin(t*4.3)
  cx=1.47+.11*sin(t*4.2)
  width=.115+.075*t+.022*sin(t*pi)
  for i in range(4):
   side=-1 if i<2 else 1
   x=cx+side*(width+.09)
   front=i in (1,2)
   zz=(z-.04+.025*sin(t*15+i)) if front else (-3.83+.025*sin(y*5+x*3))
   vs.append((x,y+.015*sin(t*14+i),zz));uv.append((i*.27,t*1.4))
 for j in range(n):
  for i in range(3):
   a=j*4+i;b=a+4;fs.append((a,a+1,b+1,b))
 objmesh('P3_V4_SECONDARY_CASCADE_CONNECTED_BEDROCK',vs,fs,dark_basalt,uv,False)
 for side in (-1,1):
  for k in range(8):
   t=(k+.45)/8
   y=1.92-1.58*t;z=-3.55+.53*t+.045*sin(t*4.3)
   x=1.47+.11*sin(t*4.2)+side*(.115+.075*t+.07)
   bankrock('P3_V4_SECONDARY_FALL_BASALT_SHOULDER',x,y,z-.06,
     .12,.14,.13,8100+k+side*11,dark_basalt)
 # The impact is a recessed dark crater, not a floating luminous water disk.
 for k in range(12):
  a=2*pi*k/12
  x=1.55+.33*cos(a);z=-2.99+.27*sin(a)
  bankrock('P3_V4_CASCADE_IMPACT_RIM',x,ground_y(x,z)+.06,z,
    .17,.13,.20,8300+k,crust if k%4==0 else dark_basalt)

# A few local dark fissures give the added boulders depth without emitting
# water-like bright bands. Preserve every original approved V16 rock.
for k in range(12):
 z=-2.45+k*.41+.08*sin(k*2.3)
 side=-1 if k%2 else 1
 x=edge(z,side)+side*(.33+.14*sin(k*.91)**2)
 y=ground_y(x,z)+.10
 objmesh('V3_RECESSED_BASALT_FRACTURE',
   [(x-.025,y,z-.13),(x+.024,y-.018,z+.07),
    (x+.045,y-.017,z+.10),(x+.005,y,z-.10)],
   [(0,1,2,3)],fracture,[(0,0),(.9,.9),(1,1),(.1,0)],smooth=False)
print('V16 preserved; additive B4 magma variant:',p)
