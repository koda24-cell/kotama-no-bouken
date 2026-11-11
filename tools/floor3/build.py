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


# Fourth pass: large torn facade remnants with physically thick jagged edges.
# Keep the existing beams, columns, stairs and small facade fragments intact.
def torn_wall(name, xz, y=-3.32, thickness=.32):
    n=len(xz)
    vertices=[[x,yy,z] for yy in (y-thickness/2,y+thickness/2) for x,z in xz]
    faces=[]
    for i in range(1,n-1):
        faces.extend([[0,i,i+1],[n,n+i+1,n+i]])
    for i in range(n):
        j=(i+1)%n
        faces.extend([[i,j,n+j],[i,n+j,n+i]])
    mesh=trimesh.Trimesh(vertices=vertices,faces=faces,process=False)
    mesh.visual.vertex_colors=[137,136,127,255]
    s.add_geometry(mesh,geom_name=name)

# Broad but incomplete concrete planes: different fracture profiles per storey.
torn_wall('major_torn_wall_ground_left',[
 (-5.95,.35),(-3.78,.35),(-3.42,.72),(-3.66,1.08),
 (-3.15,1.42),(-3.44,1.89),(-3.20,2.15),(-3.72,2.72),
 (-4.08,2.44),(-4.48,3.14),(-5.95,3.18)])
torn_wall('major_torn_wall_middle_left',[
 (-5.95,3.76),(-3.45,3.76),(-3.15,4.14),(-3.59,4.57),
 (-3.31,4.94),(-3.86,5.18),(-3.61,5.58),(-4.18,6.46),
 (-4.52,6.16),(-4.89,6.72),(-5.95,6.73)])
torn_wall('major_torn_wall_upper_left',[
 (-5.95,7.18),(-4.26,7.18),(-3.93,7.51),(-4.28,7.89),
 (-3.84,8.18),(-4.52,8.71),(-4.23,9.05),(-4.96,9.64),
 (-5.95,9.78)])
torn_wall('major_torn_wall_ground_right',[
 (1.18,.36),(3.62,.36),(3.62,3.25),(2.66,3.24),
 (2.36,2.91),(2.62,2.45),(2.08,2.13),(2.34,1.72),
 (1.77,1.31),(1.98,.84)])
torn_wall('major_torn_wall_middle_right',[
 (2.45,3.78),(3.62,3.78),(3.62,6.69),(2.87,6.63),
 (2.55,6.21),(2.87,5.86),(2.35,5.41),(2.72,4.95),
 (2.30,4.46)])
# Structural fracture reinforcement: rods originate at the broken edges.
for idx,(x,z) in enumerate([(-3.44,1.89),(-3.72,2.72),(-3.59,4.57),
                           (-3.86,5.18),(-4.52,8.71),(2.62,2.45),
                           (2.87,5.86),(2.35,5.41)]):
    for j in range(3):
        dz=.11*j
        rod(f'torn_edge_rebar_{idx}_{j}',(x,-3.3,z+dz),
            (x+.25+.07*j,-3.43,z+dz-.23),.026,rust)
# Fractured floor rim with exposed reinforcement, avoiding the intact central stairs.
for k,z in enumerate((3.65,7.05,10.45)):
    for j in range(5):
        x=-5.35+j*.62
        rod(f'floor_edge_rebar_{k}_{j}',(x,-3.4,z),
            (x+.08,-3.88,z-.12-.08*(j%3)),.035,rust)


# Fifth pass: structural side-wall ruins. These are additive, not replacements.
# The exposed right flank was previously an open regular steel frame.
def torn_side_wall(name, yz, x=3.68, thickness=.34):
    n=len(yz)
    verts=[[xx,y,z] for xx in (x-thickness/2,x+thickness/2) for y,z in yz]
    faces=[]
    for i in range(1,n-1):
        faces.extend([[0,i,i+1],[n,n+i+1,n+i]])
    for i in range(n):
        j=(i+1)%n
        faces.extend([[i,j,n+j],[i,n+j,n+i]])
    mesh=trimesh.Trimesh(vertices=verts,faces=faces,process=False)
    mesh.visual.vertex_colors=[143,140,132,255]
    s.add_geometry(mesh,geom_name=name)

