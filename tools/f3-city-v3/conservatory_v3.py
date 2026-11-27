"""Abandoned botanical structures with joined roof ribs and deep root beds."""
def build(asset,e):
 import math,json
 from mathutils import Vector
 bpy,c,box,rod,scar=[e[k]for k in['bpy','c','box','rod','scar']]
 concrete,rust,steel,dark,moss,fracture=[e[k]for k in['concrete','rust','steel','dark','moss','fracture']]
 rng=e['rng']
 def beam(name,a,b,w=.12,d=.08,material=None):
  a,b=Vector(a),Vector(b);o=box(name,(a+b)*.5,(w,d,(b-a).length),material or rust,.007);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o
 def arch(y):
  pts=[(3.75*math.cos(math.pi-i*math.pi/18),y,3.1+3*math.sin(math.pi-i*math.pi/18))for i in range(19)]
  for a,b in zip(pts,pts[1:]):beam('curved riveted roof rib',a,b,.14,.12)
  for x in[-3.75,3.75]:
   beam('greenhouse column',(x,y,.25),(x,y,3.1),.18,.16)
   box('corroded base bearing',(x,y,.29),(.42,.42,.08),steel,.01)
   box('roof rib column gusset',(x,y,3.0),(.24,.22,.30),rust,.012)
   for zz in[2.93,3.07]:
    bpy.ops.mesh.primitive_cylinder_add(vertices=6,radius=.019,depth=.035,location=(x,y-.13,zz),rotation=(math.pi/2,0,0));bpy.context.object.name='rib connection hex bolt';bpy.context.object.data.materials.append(steel)
   for dx in[-.14,.14]:
    bpy.ops.mesh.primitive_cylinder_add(vertices=6,radius=.025,depth=.04,location=(x+dx,y,.35));bpy.context.object.data.materials.append(steel)
  return pts
 def rubble(x,y,z,n=25):
  for k in range(n):
   s=.12+rng.random()*.45;o=box('moss covered broken foundation',(x+(rng.random()-.5)*2.4,y+(rng.random()-.5)*1.5,z+s*.3),(s,s*.8,s*.5),moss if k%3==0 else fracture,.02);o.rotation_euler=(rng.random()*.4,rng.random()*.5,rng.random()*6.28)
 def roots(x,y,z):
  for k in range(8):
   a=k*math.pi/4;points=[(x,y,z+.15)]
   for j in range(1,5):points.append((x+math.cos(a)*j*.42,y+math.sin(a)*j*.4,z+.10*math.exp(-j)+rng.random()*.025))
   for j,(p,q)in enumerate(zip(points,points[1:])):rod('old woody roots levering the paving',p,q,.10-j*.018,dark,12)
 if asset=='v3_greenhouse_bay':
  ribs=[arch(y)for y in[-3.9,0,3.9]]
  for i in[0,3,6,9,12,15,18]:
   for j in range(2):beam('continuous longitudinal roof purlin',ribs[j][i],ribs[j+1][i],.065,.07)
  glass=bpy.data.materials.new('filthy greenhouse remaining glass');glass.use_nodes=True;p=glass.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.18,.27,.23,1);p.inputs['Roughness'].default_value=.65;p.inputs['Transmission Weight'].default_value=.18
  for side in[-1,1]:
   beam('joined upper greenhouse side rail',(side*3.75,-4,3.1),(side*3.75,4,3.1),.07,.08)
   for yy in[-3.9,0,3.9]:box('deep individual column footing',(side*3.75,yy,.22),(.65,.65,.44),concrete,.03)
  # Broken roof triangles retain actual thickness via solidify; roof mostly open.
  for k in range(12):
   i=rng.choice([2,3,4,13,14,15]);j=rng.randrange(2);t=rng.randrange(4)/4;a=Vector(ribs[j][i]).lerp(Vector(ribs[j+1][i]),t);b=a+Vector((0,3.9/4,0));d=Vector(ribs[j][i+1]).lerp(Vector(ribs[j+1][i+1]),t);points=[a,b,a+(d-a)*.7+(b-a)*.18]
   mesh=bpy.data.meshes.new('roof shard');mesh.from_pydata(points,[],[(0,1,2)]);mesh.update();o=bpy.data.objects.new('remaining broken roof glazing',mesh);bpy.context.collection.objects.link(o);mesh.materials.append(glass);o.modifiers.new('glass physical thickness','SOLIDIFY').thickness=.008
  roots(-3.2,1,.2);rubble(-3.2,1,.25)
 elif asset=='v3_greenhouse_gate':
  for x in[-2.25,2.25]:
   o=box('fractured conservatory entrance pier',(x,0,1.8),(.8,1.3,3.6),concrete,.035);scar(o,(x,-.64,1.2),(.4,.36,.65),(.1,.2,.3));rubble(x,-.5,.02,12)
  box('deep entrance lintel',(0,0,3.62),(5.3,1.4,.48),concrete,.025)
  for x in[-1.65,1.65]:
   before=set(bpy.data.objects)
   for z in[.25,2.85]:beam('door frame member',(x,-.22,z),(x*.05,-.22,z),.055,.065)
   beam('gate outer upright',(x,-.22,.25),(x,-.22,2.85),.055,.065)
   for k in range(6):xx=x*k/6;rod('rusted entrance gate bar',(xx,-.22,.25),(xx,-.22,2.85),.015,rust,10)
   hinge=bpy.data.objects.new('open conservatory gate hinge',None);bpy.context.collection.objects.link(hinge);hinge.location=(x,-.22,0)
   bpy.context.view_layer.update()
   for o in set(bpy.data.objects)-before-{hinge}:
    matrix=o.matrix_world.copy();o.parent=hinge;o.matrix_world=matrix
   hinge.rotation_euler.z=math.copysign(math.radians(84),x)
  roots(2.2,.2,.15)
 elif asset in['v3_sunken_colonnade','v3_sunken_shopfront']:
  box('submerged foundation slab',(0,0,.15),(5.5,2.5,.3),concrete,.03)
  for x in[-2.3,0,2.3]:
   box('algae encrusted column',(x,0,1.7),(.45,.55,3.1),concrete,.035)
   box('silt covered column base',(x,0,.35),(.8,.85,.25),moss,.02)
  box('broken submerged lintel',(0,0,3.28),(5.5,.9,.42),concrete,.03)
  if asset=='v3_sunken_shopfront':
   box('opaque submerged shop interior',(0,.92,1.65),(5.4,.2,3),dark,.01)
   for x in[-1.15,1.15]:
    for z in[.6,1.8,2.95]:beam('rusted flooded glazing frame',(x-1,-.12,z),(x+1,-.12,z),.055,.07)
    for xx in[x-.95,x,x+.95]:beam('flooded shop mullion',(xx,-.12,.6),(xx,-.12,2.95),.045,.06)
  rubble(1,-.65,.18,25)
 else:return False
 (c.OUT/'sources/conservatory-design.json').write_text(json.dumps({'asset':asset,'status':'NOT_APPROVED','source':'Original joined structural model from real abandoned greenhouse rib and ruin references','referenceIndex':'docs/3d/research/F3_CITY_V3_PINTEREST_20261127.json','reusedMaterials':'Scanned CC0 concrete, rust, fracture and moss PBR'},indent=2))
 return True
