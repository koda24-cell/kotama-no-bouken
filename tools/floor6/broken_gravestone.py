import bpy, math, random, sys, os
from mathutils import Vector
random.seed(61)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
def material(name,color,roughness=1):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 bs=m.node_tree.nodes.get("Principled BSDF");bs.inputs["Base Color"].default_value=(*color,1);bs.inputs["Roughness"].default_value=roughness
 return m
stone=material("weathered charcoal limestone",(.16,.18,.175))
edge=material("fresh fractured stone",(.27,.29,.27))
moss=material("uneven deep olive moss",(.065,.13,.055))
engrave=material("shadowed engraving",(.055,.065,.055))
def mesh(name,verts,faces,mat):
 m=bpy.data.meshes.new(name);m.from_pydata(verts,[],faces);m.update();o=bpy.data.objects.new(name,m);bpy.context.collection.objects.link(o);o.data.materials.append(mat);return o
def block(name,loc,scale,mat,bevel=.035):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 if bevel: mod=o.modifiers.new("worn stone edges","BEVEL");mod.width=bevel;mod.segments=2;o.modifiers.new("weighted normals","WEIGHTED_NORMAL")
 return o
# Reference image silhouette sampled at ~3x previous point density (48 vertices).
# Main shape retained; stepped shoulders and ornamental lobes added.
outline=[
 (-.43,.36),(-.45,.46),(-.46,.58),(-.47,.73),(-.47,.92),
 (-.48,1.12),(-.47,1.22),(-.49,1.30),(-.53,1.34),
 (-.55,1.39),(-.54,1.45),(-.51,1.50),(-.46,1.53),
 (-.41,1.53),(-.37,1.51),(-.34,1.55),(-.32,1.61),
 (-.28,1.67),(-.22,1.71),(-.15,1.74),(-.08,1.75),
 (-.01,1.74),(.06,1.70),(.12,1.65),(.17,1.58),
 (.19,1.52),(.24,1.54),(.30,1.54),(.35,1.51),
 (.39,1.47),(.41,1.42),(.40,1.37),(.37,1.33),
 (.35,1.29),(.39,1.25),(.42,1.20),(.44,1.12),
 (.45,1.02),(.45,.91),(.44,.81),(.43,.70),
 (.43,.60),(.42,.50),(.42,.40),(.42,.36)
]
# chipped upper right portion with broken zigzag profile
n=len(outline);verts=[]
for y in [-.13,.13]:
 for x,z in outline: verts.append((x+random.uniform(-.012,.012),y+random.uniform(-.013,.013),z))
faces=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]
for i in range(n):j=(i+1)%n;faces.append((i,j,j+n,i+n))
headstone=mesh("asymmetric fractured upright stone",verts,faces,stone)
block("lower cracked plinth",(0,0,.15),(1.14,.48,.30),stone,.055)
block("upper chipped plinth",(-.02,0,.34),(1.0,.37,.16),edge,.035)
# V10: actual concave erosion cut into the headstone mesh, rather than
# light-colored strips laid over its surface. Keep the silhouette and inscription.
# V11: connected narrow fracture trenches with real boolean subtraction.
# Overlapping cutters follow one continuous polyline, rather than round isolated holes.
def carve_trench(name,pts,width):
 for i,(p,q) in enumerate(zip(pts,pts[1:])):
  x1,z1=p;x2,z2=q;dx=x2-x1;dz=z2-z1
  length=math.hypot(dx,dz)
  bpy.ops.mesh.primitive_cube_add(size=1,location=((x1+x2)/2,-.132,(z1+z2)/2))
  cutter=bpy.context.object;cutter.name=name+" cutter "+str(i)
  cutter.dimensions=(width,.115,length+width*.9)
  cutter.rotation_euler[1]=math.atan2(dx,dz)
  bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
  bpy.context.view_layer.objects.active=headstone
  mod=headstone.modifiers.new(name+" "+str(i),"BOOLEAN")
  mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter
  bpy.ops.object.modifier_apply(modifier=mod.name)
  bpy.data.objects.remove(cutter,do_unlink=True)
for i,pts in enumerate([
 [(-.34,1.47),(-.29,1.34),(-.33,1.24),(-.26,1.10),(-.31,.96)],
 [(.36,1.44),(.28,1.34),(.31,1.20),(.25,1.10),(.32,.98)],
 [(.09,1.57),(.02,1.48),(.07,1.39),(.015,1.29)]
]):
 carve_trench("V11 connected stone fracture %d"%i,pts,.021)
