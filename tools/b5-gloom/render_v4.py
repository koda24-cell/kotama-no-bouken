"""Standalone additive B5 corruption-rock prototype. No game runtime changes."""
import bpy, math, random, os, sys
from mathutils import Vector
random.seed(51)
out=os.path.abspath("render-output/b5-gloom")
os.makedirs(out,exist_ok=True)
bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
def mat(name,color,metal=0,rough=.8,emit=None,power=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get("Principled BSDF")
 p.inputs["Base Color"].default_value=(*color,1)
 p.inputs["Metallic"].default_value=metal;p.inputs["Roughness"].default_value=rough
 if emit:
  p.inputs["Emission Color"].default_value=(*emit,1)
  p.inputs["Emission Strength"].default_value=power
 return m
black=mat("B5 obsidian corruption",(.027,.022,.041),.22,.79)
purple=mat("B5 violet mineral",(.12,.037,.17),.24,.65)
glow=mat("B5 dim magenta cracks",(.55,.025,.19),.1,.45,(1,.025,.27),6.0)
stone=mat("B5 weathered masonry",(.12,.105,.14),0,.94)
def ico(name,loc,scale,material,sub=1):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub,radius=1,location=loc)
 o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(material);return o
def link(name,pts,radius,material):
 curve=bpy.data.curves.new(name,"CURVE");curve.dimensions="3D";curve.resolution_u=16
 curve.bevel_depth=radius;curve.bevel_resolution=3
 sp=curve.splines.new("POLY");sp.points.add(len(pts)-1)
 for p,v in zip(sp.points,pts):p.co=(*v,1)
 obj=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(obj);obj.data.materials.append(material)
 return obj
# Stone base: chipped blocks visible under the added invasion.
for i in range(8):
 a=i*math.tau/8
 ico("original-style masonry %02d"%i,(math.cos(a)*.87,math.sin(a)*.75,.18),(.49,.42,.27),stone,1)
# Root masses and crusty uneven silhouettes, asymmetrical to avoid perfect rosettes.
for i in range(8):
 a=i*2.399+random.uniform(-.3,.3)
 rad=random.uniform(.12,1.0)
 z=random.uniform(.13,.27)
 ico("black growth %02d"%i,(math.cos(a)*rad,math.sin(a)*rad,z),
     (random.uniform(.29,.53),random.uniform(.25,.48),random.uniform(.09,.19)),
     black if i%4 else purple,2)
# V2: low, broad irregular crust sheets; edges feather into the existing masonry.
# Each polygon has an uneven outer boundary, avoiding a circular ore pile.
def crust_sheet(index,theta,reach):
 n=11; verts=[]; faces=[]
 cx=.18*math.cos(theta);cy=.18*math.sin(theta)
 for ring in (0,1):
  for j in range(n):
   a=theta+(j/(n-1)-.5)*1.22
   rr=(.22 if ring==0 else reach)*(1+.12*math.sin(j*2.7+index))
   z=.25 if ring==0 else .10+.025*math.sin(j*3.1+index)
   verts.append((cx+rr*math.cos(a),cy+rr*math.sin(a),z))
 for j in range(n-1):faces.append((j,j+1,n+j+1,n+j))
 mesh=bpy.data.meshes.new("corruption crust mesh")
 mesh.from_pydata(verts,[],faces);mesh.update()
 obj=bpy.data.objects.new("creeping crust sheet %02d"%index,mesh)
 bpy.context.collection.objects.link(obj);mesh.materials.append(black if index%3 else purple)
for i in range(13):
 crust_sheet(i,i*2.399,random.uniform(.78,1.33))
# Tiny discontinuous fissures on top of low crust, rather than tall glowing wires.
for i in range(17):
 a=i*2.399+.31
 r0=random.uniform(.32,.76)
 pts=[]
 for j in range(5):
  t=j/4
  rr=r0+t*.25
  aa=a+.04*math.sin(j*2.2+i)
  pts.append((math.cos(aa)*rr,math.sin(aa)*rr,.267-.10*t))
 link("surface hairline fissure %02d"%i,pts,.007,glow)