# Broken right flank, leaving large openings to read the internal stairs.
torn_side_wall('side_wall_ground_remnant',[
 (-3.18,.34),(-1.02,.34),(-.78,.73),(-1.12,1.06),
 (-.71,1.45),(-1.18,1.83),(-.94,2.18),
 (-1.62,2.53),(-1.95,3.13),(-3.18,3.13)])
torn_side_wall('side_wall_middle_remnant',[
 (1.00,3.79),(3.12,3.79),(3.12,6.65),(2.23,6.65),
 (1.86,6.27),(2.06,5.92),(1.53,5.44),
 (1.83,5.05),(1.29,4.61)])
torn_side_wall('side_wall_top_spandrel',[
 (-3.16,9.35),(-2.57,9.12),(-2.13,9.42),(-1.76,9.02),
 (-1.24,9.46),(-.71,9.17),(-.35,9.78),(.35,9.61),
 (.75,10.23),(-3.16,10.23)])
# Distinctive broken reinforced concrete edge, with rods emerging outward
# from the exposed side-wall fracture rather than floating in space.
for i,(y,z) in enumerate([(-1.12,1.06),(-1.18,1.83),(-1.62,2.53),
                         (1.86,6.27),(1.53,5.44),(-1.76,9.02)]):
    for j in range(2):
        rod(f'side_fracture_rebar_{i}_{j}',
            (3.69,y,z+.12*j),(4.08+.09*j,y+.12,z-.24+.12*j),.028,rust)
# Dislodged side-wall concrete fragments resting below the corresponding breaks.
for i,(x,y,z,w,h) in enumerate([
    (4.17,-1.50,.47,.85,.65),(4.63,-2.15,.30,.64,.43),
    (4.02,1.86,3.87,.72,.32),(4.27,2.38,3.88,.53,.29)]):
    box(f'side_collapse_fragment_{i}',(x,y,z),(w,.46,h),con)


# Sixth pass: exposed broken floor cantilevers and hanging reinforcement.
# These project beyond the original straight slab edge, visually interrupting
# its uniform outline without deleting the underlying structural geometry.
def fracture_cantilever(name, points, bottom, top, col):
    n=len(points)
    vertices=[[x,y,z] for z in (bottom,top) for x,y in points]
    faces=[]
    for i in range(1,n-1):
        faces.extend([[0,i+1,i],[n,n+i,n+i+1]])
    for i in range(n):
        j=(i+1)%n
        faces.extend([[i,j,n+j],[i,n+j,n+i]])
    mesh=trimesh.Trimesh(vertices=vertices,faces=faces,process=False)
    mesh.visual.vertex_colors=col
    s.add_geometry(mesh,geom_name=name)

# Three independent floor fractures: broken tongues have varied footprints.
for floor,z in enumerate([3.65,7.05,10.45]):
    shapes=[
      [(-5.65,-3.08),(-4.15,-3.08),(-4.23,-3.67),(-4.56,-3.91),(-4.91,-3.69),(-5.23,-4.13),(-5.65,-3.72)],
      [(-3.32,-3.07),(-1.86,-3.07),(-1.91,-3.58),(-2.18,-3.77),(-2.57,-3.51),(-2.91,-3.98),(-3.32,-3.55)],
      [(-.75,-3.07),(.22,-3.07),(.06,-3.45),(-.27,-3.81),(-.52,-3.58),(-.75,-3.72)]
    ]
    outline=shapes[floor]
    fracture_cantilever(f'broken_floor_cantilever_{floor}',outline,z-.28,z+.04,[128,125,116,255])
    for j in range(4):
        x=outline[0][0]+.22+j*.27
        y=-3.57-.12*(j%2)
        rod(f'hanging_slab_rebar_{floor}_{j}',(x,y,z-.1),
            (x+.09,y-.24,z-.72-.12*(j%3)),.029,rust)
    # Sheared fragments below the same break, not evenly scattered.
    for j in range(3):
        x=outline[0][0]+.3+j*.41
        box(f'falling_slab_chunk_{floor}_{j}',(x,-3.9-j*.11,z-.58-j*.17),
            (.31+.09*j,.32,.23+.05*j),[137,133,124,255])


