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

# Second-pass structural detail
for k in range(3):
 z=k*3.4
 for step in range(11):
  box(f'stair_{k}_{step}',(-.1,1.8-step*.35,z+.2+step*.29),(1.3,.38,.24),con)
 for side in [-.75,.65]:
  rod(f'rail_{k}_{side}',(side,2.2,z+.55),(side,-1.7,z+3.5),.045,rust)
 for x in [-5.7,-4.5,-2.6,-1.1]:
  if (k,x) in [(1,-2.6),(2,-4.5)]:continue
  rod(f'window_vertical_{k}_{x}',(x+.48,-3.42,z+.65),(x+.48,-3.42,z+2.6),.035,rust)
  rod(f'window_sill_{k}_{x}',(x+.15,-3.42,z+.7),(x+.9,-3.42,z+.7),.035,rust)
for i in range(35):
 x=random.uniform(-5.6,4.7);y=random.choice([-3.3,3.3]);z=random.choice([3.65,7.05,10.45]);box(f'broken_edge_{i}',(x,y,z+random.uniform(-.2,.2)),(random.uniform(.18,.65),random.uniform(.2,.7),random.uniform(.12,.4)),con)
for i in range(20):
 x=random.uniform(1,4.5);y=random.uniform(-3,3);z=random.uniform(.6,10);rod(f'steel_bolt_{i}',(x,y,z),(x+.16,y,z),.05,rust)
for x in [-4.7,-3.1]:
 for y in [1.5,2.9]:rod(f'tank_leg_{x}_{y}',(x,y,10.7),(x,y,12.1),.09,rust)
rod('tank_body_vertical',(-3.9,2.2,11.8),(-3.9,2.2,13.2),.7,rust)


# Third-pass: jagged concrete panels, rebar, structural bracing and ivy.
def shard(n,pts,depth,col):
 c=np.mean(np.array(pts),axis=0);v=[];faces=[]
 for y in [-depth/2,depth/2]:
  v.append([c[0],y,c[1]]);v.extend([[x,y,z] for x,z in pts])
 count=len(pts);o=count+1
 for i in range(count):
  j=(i+1)%count
  faces.extend([[0,1+i,1+j],[o,o+1+j,o+1+i],[1+i,o+1+i,o+1+j],[1+i,o+1+j,1+j]])
 m=trimesh.Trimesh(vertices=v,faces=faces,process=False);m.visual.vertex_colors=col;s.add_geometry(m,geom_name=n)
for k in range(3):
 z=k*3.4+.5
 for j,x in enumerate([-5.5,-3.7,-1.9]):
  pts=[(x,z+.1),(x+1.55,z+.08),(x+1.45,z+.32),(x+1.2,z+.41),(x+.96,z+.21),(x+.65,z+.52),(x+.34,z+.29),(x+.1,z+.57)]
  shard(f'fractured_panel_{k}_{j}',pts,.32,con)
  for t in range(3):
   xx=x+.3+t*.38;rod(f'fracture_rebar_{k}_{j}_{t}',(xx,-.25,z+.18),(xx+.18,-.35,z-.2-.15*t),.025,rust)
 for y in [-2.8,2.8]:
  low=.65+k*3.4;high=low+2.9
  rod(f'brace_a_{k}_{y}',(1.1,y,low),(4.5,y,high),.055,rust)
  rod(f'brace_b_{k}_{y}',(4.5,y,low),(1.1,y,high),.055,rust)
  for x in [1.1,4.5]:box(f'gusset_{k}_{y}_{x}',(x,y,high),(.45,.12,.4),rust)
for i,x in enumerate(np.linspace(-5.4,-1.3,7)):
 if i==4:continue
 rod(f'roof_post_{i}',(x,-3,10.65),(x,-3,11.55),.035,rust)
for i in [0,1,2,5]:
 x=-5.4+i*4.1/6;rod(f'roof_rail_{i}',(x,-3,11.5),(x+4.1/6,-3,11.5),.035,rust)
for i in range(46):
 x=random.uniform(-5.8,3.4);y=random.uniform(-3.1,3.1);z=random.choice([3.75,7.15,10.55]);a=random.uniform(.12,.52)
 m=trimesh.creation.icosphere(subdivisions=0,radius=a);m.apply_scale([1.5,.9,.4]);m.apply_translation([x,y,z+a*.2]);m.visual.vertex_colors=con;s.add_geometry(m,geom_name=f'ledge_rubble_{i}')
for i in range(23):
 x=random.choice([-5.6,-1.1,3.5])+random.uniform(-.3,.3);y=random.uniform(-3,3);top=random.choice([10.7,7.3,3.9]);length=random.uniform(1,2.6);prev=(x,y,top)
 for j in range(5):
  pt=(x+np.sin(j*.65+i)*.12,y+.1*np.cos(j+i),top-length*(j+1)/5)
  rod(f'ivy_stem_{i}_{j}',prev,pt,.026,green)
  if j%2==0:box(f'ivy_leaf_{i}_{j}',pt,(.28,.2,.16),green)
  prev=pt

s.export('ruined_building_prototype.glb')
