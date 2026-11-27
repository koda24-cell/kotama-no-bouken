"""Load-bearing open-grating steel stairs, landings, handrails and connection plates."""
def build(asset,e):
 import math,json
 from mathutils import Vector
 bpy,c,box,rod=[e[k]for k in ['bpy','c','box','rod']];rust,steel=e['rust'],e['steel']
 def beam(name,a,b,w=.14,d=.08):
  a,b=Vector(a),Vector(b);o=box(name,(a+b)/2,(w,d,(b-a).length),rust,.008)
  o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o
 def bolt(x,y,z,axis='Z'):
  bpy.ops.mesh.primitive_cylinder_add(vertices=6,radius=.019,depth=.016,location=(x,y,z));o=bpy.context.object;o.name='hex bolt with raised head';o.data.materials.append(steel)
  if axis=='Y':o.rotation_euler.x=math.pi/2
 def plate(x,y,z):
  box('pier foot plate',(x,y,z),(.34,.34,.035),steel,.009)
  for dx in[-.105,.105]:
   for dy in[-.105,.105]:bolt(x+dx,y+dy,z+.026)
 def grating(x,y,z,w,d):
  box('grating end frame',(x,y-d/2,z),(w,.035,.055),steel,.006)
  box('grating end frame',(x,y+d/2,z),(w,.035,.055),steel,.006)
  n=max(3,int(w/.11))
  for i in range(n):box('vertical bearing bar',(x-w/2+(i+.5)*w/n,y,z),(.025,d,.055),rust,.003)
  for q in range(max(1,int(d/.24))):box('transverse twisted grating tie',(x,y-d/2+(q+.5)*.24,z+.015),(w,.016,.018),steel,.002)
 def post(x,y,z):
  rod('handrail upright',(x,y,z),(x,y,z+1.04),.024,rust,12)
  box('rail stanchion bolted bracket',(x,y,z-.015),(.10,.13,.18),rust,.01)
  bolt(x,y-.075,z+.035,'Y')
 def flight(x,y0,y1,z0,z1,w=1.5):
  n=12;run=(y1-y0)/n;rise=(z1-z0)/n
  for i in range(n):
   y=y0+(i+.5)*run;z=z0+(i+1)*rise;grating(x,y,z,w,abs(run)*.96)
   box('anti slip tread nosing',(x,y-run*.45,z+.02),(w,.035,.045),steel,.004)
   for sx in[-1,1]:
    box('tread end bearing angle',(x+sx*(w/2-.03),y,z-.06),(.045,abs(run)*.9,.13),rust,.006)
    bolt(x+sx*(w/2-.07),y,z+.04)
  for sx in[-1,1]:
   xx=x+sx*(w/2+.055)
   beam('continuous steel stringer web',(xx,y0,z0-.18),(xx,y1,z1-.18),.07,.24)
   beam('stringer upper flange',(xx,y0,z0-.04),(xx,y1,z1-.04),.16,.035)
   beam('stringer lower flange',(xx,y0,z0-.31),(xx,y1,z1-.31),.16,.035)
   for k in range(5):
    t=k/4;post(xx,y0+(y1-y0)*t,z0+(z1-z0)*t)
   for h in[.52,1.04]:rod('continuous sloping handrail',(xx,y0,z0+h),(xx,y1,z1+h),.024,rust,12)
 def landing(x,y,z,w,d,open_front=False):
  grating(x,y,z,w,d)
  for sx in[-1,1]:
   xx=x+sx*(w/2+.02);beam('landing load bearer',(xx,y-d/2,z-.2),(xx,y+d/2,z-.2),.16,.19)
   for yy in[y-d/2,y+d/2]:post(xx,yy,z)
   for h in[.52,1.04]:rod('landing side rail',(xx,y-d/2,z+h),(xx,y+d/2,z+h),.024,rust,12)
  for xx in[x-w/2,x+w/2]:
   for yy in[y-d/2,y+d/2]:
    if z>.25:beam('landing supported column',(xx,yy,.06),(xx,yy,z-.2),.15,.15);plate(xx,yy,.04)
 if asset=='v3_switchback_stair':
  flight(-.87,-2.7,1.8,0,1.6);landing(0,2.35,1.6,3.45,1.1)
  flight(.87,1.8,-2.7,1.6,3.2);landing(.87,-3.2,3.2,1.65,1.0)
  landing(-.87,-3.2,0,1.65,1.0)
  for y in[1.8,2.8]:
   beam('braced landing frame',(-1.75,y,.18),(1.75,y,1.38),.08,.08)
   beam('braced landing frame',(1.75,y,.18),(-1.75,y,1.38),.08,.08)
 elif asset=='v3_straight_access_stair':
  flight(0,-3,3,0,3.2,2.2);landing(0,3.65,3.2,2.35,1.3);landing(0,-3.5,0,2.35,1.0)
  for sx in[-1,1]:beam('under stair diagonal brace',(sx*1.15,3.8,.1),(sx*1.15,.5,1.6),.08,.08)
 else:
  landing(0,0,3.2,3.5,3.5)
  for x in[-1.65,1.65]:beam('cross brace on junction',(x,-1.65,.15),(x,1.65,2.95),.09,.07)
 (c.OUT/'sources/stair-structure.json').write_text(json.dumps({'status':'NOT_APPROVED','asset':asset,'materialSource':'Existing verified CC0 rusted steel PBR','design':'Load bearing stringer webs/flanges, open grating, bolted bearings and continuous rails; landings are supported to ground. Fit assembled stair to building floor sockets, not isolated roadside decoration.','storeyRiseMeters':3.2,'reference':'Real suspended access/catwalk manufacturer and industrial stair photographs in Pinterest V3 research'},indent=2))
