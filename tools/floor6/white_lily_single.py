"""Single white lily study: six sculpted petals x 25 control coordinates = 150.
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
# 150 explicit parametric control coordinates: 6 petals, each 5 longitudinal x 5 transverse.
all_points=[]
for k in range(6):
 angle=math.tau*k/6+.08 + (.055 if k%2 else -.045)
 u=Vector((math.cos(angle),math.sin(angle),0))
 v=Vector((-math.sin(angle),math.cos(angle),0))
 verts=[]
 for i in range(5):
  t=i/4
  for j in range(5):
   q=(j-2)/2
   spread=(.006 + (.125 if k%2==0 else .102) * (math.sin(math.pi*t)**.85)) * (1-.12*t)
   # Lily tepals open horizontally, then curl backwards at tips.
   distance=.045 + (.48 + .045*math.sin(k*2.4))*t + .19*t*t
   height=.54 + (.23 if k%2==0 else .19)*math.sin(math.pi*t) - (.31 + .055*math.sin(k*1.7))*t*t + .027*q*q*math.sin(math.pi*t) + .014*q*math.sin(math.pi*t)
   p=u*distance+v*(q*spread)+Vector((0,0,height))
   verts.append(tuple(p));all_points.append(tuple(p))
 faces=[]
 for i in range(4):
  for j in range(4):
   a=i*5+j;faces.append((a,a+1,a+6,a+5))
 me=bpy.data.meshes.new("lily petal mesh");me.from_pydata(verts,[],faces);me.update()
 ob=bpy.data.objects.new("lily petal %d"%(k+1),me);bpy.context.collection.objects.link(ob)
 me.materials.append(ivory)
 # Add solidify for actual petal thickness, smooth shading.
 mod=ob.modifiers.new("subtle petal thickness","SOLIDIFY");mod.thickness=.0015
 for poly in me.polygons:poly.use_smooth=True
assert len(all_points)==150
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
with open(os.path.join(out,"control_points_150.csv"),'w') as f:
 f.write("petal,point,x,y,z\n")
 for n,p in enumerate(all_points):
  f.write("%d,%d,%.6f,%.6f,%.6f\n"%(n//25+1,n%25+1,*p))
print("LILY_CONTROL_POINTS: 150",flush=True)
print("WHITE_LILY_DONE",flush=True)
