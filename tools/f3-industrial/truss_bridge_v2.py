"""Eight-metre industrial crossing, supported in wall cells, open walking lane below."""
def build(e):
 import math
 from mathutils import Vector
 c,bpy,box,rod,rng=[e[k]for k in ['c','bpy','box','rod','rng']]
 rust,steel,moss,dark=[e[k]for k in ['rust','steel','moss','dark']]
 def beam(name,a,b,width=.16,depth=.22,t=.019):
  a,b=Vector(a),Vector(b);q=Vector((0,0,1)).rotation_difference((b-a).normalized());u=q@Vector((1,0,0));v=q@Vector((0,1,0))
  section=[(-width/2,-depth/2),(width/2,-depth/2),(width/2,-depth/2+t),(t/2,-depth/2+t),(t/2,depth/2-t),(width/2,depth/2-t),(width/2,depth/2),(-width/2,depth/2),(-width/2,depth/2-t),(-t/2,depth/2-t),(-t/2,-depth/2+t),(-width/2,-depth/2+t)]
  n=len(section);verts=[tuple(p+u*x+v*y)for p in[a,b]for x,y in section]
  o=c.mesh(name,verts,[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,n+(i+1)%n,n+i)for i in range(n)],rust);c.uv_world(o);return o
 def bolt(p,axis='y'):
  bpy.ops.mesh.primitive_cylinder_add(vertices=6,radius=.025,depth=.037,location=p,rotation=(math.pi/2,0,0)if axis=='y' else(0,0,0));o=bpy.context.object;o.name='rusted hex-head connection';o.data.materials.append(steel);c.uv_world(o)
 for x in [-3.25,3.25]:
  for y in [-.85,.85]:
   box('fractured pier foot',(x,y,.18),(.72,.72,.36),moss,.045)
   box('pier base plate',(x,y,.40),(.48,.48,.09),rust,.008)
   beam('bridge support column',(x,y,.44),(x,y,5.3),.26,.31,.028)
   for dx in [-.16,.16]:
    for dy in [-.16,.16]:bolt((x+dx,y+dy,.47),'z')
  beam('transverse pier cap',(x,-1.10,5.22),(x,1.10,5.22),.22,.31,.023)
  for y in [-.85,.85]:
   beam('triangular knee bearing',(x,y,4.25),(x+(-.65 if x>0 else .65),y,5.25),.13,.16)
  # No diagonal spans the player's central street below the crossing.
  beam('pier end diagonal',(x,-.85,.52),(x,.85,4.90),.12,.15)
 for side in [-1,1]:
  y=side*1.0
  for z in [5.30,7.20]:beam('continuous truss chord',(-4,y,z),(4,y,z),.19,.27,.024)
  for k in range(5):
   x=-4+k*2;beam('truss upright',(x,y,5.30),(x,y,7.20),.14,.17)
   box('truss gusset',(x,y+side*.11,5.48),(.38,.035,.41),rust,.007)
   box('upper gusset',(x,y+side*.11,7.05),(.36,.035,.31),rust,.007)
   for dx in [-.11,.11]:
    for dz in [-.105,.105]:bolt((x+dx,y+side*.14,5.48+dz))
  for k in range(4):
   x=-4+k*2;beam('Warren diagonal',(x,y,5.36 if k%2==0 else 7.14),(x+2,y,7.14 if k%2==0 else 5.36),.12,.16)
  for k in range(9):
   x=-3.8+k*.95
   if side==1 and k in [5,6]:continue
   rod('deck safety post',(x,y,5.42),(x,y,6.38),.022,rust,8)
   end=x+.95
   if k==4 and side==1:end=x+.32
   rod('deck safety rail',(x,y,6.38),(end,y,6.38),.024,rust,8)
   if end<x+.9:rod('bent still-attached rail',(end,y,6.38),(end+.12,y+.18,6.09),.024,rust,8)
 for k in range(17):
  x=-4+k*.5;beam('deck cross bearer',(x,-1.04,5.33),(x,1.04,5.33),.10,.14)
 for k in range(81):
  x=-4+k*.1
  if 1.15<x<2.0:continue
  box('open deck grating',(x,0,5.46),(.026,1.90,.06),rust,.002)
 for y in [-.72,-.24,.24,.72]:box('longitudinal grating tie',(0,y,5.43),(8,.022,.026),steel,.001)
 for x in [-4,-2,0,2,4]:
  beam('overhead transverse tie',(x,-1,7.19),(x,1,7.19),.10,.14)
  if x!=4:beam('upper lateral bracing',(x,-1,7.18),(x+2,1,7.18),.09,.12)
 # A snapped cable has a supported end and a gravity sag, not a floating line.
 c.tube('severed bridge service cable',[(-4,1.13,6.91),(-2.4,1.18,6.14),(-.8,1.20,6.48),(.3,1.17,6.9),(.63,1.18,5.9),(.69,1.15,4.45)],.018,dark,8)
 # Cables and pipe are clipped to the structure at plausible fixing points.
 c.tube('bridge utility pipe',[(-4,-1.19,5.7),(-.5,-1.19,5.7),(-.15,-1.19,5.42),(.28,-1.19,5.42)],.052,rust,12)
 for x in [-3.5,-2.5,-1.5]:box('pipe bearing clip',(x,-1.08,5.70),(.07,.28,.09),steel,.005)
 import ivy
 before=set(bpy.data.objects);ivy.build(e);bpy.context.view_layer.update()
 from mathutils import Matrix
 transform=Matrix.Translation((-3.3,.88,5.50))@Matrix.Diagonal((.85,.65,1.1,1))
 for o in set(bpy.data.objects)-before:
  if o.type=='MESH':o.matrix_world=transform@o.matrix_world