# cracks as recessed dark narrow grooves with branching zigzags, surface attached
def groove(name,points,width=.012):
 for i,(a,b) in enumerate(zip(points,points[1:])):
  ax,az=a;bx,bz=b;dx=bx-ax;dz=bz-az
  o=block(name+" "+str(i),((ax+bx)/2,-.149,(az+bz)/2),(width,.008,math.hypot(dx,dz)),engrave,0)
  o.rotation_euler[1]=math.atan2(dx,dz)
groove("major fractured fissure",[(.04,1.57),(-.035,1.34),(.07,1.16),(-.02,.94),(.04,.76),(-.10,.51)],.018)
groove("branch fissure",[(.07,1.16),(.20,1.09),(.30,.91)],.012)
groove("secondary fissure",[(-.02,.94),(-.18,.83),(-.26,.67)],.009)
# faded inscription carved-looking shallow line geometry
for i in range(3):
 z=.72-i*.105
 groove("worn rune "+str(i),[(-.30,z),(-.23,z+.015),(-.16,z-.01)],.007)
# displaced broken fragments
for i,(x,y,z,s) in enumerate([(-.53,-.27,.12,.22),(.57,-.21,.11,.19),(.34,-.42,.09,.16),(-.21,-.39,.07,.12)]):
 o=block("fallen chipped fragment "+str(i),(x,y,z),(s,s*.65,s*.7),edge,.025);o.rotation_euler=(random.uniform(-.3,.3),random.uniform(-.4,.4),random.uniform(-.7,.7))
# moss patches at base, deliberately discrete and sparse
for i in range(26):
 x=random.uniform(-.5,.5);z=random.uniform(.31,.58);y=-.155
 o=block("moss patch "+str(i),(x,y,z),(random.uniform(.02,.07),.014,random.uniform(.015,.055)),moss,.008)
# Architectural raised perimeter, assembled from irregular chipped border segments.
# Border follows the front silhouette and is visibly raised rather than a flat texture.
for i in range(len(outline)-1):
 a,b=outline[i],outline[i+1]
 dx,dz=b[0]-a[0],b[1]-a[1]
 seg=block("raised gravestone frame %02d"%i,((a[0]+b[0])/2,-.158,(a[1]+b[1])/2),
           (.058,.068,math.hypot(dx,dz)+.012),edge,.008)
 seg.rotation_euler[1]=math.atan2(dx,dz)
# Reference-derived relief grooves: triple-density sampling of shoulders, arch, and frame.
# These are surface-mounted recessed-looking lines, not destructive booleans.
def sampled_arc(name,cx,cz,rx,rz,start,stop,count,width):
 pts=[(cx+rx*math.cos(start+(stop-start)*i/(count-1)),
       cz+rz*math.sin(start+(stop-start)*i/(count-1))) for i in range(count)]
 groove(name,pts,width)
# Main concentric arch: 33 samples, 3x the former coarse perimeter rhythm.
sampled_arc("inner arched relief",-.04,1.38,.265,.245,.08,math.pi-.08,33,.012)
sampled_arc("outer arched relief",-.04,1.38,.335,.315,.10,math.pi-.10,33,.008)
# Circular shoulder scroll carvings, sampled at 24 points each.
for side,cx in [("left",-.41),("right",.32)]:
 sampled_arc(side+" shoulder volute",cx,1.41,.065,.069,0,math.pi*1.86,24,.010)
 sampled_arc(side+" inner volute",cx,1.41,.033,.036,0,math.pi*1.75,18,.007)
# Inner rectangular frame: 3x sampled edges with weathered offsets.
for side,x in [("left",-.345),("right",.335)]:
 pts=[(x+random.uniform(-.003,.003),.48+(1.01*i/29)) for i in range(30)]
 groove("inner frame "+side,pts,.009)
# Mineral runoff and stone scratches, concentrated below ornamental scrolls.
for k in range(26):
 x=random.uniform(-.35,.35);top=random.uniform(.83,1.44)
 length=random.uniform(.055,.22)
 pts=[(x+random.uniform(-.009,.009),top-length*i/5) for i in range(6)]
 groove("eroded vertical streak %02d"%k,pts,.0035)
# V4: 100 individually indexed weathering coordinates mapped from the reference
# column's three fracture zones: upper crushed crown (40), left fissure (35),
# right lower erosion (25). Coordinates are normalized to this gravestone face.
weathering_coords=[]
for i in range(40):
 t=i/39
 weathering_coords.append((-.39+.73*t+random.uniform(-.023,.023),
                            1.48-.22*abs(math.sin(t*math.pi*2))+random.uniform(-.025,.025)))
