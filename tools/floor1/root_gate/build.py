import bpy, math, random, os, sys, json, hashlib
from mathutils import Vector
random.seed(81)
OUT=os.path.abspath(sys.argv[sys.argv.index('--')+1] if '--' in sys.argv else 'review/floor1-root-gate-v1');os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(name,color,noise=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=.88
 if noise:
  n=m.node_tree.nodes.new('ShaderNodeTexNoise');n.inputs['Scale'].default_value=noise
  b=m.node_tree.nodes.new('ShaderNodeBump');b.inputs['Strength'].default_value=.28;b.inputs['Distance'].default_value=.07
  m.node_tree.links.new(n.outputs['Fac'],b.inputs['Height']);m.node_tree.links.new(b.outputs['Normal'],p.inputs['Normal'])
 return m
wood=mat('warm bark',(.20,.115,.055),17);groove=mat('bark ridges',(.29,.18,.085),24)
stones=[mat('stone'+str(i),(.25+i*.012,.28+i*.012,.235+i*.012),12) for i in range(5)]
leaves=[mat('foliage'+str(i),(.08+i*.028,.16+i*.032,.035+i*.008)) for i in range(5)]
moss=mat('moss',(.16,.23,.045),22)
def mesh(name,v,f,m):
 me=bpy.data.meshes.new(name);me.from_pydata(v,[],f);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);o.data.materials.append(m);return o
def tube(name,pts,rs,m,sides=10):
 pts=[Vector(p) for p in pts]
 # Catmull-Rom interpolation preserves knots and rounds branch transitions.
 old=pts;rr=rs;pts=[];rs=[]
 for k in range(len(old)-1):
  a,b,c,d=old[max(k-1,0)],old[k],old[k+1],old[min(k+2,len(old)-1)]
  for q in range(5):
   t=q/5;pts.append(.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t));rs.append(rr[k]*(1-t)+rr[k+1]*t)
 pts.append(old[-1]);rs.append(rr[-1]);vs=[]
 for i,p in enumerate(pts):
  tangent=(pts[min(i+1,len(pts)-1)]-pts[max(0,i-1)]).normalized();a=tangent.cross(Vector((0,1,0))).normalized()
  if a.length<.1:a=tangent.cross(Vector((1,0,0))).normalized()
  b=tangent.cross(a).normalized()
  for j in range(sides):
   t=j*math.tau/sides;r=rs[i]*(1+.07*math.sin(j*3+i*.8));vs.append(p+r*(math.cos(t)*a+math.sin(t)*b))
 fs=[]
 for i in range(len(pts)-1):
  for j in range(sides):a=i*sides+j;b=i*sides+(j+1)%sides;fs.append((a,b,b+sides,a+sides))
 fs.extend([tuple(reversed(range(sides))),tuple((len(pts)-1)*sides+j for j in range(sides))]);o=mesh(name,vs,fs,m)
 for p in o.data.polygons:p.use_smooth=True
 return o
# Rough-hewn masonry with per-corner displacement; blocks remain distinct.
def block(name,loc,scale,rot=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name
 for v in o.data.vertices:
  v.co.x*=scale[0];v.co.y*=scale[1];v.co.z*=scale[2];v.co+=Vector([random.uniform(-.035,.035) for _ in range(3)])
 o.rotation_euler[1]=rot;o.data.materials.append(random.choice(stones));be=o.modifiers.new('worn stone edges','BEVEL');be.width=.045;be.segments=2
 bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=be.name)
 return o
# 2.2m clear opening, 2m straight jambs, semicircular arch above.
for s in [-1,1]:
 for z in range(5):
  block('jamb', (s*1.38,0,.22+z*.43),(.57,random.uniform(.68,.85),.40),random.uniform(-.025,.025))
for i in range(13):
 a=(i+.5)*math.pi/13;x=1.38*math.cos(a);z=2.08+1.38*math.sin(a)
 block('arch voussoir',(x,0,z),(.40,.82,.51),math.pi/2-a)
for x,z in [(1.5,2.5),(1.65,2.95),(-1.5,2.7)]:block('broken crest',(x,.12,z),(.44,.65,.32),random.uniform(-.2,.2))
# Contorted trunk left of passage.
trunk=[(-1.96,.22,.13),(-1.84,.20,.7),(-1.78,.24,1.45),(-1.93,.30,2.2),(-1.75,.30,2.95),(-1.32,.32,3.65),(-1.44,.33,4.3),(-1.10,.35,4.95)]
rs=[.67,.57,.49,.48,.43,.34,.25,.10];tube('ancient trunk',trunk,rs,wood,18)
for j in range(16):
 a=j*math.tau/16;pts=[(p[0]+r*.97*math.cos(a+i*.22),p[1]+r*.97*math.sin(a+i*.22),p[2]) for i,(p,r) in enumerate(zip(trunk,rs))]
 tube('long bark rib',pts,[.035,.045,.042,.04,.035,.03,.02,.006],groove,5)
# Buttress roots fan onto the floor without crossing the passage.
for j in range(11):
 a=j*math.tau/11;end=(-1.9+math.cos(a)*random.uniform(.8,1.45),.2+math.sin(a)*random.uniform(.8,1.4),.035)
 tube('buttress root',[trunk[1],(-1.9+math.cos(a)*.55,.2+math.sin(a)*.55,.28),end],[.22,.18,.015],wood)
