"""Original Assassin V18 face blockout: no reference meshes loaded or copied.
Blender 5.3, independent authored parametric anatomical topology, review only.
"""
import bpy, math, os, sys, json, hashlib, collections
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
assert len(args)==1
out=args[0]; os.makedirs(out,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
def mat(name,c):
 m=bpy.data.materials.new(name); m.diffuse_color=(*c,1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*c,1)
 bs.inputs['Roughness'].default_value=.88
 return m
clay=mat('original-clay',(.69,.54,.47)); lip=mat('lip-soft',(.46,.30,.30)); sclera=mat('sclera',(.82,.81,.77)); iris=mat('iris',(.26,.33,.37)); pupil=mat('pupil',(.11,.10,.10))
def smooth(u):
 u=max(0.,min(1.,u));return u*u*(3-2*u)
def lerp(a,b,t):return a+(b-a)*t
# Explicit author-drawn silhouette sections: (height, half-width, front-depth, rear-depth)
# Normalized original head; regions are chin, lower jaw, cheekbone, temple, forehead, crown.
sections=[(.03,.027,.022,.030),(.10,.040,.038,.044),(.19,.060,.057,.061),(.30,.082,.069,.084),(.40,.100,.079,.100),(.50,.109,.077,.109),(.59,.111,.079,.114),(.70,.110,.075,.116),(.80,.100,.071,.107),(.89,.083,.064,.089),(.96,.049,.043,.055),(.995,.012,.014,.016),(1.,.0002,.0002,.0002)]
def section(t):
 for i in range(len(sections)-1):
  if t<=sections[i+1][0]:break
 a,b=sections[i],sections[i+1];w=(t-a[0])/(b[0]-a[0]) # V19: continuous slope across sections; no repeated flattening
 return tuple(lerp(a[k],b[k],w) for k in (1,2,3))
def band(v,a,b,c,d):
 return smooth((v-a)/(b-a))*(1-smooth((v-c)/(d-c)))
# Face feature profile uses piecewise, independent semantic areas, not stacked Gaussian blobs.
def front_relief(x,z,base):
 ax=abs(x)
 # Subtle under-brow plane and recessed orbital bowl.
 eyelid_shell=-.0056*band(ax,.012,.023,.052,.065)*band(z,.490,.510,.566,.584)
 supraorbital=.0026*band(ax,.014,.026,.060,.072)*band(z,.560,.573,.603,.619)
 # Cheekbone gently turns toward eye, tapers before mouth.
 zygomatic=.0065*band(ax,.032,.050,.076,.096)*band(z,.398,.438,.494,.540)
 # Continuous anatomical bridge from root to upper tip.
 nose_width=lerp(.012,.022,smooth((.54-z)/.19))
 core=(1-smooth((ax-nose_width*.40)/(nose_width*.68)))
 bridge=.012*band(z,.370,.408,.519,.559)*core
 # The bridge runs into a distinct forward-placed tip; no separate shell/cast-shadow hole.
 tip=.026*band(z,.345,.378,.406,.435)*(1-smooth((ax-.008)/.021))
 # Mirrored alar wings widen lower nose.
 alar=.010*band(ax,.013,.018,.034,.043)*band(z,.335,.355,.390,.410)
 # Philtrum / lip plane / chin, each bounded along z.
 philtrum=.0015*band(ax,.0,.007,.020,.031)*band(z,.300,.314,.342,.354)
 upper_lip=.0035*(1-smooth((ax-.018)/.045))*band(z,.277,.292,.315,.326)
 chin=.0075*(1-smooth((ax-.022)/.052))*band(z,.170,.193,.241,.261)
 return eyelid_shell+supraorbital+zygomatic+bridge+tip+alar+philtrum+upper_lip+chin
# Main head is ONE original watertight crown shell with open lower neck boundary.
R=132;S=144;v=[];f=[]
for i in range(R+1):
 t=.03+(.97*i/R)
 rx,front,rear=section(t)
 for j in range(S):
  th=math.tau*j/S;cx,sy=math.cos(th),math.sin(th);x=rx*cx
  y=(front*(max(0,sy)**.74)+front_relief(x,t,front)) if sy>=0 else -rear*(abs(sy)**.75)
  # Fade anatomical relief as surface becomes lateral, avoiding a side seam.
  if sy>=0:
   y=front*(sy**.74)+front_relief(x,t,front)*smooth(sy/.54)
  v.append((x,y,t))
for i in range(R):
 for j in range(S):
  a=i*S+j;b=i*S+(j+1)%S;c=(i+1)*S+(j+1)%S;d=(i+1)*S+j
  f.append((a,b,c,d))
pole=len(v);v.append((0,0,1.0003))
for j in range(S): f.append((R*S+j,R*S+(j+1)%S,pole))
me=bpy.data.meshes.new('Independent V18 Craniofacial Quad Surface');me.from_pydata(v,[],f);me.update()
head=bpy.data.objects.new('ASSASSIN_V18_ORIGINAL_FACE_HEAD',me);bpy.context.collection.objects.link(head);me.materials.append(clay)
for q in me.polygons:q.use_smooth=True
# Original ear cartilage prototype. Separate mesh, explicitly NOT welded or approved.
def create_ear(side):
 seg=48;radii=[1.,.81,.62,.43,.21];xs=[.113,.122,.118,.114,.111]
 vv=[];ff=[]
 for ring,r in enumerate(radii):
  for j in range(seg):
   a=j*math.tau/seg;co,si=math.cos(a),math.sin(a)
   vv.append((side*xs[ring],.001+.012*co*r,.492+.047*r*si+.006*r*co*si))
 for ring in range(len(radii)-1):
  for j in range(seg):
   a=ring*seg+j;b=ring*seg+(j+1)%seg;c=(ring+1)*seg+(j+1)%seg;d=(ring+1)*seg+j
   ff.append((a,b,c,d) if side>0 else (d,c,b,a))
 mid=len(vv);vv.append((side*.113,.004,.490))
 for j in range(seg):
  a=(len(radii)-1)*seg+j;b=(len(radii)-1)*seg+(j+1)%seg
  ff.append((a,b,mid) if side>0 else (mid,b,a))
 m=bpy.data.meshes.new('Original Ear Prototype');m.from_pydata(vv,[],ff);m.update()
 o=bpy.data.objects.new('V18_EAR_STUDY_'+str(side),m);bpy.context.collection.objects.link(o);m.materials.append(clay)
 for q in m.polygons:q.use_smooth=True
create_ear(-1);create_ear(1)
def uv(name,location,scale,material):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=20,location=location)
 o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(material)
 for p in o.data.polygons:p.use_smooth=True
 return o
