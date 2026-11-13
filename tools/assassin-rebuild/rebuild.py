import bpy,math,os,sys
from mathutils import Vector
out=os.path.abspath(sys.argv[sys.argv.index('--out')+1]);os.makedirs(out,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(name,rgb):
 m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,1);return m
skin=mat('skin',(.85,.75,.75));hair=mat('silver-lavender',(.67,.64,.75));dark=mat('ribbon',(.19,.16,.27))
def mesh(name,v,f,m):
 d=bpy.data.meshes.new(name);d.from_pydata(v,[],f);d.update();o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);d.materials.append(m)
 for p in d.polygons:p.use_smooth=True
def sphere(name,loc,scale,m):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(m);bpy.ops.object.shade_smooth()
def g(x,c,w):return math.exp(-.5*((x-c)/w)**2)
# Brand-new anime face: 144 x 112 quad lattice, with rounded chin and cheeks.
v=[];f=[];R=144;S=112
for i in range(R):
 z=-.57+1.62*i/(R-1);t=(z+.57)/1.62
 w=.13+.47*max(0,math.sin(math.pi*(.08+.85*t)))**.53+.045*g(z,.18,.19)-.028*g(z,-.34,.17)
 for j in range(S):
  a=2*math.pi*j/S;x=w*math.sin(a);co=math.cos(a);front=max(0,-co)**6
  y=-.01+(.29+.025*g(z,.40,.25))*co
  y-=front*(.033*g(abs(x),.34,.13)*g(z,.16,.16)+.033*g(z,-.42,.08)*g(x,0,.18))
  y-=front*(.042*g(x,0,.075)*g(z,.08,.18)+.039*g(x,0,.065)*g(z,-.035,.052))
  y+=front*.020*g(abs(x),.23,.12)*g(z,.31,.07)
  v.append((x,y,z))
for i in range(R-1):
 for j in range(S):
  a=i*S+j;b=i*S+(j+1)%S;f.append((a,b,b+S,a+S))
mesh('NEW_FACE_16128_VERTICES_16016_QUADS',v,f,skin)
for side in (-1,1):
 sphere('eye',(.245*side,-.302,.305),(.145,.018,.069),skin)
 sphere('iris',(.245*side,-.323,.305),(.062,.014,.067),dark)
 sphere('eyelid',(.245*side,-.313,.377),(.151,.014,.015),dark)
 sphere('ear',(.58*side,.015,.12),(.067,.065,.12),skin)
sphere('nose',(0,-.348,-.02),(.035,.026,.029),skin)
sphere('mouth',(0,-.300,-.235),(.078,.007,.008),dark)
# New swept quad-ribbon hairstyle, asymmetrical fringe and high ponytail.
hv=[];hf=[];STRANDS=132;STEPS=62
for k in range(STRANDS):
 if k<54:
  u=k/53;rx=-.54+1.08*u;rz=.99-.12*abs(u-.47);ry=-.09-.10*math.cos((u-.5)*math.pi)
  ex=rx+(.18 if u<.65 else -.12);ez=.29+.13*math.sin(k*.41);ey=-.30;w=.035+.024*math.sin(math.pi*u)
 elif k<96:
  u=(k-54)/41;side=-1 if k%2 else 1;rx=side*(.34+.20*u);rz=.85-.13*u;ry=-.01+.10*u
  ex=side*(.53+.06*u);ez=-.53-.32*u;ey=.08+.12*u;w=.05
 else:
  u=(k-96)/35;rx=.29+.23*(u-.5);rz=1.04+.045*math.sin(u*math.pi);ry=.21
  ex=.62+.15*math.sin(math.pi*u);ez=-.65-.46*u;ey=.46+.12*u;w=.06
 base=len(hv)
 for j in range(STEPS):
  t=j/(STEPS-1);ease=t*t*(3-2*t);x=rx+(ex-rx)*ease+.055*math.sin(math.pi*t)*math.sin(k*.35)
  y=ry+(ey-ry)*ease-.065*math.sin(math.pi*t);z=rz+(ez-rz)*t+.045*math.sin(math.pi*t)
  width=w*(.025+(1-t)**.6);twist=.25*math.sin(t*math.pi*1.5+k*.12)
  hv.extend([(x-width*math.cos(twist),y-width*math.sin(twist),z),(x+width*math.cos(twist),y+width*math.sin(twist),z)])
  if j:
   a=base+2*(j-1);hf.append((a,a+1,a+3,a+2))
mesh('NEW_HAIR_16368_VERTICES_8052_QUADS',hv,hf,hair)
sphere('scalp',(0,.05,.72),(.59,.275,.36),hair)
sphere('ponytail tie',(.39,.24,1),(.105,.10,.105),dark)
for side in (-1,1):sphere('bow loop',(.39+side*.15,.28,1.04),(.16,.042,.11),dark)
sc=bpy.context.scene
clay=mat('uniform_solid_clay',(.70,.73,.78));sc.view_layers[0].material_override=clay
engines={e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items}
sc.render.engine='BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in engines else 'BLENDER_EEVEE'
sc.render.resolution_x=600;sc.render.resolution_y=600;sc.render.resolution_percentage=100
sc.render.image_settings.file_format='PNG';sc.world.color=(.7,.7,.7)
for loc,power in [((3,-4,5),650),((-3,1,3),500)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.size=5;o.rotation_euler=(Vector((0,0,.2))-o.location).to_track_quat('-Z','Y').to_euler()
for name,loc in [('front',(0,-5,.3)),('right_side',(5,0,.3)),('left_side',(-5,0,.3)),('three_quarter',(3,-4,.5))]:
 bpy.ops.object.camera_add(location=loc);cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,.22))-cam.location).to_track_quat('-Z','Y').to_euler()
 cam.data.type='ORTHO';cam.data.ortho_scale=2.55;sc.camera=cam
 sc.render.filepath=os.path.join(out,name+'.png');bpy.ops.render.render(write_still=True);bpy.data.objects.remove(cam,do_unlink=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'assassin_rebuild.blend'))
with open(os.path.join(out,'geometry_report.txt'),'w') as report:report.write(f'head_vertices={len(v)}\nhead_quads={len(f)}\nhair_vertices={len(hv)}\nhair_quads={len(hf)}\nengine={sc.render.engine}\n')
assert (len(v),len(f),len(hv),len(hf))==(16128,16016,16368,8052)
