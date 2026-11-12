"""Frozen waterfall and open cavern diorama for Stage 2; Z up, metres."""
import numpy as np
import trimesh
S=trimesh.Scene()
ICE=[105,181,206,230];LIGHT=[165,222,231,245];DEEP=[49,115,157,255];ROCK=[76,91,102,255];STONE=[116,133,141,255];FROST=[204,226,232,255]
def put(name,mesh,color):
 mesh.visual.vertex_colors=color;S.add_geometry(mesh,geom_name=name)
def block(name,at,size,color):
 m=trimesh.creation.box(extents=size);m.apply_translation(at);put(name,m,color)
def spike(name,base,tip,r,color,seed=0):
 a=np.array(base,float);b=np.array(tip,float);d=b-a
 mesh=trimesh.creation.cone(radius=r,height=np.linalg.norm(d),sections=7)
 mesh.apply_transform(trimesh.geometry.align_vectors([0,0,1],d/np.linalg.norm(d)))
 mesh.apply_translation((a+b)/2);put(name,mesh,color)
rng=np.random.default_rng(42)
# Wide 20m cavern with broken rock ledges and a clear central vista.
block('rock_backdrop',(0,3.6,6.0),(19,2.8,12),ROCK)
for i in range(12):
 x=-9+i*1.6
 block(f'cliff_ledge_{i}',(x,2.0+rng.uniform(-.5,.5),rng.uniform(1,3)),(1.7,2.4,rng.uniform(2,5)),STONE if i%3==0 else ROCK)
# Multiple overlapping curving sheets, not a flat rectangular slab.
for j in range(11):
 x=-5.0+j
 zvals=np.linspace(2.0,10.6,19)
 vertices=[];faces=[]
 for k,z in enumerate(zvals):
  wobble=.22*np.sin(z*1.6+j*.85)+.12*np.sin(z*3.1+j)
  x0=x+wobble+.20*np.sin(z*.35)
  y0=1.6-.35*np.cos(z*.7+j*.5)
  width=.29+.12*np.sin(z*.8+j)
  vertices.extend([[x0-width,y0,z],[x0+width,y0+.10,z]])
 for k in range(len(zvals)-1):
  a=2*k;faces.extend([[a,a+1,a+2],[a+1,a+3,a+2]])
 m=trimesh.Trimesh(vertices=vertices,faces=faces,process=False)
 put(f'frozen_flow_ribbon_{j}',m,LIGHT if j%3==0 else ICE)
 # Ice column at variable hanging heights and spacing.
 for k in range(2):
  z=7.8+rng.uniform(-2.5,2)
  h=rng.uniform(.8,3.4)
  spike(f'waterfall_ice_tusk_{j}_{k}',(x+rng.uniform(-.4,.4),1.0+rng.uniform(-.4,.4),z),(x+rng.uniform(-.6,.6),1.1,z-h),rng.uniform(.14,.44),LIGHT if k else DEEP)
# Massive top overhang with hanging ice.
block('upper_rock_shelf',(0,1.3,11.2),(14.5,5.5,1.6),ROCK)
for i in range(25):
 x=rng.uniform(-7,7);y=rng.uniform(-1,3)
 h=rng.uniform(.5,3.1)
 spike(f'overhang_icicle_{i}',(x,y,10.4),(x+rng.uniform(-.3,.3),y,10.4-h),rng.uniform(.10,.39),LIGHT if i%3 else DEEP)
# Frozen plunge basin, concentric irregular sheets and cracked banks.
for i in range(6):
 m=trimesh.creation.cylinder(radius=5.0-i*.43,height=.08,sections=48)
 m.apply_scale([1.5,0.52,1]);m.apply_translation((0,-1.0,.12+i*.05))
 put(f'frozen_pool_{i}',m,ICE if i%2 else DEEP)
for side in [-1,1]:
 for i in range(7):
  x=side*(6.5+rng.uniform(0,2))
  y=rng.uniform(-3,2)
  block(f'bank_rock_{side}_{i}',(x,y,rng.uniform(.2,.6)),(rng.uniform(.8,1.7),rng.uniform(.6,1.8),rng.uniform(.5,1.4)),STONE)
  if i%2==0:
   spike(f'bank_crystal_{side}_{i}',(x,y,.8),(x+rng.uniform(-.5,.5),y,2.2+rng.uniform(0,2)),rng.uniform(.2,.6),LIGHT)

# V2: open the central vista and replace cuboid cliff silhouette with faceted rock.
for name, geom in list(S.geometry.items()):
 if name.startswith('rock_backdrop') or name.startswith('upper_rock_shelf'):
  S.delete_geometry(name)
 elif name.startswith('cliff_ledge_') or name.startswith('bank_rock_'):
  bounds=geom.bounds
  center=bounds.mean(axis=0)
  scale=(bounds[1]-bounds[0])*.68
  rock=trimesh.creation.icosphere(subdivisions=1,radius=1)
  rock.apply_scale(scale)
  rock.apply_translation(center)
  S.delete_geometry(name)
  put(name+'_faceted',rock,STONE)
 elif name.startswith('frozen_flow_ribbon_'):
  geom.apply_translation([0,-2.8,0])
 elif name.startswith('waterfall_ice_tusk_'):
  geom.apply_translation([0,-2.8,0])
