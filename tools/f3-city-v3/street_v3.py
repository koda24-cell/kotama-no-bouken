"""Weathered connected street services; all source materials are scanned PBR."""
def build(asset,e):
 import math,json
 from mathutils import Vector,Matrix
 bpy,c,box,rod,scar=[e[k]for k in['bpy','c','box','rod','scar']]
 concrete,rust,steel,dark,moss,fracture=[e[k]for k in['concrete','rust','steel','dark','moss','fracture']];rng=e['rng']
 def beam(name,a,b,w=.1,d=.1,material=None):
  a,b=Vector(a),Vector(b);o=box(name,(a+b)*.5,(w,d,(b-a).length),material or rust,.007);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o
 def bolt(x,y,z):
  bpy.ops.mesh.primitive_cylinder_add(vertices=6,radius=.018,depth=.018,location=(x,y,z),rotation=(math.pi/2,0,0));bpy.context.object.name='rusted hexagonal fixing';bpy.context.object.data.materials.append(steel)
 def debris(n=30):
  for k in range(n):
   x=(rng.random()-.5)*3.8;y=(rng.random()-.5)*2.6;s=.10+rng.random()*.55
   o=box('irregular rubble with weathered fracture',(x,y,s*.22),(s,s*(.6+rng.random()),s*.5),moss if k%4==0 else fracture,.02);o.rotation_euler=(rng.random()*.7,rng.random()*.4,rng.random()*6.28)
 if asset=='v3_electric_cabinet':
  from licensed_gltf_v2 import load
  objects,raw=load(c,bpy,e['scan'],'utility_box_02',resolution='2k')
  meshes=[o for o in objects if o.type=='MESH'];assert meshes
  corners=[o.matrix_world@Vector(p)for o in meshes for p in o.bound_box];lo=Vector([min(v[k]for v in corners)for k in range(3)]);hi=Vector([max(v[k]for v in corners)for k in range(3)]);center=(lo+hi)*.5;scale=1.7/(hi.z-lo.z)
  transform=Matrix.Translation((-center.x*scale,-center.y*scale,.18-lo.z*scale))@Matrix.Diagonal((scale,scale,scale,1))
  for o in objects:
   if not o.parent:o.matrix_world=transform@o.matrix_world
  box('sunken cabinet concrete footing',(0,0,.09),(1.5,1,.18),concrete,.025)
  for x in[-.36,.15,.35]:
   points=[(x,.05,.3),(x,-.3,.17),(x+.05,-.6,.05),(x+.22,-.7,.04)]
   for a,b in zip(points,points[1:]):rod('abandoned cable leaving cabinet',a,b,.018,dark,10)
 elif asset=='v3_fluorescent_fixture':
  box('folded fluorescent metal housing',(0,0,.18),(1.55,.28,.18),rust,.025)
  box('recessed fixture interior',(0,-.01,.075),(1.39,.22,.07),dark,.01)
  ceramic=bpy.data.materials.new('aged ceramic lamp holders');ceramic.diffuse_color=(.44,.43,.35,1)
  for x in[-.62,.62]:
   for y in[-.065,.065]:box('ceramic tube socket',(x,y,.02),(.09,.05,.07),ceramic,.01)
  tube=bpy.data.materials.new('dusty warm fluorescent glass');tube.use_nodes=True;p=tube.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.76,.76,.58,1);p.inputs['Roughness'].default_value=.52;p.inputs['Emission Color'].default_value=(.72,.70,.40,1);p.inputs['Emission Strength'].default_value=.8
  rod('one remaining dim fluorescent tube',(-.59,-.065,.012),(.59,-.065,.012),.018,tube,16)
  rod('broken dark fluorescent remnant',(-.59,.065,.012),(-.34,.065,.012),.018,steel,14)
  for x in[-.48,.48]:rod('fixture suspension stem',(x,0,.24),(x,0,.75),.012,rust,10);bolt(x,-.15,.19)
  for j in range(5):rod('loose electrical supply',(0,.02,.28),(.15+j*.04,.04,.38+j*.08),.008,dark,8)
 elif asset=='v3_cable_pole':
  rod('weathered utility pole',(0,0,.0),(.08,.02,6.8),.11,rust,16)
  box('buried pole footing',(0,0,.16),(.65,.65,.32),concrete,.03)
  for z in[5.45,6.3]:
   beam('crossarm bolted to pole',(-1.1,0,z),(1.1,0,z),.10,.12)
   for x in[-.9,-.4,.4,.9]:
    rod('insulator pin',(x,0,z),(x,0,z+.24),.018,steel,10)
    for j in range(4):
     bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=6,radius=.067,location=(x,0,z+.08+j*.04));o=bpy.context.object;o.name='stacked ceramic electrical insulator';o.scale.z=.38;o.data.materials.append(dark)
  for z in[1.6,3.8,5.8]:beam('pole service clamp',(-.15,-.04,z),(.15,-.04,z),.035,.08)
 elif asset=='v3_shutter_shop':
  box('solid closed shop interior',(0,.37,1.6),(3.9,.2,3.2),dark,.02)
  for x in[-1.9,1.9]:box('deep shop return pier',(x,0,1.6),(.25,.9,3.2),concrete,.02)
  box('shutter roll housing',(0,-.05,3),(3.65,.55,.38),rust,.025)
  for row in range(24):
   z=.35+row*.106;segments=[(-1.72,-.35),(-.35,1.72)]if row<4 else[(-1.72,1.72)]
   for a,b in segments:
    o=box('folded dented shutter slat',((a+b)*.5,-.15+(.03*math.sin(row*.7)),z),(b-a,.075,.099),rust,.012);o.rotation_euler.z=(rng.random()-.5)*.008
  for x in[-1.77,1.77]:box('continuous shutter guide',(x,-.20,1.6),(.08,.12,2.75),steel,.008)
  for x in[-1.62,1.62]:
   for z in[.5,1.5,2.6]:bolt(x,-.24,z)
  box('corroded central lock',(.12,-.27,.46),(.13,.05,.10),dark,.009)
 elif asset=='v3_rubble_bank':
  debris(65)
  for k in range(7):
   a=((rng.random()-.5)*3,(rng.random()-.5)*2,.15);b=(a[0]+.35,a[1]+.2,.65+rng.random()*.4);rod('bent reinforcement among fallen masonry',a,b,.016,rust,10)
 elif asset=='v3_asphalt_heave':
  # Individual broken plates rise around a woody root, no square decal on top.
  for j in range(3):
   for i in range(3):
    x=(i-1)*1.25;y=(j-1)*1.25;rise=.08+.22*math.exp(-((x-.5)**2+y*y))
    o=box('root lifted fractured asphalt plate',(x,y,rise),(1.22,1.22,.16),e['asphalt'],.018);o.rotation_euler=(.10*math.sin(y+1),-.11*math.cos(x),.025*(rng.random()-.5))
    scar(o,(x+.5,y+.55,rise+.05),(.32,.35,.22),(.1,.2,.4))
  for k in range(5):rod('exposed root below broken pavement',(-1.7,k*.24-.6,.15),(1.6,k*.22-.5,.18),.045,dark,12)
  debris(25)
 else:return False
 (c.OUT/'sources/street-design.json').write_text(json.dumps({'asset':asset,'status':'NOT_APPROVED','referenceIndex':'docs/3d/research/F3_CITY_V3_PINTEREST_20261127.json','design':'Connected physical street services, aged surfaces, recessed interiors and settled debris','sourceMaterial':'Previously scanned CC0 PBR; cabinet original Poly Haven utility_box_02 retained'},indent=2))
 return True
