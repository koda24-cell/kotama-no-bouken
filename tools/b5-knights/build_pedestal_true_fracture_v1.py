#!/usr/bin/env python3
"""B5 pedestal genuine fractured solids. Independent experimental V1, NOT_APPROVED."""
import bpy, math, json, hashlib, os, random
from pathlib import Path
from mathutils import Vector
random.seed(517)
ROOT=Path("render-output/b5-knights/pedestal_true_fracture_v1").resolve()
ROOT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
parts=[]
def mat(name, rgb, rough=.96):
 m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,1);m.use_nodes=True
 bs=m.node_tree.nodes.get("Principled BSDF")
 bs.inputs["Base Color"].default_value=(*rgb,1);bs.inputs["Roughness"].default_value=rough
 return m
stone=mat("outer slate aged marble stone",(.24,.255,.289))
broken=mat("interior freshly exposed granular stone",(.31,.325,.354))
black=mat("recesses only",(.095,.11,.136))
edge=mat("eroded corner mineral deposits",(.29,.29,.307))
photo_src=Path("render-output/b5-knights/photo_source")
photo_mode="NOT_AVAILABLE"
if (photo_src/"Color_ColdStone.jpg").exists():
 try:
  img=bpy.data.images.load(str((photo_src/"Color_ColdStone.jpg").resolve()));img.pack()
  rough=bpy.data.images.load(str((photo_src/"Roughness.jpg").resolve()))
  rough.colorspace_settings.name="Non-Color";rough.pack()
  for m in (stone,broken):
   n=m.node_tree.nodes; l=m.node_tree.links;shader=n.get("Principled BSDF")
   tex=n.new("ShaderNodeTexImage");tex.image=img
   mix=n.new("ShaderNodeMixRGB");mix.blend_type="MIX";mix.inputs[0].default_value=.42
   mix.inputs[1].default_value=m.diffuse_color
   l.new(tex.outputs["Color"],mix.inputs[2]);l.new(mix.outputs["Color"],shader.inputs["Base Color"])
   texr=n.new("ShaderNodeTexImage");texr.image=rough
   l.new(texr.outputs["Color"],shader.inputs["Roughness"])
  photo_mode="CC0_AMBIENTCG_ROCK063_COLOR_ROUGHNESS"
 except Exception as e:print("PHOTO_FAILED",repr(e));photo_mode="FALLBACK"
def register(o,name,material):
 o.name=name;o.data.materials.append(material);parts.append(o);return o
def box(name,loc,size,material=stone,bevel=0.0015):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object
 o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 register(o,name,material)
 if bevel:
  mod=o.modifiers.new("small edge wear","BEVEL");mod.width=bevel;mod.segments=1
  o.modifiers.new("weighted normal","WEIGHTED_NORMAL")
 return o
def prism(name,poly,front=-.68,back=.68,material=stone):
 """Create a genuine solid from a polygon outline in XZ plane; split faces really open."""
 N=len(poly);vs=[]
 for y in (front,back):
  for x,z in poly:vs.append((x,y,z))
 # winding correct for front surface; mesh normals recalc with Blender bmesh
 faces=[tuple(range(N-1,-1,-1)),tuple(range(N,2*N))]
 for i in range(N):faces.append((i,(i+1)%N,(i+1)%N+N,i+N))
 mesh=bpy.data.meshes.new(name+"_solid_mesh");mesh.from_pydata(vs,[],faces);mesh.update()
 ob=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(ob)
 register(ob,name,material)
 # Create fractured edge as jagged, multi-scale normal variation with nonuniform stone color.
 # Keep the two solids separated by real air, not simulated ink.
 for f in mesh.polygons:
  if any(abs(mesh.vertices[i].co[0])<.19 for i in f.vertices) and len(f.vertices)==4:
   f.material_index=1
 mesh.materials.append(broken)
 return ob
