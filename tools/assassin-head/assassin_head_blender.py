import bpy, math, random, os, sys
from mathutils import Vector
random.seed(24)
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
out=os.path.abspath(args[args.index('--out')+1]) if '--out' in args else os.getcwd()
os.makedirs(out,exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
def mat(name,color):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=.75
 return m
skin=mat('pale skin',(.91,.79,.78));hairmat=mat('silver lilac hair',(.66,.62,.73));shadow=mat('hair shadow',(.38,.34,.46))
iris=mat('violet iris',(.38,.29,.62));white=mat('eye white',(.94,.90,.95));dark=mat('eyelash ink',(.13,.105,.19))
ribbon=mat('black violet ribbon',(.16,.13,.22));blush=mat('soft lip',(.72,.47,.51))
def mesh(name,verts,faces,material):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update()
 ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob);ob.data.materials.append(material)
 for p in me.polygons:p.use_smooth=True
 return ob
verts=[];faces=[];R=100;S=50
for i in range(R):
 z=-.73+1.77*i/(R-1);t=(z+.73)/1.77
 width=(.06+.59*(max(0,math.sin(math.pi*(.05+.88*t)))**.72))*(1-.10*max(0,(t-.58)/.42))
 for j in range(S):
  a=2*math.pi*j/S;x=width*math.sin(a)
  y=.20*math.cos(a)-.065-.075*math.exp(-((z+.10)/.30)**2)*max(0,math.cos(a))
  verts.append((x,y,z))
for i in range(R-1):
 for j in range(S):
  k=i*S+j;q=i*S+(j+1)%S;faces.extend([(k,q,q+S),(k,q+S,k+S)])
face=mesh('SKIN_FACE__5000_vertices',verts,faces,skin)
hv=[];hf=[]
for strand in range(100):
 if strand<45:
  f=strand/44;rootx=-.51+1.02*f;rootz=1.03-.08*abs(f-.55)
  length=.66+.42*(1-f)**1.5;endx=rootx+.23+.14*(1-f);endz=rootz-length
  rooty=-.08-.10*math.cos((f-.5)*math.pi);endy=-.28
 elif strand<75:
  f=(strand-45)/29;side=-1 if strand%2 else 1;rootx=side*(.34+.19*f);rootz=.85-.12*f
  length=1.18+.50*f;endx=rootx+side*(.13+.10*f);endz=rootz-length
  rooty=-.01+.12*f;endy=-.01+.08*f
 else:
  f=(strand-75)/24;rootx=.28+.19*(f-.5);rootz=1.02+.12*math.sin(math.pi*f)
  length=1.05+.42*f;endx=.67+.20*math.sin(math.pi*f);endz=rootz-length
  rooty=.21;endy=.43+.09*f
 base=len(hv)
 for k in range(50):
  u=k/49;ease=u*u*(3-2*u)
  x=rootx+(endx-rootx)*ease+.045*math.sin(u*math.pi*1.6+strand*.23)*u
  z=rootz+(endz-rootz)*u;y=rooty+(endy-rooty)*u-.10*math.sin(math.pi*u)
  w=(.022+.016*math.sin(math.pi*u))*(1-u**3)+.001
  hv.extend([(x-w,y,z),(x+w,y-.008,z)])
  if k:\n   a=base+2*(k-1);b=a+1;c=base+2*k;d=c+1\n   hf.extend([(a,b,d),(a,d,c)])
hair=mesh('HAIR_10000_vertices_100_strands',hv,hf,hairmat)
def sphere(name,loc,scale,material):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,location=loc)
 o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(material);bpy.ops.object.shade_smooth()
for side in (-1,1):
 sphere('eye white',(.245*side,-.276,.31),(.178,.030,.087),white)
 sphere('iris',(.245*side,-.309,.305),(.072,.020,.080),iris)
 sphere('pupil',(.245*side,-.331,.303),(.030,.011,.063),dark)
 sphere('upper eyelid',(.245*side,-.301,.397),(.187,.021,.018),dark)
 sphere('eyebrow',(.245*side,-.275,.49),(.153,.013,.015),shadow)
 sphere('ear',(.605*side,.015,.16),(.078,.070,.15),skin)
sphere('small nose',(0,-.308,.065),(.043,.040,.055),skin)
sphere('mouth',(0,-.270,-.22),(.09,.009,.010),blush)
sphere('ponytail tie',(.38,.25,1.01),(.13,.12,.13),ribbon)
for side in (-1,1):sphere('bow loop',(.38+side*.16,.29,1.04),(.19,.045,.13),ribbon)
world=bpy.context.scene.world;world.color=(.8,.8,.8)
def light(loc,power,size):
 bpy.ops.object.light_add(type='AREA',location=loc)
 o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size
 o.rotation_euler=(Vector((0,0,.15))-o.location).to_track_quat('-Z','Y').to_euler()
light((3,-4,5),650,5);light((-3,1,3),450,4)
sc=bpy.context.scene;sc.render.engine='CYCLES';sc.cycles.samples=24
sc.render.resolution_x=768;sc.render.resolution_y=768;sc.render.resolution_percentage=100
sc.render.image_settings.file_format='PNG'
def render(name,loc):
 bpy.ops.object.camera_add(location=loc);cam=bpy.context.object
 cam.rotation_euler=(Vector((0,0,.1))-cam.location).to_track_quat('-Z','Y').to_euler()
 cam.data.type='ORTHO';cam.data.ortho_scale=2.9;sc.camera=cam
 sc.render.filepath=os.path.join(out,name);bpy.ops.render.render(write_still=True)
 bpy.data.objects.remove(cam,do_unlink=True)
render('front.png',(0,-5,.3))
render('side.png',(5,0,.3))
render('three_quarter.png',(3,-4,.4))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'assassin_head.blend'))
with open(os.path.join(out,'geometry_report.txt'),'w') as f:
 f.write('skin_vertices=%d\nhair_vertices=%d\n' % (len(face.data.vertices),len(hair.data.vertices)))
print('COUNTS',len(face.data.vertices),len(hair.data.vertices))