# V3: high-density, non-radial sculpted mantle. 13 x 11 fan sheets are
# replaced by a continuous 96 x 28 polar mesh with multiscale relief.
# The mantle is additive: original masonry and earlier crust remain intact.
from mathutils.noise import multi_fractal, noise_vector
def sculpted_mantle():
 sectors=112; rings=30; vertices=[]; faces=[]
 for j in range(rings+1):
  t=j/rings
  for i in range(sectors):
   a=math.tau*i/sectors
   wave=.10*math.sin(5*a+1.4)+.07*math.sin(11*a-.6)+.035*math.sin(23*a)
   radius=t*(1.12+wave)
   x=radius*math.cos(a); y=radius*math.sin(a)
   broad=.065*math.sin(8*x+4*y)*math.cos(7*y-3*x)
   fine=.020*math.sin(29*x+12*y)*math.sin(31*y-5*x)
   grit=.008*math.sin(79*x-27*y)*math.cos(65*y+18*x)
   z=.075+.31*(1-t*t)**2+broad*(1-t)+fine*(.3+.7*t)+grit
   vertices.append((x,y,z))
 for j in range(rings):
  for i in range(sectors):
   k=j*sectors+i;n=j*sectors+(i+1)%sectors
   faces.append((k,n,n+sectors,k+sectors))
 mesh=bpy.data.meshes.new("V3 high density corrupted surface")
 mesh.from_pydata(vertices,[],faces);mesh.update()
 obj=bpy.data.objects.new("V3 organic mantle 3400 quads",mesh)
 bpy.context.collection.objects.link(obj);mesh.materials.append(black)
 # Procedural 3D micro-bump with Noise and Voronoi, independent of UVs.
 p=black.node_tree.nodes.get("Principled BSDF")
 nt=black.node_tree
 tex=nt.nodes.new("ShaderNodeTexNoise");tex.inputs["Scale"].default_value=46
 tex.inputs["Detail"].default_value=5;tex.inputs["Roughness"].default_value=.72
 bump=nt.nodes.new("ShaderNodeBump");bump.inputs["Strength"].default_value=.27
 bump.inputs["Distance"].default_value=.045
 nt.links.new(tex.outputs["Fac"],bump.inputs["Height"])
 nt.links.new(bump.outputs["Normal"],p.inputs["Normal"])
 return obj
sculpted_mantle()
# Jagged broken stone flakes add small-scale silhouettes, not tall cones.
for i in range(45):
 a=i*2.399
 r=random.uniform(.27,1.12)
 x=r*math.cos(a);y=r*math.sin(a)
 ico("surface fragment %02d"%i,(x,y,.12+.20*(1-r/1.2)),
     (random.uniform(.055,.15),random.uniform(.045,.12),random.uniform(.025,.075)),
     black if i%5 else purple,2)
# Mineral teeth growing upward with irregular heights.
for i in range(3):
 a=i*2.399
 r=random.uniform(.22,.93)
 x,y=math.cos(a)*r,math.sin(a)*r
 height=random.uniform(.20,.52)
 bpy.ops.mesh.primitive_cone_add(vertices=5,radius1=random.uniform(.12,.23),radius2=.008,depth=height,location=(x,y,.18+height/2))
 o=bpy.context.object;o.name="jagged mineral tooth %02d"%i
 o.rotation_euler=(random.uniform(-.24,.24),random.uniform(-.22,.22),a)
 o.data.materials.append(black if i%3 else purple)
# Glowing fissures run along top of the black crust; not neon tubes in empty space.
for i in range(3):
 a=i*math.tau/3+.22
 r=random.uniform(.12,.35)
 pts=[]
 for j in range(6):
  t=j/5
  rr=r+t*random.uniform(.35,.47)
  aa=a+math.sin(t*8+i)*.10
  pts.append((math.cos(aa)*rr,math.sin(aa)*rr,.30-.09*t+.012*math.sin(t*14+i)))
 link("embedded fissure %02d"%i,pts,.012,glow)
# Thin hooked roots crawling outward.
for i in range(8):
 a=i*math.tau/8
 pts=[]
 for j in range(9):
  t=j/8
  r=.52+t*.83
  pts.append((math.cos(a+.11*math.sin(t*5+i))*r,math.sin(a+.11*math.sin(t*5+i))*r,.19+.18*math.sin(math.pi*t)))
 link("creeping root %02d"%i,pts,.042,black)