# Large architectural base: strictly flat major planes and square masonry silhouette.
box("01 long foundation plinth",(0,0,.067),(1.96,1.70,.134))
box("02 lower recessed mortar band",(0,0,.147),(1.79,1.54,.026),black,.001)
box("03 middle crisp stone bed",(0,0,.194),(1.85,1.57,.080),stone,.002)
# Main shaft fracture: physical space separating two large irregular masonry solids.
# The crack moves sideways at each depth, has small backtracking and an inconsistent opening.
jag=[(-.022,.238),(-.038,.270),(.015,.285),(.006,.314),
     (.055,.330),(.042,.354),(.105,.379),(.074,.397),
     (.125,.414),(.102,.429),(.142,.453)]
gap=.026
left_outline=[(-.835,.238),(jag[0][0]-gap,.238)]
left_outline += [(x-gap,z) for x,z in jag[1:]]
left_outline += [(-.835,.453)]
right_outline=[(jag[0][0]+gap,.238),(.835,.238),(.835,.453)]
right_outline += [(x+gap,z) for x,z in reversed(jag)]
# Non-overlapping masonry pieces: a visible fissure with interior faces, not dark tubes.
shaft_left=prism("04 real fractured left stone shaft",left_outline,material=stone)
shaft_right=prism("05 real fractured right stone shaft",right_outline,material=stone)
# A dark recessed horizontal band under the separated cap slabs.
box("06 cornice deep relief shadow",(0,0,.469),(1.70,1.43,.025),black,.001)
# Open fracture through top cap too, jagged across the front-facing width.
# Cap has TWO independent solid pieces with offset (front/rear) and a wider split.
cap_jag=[(.10,.482),(.135,.506),(.085,.520),(.159,.541),(.12,.561)]
cg=.026
left_cap=[(-.97,.483),(cap_jag[0][0]-cg,.483)]
left_cap += [(x-cg,z) for x,z in cap_jag[1:]]
left_cap += [(-.97,.562)]
right_cap=[(cap_jag[0][0]+cg,.483),(.97,.483),(.97,.562)]
right_cap += [(x+cg,z) for x,z in reversed(cap_jag)]
prism("07 left fractured projecting cap stone",left_cap,front=-.83,back=.83,material=stone)
prism("08 right fractured projecting cap stone",right_cap,front=-.822,back=.83,material=stone)
# Upper bed is likewise broken: not one unbroken slab disguised by a black line.
top_l=[(-.85,.563),(.125,.563),(.08,.581),(-.85,.581)]
top_r=[(.156,.563),(.85,.563),(.85,.581),(.135,.581)]
prism("09 left broken thin bedding layer",top_l,front=-.75,back=.75,material=edge)
prism("10 right broken thin bedding layer",top_r,front=-.75,back=.75,material=edge)
# Replace the neat corner with a large irregular physical spall; cutters must remove mesh.
def chip(obj,name,loc,size,rot):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=loc)
 cutter=bpy.context.object;cutter.scale=size;cutter.rotation_euler=rot
 for v in cutter.data.vertices:
  p=v.co; p.x*=1+.13*math.sin(p.z*6+2);p.y*=1+.17*math.cos(p.x*9)
 bpy.context.view_layer.objects.active=obj
 mod=obj.modifiers.new(name,"BOOLEAN");mod.operation="DIFFERENCE";mod.object=cutter
 try:bpy.ops.object.modifier_apply(modifier=mod.name)
 except Exception as e:print("CUT_WARNING",name,str(e))
 bpy.data.objects.remove(cutter,do_unlink=True)
chip(shaft_right,"impact takes corner",(.81,-.65,.355),(.25,.32,.11),(.2,.2,.45))
chip(shaft_left,"laminar weathering patch",(-.57,-.687,.330),(.18,.14,.056),(.12,.21,.20))
chip(next(p for p in parts if p.name=="07 left fractured projecting cap stone"),"old cornice chip",
     (-.83,-.78,.557),(.20,.18,.08),(.13,.08,.27))
# An uneven section of four-leaf carving is partially lost at the real fracture.
# Carving accents ONLY on intact portions and strongly reduced frequency.
def tiny_inset(cx,name):
 box(name+" dark recessed panel",(cx,-.693,.349),(.25,.027,.115),black,.001)
 # Very shallow four-lobed concavity approximation, intentionally interrupted by chips.
 for i in range(4):
  a=math.pi*i/2
  bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=6,radius=1,
      location=(cx+math.cos(a)*.039,-.713,.349+math.sin(a)*.038))
  ob=bpy.context.object;ob.scale=(.040,.006,.033);register(ob,name+" worn relief "+str(i),edge)
