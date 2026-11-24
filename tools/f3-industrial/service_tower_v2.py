"""One supported industrial service tower; original plates/trusses/platforms."""
def build(e):
 import math,json,hashlib
 from mathutils import Vector,Matrix
 c,bpy,box,rod,rng=[e[k]for k in ['c','bpy','box','rod','rng']]
 rust,steel,moss,dark=[e[k]for k in ['rust','steel','moss','dark']]
 concrete=e['pbr']('v2_tower_bearing_concrete','concrete_slab_wall')
 paint=c.material('v2_faded_iron_oxide_primer',(.23,.115,.055,1),.9)
 def beam(name,a,b,width=.18,depth=.25,t=.022,material=rust):
  a,b=Vector(a),Vector(b);q=Vector((0,0,1)).rotation_difference((b-a).normalized());u=q@Vector((1,0,0));v=q@Vector((0,1,0))
  section=[(-width/2,-depth/2),(width/2,-depth/2),(width/2,-depth/2+t),(t/2,-depth/2+t),(t/2,depth/2-t),(width/2,depth/2-t),(width/2,depth/2),(-width/2,depth/2),(-width/2,depth/2-t),(-t/2,depth/2-t),(-t/2,-depth/2+t),(-width/2,-depth/2+t)]
  n=len(section);verts=[tuple(origin+u*x+v*y)for origin in[a,b]for x,y in section]
  o=c.mesh(name,verts,[tuple(range(n-1,-1,-1)),tuple(n+i for i in range(n))]+[(i,(i+1)%n,n+(i+1)%n,n+i)for i in range(n)],material);c.uv_world(o);return o
 def bolt(name,p,r=.023):
  bpy.ops.mesh.primitive_cylinder_add(vertices=6,radius=r,depth=.035,location=p,rotation=(math.pi/2,0,0));o=bpy.context.object;o.name=name;o.data.materials.append(steel);c.uv_world(o)
 def platform(z,broken=False):
  for y in [-1.38,1.38]:beam('platform perimeter bearer',(-1.4,y,z),(1.4,y,z),.12,.22)
  for x in [-1.38,1.38]:beam('platform side bearer',(x,-1.4,z),(x,1.4,z),.12,.22)
  for k in range(25):
   x=-1.28+k*.105
   if broken and k in [15,16,17,18]:continue
   box('actual spaced floor grating',(x,0,z+.13),(.033,2.65,.058),rust,.003)
  for y in [-.90,0,.90]:box('grating transverse tie',(0,y,z+.15),(2.64,.022,.045),steel,.003)
  for side in [-1,1]:
   for y in [-1.25,0,1.25]:rod('platform guard upright',(side*1.46,y,z+.15),(side*1.46,y,z+1.13),.020,rust,8)
   for h in [.61,1.13]:rod('platform side guard',(side*1.46,-1.25,z+h),(side*1.46,1.25,z+h),.021,rust,8)
  for x in [-1.25,0,1.25]:rod('rear guard upright',(x,1.46,z+.15),(x,1.46,z+1.13),.020,rust,8)
  rod('rear top guard',(-1.3,1.46,z+1.13),(1.3,1.46,z+1.13),.021,rust,8)
  if broken:
   rod('damaged attached rail',(.25,1.46,z+.62),(1.04,1.46,z+.62),.020,rust,8)
   rod('folded attached end',(1.04,1.46,z+.62),(1.22,1.50,z+.31),.020,rust,8)
  else:rod('rear middle guard',(-1.3,1.46,z+.61),(1.3,1.46,z+.61),.020,rust,8)
 levels=[.30,3.80,7.30,10.80,14.30]
 for x in [-1.25,1.25]:
  for y in [-1.25,1.25]:
   box('eroded concrete foundation',(x,y,.16),(.60,.60,.32),moss,.035)
   box('column sole plate',(x,y,.36),(.45,.45,.09),rust,.012)
   beam('continuous I-section column',(x,y,.40),(x,y,14.80),.25,.30,.030)
   for dx in [-.15,.15]:
    for dy in [-.15,.15]:bolt('foundation anchor nut',(x+dx,y+dy,.43),.027)
 for j,z in enumerate(levels[1:]):
  platform(z,broken=j==2)
  for side in [-1,1]:
   beam('rear main horizontal',(-1.25,side*1.25,z-.08),(1.25,side*1.25,z-.08),.20,.27)
   if side==1:
    beam('rear structural diagonal',(-1.25,1.25,levels[j]+.35),(1.25,1.25,z-.1),.12,.15)
    if j%2==0:beam('rear counter diagonal',(1.25,1.25,levels[j]+.35),(-1.25,1.25,z-.1),.11,.14)
   beam('side bracing',(side*1.25,-1.25,levels[j]+.35),(side*1.25,1.25,z-.1),.12,.15)
   for x in [-1.25,1.25]:
    box('bolted gusset plate',(x,side*1.42,z-.12),(.38,.028,.45),paint,.009)
    for dx in [-.105,.105]:
     for dz in [-.12,.12]:bolt('gusset hex bolt',(x+dx,side*1.45,z-.12+dz))
  # A steep service stair has two real stringers and rail bearings at both landings.
  sign=-1 if j%2 else 1;a=Vector((-sign*1.22,-1.63,levels[j]+.16));b=Vector((sign*1.22,-1.63,z+.16))
  for side in [-1,1]:
   offset=Vector((0,side*.29,0));beam('stair stringer',a+offset,b+offset,.10,.13)
   rod('inclined stair handrail',a+offset+Vector((0,0,.90)),b+offset+Vector((0,0,.90)),.022,rust,8)
   for t in [0,.5,1]:
    p=a.lerp(b,t)+offset;rod('stair handrail post',p,p+Vector((0,0,.90)),.019,rust,8)
  for step in range(18):
   p=a.lerp(b,(step+.5)/18);box('perforated service stair tread',p,(.21,.58,.045),rust,.005)
 # Tall battered process vessel, with flanges and connected curved discharge.
 bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=.56,depth=8.6,location=(.18,.20,6.45));vessel=bpy.context.object;vessel.name='weathered process cylinder';vessel.data.materials.append(rust);c.uv_world(vessel)
 for z in [2.15,4.5,7.8,10.75]:
  bpy.ops.mesh.primitive_torus_add(major_segments=32,minor_segments=6,major_radius=.57,minor_radius=.033,location=(.18,.2,z));bpy.context.object.name='vessel collar ring';bpy.context.object.data.materials.append(steel)
  for k in range(12):
   angle=k*math.tau/12;x=.18+math.cos(angle)*.58;y=.20+math.sin(angle)*.58
   box('collar fastener',(x,y,z),(.045,.045,.055),rust,.004)
 c.tube('supported curved exhaust',[(.18,.2,10.68),(.18,.2,11.55),(.18,.2,12.4),(.18,.45,12.85),(.18,.92,13.05),(.18,1.22,13.05)],.19,rust,20)
 for z in [3.8,7.3,10.8]:
  beam('vessel support bracket',(-1.25,.2,z),(-.35,.2,z),.13,.16)
  beam('vessel lateral bracket',(.70,.2,z),(1.25,.2,z),.13,.16)
 c.tube('bundled severed conduit',[(1.40,-1.18,14.55),(1.42,-1.18,9.3),(1.34,-1.35,6.1),(1.43,-1.41,4.3)],.016,dark,8)
 # Reuse the actual preserved V1 control cabinet; verify before Blender import.
 folder=e['candidate']/'control_cabinet';doc=json.loads((folder/'manifest.json').read_text());source=folder/doc['asset']['file'];assert hashlib.sha256(source.read_bytes()).hexdigest()==doc['asset']['sha256']
 e['scan'](source,'tower-reused-control-cabinet')
 from gltf_import_compat import import_gltf
 before=set(bpy.data.objects);import_gltf(bpy,source);bpy.context.view_layer.update();objects=[o for o in set(bpy.data.objects)-before if o.type=='MESH']
 matrices={o:o.matrix_world.copy()for o in objects}
 for o in objects:o.parent=None
 transform=Matrix.Translation((.81,-.68,.33))@Matrix.Diagonal((.42,.42,.42,1))
 for o in objects:o.matrix_world=transform@matrices[o]
 # The base growth is attached to a damp bearing, never a floating planter.
 import ivy
 before=set(bpy.data.objects);ivy.build(e);bpy.context.view_layer.update();transform=Matrix.Translation((-1.16,1.25,.33))@Matrix.Diagonal((.65,.65,.9,1))
 for o in set(bpy.data.objects)-before:
  if o.type=='MESH':o.matrix_world=transform@o.matrix_world