# V4: import a real CC0 Poly Haven rock scan (separate from procedural corruption).
scan_file=os.path.abspath("render-output/b5-scan-source/rock_07.blend")
if not os.path.exists(scan_file):
 raise RuntimeError("CC0 rock source missing; run fetch_cc0_scan.py first")
with bpy.data.libraries.load(scan_file,link=False) as (source,destination):
 destination.objects=[name for name in source.objects if name]
scan_objects=[]
for ob in destination.objects:
 if ob and ob.type=="MESH":
  bpy.context.collection.objects.link(ob)
  scan_objects.append(ob)
if not scan_objects:raise RuntimeError("Poly Haven blend contains no mesh objects")
# Preserve original scan geometry. Transform at object level and make dark stone visible.
for ob in scan_objects:
 ob.name="CC0 Poly Haven rock 07 "+ob.name
 ob.location=(1.02,.08,.25)
 ob.scale=(.60,.60,.50)
 ob.rotation_euler[2]=.27
 print("SCAN_MESH",ob.name,len(ob.data.polygons),flush=True)
# V4 high-density variant: triple the actual triangle count of each mesh.
# Triangulate then poke each triangle into three; existing silhouettes stay intact.
# Displace only newly created centers very slightly for physical micro-relief.
import bmesh
triangles_before=0
triangles_after=0
for obj in list(bpy.context.scene.objects):
 if obj.type!="MESH":continue
 mesh=obj.data.copy()
 obj.data=mesh
 bm=bmesh.new();bm.from_mesh(mesh)
 bmesh.ops.triangulate(bm,faces=list(bm.faces))
 before=len(bm.faces)
 triangles_before+=before
 faces=list(bm.faces)
 result=bmesh.ops.poke(bm,faces=faces,offset=0)
 # Controlled center-only micro-relief on procedural mantle, not on scan rocks.
 if obj.name.startswith("V3 organic mantle"):
  for v in result["verts"]:
   v.co.z+=.003*math.sin(v.co.x*83+v.co.y*49)
 bm.to_mesh(mesh);bm.free();mesh.update()
 after=len(mesh.polygons)
 triangles_after+=after
 assert after==before*3,(obj.name,before,after)
 print("TRIANGLE_DENSITY",obj.name,before,after,flush=True)
print("TOTAL_TRIANGLES",triangles_before,triangles_after,flush=True)
assert triangles_after==triangles_before*3
# Export only geometry; preview plane/lights created later.
bpy.ops.export_scene.gltf(filepath=os.path.join(out,"b5-gloom-corruption-prototype.glb"),export_format="GLB",export_apply=True)
floor=mat("preview floor",(.11,.105,.14),0,.96)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.09));bpy.context.object.data.materials.append(floor)
world=bpy.context.scene.world
world.color=(.09,.07,.12)
def aim(obj,pt):obj.rotation_euler=(Vector(pt)-obj.location).to_track_quat("-Z","Y").to_euler()
for loc,energy,color in [((-3,-4,6),850,(.65,.65,1)),((4,3,4),600,(1,.22,.4))]:
 bpy.ops.object.light_add(type="AREA",location=loc);o=bpy.context.object;o.data.energy=energy;o.data.color=color;o.data.shape="DISK";o.data.size=5;aim(o,(0,0,.4))
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type="ORTHO";cam.data.ortho_scale=3.8;bpy.context.scene.camera=cam
scene=bpy.context.scene;scene.render.engine="CYCLES";scene.cycles.samples=24
scene.render.resolution_x=960;scene.render.resolution_y=720
scene.render.image_settings.file_format="PNG"
scene.view_settings.view_transform="AgX"
for name,pos in [("front",(0,-5,2.0)),("side",(5,0,2.0)),("top-oblique",(4,-5,5))]:
 cam.location=pos;aim(cam,(0,0,.4));scene.render.filepath=os.path.join(out,"b5-gloom-"+name+".png")
 bpy.ops.render.render(write_still=True)
 assert os.path.getsize(scene.render.filepath)>1000
 print("RENDER_OK",name,flush=True)