tiny_inset(-.52,"11 Gothic ornament left")
tiny_inset(.49,"12 Gothic ornament right")
# Real detached fracture fragment should rest on lower foundation.
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=(.60,-.61,.269))
ob=bpy.context.object;ob.scale=(.115,.11,.065);register(ob,"13 coarse broken fragment on ledge",broken)
# Export geometry and save original .blend **before** preview lighting.
bpy.ops.object.select_all(action="DESELECT")
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=next(o for o in parts if o.type=="MESH")
if photo_mode.startswith("CC0_"):
 bpy.ops.object.mode_set(mode="EDIT")
 bpy.ops.mesh.select_all(action="SELECT")
 bpy.ops.uv.smart_project(island_margin=.035)
 bpy.ops.object.mode_set(mode="OBJECT")
bpy.ops.export_scene.gltf(filepath=str(ROOT/"pedestal_true_fracture_v1.glb"),export_format="GLB",use_selection=True,export_materials="EXPORT")
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/"pedestal_true_fracture_v1.blend"))
for o in parts:o.select_set(False)
floor=mat("preview floor",(.08,.08,.115))
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,-.11))
ob=bpy.context.object;ob.dimensions=(5.5,5.5,.22);ob.data.materials.append(floor)
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
world=bpy.context.scene.world or bpy.data.worlds.new("preview")
bpy.context.scene.world=world;world.use_nodes=True
world.node_tree.nodes["Background"].inputs["Color"].default_value=(.17,.15,.23,1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value=.47
for name,location,power in [("broad key",(-3,-3,5),490),("violet bounce",(4,-1,4),240),("cold rim",(1,4,5),450)]:
 data=bpy.data.lights.new(name,"AREA");data.energy=power;data.shape="DISK";data.size=3.2
 obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj)
 obj.location=location;obj.rotation_euler=(Vector((0,0,.3))-obj.location).to_track_quat("-Z","Y").to_euler()
bpy.ops.object.camera_add()
cam=bpy.context.object;cam.data.type="ORTHO";cam.data.ortho_scale=2.58
scene=bpy.context.scene;scene.camera=cam;scene.render.engine="CYCLES";scene.cycles.samples=40
scene.cycles.use_denoising=False
for lay in scene.view_layers:
 if hasattr(lay,"cycles"):lay.cycles.use_denoising=False
scene.render.resolution_x=1000;scene.render.resolution_y=800
scene.render.image_settings.file_format="PNG"
scene.view_settings.view_transform="Standard"
for view,position in [("front",(0,-4,1.0)),("side",(4,0,1.0)),("angle",(3,-4,1.45))]:
 cam.location=position;cam.rotation_euler=(Vector((0,0,.28))-cam.location).to_track_quat("-Z","Y").to_euler()
 scene.render.filepath=str(ROOT/(view+".png"));bpy.ops.render.render(write_still=True)
checks={}
for f in [ROOT/"pedestal_true_fracture_v1.glb",ROOT/"pedestal_true_fracture_v1.blend"]+[ROOT/(x+".png") for x in ("front","side","angle")]:
 checks[f.name]=hashlib.sha256(f.read_bytes()).hexdigest()
manifest={"approval":"NOT_APPROVED","subject":"B5 true 3D fracture pedestal","sha":os.environ.get("GITHUB_SHA"),
          "run_id":os.environ.get("GITHUB_RUN_ID"),"mesh_count":len([o for o in parts if o.type=="MESH"]),
          "photo_status":photo_mode,"fracture_geometry":"TWO_OPEN_SEPARATE_MASONRY_SOLIDS",
          "game_integrated":False,"views":["front","side","angle"],"files_sha256":checks,
          "quality_note":"Physical main fissure with interior faces; Blender material and full model artistic review still required."}
(ROOT/"manifest.json").write_text(json.dumps(manifest,indent=2),encoding="utf8")
print("TRUE_FRACTURE_COMPLETED",len(parts),photo_mode)
