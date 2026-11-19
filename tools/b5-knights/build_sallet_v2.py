#!/usr/bin/env python3
"""Independent, museum-sallet-informed B5 stone helmet candidate, not approved."""
import bpy, math, random, hashlib, json, os
from mathutils import Vector
from pathlib import Path
random.seed(51)
D=Path('render-output/b5-knights/sallet_v2').resolve();D.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
parts=[]
def mat(name,color,rough=.91):
 m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,1)
 p=m.node_tree.nodes.get("Principled BSDF")
 p.inputs["Base Color"].default_value=(*color,1)
 p.inputs["Roughness"].default_value=rough
 return m
outer=mat("aged gray limestone helm",(.205,.219,.252))
edges=mat("rubbed stone arris",(.29,.295,.32))
cut=mat("inner unlit eye slit",(.075,.081,.105))
deep=mat("interior fractured stone",(.17,.175,.20))
def add(obj,name,material):
 obj.name=name;obj.data.materials.append(material);parts.append(obj);return obj
def rings(name,sections,segments=48,material=outer,close_ends=True):
 verts=[]
 for z,rx,ry,fy in sections:
  for i in range(segments):
   a=math.pi*2*i/segments
   verts.append((rx*math.cos(a),fy+ry*math.sin(a),z))
 faces=[]
 for k in range(len(sections)-1):
  for i in range(segments):
   j=(i+1)%segments
   faces.append((k*segments+i,k*segments+j,(k+1)*segments+j,(k+1)*segments+i))
 if close_ends:
  faces.append(tuple(range(segments-1,-1,-1)))
  faces.append(tuple((len(sections)-1)*segments+i for i in range(segments)))
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update()
 ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob)
 add(ob,name,material)
 be=ob.modifiers.new("subtle chiseled edges","BEVEL");be.width=.0025;be.segments=2
 no=ob.modifiers.new("weighted face normals","WEIGHTED_NORMAL")
 return ob
def panel(name,z,front_curve,rear_curve,material=outer):
 # front_curve and rear_curve are corresponding x,y pairs; mesh upper/lower profiles
 n=len(front_curve);v=[]
 for y in (front_curve,rear_curve):
  for x,pz in y:v.append((x,z+pz[0],pz[1])) if isinstance(pz,tuple) else None
def loft(name,cross,material=outer):
 # cross: list of (z, points[(x,y)]), horizontal contour strips, non cylindrical.
 verts=[];N=len(cross[0][1])
 for z,pts in cross:
  assert len(pts)==N
  for x,y in pts:verts.append((x,y,z))
 faces=[]
 for j in range(len(cross)-1):
  for i in range(N-1):faces.append((j*N+i,j*N+i+1,(j+1)*N+i+1,(j+1)*N+i))
 me=bpy.data.meshes.new(name+"_mesh");me.from_pydata(verts,[],faces);me.update()
 o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);add(o,name,material)
 solid=o.modifiers.new("thin carved plate","SOLIDIFY");solid.thickness=.0045
 o.modifiers.new("light weighted normals","WEIGHTED_NORMAL")
 return o
def curve(name,pts,thick,material):
 c=bpy.data.curves.new(name,"CURVE");c.dimensions="3D";c.resolution_u=18
 c.bevel_depth=thick;c.bevel_resolution=2
 sp=c.splines.new("POLY");sp.points.add(len(pts)-1)
 for i,p in enumerate(pts):sp.points[i].co=(*p,1)
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o)
 return add(o,name,material)
def sphere(name,pos,radii,material):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=1,location=pos)
 o=bpy.context.object;o.scale=radii;return add(o,name,material)
# Long-swept rear is -Y, face toward +Y. More adult than boxy bucket.
skull=rings("01 forged stone sallet cranium",[
 (.078,.099,.129,-.032),(.129,.106,.143,-.014),(.210,.112,.146,-.011),
 (.263,.109,.132,.000),(.310,.091,.107,.002),(.353,.062,.071,.003),
 (.374,.015,.021,.004)],segments=64,material=outer)
# Trail behind head: sloping independent curved neck-tail shell, -Y distance.
cross=[]
for z,depth,width in [(.078,-.160,.104),(.100,-.202,.116),(.136,-.224,.118),
                      (.155,-.206,.114),(.177,-.164,.103)]:
 pts=[]
 for i in range(19):
  t=i/18
  x=(t-.5)*2*width
  y=depth+.032*(x/width)**2
  pts.append((x,y))
 cross.append((z,pts))
loft("02 elongated rear nape deflector",cross,outer)
# Twin bevel-visible nasal eye band is physically separate and leaves a dark real gap.
# Upper visor 2 plates with a slit: negative space from z .217 to .231 in front.
def visor_band(label,lower,upper,material):
 coords=[]
 for z in (lower,upper):
  pts=[]
  for i in range(29):
   t=i/28;x=(t-.5)*.216
   y=.151-.036*(x/.108)**2
   pts.append((x,y))
  coords.append((z,pts))
 return loft(label,coords,material)