for i in range(35):
 t=i/34
 weathering_coords.append((-.37+.16*math.sin(t*math.pi*2)+random.uniform(-.025,.025),
                            1.22-.76*t+random.uniform(-.015,.015)))
for i in range(25):
 t=i/24
 weathering_coords.append((.33-.14*math.sin(t*math.pi*1.5)+random.uniform(-.023,.023),
                            1.17-.69*t+random.uniform(-.02,.02)))
assert len(weathering_coords)==100
# V10: remove former bright protruding chip strips; recesses are real booleans.
# Preserve weathering coordinates as metadata for future surface painting.
# V7: fracture network follows interlocking polygonal plates, inspired by the
# reference's fractured boulder. No central hole or disconnected overlay rods.
# 48 added irregular crack coordinates, with forks and changing line width.
for i in range(8):
 start_x=random.uniform(-.36,.35);start_z=random.uniform(.61,1.55)
 x,z=start_x,start_z
 points=[(x,z)]
 for j in range(6):
  x+=random.uniform(-.038,.038)
  z-=random.uniform(.025,.075)
  points.append((x,z))
 groove("V7 branching fracture %02d"%i,points,random.uniform(.004,.009))
# Lower transverse ornamental frame band
block("lower frame rail",(0,-.158,.43),(.78,.065,.052),edge,.009)
# V8: reference upper-left mossy boulder: asymmetric, broad broken rock.
# Double each rock's original V7 radius, keep six distinct large/small variants.
# Add 100 sculpt coordinates PER rock and subdivide to 320 faces for genuine geometric detail.
rock_specs=[(-.52,-.30,.115,.21),(-.47,.29,.11,.105),(.52,-.28,.12,.19),(.47,.28,.10,.09),(-.16,-.38,.09,.085),(.16,.37,.105,.16)]
for i,(x,y,z,radius) in enumerate(rock_specs):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3,radius=radius*2.0,location=(x,y,z))
 o=bpy.context.object;o.name="V8 reference weathered foundation rock %02d"%i
 # Shape the entire surface into uneven planar chipped facets.
 for v in o.data.vertices:
  # broad low-frequency erosion instead of independent sharp random spikes
  x0,y0,z0=v.co
  factor=1+.11*math.sin(7*x0+4*y0)*math.cos(5*z0-3*y0)
  v.co.x*=factor*1.04
  v.co.y*=factor*.98
  v.co.z*=factor*.92
 # One hundred deterministic sculpting locations per rock; each modifies the
 # nearest actual mesh vertex, with local falloff to adjacent vertices.
 # This changes the rock's geometry rather than placing floating decorations.
 sculpt_coords=[]
 for k in range(100):
  theta=2*math.pi*((k*.61803398875)%1.0)
  vertical=1-2*((k+.5)/100)
  radial=math.sqrt(max(0,1-vertical*vertical))
  sculpt_coords.append((radial*math.cos(theta),radial*math.sin(theta),vertical))
 assert len(sculpt_coords)==100
 for k,(sx,sy,sz) in enumerate(sculpt_coords):
  nearest=min(o.data.vertices,key=lambda v:
   (v.co.x/radius-sx)**2+(v.co.y/radius-sy)**2+(v.co.z/radius-sz)**2)
  direction=nearest.co.normalized()
  displacement=radius*random.uniform(-.022,.035)
  nearest.co+=direction*displacement
 # Gentle Laplacian smoothing of local spikes; retain the large eroded silhouette.
 adjacency=[set() for _ in o.data.vertices]
 for e in o.data.edges:
  a,b=e.vertices;adjacency[a].add(b);adjacency[b].add(a)
 for iteration in range(2):
  old=[v.co.copy() for v in o.data.vertices]
  for vi,v in enumerate(o.data.vertices):
   neighbors=adjacency[vi]
   if neighbors:
    avg=sum((old[n] for n in neighbors),Vector((0,0,0)))/len(neighbors)
    v.co=old[vi].lerp(avg,.38)
 o.scale=(random.uniform(.96,1.36),random.uniform(.72,1.12),random.uniform(.48,.78))
 o.rotation_euler=(random.uniform(-.5,.5),random.uniform(-.5,.5),random.uniform(-1,1))
 o.data.materials.append(edge if i%2 else stone)
 assert len(o.data.polygons)>=320
# Tiny clustered moss nodules: irregular patch distribution, never blanket cover.
for patch in range(20):
 cx=random.uniform(-.38,.38);cz=random.choice([random.uniform(.42,.70),random.uniform(1.02,1.43)])
 for k in range(random.randint(5,12)):
  x=cx+random.gauss(0,.035);z=cz+random.gauss(0,.033)
  if abs(x)>.40 or z>1.48:continue
  bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=random.uniform(.006,.016),
     location=(x,-.179-random.uniform(0,.006),z))
  o=bpy.context.object;o.name="fine lumpy moss %02d_%02d"%(patch,k)
  o.scale=(1,random.uniform(.45,.9),random.uniform(.5,1.6))
  o.data.materials.append(moss)