# Eyes kept visibly provisional so face anatomy can be judged without a polished texture.
for sign in (-1,1):
 x=sign*.039; z=.539;depth=.082
 uv('original eye sclera '+str(sign),(x,depth,z),(.021,.002,.010),sclera)
 uv('original iris '+str(sign),(x,depth+.002,z),(.008,.0015,.008),iris)
 uv('original pupil '+str(sign),(x,depth+.003,z),(.004,.001,.005),pupil)
def curve(name,points,r,material):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=3
 sp=c.splines.new('BEZIER');sp.bezier_points.add(len(points)-1)
 for p,co in zip(sp.bezier_points,points):
  p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(material)
curve('mouth neutral draft',[(-.030,.070,.292),(0,.079,.290),(.030,.070,.292)],.0007,lip)
# V19 independently authored skull proportions corrective pass.
# Fix V18 height-to-width ratio ~4.4:1 by restoring width and depth.
# Compress oversized forehead; stop the chin from tapering into a needle.
def reframe_z(z):
 if z >= .62:return .62 + .68*(z-.62)
 if z < .17:return .17 + .58*(z-.17)
 return z
for obj in list(bpy.context.scene.objects):
 if obj.type=='MESH':
  # Original geometry only: no imports / copied external vertices.
  # For all mesh vertices, bake XY ratio corrections into authored topology.
  # UV spheres have their shape held on object.scale: only translate and
  # widen object transform to keep them visually proportional.
  if obj == head or obj.name.startswith('V18_EAR'):
   for vert in obj.data.vertices:
    vert.co.x*=3.15
    vert.co.y*=3.0
    vert.co.z=reframe_z(vert.co.z)
  else:
   obj.location.x*=3.15;obj.location.y*=3.0
   obj.location.z=reframe_z(obj.location.z)
   obj.scale.x*=2.5;obj.scale.y*=2.3;obj.scale.z*=1.15
 elif obj.type=='CURVE':
  for sp in obj.data.splines:
   for p in sp.bezier_points:
    p.co.x*=3.15;p.co.y*=3.0;p.co.z=reframe_z(p.co.z)
  obj.data.bevel_depth*=2.3
