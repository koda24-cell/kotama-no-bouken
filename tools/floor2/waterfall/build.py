"""Stage 2 frozen waterfall V4: vertical icefall, natural basin, angular distant cliffs."""
import numpy as np
import trimesh
rng=np.random.default_rng(2402)
scene=trimesh.Scene()
ICE=[123,195,219,240];WHITE=[195,234,242,255];BLUE=[45,113,158,255]
ROCK=[69,85,98,255];STONE=[99,116,128,255]
def add(name,mesh,color):
 mesh.visual.vertex_colors=color
 scene.add_geometry(mesh,geom_name=name)
def rock(name,center,scale,color):
 # Deformed triangulated angular rock, with jagged silhouettes rather than boxes or spheres.
 m=trimesh.creation.icosphere(subdivisions=1,radius=1)
 v=m.vertices.copy()
 v*=rng.uniform(.72,1.28,(len(v),1))
 v*=np.asarray(scale)
 m.vertices=v+np.asarray(center)
 add(name,m,color)
def ice_sheet(name,x0,width,y0,zbottom,ztop,seed,color):
 # Truly vertical XY narrow, XZ tall ice curtain; irregular ridges along Z.
 verts=[];faces=[]
 for iz in range(36):
  z=zbottom+(ztop-zbottom)*iz/35
  for ix in range(11):
   u=ix/10
   x=x0+(u-.5)*width+.15*np.sin(z*1.3+u*13+seed)
   y=y0+.15*np.sin(u*24+z*.8+seed)+.08*np.sin(z*2.1+u*9)
   verts.append((x,y,z))
 for iz in range(35):
  for ix in range(10):
   a=iz*11+ix
   faces.extend(((a,a+1,a+11),(a+1,a+12,a+11)))
 m=trimesh.Trimesh(vertices=verts,faces=faces,process=False)
 add(name,m,color)
def icicle(name,x,y,z,length,r,color):
 m=trimesh.creation.cone(radius=r,height=length,sections=7)
 # cone tip points downward after 180-degree flip
 m.apply_transform(trimesh.transformations.rotation_matrix(np.pi,[1,0,0]))
 m.apply_translation((x,y,z-length*.5))
 add(name,m,color)
# Open air in foreground y<0; waterfall occupies rear vertical plane y=2.
ice_sheet('hero_waterfall_12m_tall',0,12.4,2.0,.65,13.2,7,ICE)
for i in range(24):
 x=-6.0+i*.52
 ice_sheet('vertical_ice_fold_%02d'%i,x,.63,1.65-.20*np.sin(i*.8),.8+rng.uniform(0,.9),12.8+rng.uniform(-.7,.6),i,WHITE if i%4==0 else BLUE if i%7==0 else ICE)
for i in range(30):
 x=rng.uniform(-6.0,6.0)
 z=rng.uniform(7.0,13.0)
 icicle('hanging_ice_%02d'%i,x,1.2+rng.uniform(-.3,.3),z,rng.uniform(1.2,4.1),rng.uniform(.13,.4),WHITE if i%3 else BLUE)
# Rear framing rock is far behind the ice sheet (y>4), never in front.
for side in (-1,1):
 for level in range(7):
  for depth in range(2):
   rock('angular_cliff_%s_%s_%s'%(side,level,depth),
    (side*(8.0+rng.uniform(.2,2.3)),4.8+depth*2.1,1.0+level*2.0),
    (rng.uniform(1.0,2.3),rng.uniform(1.0,1.8),rng.uniform(1.3,2.4)),
    STONE if level%3==0 else ROCK)
for i in range(16):
 x=-7.7+i*1.02
 rock('broken_overhang_%02d'%i,(x,4.6+rng.uniform(-.4,.5),13.4+rng.uniform(-.3,.5)),(.8,1.4,.7),ROCK)
# Single non-circular, uneven frozen basin mesh, no stacked disks.
rings=8;segments=48
verts=[];faces=[]
for j in range(rings):
 radius=.8+j*1.04
 for i in range(segments):
  angle=2*np.pi*i/segments
  variation=1+.075*np.sin(5*angle)+.065*np.cos(9*angle+j*.35)+rng.uniform(-.025,.025)
  x=radius*variation*np.cos(angle)*1.25
  y=-3.2+radius*variation*np.sin(angle)*.69
  z=.12+.12*np.sin(angle*3+j*.7)+.045*j
  verts.append((x,y,z))
for j in range(rings-1):
 for i in range(segments):
  a=j*segments+i;b=j*segments+(i+1)%segments
  faces.extend(((a,b,a+segments),(b,b+segments,a+segments)))
basin=trimesh.Trimesh(vertices=verts,faces=faces,process=False)
add('irregular_frozen_plunge_basin',basin,BLUE)
for i in range(22):
 theta=2*np.pi*i/22
 r=rng.uniform(5.7,8.5)
 x=1.25*r*np.cos(theta);y=-3.2+.69*r*np.sin(theta)
 rock('basin_edge_rock_%02d'%i,(x,y,.25),(rng.uniform(.5,1.3),rng.uniform(.4,.9),rng.uniform(.2,.6)),STONE)
# Foreground viewing rock platform, with generous sightline to waterfall.
for i in range(8):
 x=-9+i*2.6
 rock('foreground_shore_%02d'%i,(x,-9.2,.15),(1.4,1.1,.45),ROCK)
scene.export('floor2_frozen_waterfall.glb')
print('GEOMETRIES',len(scene.geometry))
