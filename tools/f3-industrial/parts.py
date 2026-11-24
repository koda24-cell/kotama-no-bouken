"""Individual authored industrial components. Exactly one dispatch per Blender scene."""
def build(asset,e):
 import math
 from pathlib import Path
 c,bpy,box,rod,scar=[e[k]for k in ['c','bpy','box','rod','scar']]
 concrete,moss,rust,asphalt,fracture,dark,steel,rng,Vector=[e[k]for k in ['concrete','moss','rust','asphalt','fracture','dark','steel','rng','Vector']]
 paint=c.material('f3_faded_safety_ochre',(.34,.265,.105,1),.88)
 rubber=c.material('f3_aged_rubber',(.035,.042,.037,1),.94)
 def beam(name,a,b,w=.24,d=.28,t=.028,mat=rust):
  a,b=Vector(a),Vector(b);axis=(b-a).normalized();q=Vector((0,0,1)).rotation_difference(axis);u=q@Vector((1,0,0));v=q@Vector((0,1,0))
  p=[(-w/2,-d/2),(w/2,-d/2),(w/2,-d/2+t),(t/2,-d/2+t),(t/2,d/2-t),(w/2,d/2-t),(w/2,d/2),(-w/2,d/2),(-w/2,d/2-t),(-t/2,d/2-t),(-t/2,-d/2+t),(-w/2,-d/2+t)]
  n=len(p);verts=[tuple(origin+u*x+v*y)for origin in[a,b]for x,y in p]
  faces=[tuple(range(n-1,-1,-1)),tuple(n+i for i in range(n))]+[(i,(i+1)%n,n+(i+1)%n,n+i)for i in range(n)]
  o=c.mesh(name,verts,faces,mat);c.uv_world(o);return o
 def disk(name,center,r,depth,mat=rust,axis=(0,-1,0),sides=12):
  bpy.ops.mesh.primitive_cylinder_add(vertices=sides,radius=r,depth=depth,location=center);o=bpy.context.object;o.name=name;o.rotation_euler=Vector((0,0,1)).rotation_difference(Vector(axis)).to_euler();o.data.materials.append(mat);c.uv_world(o);return o
 def ring(name,center,outer,inner,depth,axis=(0,-1,0),mat=rust,n=20):
  q=Vector((0,0,1)).rotation_difference(Vector(axis));origin=Vector(center)
  verts=[tuple(origin+q@Vector((r*math.cos(j*math.tau/n),r*math.sin(j*math.tau/n),z)))for z,r in[(-depth/2,outer),(depth/2,outer),(-depth/2,inner),(depth/2,inner)]for j in range(n)]
  faces=[]
  for j in range(n):
   k=(j+1)%n
   faces.extend([(j,k,n+k,n+j),(2*n+j,3*n+j,3*n+k,2*n+k),(j,2*n+j,2*n+k,k),(n+j,n+k,3*n+k,3*n+j)])
  o=c.mesh(name,verts,faces,mat);c.uv_world(o);return o
 def bolt(x,y,z,r=.028):
  ring('oxidized bolt washer',(x,y,z),r*1.5,r*.6,.006,mat=steel,n=12)
  disk('hexagonal bolt head',(x,y-.017,z),r,.023,steel,sides=6)
 def plate(x,y,z,w,h,mat=rust):
  box('gusset connection plate',(x,y,z),(w,.025,h),mat,.007)
  for dx in[-1,1]:
   for dz in[-1,1]:bolt(x+dx*(w/2-.065),y-.023,z+dz*(h/2-.065))
 def ribs(a,b,r=.014):
  a,b=Vector(a),Vector(b);rod('exposed deformed reinforcing bar',a,b,r,rust,10)
  for j in range(max(2,int((b-a).length/.07))):
   p=a.lerp(b,j/max(1,int((b-a).length/.07)));ring('rolled steel deformation',p,r*1.14,r*.92,.005,tuple((b-a).normalized()),rust,10)
 def recovered(label,filename,name,center,size):
  root=Path(__file__).resolve().parents[2];folder=root/'assets/3d/dungeons/b3_recovered_candidates'/label
  source=next((folder/'original').rglob(filename));receipt=__import__('json').loads((folder/'recovery.json').read_text());rel=str(source.relative_to(folder/'original'))
  assert __import__('hashlib').sha256(source.read_bytes()).hexdigest()==receipt['files'][rel]['sha256']
  before=set(bpy.context.scene.objects);bpy.ops.import_scene.gltf(filepath=str(source));new=set(bpy.context.scene.objects)-before;meshes=[o for o in new if o.type=='MESH'];assert meshes
  corners=[o.matrix_world@Vector(p)for o in meshes for p in o.bound_box];lo=Vector(tuple(min(p[k]for p in corners)for k in range(3)));hi=Vector(tuple(max(p[k]for p in corners)for k in range(3)));middle=(lo+hi)*.5
  scale=Vector(tuple(size[k]/max(hi[k]-lo[k],.0001)for k in range(3)))
  for o in meshes:
   transform=o.matrix_world.copy();o.parent=None;o.matrix_world.identity();o.name=name
   for v in o.data.vertices:
    p=transform@v.co-middle;v.co=Vector(tuple(p[k]*scale[k]+center[k]for k in range(3)))
  for o in new:
   if o.type!='MESH':bpy.data.objects.remove(o,do_unlink=True)
  return meshes
 def chip_edge(o,loc,size):
  scar(o,loc,size,(rng.uniform(-.22,.22),rng.uniform(-.2,.2),rng.uniform(-.25,.25)))
 def cable(name,points,r=.011):return c.tube(name,points,r,rubber,8)
 if asset=='column_joint':
  core=box('fractured RC pier',(0,0,2.8),(.68,.68,5.6),concrete,.035)
  chip_edge(core,(.30,-.31,2.35),(.33,.30,.75));chip_edge(core,(-.3,-.3,5.48),(.25,.24,.33))
  for x in[-.22,.22]:ribs((x,-.21,1.99),(x+.04,-.22,2.78))
  beam('cantilever I beam',(-1.2,0,5.12),(1.2,0,5.12),.36,.45,.035)
  for x in[-.54,.54]:plate(x,-.25,5.1,.46,.56)
  box('anchored base plate',(0,0,.08),(1.03,1.03,.10),rust,.01)
  for x in[-.38,.38]:
   for y in[-.38,.38]:disk('anchor bolt',(x,y,.18),.038,.13,steel,(0,0,1),6)
  box('moss-dark footing',(0,0,.06),(1.13,1.13,.12),moss,.035)
 elif asset=='riveted_girder':
  beam('continuous I girder',(-2,0,.56),(2,0,.56),.43,.62,.045)
  for x in[-1.8,-.9,0,.9,1.8]:
   box('web stiffener',(x,0,.56),(.038,.36,.54),rust,.004)
   for z in[.35,.75]:bolt(x,-.225,z)
  plate(-1.75,-.24,.56,.43,.52);plate(1.75,-.24,.56,.43,.52)
  # Displaced end connection and a fallen washer retain the history of failed loading.
  o=box('peeled end flange',(1.96,-.07,.88),(.26,.38,.035),rust,.006);o.rotation_euler[1]=-.18
  ring('loose connection washer',(.6,-.34,.035),.075,.031,.018,(0,0,1),rust)
 elif asset=='buckled_portal':
  beam('left column',(-1.78,0,0),(-1.82,0,5.05),.3,.36,.035)
  beam('buckled right lower column',(1.78,0,0),(1.62,-.08,3.1),.3,.36,.035)
  beam('buckled right upper column',(1.62,-.08,3.1),(1.78,0,5.05),.3,.36,.035)
  beam('portal cross member',(-2,0,5.02),(2,0,4.96),.35,.44,.035)
  for x in[-1.78,1.78]:
   box('corroded footing shoe',(x,0,.045),(.65,.65,.09),rust,.01);plate(x,-.2,4.82,.52,.55)
   for y in[-.24,.24]:disk('anchor stud',(x+.2,y,.14),.033,.15,steel,(0,0,1),6)
  beam('left knee brace',(-1.78,0,4.25),(-.95,0,4.98),.16,.19,.018)
  beam('right knee brace',(.95,0,4.98),(1.72,0,4.25),.16,.19,.018)
  cable('severed suspended wire',[(-1.1,0,4.9),(-.8,-.06,4.25),(-.45,-.05,4.01)],.009)
 elif asset=='grating_catwalk':
  for y in[-.78,.78]:beam('perimeter channel',(-2,y,.13),(2,y,.13),.17,.25,.023)
  for x in[-1.85,-.8,.35,1.6]:beam('secondary deck bearer',(x,-.8,.12),(x,.8,.12),.12,.17,.018)
  for j in range(37):
   x=-1.94+j*.106
   if 21<=j<=24:continue
   bar=box('industrial bearing grating',(x,0,.23),(.026,1.54,.04),rust,.003)
   if j==25:bar.rotation_euler[1]=-.24;bar.location.z-=.06
  for y in[-.8,.8]:
   for x in[-1.9,0,1.9]:rod('handrail standard',(x,y,.2),(x,y,1.25),.022)
   rod('upper handrail',(-2,y,1.25),(2,y,1.25),.026);rod('knee rail',(-2,y,.77),(2,y,.77),.016)
   box('toe board',(0,y,.34),(4,.018,.17),rust,.004)
  plate(-1.75,-.86,.17,.38,.3)
 elif asset=='service_stair':
  for x in[-.66,.66]:beam('inclined stair stringer',(x,-1.8,.15),(x,1.65,2.85),.14,.24,.025)
  for j in range(12):
   y=-1.62+j*.286;z=.18+j*.23
   box('folded tread',(0,y,z),(1.42,.28,.038),rust,.007)
   for k in range(7):box('tread grip rib',(-.60+k*.2,y-.08,z+.025),(.025,.21,.016),steel,.003)
   if j in[0,4,8,11]:
    for x in[-.73,.73]:rod('sloped railing post',(x,y,z),(x,y,z+1.02),.021)
  for x in[-.74,.74]:rod('continuous grasp rail',(x,-1.72,1.2),(x,1.53,3.76),.026)
  for x in[-.65,.65]:box('stringer bearing plate',(x,-1.8,.065),(.32,.42,.08),rust,.006)
  o=box('fractured bottom tread corner',(.63,-1.62,.17),(.19,.22,.035),rust,.005);o.rotation_euler[2]=.18
 elif asset=='landing_railing':
  box('concrete landing',(0,0,.13),(2.6,1.95,.24),concrete,.03)
  for x in[-1.2,0,1.2]:
   for y in[-.91,.91]:rod('guardrail upright',(x,y,.2),(x,y,1.32),.022)
  for y in[-.93,.93]:
   c.tube('bent top rail',[(-1.3,y,1.3),(-.4,y,1.31),(.55,y+.11,1.19),(1.3,y,1.27)],.025,rust,10)
   rod('lower rail',(-1.3,y,.75),(1.3,y,.74),.016)
  for x in[-1.2,1.2]:
   for y in[-.91,.91]:box('post weld plate',(x,y,.27),(.16,.16,.022),rust,.004)
  chip_edge(next(o for o in bpy.context.scene.objects if o.name.startswith('concrete landing')), (1.22,-.93,.22),(.3,.24,.22))
 elif asset=='bridge_abutment':
  wall=box('RC abutment stem',(0,.65,1.45),(3.6,1.1,2.9),concrete,.04)
  box('widened bridge footing',(0,.45,.16),(3.85,1.55,.32),moss,.04)
  box('bearing shelf',(0,.05,2.71),(3.8,1.8,.34),concrete,.025)
  for x in[-1.1,1.1]:
   box('elastomeric bearing',(x,-.35,2.96),(.62,.64,.13),rubber,.01)
   box('bearing cap steel',(x,-.35,3.08),(.75,.76,.10),rust,.007)
   beam('fractured bridge girder',(x,-1.05,3.35),(x,.75,3.35),.5,.58,.04)
   for y in[-.6,-.12]:disk('bearing retaining stud',(x+.26,y,3.10),.033,.17,steel,(0,0,1),6)
  for loc,size in [((-1.72,-.7,2.75),(.4,.45,.38)),((1.7,.14,2.2),(.28,.36,.7))]:chip_edge(wall,loc,size)
  for x in[-1.6,-1.4]:ribs((x,-.2,2.7),(x+.06,-.42,3.07))
 else:
  build_small(asset,e,dict(beam=beam,disk=disk,ring=ring,bolt=bolt,plate=plate,ribs=ribs,cable=cable,paint=paint,rubber=rubber,recovered=recovered))