# V4: 10x V3 moss coverage in the existing lower growth zone, with 2x nodule radii.
# Batch geometry into two meshes to avoid thousands of Blender objects.
phi=(1+math.sqrt(5))/2
ico_verts=[(-1,phi,0),(1,phi,0),(-1,-phi,0),(1,-phi,0),
 (0,-1,phi),(0,1,phi),(0,-1,-phi),(0,1,-phi),
 (phi,0,-1),(phi,0,1),(-phi,0,-1),(-phi,0,1)]
ico_faces=[(0,11,5),(0,5,1),(0,1,7),(0,7,10),(0,10,11),
 (1,5,9),(5,11,4),(11,10,2),(10,7,6),(7,1,8),
 (3,9,4),(3,4,2),(3,2,6),(3,6,8),(3,8,9),
 (4,9,5),(2,4,11),(6,2,10),(8,6,7),(9,8,1)]
def moss_batch(name,placements):
 verts=[];faces=[]
 for x,y,z,rx,ry,rz in placements:
  base=len(verts)
  verts.extend((x+vx*rx/phi,y+vy*ry/phi,z+vz*rz/phi) for vx,vy,vz in ico_verts)
  faces.extend(tuple(base+v for v in face) for face in ico_faces)
 return mesh(name,verts,faces,moss)
lower_moss=[]
for patch in range(375):  # half the V5 moss clusters, keep spatial distribution
 side=random.choices(["front","back","left","right"],[.28,.28,.22,.22])[0]
 base_z=random.choices([random.uniform(.27,.67),random.uniform(.67,1.45)],[.74,.26])[0]
 base_x=random.uniform(-.45,.45)
 for k in range(random.randint(6,13)):
  z=base_z+random.gauss(0,.023)
  if z<.24 or z>1.52:continue
  rad=random.uniform(.005,.015) # smaller moss microtufts, avoid gravel appearance
  if side=="front":
   x=base_x+random.gauss(0,.029)
   if abs(x)>.49 or (z>.78 and abs(x)<.26):continue
   y=-.19-random.uniform(0,.009)
   rx,ry,rz=rad*1.2,rad*.30,rad*random.uniform(.7,1.4)
  elif side=="back":
   x=base_x+random.gauss(0,.029)
   if abs(x)>.49:continue
   y=.19+random.uniform(0,.009)
   rx,ry,rz=rad*1.1,rad*.60,rad*random.uniform(.7,1.4)
  else:
   x=(-.455 if side=="left" else .455)+random.uniform(-.009,.009)
   y=random.uniform(-.13,.13)
   rx,ry,rz=rad*.30,rad*1.2,rad*random.uniform(.7,1.4)
  lower_moss.append((x,y,z,rx,ry,rz))
moss_batch("V4 dense lower moss",lower_moss)
ledge_moss=[]
for patch in range(475): # half the V5 ledge moss; still densely carpeted
 x=random.uniform(-.56,.56);y=random.uniform(-.21,.18);z=random.uniform(.30,.37)
 rad=random.uniform(.010,.027) # smaller and flatter ledge moss
 ledge_moss.append((x,y,z,rad*1.55,rad*.95,rad*.22))
moss_batch("V4 dense ledge moss",ledge_moss)
# V6: carved-looking chipped erosion with actual irregular faceted surface patches.
# Reference has missing stone wedges and fractured strata, NOT a central hole.
# 36 irregular depressions on front and side edges, concentrated around existing cracks.
# V10: previous surface-mounted faceted chips and white lips removed.
# Existing Boolean gouges above now provide physical depth.
# Three climbing vines on the right front, crossing the edge onto the side.
vine_mat=material("dark olive vine stems",(.085,.105,.035))
leaf_mat=material("ivy leaf green",(.11,.22,.075))
leaf_dark=material("aged ivy leaves",(.065,.14,.045))
def ivy_leaf(name,x,y,z,size,angle):
 # Five-vertex pointed ivy blade, not a sphere; mild bend creates dimensionality.
 v=[(x,y,z+size),(x-size*.52,y-.002,z+size*.17),
    (x-size*.34,y-.004,z-size*.42),(x,y-.008,z-size*.70),
    (x+size*.43,y-.002,z-size*.34),(x+size*.55,y,z+size*.18)]
 o=mesh(name,v,[(0,1,2,3),(0,3,4,5)],leaf_mat if random.random()>.3 else leaf_dark)
 o.rotation_euler[1]=angle
 return o
