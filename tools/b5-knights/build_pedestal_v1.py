#!/usr/bin/env python3
"""Independent architectural Gothic knight pedestal candidate. NOT_APPROVED."""
import bpy, math, os, random, json, hashlib, struct
from pathlib import Path
from mathutils import Vector
OUT=Path(os.getenv("PEDESTAL_OUTPUT","render-output/b5-knights/pedestal_v1")).resolve()
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
random.seed(2402)
objects=[]
def material(name,color,rough=.92):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 node=m.node_tree.nodes.get("Principled BSDF")
 node.inputs["Base Color"].default_value=(*color,1)
 node.inputs["Roughness"].default_value=rough
 return m
stone=material("dark weathered granite slate",(.31,.325,.37))
edge=material("worn corner stone",(.39,.4,.43))
shade=material("quatrefoil recess",(.105,.11,.14))
joint=material("stone joint cavities",(.145,.155,.18))
def add(o,n,m):
 o.name=n;o.data.materials.append(m);objects.append(o);return o
def block(n,center,dims,mat=stone,bevel=.003):
 bpy.ops.mesh.primitive_cube_add(size=1,location=center)
 o=bpy.context.object;o.dimensions=dims
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 add(o,n,mat)
 if bevel:
  md=o.modifiers.new("tiny architectural arris","BEVEL")
  md.width=bevel;md.segments=1
  o.modifiers.new("stable weighted normal","WEIGHTED_NORMAL")
 return o
# Three-layer real masonry design, clear horizontal flat bands, restrained bevels.
block("01 foundation lower square course",(0,0,.068),(1.92,1.64,.136),stone,.0025)
block("02 foundation thin shadow line",(0,0,.145),(1.79,1.50,.026),shade,.001)
block("03 lower molded setback",(0,0,.186),(1.83,1.54,.068),edge,.004)
block("04 tall tomb shaft",(0,0,.302),(1.66,1.36,.165),stone,.004)
block("05 upper dark reveal",(0,0,.396),(1.67,1.37,.028),joint,.001)
block("06 upper projecting cap stone",(0,0,.448),(1.92,1.64,.083),stone,.003)
block("07 polished top bed",(0,0,.495),(1.78,1.5,.018),edge,.002)
# Quatrefoil depressions: dark backing inside shallow pilaster frames, not stickers.
def curve(n,points,r,mat,closed=False):
 cv=bpy.data.curves.new(n,"CURVE");cv.dimensions="3D";cv.resolution_u=12
 cv.bevel_depth=r;cv.bevel_resolution=3
 sp=cv.splines.new("POLY");sp.points.add(len(points)-1)
 for i,p in enumerate(points):sp.points[i].co=(*p,1)
 sp.use_cyclic_u=closed
 ob=bpy.data.objects.new(n,cv);bpy.context.collection.objects.link(ob)
 return add(ob,n,mat)
def quatrefoil_pts(cx,cz,plane,side):
 pts=[]
 # Polar "four leaf" Gothic shape, with narrow intermediate cusps.
 for i in range(64):
  t=2*math.pi*i/64
  rr=.078*(1+.18*math.cos(4*t))
  u=cx+rr*math.cos(t);v=cz+rr*math.sin(t)
  if plane=="front": pts.append((u,side*.687,v))
  else: pts.append((side*.837,u,v))
 return pts
for which,sgn in (("front",-1),("back",1)):
 for k,cx in enumerate((-.48,0,.48)):
  z=.302
  block(f"{which} inset relief backing {k}",(cx,sgn*.687,z),(.31,.010,.126),shade,.002)
  curve(f"{which} quatrefoil carved rim {k}",quatrefoil_pts(cx,z,"front",sgn),.012,edge,True)
  # little paired lancet gables; gothic rhythm not perfect flat tile.
  curve(f"{which} arch crown {k}",[(cx-.112,sgn*.697,.341),(cx,sgn*.697,.398),(cx+.112,sgn*.697,.341)],.010,edge)
for which,sgn in (("left",-1),("right",1)):
 for k,cy in enumerate((-.31,.31)):
  block(f"{which} small inset {k}",(sgn*.834,cy,.303),(.012,.27,.112),shade,.001)
  curve(f"{which} quatrefoil rim {k}",quatrefoil_pts(cy,.303,"side",sgn),.010,edge,True)
# Vertical ashlar joints; fine, controlled recesses in face plane.
for sg in (-1,1):
 for x in (-.79,-.235,.235,.79):
  curve(f"front back construction joint {sg} {x}",[(x,sg*.824,.020),(x,sg*.824,.129)],.005,joint)