def build_small(asset,e,h):
 import math
 c,bpy,box,rod,scar=[e[k]for k in ['c','bpy','box','rod','scar']]
 concrete,moss,rust,asphalt,fracture,dark,steel,rng,Vector=[e[k]for k in ['concrete','moss','rust','asphalt','fracture','dark','steel','rng','Vector']]
 beam,disk,ring,bolt,plate,ribs,cable,paint,rubber,recovered=[h[k]for k in ['beam','disk','ring','bolt','plate','ribs','cable','paint','rubber','recovered']]
 if asset=='broken_signal':
  box('signal concrete footing',(0,0,.12),(.65,.65,.24),moss,.035)
  rod('leaning tubular signal mast',(0,0,.2),(.12,.04,3.4),.065,rust,14)
  box('hollow folded signal back',(.12,-.1,2.7),(.44,.20,1.25),paint,.045)
  for z in[2.28,2.68,3.08]:
   ring('signal bezel',(.12,-.24,z),.172,.13,.052,mat=rust,n=24)
   if z!=2.68:
    color=(.19,.038,.025,1)if z>2.8 else(.045,.12,.07,1);lens=c.material('f3_dead_signal_'+str(z),color,.39)
    disk('unpowered dirty lens',(.12,-.252,z),.13,.025,lens,sides=24)
   else:
    disk('empty broken lens cavity',(.12,-.15,z),.132,.035,dark,sides=24)
    for i in range(3):
     a=i*1.7;c.tube('hanging broken lens retention wire',[(.12+math.cos(a)*.11,-.24,z+.04),(.12+math.cos(a)*.08,-.27,z-.12)],.006,steel,5)
   # Curved hoods protect the upper half of each lens; the middle is fractured.
   n=11;verts=[]
   for y in[-.25,-.49]:
    for j in range(n):
     a=j*math.pi/(n-1);verts.append((.12+math.cos(a)*.182,y,z+math.sin(a)*.182))
   faces=[(j,j+1,n+j+1,n+j)for j in range(n-1)if not(z==2.68 and j in[6,7])]
   o=c.mesh('corroded lamp visor',verts,faces,rust);c.uv_world(o)
  for z in[2.4,3.0]:ring('mast attachment clamp',(.12,.045,z),.085,.069,.055,(0,0,1),rust,16)
  cable('dangling supply cable',[(.1,.13,2.5),(.27,.14,1.9),(.13,.14,1.26),(.21,.13,.95)],.012)
 elif asset=='broken_streetlamp':
  box('lamp footing',(0,0,.10),(.55,.55,.2),moss,.025)
  c.tube('tapered curved streetlamp mast',[(0,0,.2),(.06,0,3.5),(.22,0,4.25),(.75,0,4.54),(1.28,0,4.50)],[.075,.045,.041,.038,.032],rust,14)
  housing=box('fractured light canopy',(1.19,0,4.43),(.68,.32,.18),rust,.075)
  scar(housing,(1.48,-.13,4.42),(.28,.2,.2),(.12,.18,.22))
  box('dusty dark luminaire',(1.1,0,4.33),(.49,.23,.015),dark,.025)
  cable('torn power conductor',[(1.44,0,4.42),(1.54,.03,4.02),(1.52,.05,3.75)],.009)
  for x in[-.18,.18]:
   for y in[-.18,.18]:disk('base anchor',(x,y,.24),.03,.18,steel,(0,0,1),6)
 elif asset=='control_cabinet':
  box('cabinet plinth',(0,0,.12),(1.35,.70,.24),moss,.035)
  for x in[-.58,.58]:box('folded cabinet side',(x,0,1.04),(.045,.64,1.62),rust,.014)
  for z in[.27,1.84]:box('cabinet horizontal fold',(0,0,z),(1.2,.66,.04),rust,.015)
  box('cabinet back panel',(0,.30,1.05),(1.2,.035,1.6),rust,.012)
  door=box('bent open control door',(-.82,-.47,1.05),(.61,.035,1.55),paint,.014);door.rotation_euler[2]=-.72
  plate(0,.25,1.12,1.0,1.30)
  for x in[-.28,0,.28]:
   disk('obsolete dial bezel',(x,.19,1.50),.10,.045,steel,sides=24);disk('dead dial face',(x,.155,1.5),.079,.012,dark,sides=20)
   for z in[.66,.90,1.14]:box('ceramic fuse block',(x,.14,z),(.12,.16,.13),concrete,.012)
  for j in range(6):cable('loose switchboard wire',[(j*.12-.3,.12,.65),(j*.13-.28,-.08,.42),(j*.11-.25,-.10,.36)],.007)
  for z in[.55,1.55]:disk('door hinge',(-.59,-.32,z),.035,.19,steel,(0,0,1),10)
 elif asset=='flanged_pipe':
  pts=[(-.9+math.sin(j*math.pi/2/12)*.95,0,.28+(1-math.cos(j*math.pi/2/12))*.95)for j in range(13)]
  c.tube('cast iron service elbow',pts,.22,rust,24)
  for p,axis in[(pts[0],(-1,0,0)),(pts[-1],(0,0,1))]:
   ring('pipe gasket',p,.292,.181,.025,axis,rubber,24);ring('eight bolt pipe flange',Vector(p)+Vector(axis)*.035,.315,.185,.065,axis,rust,24)
   q=Vector((0,0,1)).rotation_difference(Vector(axis))
   for j in range(8):
    v=Vector(p)+q@Vector((math.cos(j*math.tau/8)*.26,math.sin(j*math.tau/8)*.26,.07));disk('flange fastening',v,.025,.045,steel,axis,6)
  for x in[-.65,.0]:box('pipe saddle foot',(x,0,.08),(.30,.58,.16),concrete,.025)
 elif asset=='pipe_rack':
  for x in[-1.6,1.6]:
   beam('pipe rack transverse frame',(x,-.6,.18),(x,.6,.18),.12,.19,.02)
   for y in[-.55,.55]:box('rack mounting plate',(x,y,.08),(.25,.25,.08),rust,.005)
  for j,y in enumerate([-.38,0,.38]):
   c.tube('sagging overhead process pipe',[(-2,y,.43),(-.6,y,.43-j*.03),(.4,y-.03,.29),(1.95,y,.44)],.09+j*.018,rust,16)
   for x in[-1.6,1.6]:ring('U clamp saddle',(x,y,.43),.145,.126,.026,(1,0,0),steel,16)
  cable('hanging service bundle',[(-1.3,.5,.38),(-.5,.52,.13),(.8,.5,-.07),(1.5,.5,.32)],.016)
 elif asset=='roller_shutter':
  for x in[-1.86,1.86]:beam('shutter guide channel',(x,0,0),(x,0,4.2),.15,.21,.025)
  box('upper shutter drum cover',(0,.06,4.22),(3.9,.52,.48),rust,.045)
  for j in range(32):
   z=.1+j*.123
   if j<6:
    for side in[-1,1]:
     o=box('torn lower shutter remnant',(side*1.53,-.01,z),(.59,.052,.11),rust,.012);o.rotation_euler[1]=side*.12
   else:box('rolled galvanized shutter slat',(0,-.01,z),(3.56,.052,.115),rust,.012)
  for j in range(6):
   x=-.8+j*.31;rod('broken lock chain',(x,-.09,.85),(x+.14,-.14,.69),.006,steel,5)
 elif asset=='shattered_window':
  for x in[-1.72,1.72]:box('weathered window reveal',(x,.0,1.55),(.27,.47,3.1),concrete,.025)
  for z in[.18,2.97]:box('lintel or sill',(0,0,z),(3.7,.55,.3),concrete,.03)
  for x in[-1.51,-.5,.5,1.51]:box('steel mullion',(x,-.11,1.58),(.055,.095,2.53),rust,.007)
  for z in[1.05,2.05]:box('horizontal window transom',(0,-.11,z),(3.1,.095,.047),rust,.006)
  for j,(cx,cz)in enumerate([(-1.0,.64),(0,1.51),(1.0,2.48),(-1.0,2.45)]):
   recovered('glass_v10','f3_glass_detached_shard01_dirt_v10.glb','reused weathered glass shard',(cx,-.17,cz),(.82,.008,.74))
  # Dark closed interior prevents the window becoming a view through the maze wall.
  box('unlit interior back',(0,.28,1.57),(3.32,.04,2.55),dark,0)
 elif asset=='rebar_rubble':
  for filename,center,size in [('f3_concrete_rubble_v29_medium.glb',(-.58,.14,.31),(1.13,.95,.62)),('f3_concrete_rubble_v29_small.glb',(.61,.12,.22),(.86,.73,.44))]:
   recovered('rubble_v29',filename,'reused fracture aggregate',center,size)
  for j in range(2):recovered('rebar_v4','f3_rebar01_v4.glb','reused ribbed reinforcing bar',(-.38+j*.62,.04,.74),(.065,.065,.63+j*.12))
  box('ground contact grit',(0,0,.035),(2.1,1.3,.05),moss,.08)
 elif asset=='heaved_asphalt':
  for j in range(4):
   x=-1.42+j*.94;slab=box('root-heaved asphalt slab',(x,0,.11+j%2*.055),(.89,1.05,.16),asphalt,.025);slab.rotation_euler[1]=(-1)**j*.055
   if j<3:box('worn road line remnant',(x,-.21,.205+j%2*.055),(.42,.105,.004),paint,.006)
  for j in range(5):box('displaced concrete kerb',(-1.5+j*.73,.61,.15+j%2*.02),(.68,.23,.29),concrete,.035)
  c.tube('root lifting pavement',[(-1.8,.12,.03),(-.6,.08,.12),(.5,.12,.08),(1.65,.15,.035)],[.05,.095,.08,.025],moss,10)
 elif asset=='drain_channel':
  for y in[-.29,.29]:box('drain stone lip',(0,y,.17),(3.6,.17,.32),concrete,.02)
  box('silted invert',(0,0,.035),(3.52,.43,.07),dark,.02)
  for j in range(25):
   x=-1.70+j*.141
   if j in[15,16,17]:continue
   o=box('cast drain grate bar',(x,0,.27),(.028,.43,.025),rust,.004)
   if j==18:o.rotation_euler[2]=.20
  for x in[-1.7,-.1,1.65]:box('grate seat',(x,0,.245),(.04,.53,.05),rust,.004)
 elif asset=='factory_door':
  for x in[-1.68,1.68]:box('crumbling door jamb',(x,0,2.1),(.36,.65,4.2),concrete,.04)
  lintel=box('reinforced doorway lintel',(0,0,4.08),(3.75,.68,.36),concrete,.04);scar(lintel,(1.72,-.30,4.10),(.44,.34,.35),(.2,.2,.2))
  for x in[-1.42,1.42]:box('steel frame post',(x,-.12,1.94),(.075,.12,3.75),rust,.008)
  for side in[-1,1]:
   door=box('partly open battered door',(side*1.13,-.48,1.88),(.65,.045,3.56),rust,.02);door.rotation_euler[2]=side*.34
   for z in[.4,3.32]:disk('industrial hinge',(side*1.43,-.17,z),.035,.22,steel,(0,0,1),10)
  box('dark closed abandoned vestibule',(0,.36,1.95),(3.03,.04,3.75),dark,0)
  for x in[1.28,1.47,1.65]:ribs((x,.01,3.94),(x-.04,-.03,4.35))
 elif asset=='ivy_pocket':
  leaf=c.material('f3_shaded_ivy_leaf',(.08,.17,.055,1),.91)
  for k in range(4):
   x=k*.42-.65;pts=[(x+math.sin(j*1.3+k)*.07,0,j*.29)for j in range(8)];c.tube('climbing ivy supporting stem',pts,.008,rubber,6)
   for j in range(1,8):
    px,py,pz=pts[j];side=(-1)**(j+k);end=(px+side*.23,-.03,pz+.06)
    verts=[(px,-.025,pz),(end[0],-.025,end[2]-.1),(end[0]+side*.07,-.055,end[2]+.025),(end[0],-.04,end[2]+.14),(px+side*.055,-.025,pz+.13)]
    o=c.mesh('lobed ivy leaf',verts,[(0,1,2),(0,2,3),(0,3,4)],leaf);c.uv_world(o)
  for j in range(3):box('root pocket stone',(j*.48-.5,.1,.08),(.55,.48,.16),moss,.07)
 else:raise ValueError('Unimplemented individual industrial asset '+asset)