# Large natural stone walls framing the waterfall, not blocking its front.
for side in (-1,1):
 for row in range(3):
  for level in range(4):
   x=side*(6.3+row*1.3+rng.uniform(-.4,.4))
   y=2.5+rng.uniform(-1,1)
   z=1.4+level*2.7+rng.uniform(-.6,.6)
   rock=trimesh.creation.icosphere(subdivisions=1,radius=1)
   rock.apply_scale([rng.uniform(1.0,2.0),rng.uniform(.8,1.5),rng.uniform(1.2,2.3)])
   rock.apply_translation([x,y,z])
   put(f'cavern_wall_{side}_{row}_{level}',rock,ROCK if row%2 else STONE)
for i in range(15):
 x=-7+i
 rock=trimesh.creation.icosphere(subdivisions=1,radius=1)
 rock.apply_scale([rng.uniform(.7,1.4),rng.uniform(.7,1.4),rng.uniform(.5,1.1)])
 rock.apply_translation([x,1.8+rng.uniform(-.5,.5),11.3+rng.uniform(-.4,.4)])
 put(f'fractured_overhang_{i}',rock,ROCK)


# V3 silhouette-first redesign: the ice curtain dominates the entire composition.
# Retain V1/V2 geometry as source code; remove only clutter from this preview scene.
for name in list(S.geometry):
 if name.startswith(('fractured_overhang_','cavern_wall_','fractured_ledge_','cliff_ledge_','bank_rock_','frozen_flow_ribbon_','waterfall_ice_tusk_','overhang_icicle_','upper_rock_shelf','rock_backdrop')):
  S.delete_geometry(name)
def ice_curtain(name,x,width,front,top,bottom,seed,color):
 rr=np.random.default_rng(seed)
 verts=[];faces=[]
 for row in range(28):
  z=bottom+(top-bottom)*row/27
  for col in range(9):
   u=col/8
   xx=x+width*(u-.5)+.14*np.sin(z*.95+u*8+seed)
   yy=front+.18*np.sin(u*18+z*.7+seed)+.13*np.sin(z*1.9+u*9)
   verts.append([xx,yy,z+.11*np.sin(u*12+seed)])
 for row in range(27):
  for col in range(8):
   a=row*9+col
   faces.extend([[a,a+1,a+9],[a+1,a+10,a+9]])
 mesh=trimesh.Trimesh(vertices=verts,faces=faces,process=False)
 put(name,mesh,color)
# 12m-wide waterfall: multiple staggered ice draperies and blue crevices.
ice_curtain('MAIN_ICE_WATERFALL',0,12.8,-3.8,12.1,.75,101,LIGHT)
for i in range(19):
 x=-6.1+i*.68
 ice_curtain(f'ice_fold_{i}',x,.72,-4.05-.17*np.sin(i),11.5+rng.uniform(-.5,.6),1+rng.uniform(-.5,.7),i+120,ICE if i%3 else DEEP)
for i in range(27):
 x=rng.uniform(-6.3,6.3)
 top=rng.uniform(7.2,12.2)
 spike(f'front_icicle_{i}',(x,-4.35,top),(x+rng.uniform(-.35,.35),-4.5,top-rng.uniform(1.4,4.7)),rng.uniform(.12,.42),LIGHT if i%3 else DEEP)
# Framing cliffs: sparse angular stratified shelves, not pebble piles.
for side in (-1,1):
 for level in range(5):
  x=side*(8.5+level*.18)
  z=level*2.5+1.1
  rock=trimesh.creation.box(extents=[3.0,3.5,2.4])
  rock.apply_transform(trimesh.transformations.rotation_matrix(side*(.12+level*.05),[0,1,0]))
  rock.apply_translation([x,1.1,z])
  put(f'side_cliff_stratum_{side}_{level}',rock,ROCK if level%2 else STONE)
# Wider, visibly stepped frozen plunge pool and spacious foreground.
for name in list(S.geometry):
 if name.startswith('frozen_pool_'):S.delete_geometry(name)
for i in range(8):
 basin=trimesh.creation.cylinder(radius=8.5-i*.48,height=.09,sections=64)
 basin.apply_scale([1.1,.67,1])
 basin.apply_translation([0,-5.4,.12+i*.09])
 put(f'plunge_pool_terrace_{i}',basin,DEEP if i%2 else ICE)
# Broken radial surface plates distinguish frozen water from a featureless disk.
for i in range(16):
 theta=2*np.pi*i/16
 x=5.7*np.cos(theta);y=-5.4+3.4*np.sin(theta)
 plate=trimesh.creation.box(extents=[rng.uniform(.8,2.1),rng.uniform(.4,1.1),.08])
 plate.apply_transform(trimesh.transformations.rotation_matrix(theta,[0,0,1]))
 plate.apply_translation([x,y,.85])
 put(f'fractured_ice_shelf_{i}',plate,FROST)

S.export('floor2_frozen_waterfall.glb')
print('GEOMETRIES',len(S.geometry))
