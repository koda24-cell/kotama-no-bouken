# Procedural prototype generator. Requires trimesh and numpy.
import trimesh, numpy as np, random
random.seed(31)
s=trimesh.Scene()
def box(n,p,d,c):
 m=trimesh.creation.box(extents=d);m.apply_translation(p);m.visual.vertex_colors=c;s.add_geometry(m,geom_name=n)
def rod(n,a,b,r,c):
 a=np.array(a);b=np.array(b);v=b-a;m=trimesh.creation.cylinder(radius=r,height=np.linalg.norm(v),sections=7);m.apply_transform(trimesh.geometry.align_vectors([0,0,1],v));m.apply_translation((a+b)/2);m.visual.vertex_colors=c;s.add_geometry(m,geom_name=n)
con=[155,153,142,255];rust=[100,66,49,255];green=[61,103,51,255]
for k,z in enumerate([0.25,3.65,7.05,10.45]):
 for j,(x,y,w,d) in enumerate([(-3.3,0,5.4,6.6),(2,-1.7,4.2,3.2),(2.5,2.3,2.2,2)]):
  if k==3 and j==2:continue
  box(f'slab_{k}_{j}',(x,y,z),(w,d,.42),con)
 if k<3:
  for x in [-5.7,-1,3.7]:
   for y in [-3,3]:
    if k==2 and x==3.7 and y==3:continue
    box(f'column_{k}_{x}_{y}',(x,y,z+1.7),(.42,.42,3.4),con)
  for y in [-3,3]:box(f'beam_{k}_{y}',(-1,y,z+3.25),(9.5,.34,.45),con)
for k in range(3):
 z=k*3.4+1.8
 for x in [-5.7,-4.5,-2.6,-1.1]:
  if (k,x) in [(1,-2.6),(2,-4.5)]:continue
  box(f'facade_{k}_{x}',(x,-3.26,z),(.72,.24,2.6),con)
 box(f'lintel_{k}',(-3.4,-3.26,z+1.43),(4.9,.28,.36),con)
for x in [1.1,4.5]:
 for y in [-2.8,2.8]:rod(f'steel_{x}_{y}',(x,y,1),(x,y,10.8),.12,rust)
for z in [3.5,6.9,10.3]:
 for y in [-2.8,2.8]:rod(f'cross_{z}_{y}',(1.1,y,z),(4.5,y,z),.11,rust)
for i in range(26):
 x=random.uniform(-5.5,4.4);y=random.choice([-3.1,3.1]);z=random.choice([3.65,7.05,10.45]);rod(f'rebar_{i}',(x,y,z),(x+.2,y+.2,z+.7),.035,rust)
for i in range(60):
 x=random.uniform(-6.5,5.7);y=random.uniform(-4.6,4.6);w=random.uniform(.25,1);h=random.uniform(.18,.65);box(f'rubble_{i}',(x,y,h/2),(w,.5,h),con)
for i in range(85):
 x=random.choice([-5.9,-1,3.6])+random.uniform(-.35,.35);y=random.uniform(-3.3,3.3);z=random.uniform(.5,10.6);box(f'ivy_{i}',(x,y,z),(.22,.18,.32),green)
for i in range(70):
 x=random.uniform(-7,6);y=random.uniform(-5,5);rod(f'grass_{i}',(x,y,.1),(x+.12,y,.5),.035,green)
s.export('ruined_building_prototype.glb')
