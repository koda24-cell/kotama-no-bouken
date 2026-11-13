"""Single white lily study: six sculpted petals with 1000 surface and silhouette coordinates.
Blender 4/5 compatible. Does NOT replace approved game assets.
"""
import bpy, math, os
from mathutils import Vector
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
out=os.path.abspath("render-output/floor6/white-lily-study")
os.makedirs(out,exist_ok=True)
def material(name,rgba,rough=.7):
 m=bpy.data.materials.new(name);m.diffuse_color=(*rgba,1);m.use_nodes=True
 bs=m.node_tree.nodes.get("Principled BSDF")
 bs.inputs["Base Color"].default_value=(*rgba,1)
 bs.inputs["Roughness"].default_value=rough
 return m
ivory=material("petal porcelain ivory",(.93,.95,.91),.72)
green=material("stem deep green",(.12,.23,.12))
pale=material("pistil pale green",(.65,.78,.51))
brown=material("anther rust brown",(.44,.15,.09))
def tube(name,points,radius,mat,segments=6):
 curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.bevel_depth=radius;curve.bevel_resolution=2
 spl=curve.splines.new('POLY');spl.points.add(len(points)-1)
 for p,xyz in zip(spl.points,points):p.co=(*xyz,1)
 ob=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(ob);ob.data.materials.append(mat)
 return ob
tube("curved stalk",[(0,0,0),(.01,0,.15),(.03,0,.32),(0,0,.50)],.013,green)