# Roots hugging the crown and right-hand pier, front and back.
for k in range(5):
 y=-.47+k*.21
 pts=[(-1.78,y,2.7),(-1.25,y-.06,3.43),(-.5,y-.05,3.72),(.25,y,3.62),(1.05,y,3.28),(1.52,y,2.5),(1.57,y-.05,1.5),(1.75,y,.55),(2.12,y-.3,.04)]
 pts=[(x+.06*math.sin(i*1.8+k),y,z+.15*math.sin(i*1.6+k*1.2)) if i>0 and i<8 else (x,y,z) for i,(x,y,z) in enumerate(pts)]
 tube('embracing root',pts,[r*(1-.13*k) for r in [.22,.20,.16,.14,.17,.14,.10,.09,.012]],wood,12)
 for j in range(2):
  pp=[(x,y-.04-j*.035,z+.03) for x,y,z in pts];tube('root bark ridge',pp,[.028]*8+[.004],groove,5)
# Branch system and individual leaves rather than foliage balls.
tips=[]
for j,(dx,dy,dz) in enumerate([(-1.9,-.2,.35),(-1.5,.8,1.0),(-.5,-.7,1.2),(.8,.5,1.0),(2.0,-.25,.45),(2.6,.5,-.1)]):
 start=Vector(trunk[5 if j==5 else 6]);end=start+Vector((dx,dy,dz));mid=start.lerp(end,.53)+Vector((0,0,.24))
 tube('main bough',[start,mid,end],[.20,.11,.025],wood)
 for n in range(5):
  p=mid.lerp(end,n/5);tip=p+Vector((random.uniform(-.55,.55),random.uniform(-.7,.7),random.uniform(.15,.6)))
  tube('twig',[p,tip],[.05,.009],wood,7);tips.append(tip)
for tip in tips:
 for j in range(42):
  c=tip+Vector((random.uniform(-.48,.48),random.uniform(-.38,.38),random.uniform(-.1,.25)));a=random.random()*math.tau;length=random.uniform(.12,.23);w=length*.43
  u=Vector((math.cos(a),math.sin(a),random.uniform(-.2,.35)));v=Vector((-math.sin(a),math.cos(a),0))
  mesh('leaf',[c-u*length,c-v*w,c+Vector((0,0,.04)),c+u*length,c+v*w],[(0,1,2),(1,3,2),(3,4,2),(4,0,2)],random.choice(leaves))
# Moss as shallow patches, rubble to the sides only.
for j in range(60):
 s=random.choice([-1,1]);x=s*random.uniform(1.3,2.5);y=random.uniform(-.75,.9)
 if j<22:block('fallen stone',(x,y,.12),(random.uniform(.12,.4),random.uniform(.15,.38),random.uniform(.12,.3)),random.random())
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=(x,y,.055));o=bpy.context.object;o.name='ground moss';o.scale=(random.uniform(.08,.22),random.uniform(.08,.18),.035);o.data.materials.append(moss)
# Join by material to avoid hundreds of draw calls; apply transforms before export.
bpy.ops.object.select_all(action='DESELECT')
for m in list(bpy.data.materials):
 obs=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.materials and o.data.materials[0]==m]
 if not obs:continue
 for o in obs:o.select_set(True)
 bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.join();bpy.context.object.name=m.name;bpy.ops.object.select_all(action='DESELECT')
asset=[o for o in bpy.context.scene.objects if o.type=='MESH']
for o in asset:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT+'/root-gate-v1.glb',export_format='GLB',use_selection=True)
tri=sum(len(p.vertices)-2 for o in asset for p in o.data.polygons)
# Studio rig excluded from GLB.
ground=mat('studio',(.19,.205,.19));bpy.ops.mesh.primitive_plane_add(size=200);bpy.context.object.data.materials.append(ground)
def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
for loc,power,size in [((-4,-6,9),1700,7),((5,-1,6),1300,6),((0,5,8),1900,5)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;aim(o,(0,0,2))
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=7.5;bpy.context.scene.camera=cam
sc=bpy.context.scene;sc.render.engine='CYCLES';sc.cycles.samples=96;sc.cycles.use_denoising=False;sc.world.color=(.32,.32,.32);sc.render.resolution_x=1000;sc.render.resolution_y=1000;sc.render.resolution_percentage=100
for label,pos in [('front',(0,-12,4.5)),('side',(12,0,4.5)),('angle',(8,-12,7))]:
 cam.location=pos;aim(cam,(-.45,0,2.65));sc.render.filepath=OUT+'/'+label+'.png';bpy.ops.render.render(write_still=True)
files={f:hashlib.sha256(open(OUT+'/'+f,'rb').read()).hexdigest() for f in ['root-gate-v1.glb','front.png','side.png','angle.png']}
json.dump({'asset':'f1-root-gate-v1','approval':'pending','integration':False,'units':'meters','opening_width':2.2,'triangles':tri,'mesh_count':len(asset),'renderer':bpy.app.version_string,'render_environment':'local Blender Cycles CPU','workflow_run':None,'files_sha256':files},open(OUT+'/manifest.json','w'),indent=2)
print('DONE',tri)