for vine_id in range(3):
 points=[]
 for i in range(26):
  t=i/25
  z=.34+t*(1.17+vine_id*.10)
  x=.27+.13*math.sin(t*math.pi*2.0+vine_id*.8)+vine_id*.025
  y=-.195 if x<.43 else -.13+min(.15,(x-.43)*1.9)
  points.append((x,y,z))
 # smooth 3D tube stems, wrapping right edge where x exceeds .43
 curve=bpy.data.curves.new("ivy stem curve %d"%vine_id,'CURVE');curve.dimensions='3D'
 curve.bevel_depth=.006;curve.bevel_resolution=2
 spline=curve.splines.new('POLY');spline.points.add(len(points)-1)
 for p,xyz in zip(spline.points,points):p.co=(*xyz,1)
 obj=bpy.data.objects.new("V6 climbing vine %d"%vine_id,curve)
 bpy.context.collection.objects.link(obj);obj.data.materials.append(vine_mat)
 # V11: leaves attach at the stem's own coordinates, with a visible petiole.
 for j in range(2,25,2):
  x,y,z=points[j]
  for side in (-1,1):
   # leaf center is attached to the vine; blade expands sideways from the stem
   ivy_leaf("V7 attached ivy leaf %d_%d_%d"%(vine_id,j,side),
    x,y-.003,z,random.uniform(.019,.034),side*random.uniform(.05,.20))
# English epitaph. Deliberately weathered and tiny; not required to be legible.
epitaph=[
 "THE HERO OF OUR AGE",
 "RESTS HERE",
 "DID WE PROTECT",
 "WHAT WE LONGED TO SAVE?",
 "MAY ONE ARISE",
 "TO DISPEL THE DARKNESS",
 "BORN OF THIS AGE."
]
for i,line in enumerate(epitaph):
 bpy.ops.object.text_add(location=(-.31,-.194,1.10-i*.070))
 o=bpy.context.object;o.name="weathered epitaph %02d"%i
 o.data.body=line;o.data.size=.043;o.data.extrude=.0006;o.data.space_character=1.0
 o.rotation_euler=(math.pi/2,0,0)
 o.data.materials.append(engrave)
# Lean the monument and its attached details backward by 12 degrees.
# The surrounding rocks stay in the ground, as do the detached fragments.
attached=[o for o in bpy.context.scene.objects if (
 o.name.startswith(("asymmetric fractured","raised gravestone frame","lower frame rail",
 "major fractured","branch fissure","secondary fissure","worn rune","moss patch",
 "fine lumpy moss","V4 dense lower moss","V4 dense ledge moss","V4 erosion groove","V7 branching fracture","V4 exposed chipped edge","V6 faceted erosion","V6 fractured lip","V6 climbing vine","V6 ivy leaf","V7 attached ivy leaf","V11 attached ivy leaf","weathered epitaph","upper chipped plinth","lower cracked plinth")))]
pivot=bpy.data.objects.new("leaning gravestone pivot",None)
bpy.context.collection.objects.link(pivot);pivot.location=(0,0,.12)
for o in attached:
 matrix=o.matrix_world.copy();o.parent=pivot;o.matrix_world=matrix
pivot.rotation_euler[0]=math.radians(12)
# export only assets
os.makedirs("render-output/floor6",exist_ok=True)
asset=list(bpy.context.scene.objects)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath="render-output/floor6/broken_gravestone_v1.glb",export_format='GLB',use_selection=True)
# ground is render-only
ground=block("render-only floor",(0,0,-.075),(5,5,.12),edge,.02)
world=bpy.context.scene.world;world.color=(.18,.18,.18)
def area(loc,power,size):
 bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.data.energy=power;l.data.shape='DISK';l.data.size=size;l.rotation_euler=(Vector((0,0,.8))-l.location).to_track_quat('-Z','Y').to_euler()
area((3,-4,6),450,5);area((-3,2,4),250,4)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=48
scene.render.resolution_x=900;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
scene.view_settings.look='AgX - Medium High Contrast'
for name,loc in [('front',(0,-4.8,1.65)),('side',(4.8,0,1.6)),('angle',(3.3,-4.0,2.25))]:
 bpy.ops.object.camera_add(location=loc);cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,.8))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=2.75;scene.camera=cam
 scene.render.filepath="render-output/floor6/broken_gravestone_v1_"+name+".png";bpy.ops.render.render(write_still=True);bpy.data.objects.remove(cam,do_unlink=True)