# V19 original continuous nape prototype, not a copied reference accessory.
bpy.ops.mesh.primitive_cone_add(vertices=64,radius1=.119,radius2=.145,depth=.15,location=(0,-.015,.185))
neck=bpy.context.object;neck.name='V19_ORIGINAL_NAPE_STUDY'
neck.data.materials.append(clay)
for poly in neck.data.polygons:poly.use_smooth=True
# Scene and 10 actual view exports.
sc=bpy.context.scene
engines={x.identifier for x in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items}
sc.render.engine='BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in engines else 'BLENDER_EEVEE'
sc.render.resolution_x=720;sc.render.resolution_y=720;sc.render.resolution_percentage=100
sc.render.image_settings.file_format='PNG';sc.render.film_transparent=True
sc.world.color=(.24,.24,.24)
center=Vector((0,0,.51))
lights=[]
for offset,power,size in [((1.0,1.2,1.4),450,1.8),((-.9,-1.0,1.2),350,1.5),((0,.0,2.3),200,2)]:
 loc=center+Vector(offset);bpy.ops.object.light_add(type='AREA',location=loc)
 ob=bpy.context.object;ob.data.energy=power;ob.data.size=size
 ob.rotation_euler=(center-loc).to_track_quat('-Z','Y').to_euler();lights.append(ob)
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=1.23;sc.camera=cam
views=[('front',(0,1,0)),('front_three_quarter',(1,1,.07)),('left_profile',(-1,0,0)),('right_profile',(1,0,0)),('back',(0,-1,0)),('back_three_quarter',(1,-1,.15)),('up_oblique',(1,1,.60)),('down_oblique',(1,1,-.40))]
def render(name,d):
 cam.location=center+Vector(d).normalized()*3
 cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
 sc.render.filepath=os.path.join(out,name+'.png');bpy.ops.render.render(write_still=True)
for name,d in views:render(name,d)
for ob in lights:
 if hasattr(ob.data,'use_shadow'):ob.data.use_shadow=False
render('front_no_shadow',(0,1,0));render('profile_no_shadow',(1,0,0))
bpy.ops.object.select_all(action='DESELECT')
for ob in sc.objects:
 if ob.type in ('MESH','CURVE'):ob.select_set(True)
bpy.context.view_layer.objects.active=head
bpy.ops.export_scene.gltf(filepath=os.path.join(out,'assassin_v19_original_proportions_study.glb'),export_format='GLB',use_selection=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'assassin_v19_original_proportions_study.blend'))
edges=collections.Counter()
for face in me.polygons:
 seq=list(face.vertices)
 for a,b in zip(seq,seq[1:]+seq[:1]):edges[tuple(sorted((a,b)))]+=1
qa={'approval':'NOT_APPROVED','copied_source_vertices':0,'reference_mesh_loaded':False,'head_vertices':len(me.vertices),'head_quads':R*S,'head_lower_open_edges':sum(x==1 for x in edges.values()),'head_nonmanifold_gt2':sum(x>2 for x in edges.values()),'views':len(views)+2,'known_incomplete':['ear skull weld','real eyelid topology','mouth topology','hair','texture'],'method':'original independent manually specified profile sections and bounded semantic facial planes'}
assert qa['head_lower_open_edges']==S and qa['head_nonmanifold_gt2']==0
with open(os.path.join(out,'qa.json'),'w') as h:json.dump(qa,h,indent=2)
files={}
for fn in os.listdir(out):
 p=os.path.join(out,fn)
 if os.path.isfile(p):files[fn]={'bytes':os.path.getsize(p),'sha256':hashlib.sha256(open(p,'rb').read()).hexdigest()}
with open(os.path.join(out,'manifest.json'),'w') as h:json.dump({'approval':'NOT_APPROVED','source':'independently authored V19','files':files},h,indent=2)
print('ASSASSIN_V19_ORIGINAL_PROPORTIONS_QA',qa)