# V5: preserve the approved flower head unchanged; add three slender lanceolate leaves.
# Each leaf starts inside the existing stalk and bends naturally outwards.
leaf_green=material("lily leaf satin green",(.115,.295,.105),.56)
leaf_vein=material("lily leaf midrib green",(.17,.37,.13),.67)
def make_leaf(index,angle,base_z,length,spread,twist):
 u=Vector((math.cos(angle),math.sin(angle),0))
 v=Vector((-math.sin(angle),math.cos(angle),0))
 verts=[]
 rows,cols=18,7
 for i in range(rows):
  t=i/(rows-1)
  reach=spread*(t**.87)
  z=base_z+length*(.30*t-.28*t*t)+.025*math.sin(math.pi*t)
  halfwidth=.065*(math.sin(math.pi*t)**.9)*(1-.2*t)
  for j in range(cols):
   q=(j-(cols-1)/2)/((cols-1)/2)
   pos=u*reach+v*(q*halfwidth+twist*t*t*q*.025)+Vector((0,0,z+.018*(1-q*q)*math.sin(math.pi*t)))
   verts.append(tuple(pos))
 faces=[]
 for i in range(rows-1):
  for j in range(cols-1):
   a=i*cols+j
   faces.append((a,a+1,a+cols+1,a+cols))
 mesh=bpy.data.meshes.new("lily lanceolate leaf mesh")
 mesh.from_pydata(verts,[],faces);mesh.update()
 obj=bpy.data.objects.new("lily leaf %d"%index,mesh)
 bpy.context.collection.objects.link(obj);mesh.materials.append(leaf_green)
 for poly in mesh.polygons:poly.use_smooth=True
 solid=obj.modifiers.new("thin leaf lamina","SOLIDIFY");solid.thickness=.0016
 mid=[]
 for i in range(rows):
  mid.append(verts[i*cols+cols//2])
 tube("leaf midrib %d"%index,mid,.0018,leaf_vein)
# Three leaves, staggered along the stem rather than a symmetrical rosette.
make_leaf(1,.20,.16,.29,.31,.12)
make_leaf(2,2.55,.245,.25,.26,-.11)
make_leaf(3,4.65,.095,.23,.24,.08)
print("LILY_LEAF_COUNT: 3",flush=True)

# 1000 sculpting coordinates: six 10x16 surface lattices (960) + 40 independent silhouette guides.
# Full six-tepal trumpet: wide shoulders, narrow throat, gently ribbed cup, recurved tips.
all_points=[]
for k in range(6):
 angle=math.tau*k/6 + (.035 if k%2 else -.045)
 u=Vector((math.cos(angle),math.sin(angle),0))
 v=Vector((-math.sin(angle),math.cos(angle),0))
 verts=[]
 for i in range(16):
  t=i/15
  for j in range(10):
   q=(j-4.5)/4.5
   # Narrow base; generous shoulder at 55-75% length; tip converges to a curled point.
   width=(.010 + (.235 + .028*math.sin(1.7*k)) * (math.sin(math.pi*t)**.82)) * (1-.09*t)
   distance=.035 + (.29+.027*math.sin(k*1.3))*t + .34*t*t
   # Upward trumpet cup transitioning to a sharply recurved, lowered tip.
   curl_t=max(0.0,min(1.0,(t-.20)/.80))
   curl=curl_t*curl_t*curl_t*(10-15*curl_t+6*curl_t*curl_t)
   height=.535 + .31*t - .12*t*t - .29*curl
   height+= .085*q*q*math.sin(math.pi*t) + .012*q*math.sin(math.pi*t*2+k)
   # Longitudinal veins: slight surface relief without hard corrugation.
   height+=.0055*math.cos(q*math.pi*4)*math.sin(math.pi*t)**2
   p=u*distance+v*(q*width)+Vector((0,0,height))
   verts.append(tuple(p));all_points.append(tuple(p))
 faces=[]
 for i in range(15):
  for j in range(9):
   a=i*10+j;faces.append((a,a+1,a+11,a+10))
 me=bpy.data.meshes.new("lily petal mesh");me.from_pydata(verts,[],faces);me.update()
 ob=bpy.data.objects.new("lily petal %d"%(k+1),me);bpy.context.collection.objects.link(ob)
 me.materials.append(ivory)
 mod=ob.modifiers.new("thin tepal edge","SOLIDIFY");mod.thickness=.0014
 for poly in me.polygons:poly.use_smooth=True
# Extra outline samples define a smooth visual contour independent of the surface grid.
for k in range(6):
 angle=math.tau*k/6 + (.035 if k%2 else -.045)
 u=Vector((math.cos(angle),math.sin(angle),0));v=Vector((-math.sin(angle),math.cos(angle),0))
 count=7 if k<4 else 6
 for h in range(count):
  t=(h+1)/(count+1)
  width=(.010 + (.235+.028*math.sin(1.7*k))*math.sin(math.pi*t)**.82)*(1-.09*t)
  distance=.035+(.29+.027*math.sin(k*1.3))*t+.34*t*t
  curl_t=max(0.0,min(1.0,(t-.20)/.80))
  curl=curl_t*curl_t*curl_t*(10-15*curl_t+6*curl_t*curl_t)
  height=.535+.31*t-.12*t*t-.29*curl+.085*math.sin(math.pi*t)
  q=1 if h%2 else -1
  all_points.append(tuple(u*distance+v*(q*width)+Vector((0,0,height))))
assert len(all_points)==1000
for i in range(6):
 a=math.tau*i/6+.2
 r=.075
 x,y=math.cos(a)*r,math.sin(a)*r
 tube("filament %d"%i,[(0,0,.54),(x*.7,y*.7,.66),(x,y,.78)],.0035,pale)
 bpy.ops.mesh.primitive_uv_sphere_add(segments=10,ring_count=6,radius=1,location=(x,y,.79))
 ob=bpy.context.object;ob.name="rust anther %d"%i;ob.scale=(.012,.023,.009);ob.rotation_euler[2]=a;ob.data.materials.append(brown)
tube("central pistil",[(0,0,.54),(0,0,.70),(0,0,.84)],.005,pale)
bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=.015,location=(0,0,.845))
bpy.context.object.data.materials.append(pale)
# Export actual mesh, then render studio views.
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=os.path.join(out,"white_lily_single.glb"),export_format='GLB')
world=bpy.context.scene.world
world.color=(.13,.16,.2)
def light(name,loc,power,size):
 bpy.ops.object.light_add(type='AREA',location=loc)
 ob=bpy.context.object;ob.name=name;ob.data.energy=power;ob.data.shape='DISK';ob.data.size=size
 direction=Vector((0,0,.46))-ob.location;ob.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
light("large softbox",(2,-3,4),500,3)
light("rim softbox",(-2,2,3),350,2)
bpy.ops.object.camera_add()
cam=bpy.context.object;bpy.context.scene.camera=cam
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=32
scene.render.resolution_x=960;scene.render.resolution_y=960;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
for name,loc in [('angle',(1.5,-2.1,1.5)),('front',(0,-2.6,.95)),('side',(2.6,0,1.0)),('top',(0,-.01,3.0))]:
 cam.location=loc
 cam.rotation_euler=(Vector((0,0,.49))-cam.location).to_track_quat('-Z','Y').to_euler()
 cam.data.type='ORTHO';cam.data.ortho_scale=1.8
 scene.render.filepath=os.path.join(out,"white_lily_"+name+".png")
 bpy.ops.render.render(write_still=True)
with open(os.path.join(out,"control_points_1000.csv"),'w') as f:
 f.write("petal,point,x,y,z\n")
 for n,p in enumerate(all_points):
  f.write("%d,%d,%.6f,%.6f,%.6f\n"%((n//160+1 if n<960 else (n-960)//7+1),(n%160+1 if n<960 else n-959),*p))
print("LILY_CONTROL_POINTS: 1000",flush=True)
print("WHITE_LILY_DONE",flush=True)
