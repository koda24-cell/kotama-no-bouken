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
# Five-pass quad topology design (see docs/3d/ASSASSIN_FACE_QUAD_ANALYSIS_20261113.md).
# 160 latitude rings x 96 longitudinal samples = 15,360 surface vertices.
# UV parameterization is quad-only, with explicit anatomical deformation fields.
# Coordinates: X left/right, Y front negative, Z up. 1 Blender unit ~= 1 head unit.
verts=[];faces=[];R=160;S=96
def gaussian(x,mu,sigma):
 return math.exp(-0.5*((x-mu)/sigma)**2)
for i in range(R):
 z=-.60+1.64*i/(R-1)
 t=(z+.60)/1.64
 # skull, cheekbones, temples, tapering jaw and soft chin
 width=(.145+.475*max(0,math.sin(math.pi*(.07+.85*t)))**.58)
 width+=.044*gaussian(z,.21,.17)  # cheekbone flare
 width-=.035*gaussian(z,-.37,.18) # jaw taper
 width+=.026*gaussian(z,.61,.16)  # temples
 for j in range(S):
  a=2*math.pi*j/S
  sn=math.sin(a);cs=math.cos(a)
  x=width*sn
  # Skull depth follows a flattened oval, with facial plane toward negative Y.
  depth=.300+.030*gaussian(z,.40,.27)
  y=-.052+depth*cs
  front=max(0,-cs)**5
  # Brow ridge, eye socket depression, nasal bridge and lips are geometry, not stickers.
  eye_x=gaussian(abs(x),.245,.135)
  y-=front*(.018*gaussian(z,.49,.055) - .026*gaussian(z,.315,.095)*eye_x)
  y-=front*.080*gaussian(x,0,.070)*gaussian(z,.09,.235)  # nose bridge
  y-=front*.066*gaussian(x,0,.085)*gaussian(z,-.005,.065) # nose tip
  y-=front*.021*gaussian(x,0,.110)*gaussian(z,-.205,.033) # upper lip
  y-=front*.014*gaussian(x,0,.115)*gaussian(z,-.258,.027) # lower lip
  y-=front*.048*gaussian(x,0,.18)*gaussian(z,-.43,.09) # chin projection
  # cheek and jaw volumes follow bilateral symmetric, smooth Gaussian fields
  y-=front*.048*gaussian(abs(x),.36,.125)*gaussian(z,.11,.19)
  verts.append((x,y,z))
for i in range(R-1):
 for j in range(S):
  a=i*S+j;b=i*S+(j+1)%S
  faces.append((a,b,b+S,a+S))
assert len(verts)==15360 and len(faces)==15264
face=mesh('SKIN_FACE__15360_vertices_15264_quads',verts,faces,skin)
# Quad hair cards: 100 strips x 50 rows x 2 vertices = 10,000 hair vertices.
# Each adjacent pair of rows is one four-corner polygon (quad).
# Broad overlapping sheets replace the previous diamond-tube strands.
hv=[];hf=[]
for strand in range(100):
 if strand<42:
  f=strand/41;rootx=-.56+1.12*f;rootz=1.045-.10*abs(f-.48)
  rooty=-.14-.10*math.cos((f-.5)*math.pi)
  length=.33+.22*(1-f)**1.2
  endx=rootx+.19+.20*(1-f);endz=rootz-length;endy=-.235
  w=.067+.022*math.sin(math.pi*f)
 elif strand<76:
  f=(strand-42)/33;side=-1 if strand%2 else 1
  rootx=side*(.33+.22*f);rootz=.89-.17*f;rooty=-.01+.12*f
  length=1.10+.47*f;endx=rootx+side*(.13+.10*f);endz=rootz-length
  endy=.10+.10*f;w=.092
 else:
  f=(strand-76)/23;rootx=.23+.24*(f-.5);rootz=1.04+.10*math.sin(math.pi*f)
  rooty=.20;length=.95+.49*f
  endx=.72+.19*math.sin(math.pi*f);endz=rootz-length
  endy=.43+.09*f;w=.095
 base=len(hv)
 for k in range(50):
  u=k/49;ease=u*u*(3-2*u)
  x=rootx+(endx-rootx)*ease+.065*math.sin(u*math.pi*1.5+strand*.17)*u
  z=rootz+(endz-rootz)*u
  y=rooty+(endy-rooty)*ease-.045*math.sin(math.pi*u)+.024*math.sin(math.pi*2*u+strand*.1)
  # Cards have broad roots and a sharp, gently curved tip.
  width=w*(max(.012,(1-u**2)**.62))
  # Face camera-facing sheets in front, with curved lateral layering.
  hv.extend([(x-width,y+.015*math.sin(u*math.pi),z),
             (x+width,y-.015*math.sin(u*math.pi),z)])
  if k:
   a=base+2*(k-1);b=a+1;c=base+2*k+1;d=base+2*k
   hf.append((a,b,c,d))