# Real missing stone on two corners using Boolean wedge cutters.
def cut_corner(obj,loc,rot,scale):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
 cutter=bpy.context.object;cutter.dimensions=scale
 cutter.rotation_euler=rot;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 md=obj.modifiers.new("structural corner loss","BOOLEAN");md.operation='DIFFERENCE';md.object=cutter
 bpy.context.view_layer.objects.active=obj
 try:bpy.ops.object.modifier_apply(modifier=md.name)
 except Exception as exc:print("CUT_FAILED",str(exc))
 bpy.data.objects.remove(cutter,do_unlink=True)
# No random pebble confetti or blanket bevels.
cut_corner(next(o for o in objects if o.name=="06 upper projecting cap stone"),(.95,-.82,.472),(.12,.22,.34),(.32,.25,.16))
cut_corner(next(o for o in objects if o.name=="01 foundation lower square course"),(-.96,.82,.13),(.2,-.3,.32),(.22,.3,.16))
# Short asymmetric fissures along structural joints.
curve("upper cap displaced joint line",[(-.67,-.824,.425),(-.61,-.825,.432),(-.56,-.826,.418)],.004,joint)
# Save and export ONLY asset. Preview stage deliberately separate.
bpy.ops.object.select_all(action="DESELECT")
for o in objects:o.select_set(True)
bpy.context.view_layer.objects.active=next(o for o in objects if o.type=="MESH")
bpy.ops.export_scene.gltf(filepath=str(OUT/"pedestal_v1.glb"),export_format="GLB",use_selection=True,export_materials="EXPORT")
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/"pedestal_v1.blend"))
# Preview stage, cameras and lights excluded from exported GLB and saved BLEND
for o in objects:o.select_set(False)
floor=material("render ground only",(.09,.09,.13))
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,-.10))
base=bpy.context.object;base.dimensions=(5.6,5.6,.20)
base.data.materials.append(floor)
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
world=bpy.context.scene.world or bpy.data.worlds.new("review")
bpy.context.scene.world=world;world.use_nodes=True
world.node_tree.nodes["Background"].inputs["Color"].default_value=(.16,.16,.23,1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value=.55
for name,pos,power,size in [("large softbox",(-3,-4,5),520,3),("violet cool fill",(4,-2,3),350,3),("rim",(-1,3,5),450,2)]:
 data=bpy.data.lights.new(name,"AREA");data.energy=power;data.shape="DISK";data.size=size
 light=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(light)
 light.location=pos;light.rotation_euler=(Vector((0,0,.25))-light.location).to_track_quat("-Z","Y").to_euler()
bpy.ops.object.camera_add(location=(3,-4,2.4))
cam=bpy.context.object;cam.data.type="ORTHO";cam.data.ortho_scale=3.3
scene=bpy.context.scene;scene.camera=cam
scene.render.engine="CYCLES";scene.cycles.samples=36;scene.cycles.use_denoising=False
for l in scene.view_layers:
 if hasattr(l,"cycles"):l.cycles.use_denoising=False
scene.render.resolution_x=800;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.view_settings.view_transform="Standard"
for name,pt in (("front",(0,-4,2.4)),("side",(4,0,2.4)),("angle",(3,-4,2.6))):
 cam.location=pt;cam.rotation_euler=(Vector((0,0,.27))-cam.location).to_track_quat("-Z","Y").to_euler()
 scene.render.filepath=str(OUT/(name+".png"))
 bpy.ops.render.render(write_still=True)
sha={}
for p in list(OUT.glob("*.png"))+[OUT/"pedestal_v1.glb",OUT/"pedestal_v1.blend"]:
 sha[p.name]=hashlib.sha256(p.read_bytes()).hexdigest()
meshes=[o for o in objects if o.type=="MESH"]
manifest={"approval":"NOT_APPROVED","stage":"B5","part":"architectural_pedestal_v1",
"source_sha":os.getenv("GITHUB_SHA"),"run_id":os.getenv("GITHUB_RUN_ID"),
"mesh_count":len(meshes),"all_source_preserved":True,"game_integrated":False,
"render_views":["front","side","angle"],"files_sha256":sha,
"known_limitations":"A separate pedestal design. Photo PBR not applied yet. Artistic approval pending."}
(OUT/"manifest.json").write_text(json.dumps(manifest,indent=2),encoding="utf8")
print("PEDESTAL_RENDER_COMPLETE",json.dumps({"meshes":len(meshes),"files":list(sha)}))