visor_band("03 upper articulated visor shell",.229,.272,outer)
visor_band("04 lower pointed visor plate",.158,.209,outer)
# A rear shadow only, do not fill the ocular opening.
curve("05 ocular rim upper chiselled edge",[(-.099,.120,.233),(-.05,.139,.233),(0,.147,.234),(.05,.139,.232),(.099,.12,.232)],.002,edges)
curve("06 ocular rim lower chiselled edge",[(-.099,.120,.213),(-.05,.139,.211),(0,.147,.211),(.05,.139,.211),(.099,.12,.212)],.0018,edges)
# Separate bevor chin, pushed outward; front middle slightly lower to form a strong jaw.
for side in (-1,1):
 pts=[]
 for i in range(21):
  t=i/20;x=(t-.5)*.19
  z=.100+.020*abs(x/.095)
  pts.append((x,.156-.032*(x/.095)**2))
 # two-row lower and upper plates, less blocklike
bevor=loft("07 separate bevor chin and throat guard",[
 (.075,[(.088*math.cos(a),.046+.095*math.sin(a)) for a in [math.pi*i/24 for i in range(25)]]),
 (.100,[(.094*math.cos(a),.047+.10*math.sin(a)) for a in [math.pi*i/24 for i in range(25)]]),
 (.145,[(.100*math.cos(a),.046+.104*math.sin(a)) for a in [math.pi*i/24 for i in range(25)]])
],outer)
# Very fine Gothic ridge atop helmet, not a huge crown or toy crest.
curve("08 low central forged ridge",[(0,.09,.348),(0,.04,.369),(0,0,.374),
                                     (0,-.05,.364),(0,-.10,.346),(0,-.13,.317)],.003,edges)
for side in (-1,1):
 sphere("09 visor hinge pivot "+str(side),(side*.108,.010,.239),(.006,.005,.006),edges)
 sphere("10 bronze-like carved rivet "+str(side),(side*.100,-.13,.166),(.005,.005,.005),edges)
# A chipped cheek edge, formed as actual Boolean on the visor, local only.
def chipped(name,o,pos):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=pos)
 tool=bpy.context.object;tool.scale=(.019,.017,.014)
 bpy.context.view_layer.objects.active=o
 md=o.modifiers.new(name,"BOOLEAN");md.operation="DIFFERENCE";md.object=tool
 try:bpy.ops.object.modifier_apply(modifier=md.name)
 except Exception as e:print("LOCAL_CHIP_UNAPPLIED",str(e))
 bpy.data.objects.remove(tool,do_unlink=True)
# Note: don't apply destructive cut to the open thin visor plate yet, keep manifold by proper thickness.
# Excluded any poorly verified normal map, surface will use geometric normals only.
# Export GLB as single helmet, preview stage excluded.
bpy.ops.object.select_all(action="DESELECT")
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=next(o for o in parts if o.type=="MESH")
bpy.ops.export_scene.gltf(filepath=str(D/"sallet_v2.glb"),export_format="GLB",use_selection=True,export_materials="EXPORT")
bpy.ops.wm.save_as_mainfile(filepath=str(D/"sallet_v2.blend"))
for o in parts:o.select_set(False)
floor=mat("temporary preview tabletop",(.08,.075,.102))
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,.040))
f=bpy.context.object;f.dimensions=(2.0,2.0,.062);f.data.materials.append(floor)
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
world=bpy.context.scene.world or bpy.data.worlds.new("preview");bpy.context.scene.world=world
world.use_nodes=True;world.node_tree.nodes["Background"].inputs["Color"].default_value=(.16,.17,.22,1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value=.30
for label,loc,power in [("left soft box",(-1,-1,2),42),("front soft box",(1,2,1.5),26),("cool rim",(1,-2,2),32)]:
 l=bpy.data.lights.new(label,"AREA");l.energy=power;l.shape="DISK";l.size=2.0
 o=bpy.data.objects.new(label,l);bpy.context.collection.objects.link(o)
 o.location=loc;o.rotation_euler=(Vector((0,0,.20))-o.location).to_track_quat("-Z","Y").to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type="ORTHO";cam.data.ortho_scale=.62
scene=bpy.context.scene;scene.camera=cam;scene.render.engine="CYCLES";scene.cycles.samples=42
scene.cycles.use_denoising=False
for layer in scene.view_layers:
 if hasattr(layer,"cycles"):layer.cycles.use_denoising=False
scene.render.resolution_x=900;scene.render.resolution_y=900
scene.render.image_settings.file_format="PNG";scene.view_settings.view_transform="Standard"
scene.view_settings.exposure=-.2
for view,pos in [("front",(0,1.35,.52)),("side",(1.35,0,.49)),("angle",(1.15,1.3,.67))]:
 cam.location=pos;cam.rotation_euler=(Vector((0,0,.216))-cam.location).to_track_quat("-Z","Y").to_euler()
 scene.render.filepath=str(D/(view+".png"));bpy.ops.render.render(write_still=True)
checks={}
for p in [D/"sallet_v2.glb",D/"sallet_v2.blend"]+[D/(v+".png") for v in ("front","side","angle")]:
 checks[p.name]=hashlib.sha256(p.read_bytes()).hexdigest()
manifest={"approval":"NOT_APPROVED","model":"sallet helmet separate part","game_integrated":False,
          "view":["front","side","angle"],"component_count":len(parts),
          "source_sha":os.environ.get("GITHUB_SHA"),"run_id":os.environ.get("GITHUB_RUN_ID"),
          "files_sha256":checks,"material_note":"Procedural colored solid stone; no photo UV claimed. Gothic sallet historical reference, sculpt original."}
(D/"manifest.json").write_text(json.dumps(manifest,indent=2),encoding="utf-8")
print("SALLET_V1_RENDER_COMPLETE",len(parts),list(checks))