assert len(hv)==10000
assert all(len(poly)==4 for poly in hf)
hair=mesh('HAIR_10000_vertices_4900_quads',hv,hf,hairmat)
# Additional scalp shell closes the previously exposed crown between hair clumps.
# This is a separate supplemental mesh; the 10,000-vertex hair budget stays unchanged.
bpy.ops.mesh.primitive_uv_sphere_add(segments=64,ring_count=32,location=(0,.055,.72))
scalp=bpy.context.object
scalp.name='SCALP_SUPPLEMENT_under_hair'
scalp.scale=(.64,.285,.43)
scalp.data.materials.append(hairmat)
bpy.ops.object.shade_smooth()
def sphere(name,loc,scale,material):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,location=loc)
 o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(material);bpy.ops.object.shade_smooth()
for side in (-1,1):
 sphere('eye white',(.245*side,-.365,.31),(.166,.036,.078),white)
 sphere('iris',(.245*side,-.403,.305),(.066,.021,.071),iris)
 sphere('pupil',(.245*side,-.425,.303),(.027,.012,.058),dark)
 sphere('upper eyelid',(.245*side,-.393,.397),(.177,.026,.021),dark)
 sphere('eyebrow',(.245*side,-.345,.49),(.153,.016,.015),shadow)
 sphere('ear',(.605*side,.015,.16),(.078,.070,.15),skin)
sphere('small nose',(0,-.407,.055),(.052,.052,.061),skin)
sphere('mouth',(0,-.365,-.22),(.096,.012,.013),blush)
sphere('ponytail tie',(.38,.25,1.01),(.13,.12,.13),ribbon)
for side in (-1,1):sphere('bow loop',(.38+side*.16,.29,1.04),(.19,.045,.13),ribbon)
world=bpy.context.scene.world;world.color=(.8,.8,.8)
def light(loc,power,size):
 bpy.ops.object.light_add(type='AREA',location=loc)
 o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size
 o.rotation_euler=(Vector((0,0,.15))-o.location).to_track_quat('-Z','Y').to_euler()
light((3,-4,5),650,5);light((-3,1,3),450,4)
sc=bpy.context.scene
# CPU Cycles avoids headless Eevee/OpenGL and version-dependent engine identifiers.
sc.render.engine='CYCLES'
sc.cycles.device='CPU'
sc.cycles.samples=8
sc.render.film_transparent=False
sc.render.resolution_x=512;sc.render.resolution_y=512;sc.render.resolution_percentage=100
sc.render.image_settings.file_format='PNG'
def render(name,loc):
 bpy.ops.object.camera_add(location=loc);cam=bpy.context.object
 cam.rotation_euler=(Vector((0,0,.1))-cam.location).to_track_quat('-Z','Y').to_euler()
 cam.data.type='ORTHO';cam.data.ortho_scale=2.9;sc.camera=cam
 sc.render.filepath=os.path.join(out,name);bpy.ops.render.render(write_still=True)
 bpy.data.objects.remove(cam,do_unlink=True)
render('front.png',(0,-5,.3))
render('right_side.png',(5,0,.3))
render('left_side.png',(-5,0,.3))
render('three_quarter.png',(3,-4,.4))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'assassin_head.blend'))
for required in ('front.png','right_side.png','left_side.png','three_quarter.png'):
 assert os.path.getsize(os.path.join(out,required)) > 1000, 'Missing or empty render: '+required
with open(os.path.join(out,'geometry_report.txt'),'w') as f:
 f.write('skin_vertices=%d\nhair_vertices=%d\nskin_quads=%d\nhair_quads=%d\n' % (len(face.data.vertices),len(hair.data.vertices),len(face.data.polygons),len(hair.data.polygons)))
assert len(face.data.vertices)==15360 and len(hair.data.vertices)==10000
assert len(face.data.polygons)==15264 and len(hair.data.polygons)==4900
print('COUNTS',len(face.data.vertices),len(hair.data.vertices))
