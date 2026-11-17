"""P3 V5: thick secondary molten-rock cascade and supported impact pool.
Adds geometry to V16+V4; does not delete or replace existing meshes.
"""
from math import sin,cos,pi
assert variant=='p3-v5'
n=128;m=30;vs=[];uv=[];fs=[]
for j in range(n+1):
 t=j/n
 y=1.92-1.58*t
 z=-3.55+.53*t+.045*sin(t*4.3)
 cx=1.47+.11*sin(t*4.2)
 width=.16+.12*t+.025*sin(t*pi)
 for i in range(m+1):
  u=i/m
  x=cx+(u-.5)*2*width*(1+.045*sin(t*19+u*10))
  zz=z+.038+.026*sin(u*6.1+t*14.7)
  vs.append((x,y,zz));uv.append((u,t*1.55))
for j in range(n):
 for i in range(m):
  a=j*(m+1)+i;b=a+m+1;fs.append((a,a+1,b+1,b))
objmesh('P3_V5_THICKER_SECONDARY_MOLTEN_FRONT',vs,fs,lava,uv,True)
# Sidewalls and partly cooled crust keep the fall volumetric in side view.
for side in (-1,1):
 vs=[];uv=[];fs=[]
 for j in range(n+1):
  t=j/n
  y=1.92-1.58*t
  z=-3.55+.53*t+.045*sin(t*4.3)
  cx=1.47+.11*sin(t*4.2)
  width=.16+.12*t+.025*sin(t*pi)
  x=cx+side*width*(.92+.07*sin(t*16+side))
  vs.extend(((x,y,z+.09),(x+side*.055,y,z-.15-.025*sin(t*8)**2)))
  uv.extend(((t*.6,0),(t*.6,1)))
 for j in range(n):
  a=j*2;fs.append((a,a+1,a+3,a+2))
 objmesh('P3_V5_FALL_THICK_BASALT_CRUST_SIDE',vs,fs,crust,uv,False)
# A lava pool settles onto the terrain, following its true elevation.
N=80;M=22;vs=[];uv=[];fs=[]
cx,cz=1.53,-2.93
for j in range(M+1):
 r=j/M
 for i in range(N+1):
  a=2*pi*i/N
  jag=1+.085*sin(a*7+1.7)+.04*sin(a*13+.3)
  x=cx+r*.42*jag*cos(a)
  z=cz+r*.33*jag*sin(a)
  y=ground_y(x,z)+.045+.015*(1-r)
  vs.append((x,y,z));uv.append((.5+r*cos(a)*.46,.5+r*sin(a)*.46))
for j in range(M):
 for i in range(N):
  a=j*(N+1)+i;b=a+N+1;fs.append((a,a+1,b+1,b))
objmesh('P3_V5_SECONDARY_IMPACT_MOLTEN_BASIN',vs,fs,lava,uv,True)
# Uneven black margin fragments embedded in existing V16 basalt.
for k in range(18):
 a=2*pi*k/18
 x=cx+(.43+.045*sin(k*2.3))*cos(a)
 z=cz+(.34+.04*sin(k*1.9))*sin(a)
 bankrock('P3_V5_BURIED_POOL_CRUST',x,ground_y(x,z)+.045,z,
  .12+.04*sin(k*1.3)**2,.095,.13+.035*sin(k*.7)**2,
  9200+k,crust if k%3 else dark_basalt)
print('P3 V5: secondary cascade thickness and embedded pool added')
