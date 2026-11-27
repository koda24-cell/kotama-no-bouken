"""Individually authored modular city structure. Z is up, front is negative Y."""
def build(asset,e):
 import math,json
 from mathutils import Vector
 bpy,c,box,rod,scar=[e[k]for k in['bpy','c','box','rod','scar']]
 concrete,rust,steel,dark,moss,fracture=[e[k]for k in['concrete','rust','steel','dark','moss','fracture']]
 rng=e['rng']
 def beam(name,a,b,w=.14,d=.12,material=None):
  a,b=Vector(a),Vector(b);o=box(name,(a+b)*.5,(w,d,(b-a).length),material or rust,.008);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o
 def bolt(x,y,z):
  bpy.ops.mesh.primitive_cylinder_add(vertices=6,radius=.025,depth=.022,location=(x,y,z),rotation=(math.pi/2,0,0));o=bpy.context.object;o.name='weathered hexagonal connection bolt';o.data.materials.append(steel)
 def girder(a,b,w=.28):
  a,b=Vector(a),Vector(b);direction=(b-a).normalized();side=Vector((0,0,1))
  if abs(direction.z)>.9:side=Vector((0,1,0))
  beam('rolled steel web',a,b,w,.055)
  for sign in[-1,1]:beam('continuous rolled flange',a+side*w*sign*.48,b+side*w*sign*.48,.06,w)
 def broken_slab(name,center,size):
  o=box(name,center,size,concrete,.025)
  for k in range(3):scar(o,(center[0]+size[0]*(rng.random()-.5),center[1]-size[1]/2,center[2]+size[2]*.4),(.24,.28,.20),(rng.random()*.3,.2,rng.random()))
  return o
 def chips(x,y,z,count=14):
  for k in range(count):
   s=.07+rng.random()*.20;o=box('fallen irregular aggregate',(x+(rng.random()-.5)*1.5,y+(rng.random()-.5)*.6,z+s*.3),(s,s*(.6+rng.random()),s*.6),fracture,.01);o.rotation_euler=(rng.random()*.6,rng.random()*.6,rng.random()*6.28)
 def infill(x,y,z,w=1.2,h=1.3):
  brick=bpy.data.materials.get('v3 exposed old infill')
  if not brick:
   brick=bpy.data.materials.new('v3 exposed old infill');brick.diffuse_color=(.25,.16,.115,1);brick.use_nodes=True;brick.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.94
  for row in range(int(h/.16)):
   for col in range(int(w/.32)):
    if rng.random()<.18 or row>h/.16-2 and rng.random()<.4:continue
    o=box('eroded masonry inside spall',(x-w/2+col*.32+(row%2)*.14,y,z+row*.16),(.30,.13,.14),brick,.012);o.rotation_euler.z=(rng.random()-.5)*.035
  chips(x,y-.35,.04)
 if asset=='v3_deep_window_bay':
  # A full metre of depth, with a continuous opaque back and bonded returns.
  box('sealed rear structural wall',(0,.46,1.6),(4,.16,3.2),concrete,.02)
  for x in[-1.85,0,1.85]:broken_slab('deep concrete window pier',(x,0,1.6),(.30,1.15,3.2))
  for z,h in[(.23,.46),(2.98,.44)]:broken_slab('bonded storey spandrel',(0,0,z),(4,1.15,h))
  for x in[-.925,.925]:
   box('recessed dark interior',(x,.34,1.65),(1.52,.08,2.15),dark,.005)
   for xx in[x-.74,x,x+.74]:box('steel glazing mullion',(xx,-.04,1.65),(.042,.08,2.13),rust,.004)
   for z in[.59,1.58,2.70]:box('deep steel transom',(x,-.04,z),(1.54,.085,.042),rust,.004)
   broken_slab('projecting weathered sill',(x,-.20,.51),(1.65,.88,.13))
   for k in range(3):
    # Opaque fragments read as dirt-backed broken glazing, never an open sky hole.
    xx=x-.55+k*.48;vertices=[(xx,-.075,2.66),(xx+.32,-.075,2.66),(xx+.15,-.075,2.24-rng.random()*.25)]
    mesh=bpy.data.meshes.new('fractured pane');mesh.from_pydata(vertices,[],[(0,1,2)]);mesh.update();o=bpy.data.objects.new('remaining jagged window shard',mesh);bpy.context.collection.objects.link(o);mesh.materials.append(steel)
  rod('joined rainwater downpipe',(1.58,-.65,.12),(1.58,-.65,3.2),.045,rust,12)
  for z in[.5,2.5]:box('pipe wall bracket',(1.58,-.59,z),(.18,.21,.05),steel,.005)
  infill(-.8,-.59,.08,.95,.48)
 elif asset=='v3_structural_corner':
  for x,y,w,d in[(0,.44,1.4,.35),(.52,0,.35,1.25)]:broken_slab('thick interlocking corner return',(x,y,1.6),(w,d,3.2))
  for z in[.12,3.08]:box('bonded corner slab',(0,0,z),(1.5,1.5,.24),concrete,.02)
  for z in[.8,1.6,2.4]:girder((-.65,.22,z),(.4,.22,z),.13)
 elif asset=='v3_spalled_wall':
  box('opaque infill rear return',(0,.25,1.6),(4,.35,3.2),dark,.02)
  for x in[-1.85,1.85]:broken_slab('spalled load bearing pier',(x,0,1.6),(.3,.8,3.2))
  for z in[.18,3.02]:broken_slab('cracked retaining beam',(0,0,z),(4,.8,.36))
  infill(0,-.09,.25,3.5,2.6)
  for x in[-1.4,-.55,.35,1.2]:rod('exposed corroded reinforcement',(x,-.26,1.0),(x+.09,-.3,2.7),.018,rust,10)
  chips(0,-.7,.02,25)
 elif asset in['v3_collapsed_storey','v3_leaning_facade']:
  tilt=.20 if asset=='v3_leaning_facade' else .55
  parent=bpy.data.objects.new('connected damaged storey frame',None);bpy.context.collection.objects.link(parent)
  before=set(bpy.data.objects)
  for z in[0,3.2,6.4]:broken_slab('shattered concrete floor',(0,0,z+.12),(5,3.4,.24))
  for x in[-2.2,2.2]:
   for y in[-1.4,1.4]:broken_slab('cracked storey column',(x,y,3.2),(.4,.4,6.4))
  for z in[1.7,4.9]:
   for x in[-1.55,-.5,.55,1.6]:
    box('deep black broken window',(x,1.5,z),(.92,.15,2.45),dark,.005)
    for xx in[x-.48,x+.48]:beam('remaining window jamb',(xx,1.35,z-1.3),(xx,1.35,z+1.3),.07,.10)
  for o in set(bpy.data.objects)-before:o.parent=parent
  parent.rotation_euler.y=tilt;parent.rotation_euler.z=-.08
  for k in range(9):
   x=-2+rng.random()*4;rod('protruding torn slab rebar',(x,-1.4,3.2),(x+.24,-2.1-rng.random(),2.9),.022,rust,10)
  chips(0,-2.0,.02,30)
 elif asset=='v3_riveted_span':
  for sx in[-1,1]:
   x=sx*1.35;girder((x,-4,.1),(x,4,.1),.35)
   for z in[.45,1.6]:girder((x,-4,z),(x,4,z),.14)
   for k in range(5):
    y=-4+k*2;girder((x,y,.1),(x,y,1.6),.13)
    if k<4:beam('triangulated bridge web',(x,y,.4),(x,y+2,1.5),.08,.08)
    for zz in[.5,1.4]:bolt(x,y,zz)
  for k in range(74):box('open deck bearing grating',(0,-4+(k+.5)*8/74,.05),(2.6,.032,.075),steel,.003)
  for y in[-3,-1,1,3]:girder((-1.4,y,-.18),(1.4,y,-.18),.18)
 else:return False
 (c.OUT/'sources/city-structure-design.json').write_text(json.dumps({'asset':asset,'status':'NOT_APPROVED','design':'Original solid modular construction with physical depth, sheltered wear, exposed reinforcement and connected details','referenceIndex':'docs/3d/research/F3_CITY_V3_PINTEREST_20261127.json','textures':'Previously scanned CC0 concrete, rust and stone PBR; originals preserved'},indent=2))
 return True