# Seventh pass: partial progressive floor collapse at the exposed right-hand bay.
# A tilted heavy slab remains attached to the floor rim; broken joists and the
# matching debris below make gravity and the failure direction readable.
def displaced_slab(name, center, size, pitch_deg, color):
    mesh=trimesh.creation.box(extents=size)
    rot=trimesh.transformations.rotation_matrix(np.radians(pitch_deg),[1,0,0])
    mesh.apply_transform(rot)
    mesh.apply_translation(center)
    mesh.visual.vertex_colors=color
    s.add_geometry(mesh,geom_name=name)

# Each failure is offset, so the damage does not repeat as a rigid pattern.
for level,(x,y,z,angle) in enumerate([
    (2.25,-3.55,3.15,-26),
    (1.78,-3.62,6.38,-34),
    (2.62,-3.34,9.95,-19),
]):
    displaced_slab(f'sagging_floor_plate_{level}',(x,y,z),
                   (2.05,1.32,.35),angle,[125,122,114,255])
    for j in range(4):
        xx=x-.75+j*.47
        rod(f'sagging_plate_exposed_rebar_{level}_{j}',
            (xx,y-.5,z-.2),(xx+.06,y-.85,z-.65-.1*(j%2)),.033,rust)
    # Broken concrete chunks are concentrated below the same structural failure.
    for j in range(5):
        xx=x-.9+j*.4
        yy=-4.0-.19*(j%3)
        box(f'collapse_foot_debris_{level}_{j}',
            (xx,yy,.22+.08*(j%2)),(.55+.11*(j%2),.52,.36),con)
    rod(f'fractured_joist_{level}_a',(x-1.05,-2.9,z+.35),
        (x-.65,-3.8,z-.28),.085,rust)
    rod(f'fractured_joist_{level}_b',(x+.95,-2.9,z+.35),
        (x+.53,-3.68,z-.35),.085,rust)


# Eighth pass: roofline failure and fallen beam fragments.
# Existing roof beams stay intact to preserve prior geometry; fracture caps and
# visibly displaced heavy members create an asymmetric broken silhouette.
for idx,(x,y,z,ang) in enumerate([
    (-4.85,-3.05,10.92,-22),(-3.35,-3.15,10.72,31),
    (2.35,2.98,10.65,-38), (3.85,2.96,10.27,47)]):
    displaced_slab(f'roof_sheared_concrete_{idx}',(x,y,z),
                   (1.18,.66,.44),ang,[127,124,116,255])
    for j in range(3):
        rod(f'roof_break_rebar_{idx}_{j}',
            (x-.35+j*.28,y,z-.17),
            (x-.42+j*.32,y-.34,z-.55-.13*j),.034,rust)
# Detached upper structural fragments have varied angles and mass.
for idx,(a,b) in enumerate([
    ((-5.45,-3.05,10.83),(-4.56,-3.68,9.58)),
    ((-3.18,-3.03,10.76),(-2.63,-3.87,9.21)),
    ((3.62,2.93,10.64),(4.33,3.59,9.16))]):
    rod(f'roof_dangling_steel_{idx}',a,b,.105,rust)
for idx,(x,y,w,h) in enumerate([
    (-4.87,-4.12,1.23,.73),(-3.24,-4.52,.91,.55),
    (3.94,3.69,1.13,.82),(4.55,3.41,.78,.47)]):
    box(f'roof_collapse_ground_rubble_{idx}',(x,y,h/2),(w,.75,h),con)

s.export('ruined_building_prototype.glb')
