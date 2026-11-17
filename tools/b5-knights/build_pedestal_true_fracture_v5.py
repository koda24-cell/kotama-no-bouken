#!/usr/bin/env python3
"""B5 pedestal genuine fractured solids. Independent experimental V1, NOT_APPROVED."""
import bpy, math, json, hashlib, os, random
from pathlib import Path
from mathutils import Vector
random.seed(517)
ROOT=Path("render-output/b5-knights/pedestal_true_fracture_v5").resolve()
ROOT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
parts=[]
def mat(name, rgb, rough=.96):
 m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,1);m.use_nodes=True
 bs=m.node_tree.nodes.get("Principled BSDF")
 bs.inputs["Base Color"].default_value=(*rgb,1);bs.inputs["Roughness"].default_value=rough
 return m
stone=mat("outer slate aged marble stone",(.145,.16,.198))
broken=mat("interior freshly exposed granular stone",(.22,.235,.265))
black=mat("recesses only",(.095,.11,.136))
edge=mat("eroded corner mineral deposits",(.20,.22,.245))
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
   mix=n.new("ShaderNodeMixRGB");mix.blend_type="MIX";mix.inputs[0].default_value=.21
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
 """Solid with four transverse rings. The fractured interior side is physically rough."""
 N=len(poly);vs=[];rings=[front,front+(back-front)*.33,front+(back-front)*.67,back]
 for j,y in enumerate(rings):
  for i,(x,z) in enumerate(poly):
   # Only perturb the exposed fracture profile inside the stone, not the architectural edges.
   if j in (1,2) and abs(x)<.26:
    x += .020*math.sin(i*2.83+j*3.14)+.011*math.cos(i*5.71-j)
    z += .0035*math.sin(i*2.3+j)
   vs.append((x,y,z))
 # Polygon outline is CCW in XZ coordinates: its front normal must face -Y.
 faces=[tuple(range(N)),tuple(range(4*N-1,3*N-1,-1))]
 for layer in range(3):
  for i in range(N):
   a=layer*N+i; nxt=layer*N+(i+1)%N
   faces.append((a,a+N,nxt+N,nxt))
 mesh=bpy.data.meshes.new(name+"_fractured_stone_mesh");mesh.from_pydata(vs,[],faces);mesh.update()
 if mesh.polygons[0].normal.y > -.5:
  raise RuntimeError("Front fractured masonry face normal is not outward: "+str(mesh.polygons[0].normal[:]))
 ob=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(ob)
 register(ob,name,material);mesh.materials.append(broken)
 for face in mesh.polygons:
  if any(abs(mesh.vertices[i].co[0])<.25 for i in face.vertices) and len(face.vertices)==4:
   face.material_index=1
 return ob
# Large architectural base: strictly flat major planes and square masonry silhouette.
box("01 long foundation plinth",(0,0,.067),(1.96,1.70,.134))
box("02 lower recessed mortar band",(0,0,.147),(1.79,1.54,.026),black,.001)
box("03 middle crisp stone bed",(0,0,.194),(1.85,1.57,.080),stone,.002)
# Main shaft fracture: physical space separating two large irregular masonry solids.
# The crack moves sideways at each depth, has small backtracking and an inconsistent opening.
jag=[(-.058,.238),(-.041,.259),(-.030,.282),(.006,.300),
     (.003,.326),(.046,.345),(.040,.372),(.076,.396),
     (.087,.418),(.075,.439),(.10,.453)]
gap=.012
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
cap_jag=[(.084,.482),(.102,.510),(.09,.530),(.128,.545),(.124,.562)]
cg=.013
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

# Weathering close to the actual fracture: damaged flakes expose inner stone.
chip(shaft_left,"large fractured surface peel",(-.16,-.705,.365),(.13,.085,.035),(.15,.16,.4))
chip(shaft_right,"secondary front face delamination",(.26,-.703,.407),(.17,.08,.033),(.18,-.04,.13))
chip(shaft_left,"large unstable lip",(-.15,-.65,.253),(.13,.11,.048),(.18,.29,.48))
# A small branch is a shallow actually-cut groove, not a black painted curve.
# Narrower, discontinuous incision keeps it subordinate to the principal split.
chip(shaft_right,"branch fracture pit",(.23,-.681,.333),(.07,.07,.020),(.1,.3,.35))


# V3: Broad rock weathering must exist over the facade, not just a sharp central cut.
# Simple subdivision preserves the architectural planes; real displacement sculpts
# small surface detachments around the existing macro fracture.
noise=bpy.data.textures.new("stone chisel weathered subsurface",type="CLOUDS")
noise.noise_scale=.095
noise.noise_depth=2
for obj in parts:
 if obj.type!="MESH":continue
 if obj.name.startswith("11 ") or obj.name.startswith("12 "):continue
 if obj.name.startswith("02 ") or obj.name.startswith("06 "):continue
 # Thin cap and small stones are intentionally less damaged than the large shaft.
 is_major=("shaft" in obj.name or "fractured projecting cap" in obj.name or "foundation plinth" in obj.name)
 if not is_major:continue
 sub=obj.modifiers.new("subdivide without smoothing silhouette","SUBSURF")
 sub.subdivision_type="SIMPLE"
 sub.levels=3
 sub.render_levels=3
 dis=obj.modifiers.new("real chipped mineral face displacement","DISPLACE")
 dis.texture=noise
 dis.texture_coords="GLOBAL"
 dis.direction="NORMAL"
 dis.strength=.024 if "shaft" in obj.name else .012
 dis.mid_level=.50
 bpy.context.view_layer.objects.active=obj
 for mod in list(obj.modifiers):
  try:bpy.ops.object.modifier_apply(modifier=mod.name)
  except Exception as e:print("DISPLACEMENT_APPLY_WARNING",obj.name,mod.name,str(e))
# Real erosion primarily affects face, low-frequency layers.
# Cracked edge has rough interior faces already; secondarily exposed shallow spalls remain.


# V4: irregular planar spalling, concentrated around cracks and surviving carvings.
# Erosion is physically subtracted from the front stone skin and cap cornice.
def spall(name,obj,where,scale,rot=(0,0,0),seed=0):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=where)
 tool=bpy.context.object;tool.scale=scale;tool.rotation_euler=rot
 for v in tool.data.vertices:
  p=v.co
  q=1+.15*math.sin(p.x*8+seed)+.12*math.cos(p.z*10-seed)
  p.x*=q;p.y*=1+.18*math.sin(p.x*9+seed*2)
 bpy.context.view_layer.objects.active=obj
 modifier=obj.modifiers.new(name,"BOOLEAN")
 modifier.operation="DIFFERENCE";modifier.object=tool
 try:bpy.ops.object.modifier_apply(modifier=modifier.name)
 except Exception as e:print("SPALL_BOOLEAN_FAILED",name,str(e))
 bpy.data.objects.remove(tool,do_unlink=True)
# Large ancient delamination beside the open fracture, unevenly distributed.
spall("weathered split shoulder outer crust",shaft_left,(-.45,-.695,.397),(.26,.102,.065),(.16,-.10,.22),2)
spall("upper-left mineral crust loss",shaft_left,(-.66,-.690,.303),(.17,.096,.082),(.10,.16,-.18),6)
spall("heavily eroded joint right",shaft_right,(.34,-.688,.391),(.29,.113,.058),(.05,.22,.43),7)
spall("front stone plate spall near base",shaft_right,(.62,-.684,.265),(.20,.12,.039),(-.20,.07,.31),4)
spall("frayed cap cornice above fracture",next(o for o in parts if o.name=="07 left fractured projecting cap stone"),(-.12,-.818,.552),(.24,.13,.048),(.22,.06,.22),9)
spall("right cap layered flake",next(o for o in parts if o.name=="08 right fractured projecting cap stone"),(.57,-.821,.556),(.19,.09,.034),(.23,.15,.53),11)
# The old sculpted decoration itself loses material, like observed tomb effigies.
ornament_parts=[o for o in parts if "worn relief" in o.name]
for k,o in enumerate(ornament_parts):
 if ("left" in o.name and k%2==0) or ("right" in o.name and k%3==0):
  spall("ornament broken away",o,(o.location.x+.014,o.location.y-.005,o.location.z),
        (.060,.022,.052),(.13,.20,.33),k+4)
# Surface disintegration from the same historical material: higher micro-pitting,
# not added black curves or a pattern of circular black paint spots.

# Export geometry and save original .blend **before** preview lighting.
bpy.ops.object.select_all(action="DESELECT")
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=next(o for o in parts if o.type=="MESH")
if photo_mode.startswith("CC0_"):
 bpy.ops.object.mode_set(mode="EDIT")
 bpy.ops.mesh.select_all(action="SELECT")
 bpy.ops.uv.smart_project(island_margin=.035)
 bpy.ops.object.mode_set(mode="OBJECT")
bpy.ops.export_scene.gltf(filepath=str(ROOT/"pedestal_true_fracture_v5.glb"),export_format="GLB",use_selection=True,export_materials="EXPORT")
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/"pedestal_true_fracture_v5.blend"))
for o in parts:o.select_set(False)
floor=mat("preview floor",(.08,.08,.115))
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,-.11))
ob=bpy.context.object;ob.dimensions=(5.5,5.5,.22);ob.data.materials.append(floor)
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
world=bpy.context.scene.world or bpy.data.worlds.new("preview")
bpy.context.scene.world=world;world.use_nodes=True
world.node_tree.nodes["Background"].inputs["Color"].default_value=(.17,.15,.23,1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value=.31
for name,location,power in [("broad key",(-3,-3,5),330),("violet bounce",(4,-1,4),170),("cold rim",(1,4,5),250)]:
 data=bpy.data.lights.new(name,"AREA");data.energy=power;data.shape="DISK";data.size=3.2
 obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj)
 obj.location=location;obj.rotation_euler=(Vector((0,0,.3))-obj.location).to_track_quat("-Z","Y").to_euler()
bpy.ops.object.camera_add()
cam=bpy.context.object;cam.data.type="ORTHO";cam.data.ortho_scale=2.58
scene=bpy.context.scene;scene.camera=cam;scene.render.engine="CYCLES";scene.cycles.samples=48
scene.cycles.use_denoising=False
for lay in scene.view_layers:
 if hasattr(lay,"cycles"):lay.cycles.use_denoising=False
scene.render.resolution_x=1000;scene.render.resolution_y=800
scene.render.image_settings.file_format="PNG"
scene.view_settings.view_transform="Standard"
scene.view_settings.exposure=-.70
for view,position in [("front",(0,-4,1.0)),("side",(4,0,1.0)),("angle",(3,-4,1.45))]:
 cam.location=position;cam.rotation_euler=(Vector((0,0,.28))-cam.location).to_track_quat("-Z","Y").to_euler()
 scene.render.filepath=str(ROOT/(view+".png"));bpy.ops.render.render(write_still=True)
checks={}
for f in [ROOT/"pedestal_true_fracture_v5.glb",ROOT/"pedestal_true_fracture_v5.blend"]+[ROOT/(x+".png") for x in ("front","side","angle")]:
 checks[f.name]=hashlib.sha256(f.read_bytes()).hexdigest()
manifest={"approval":"NOT_APPROVED","subject":"B5 true 3D fracture pedestal","sha":os.environ.get("GITHUB_SHA"),
          "run_id":os.environ.get("GITHUB_RUN_ID"),"mesh_count":len([o for o in parts if o.type=="MESH"]),
          "photo_status":photo_mode,"fracture_geometry":"TWO_OPEN_SEPARATE_MASONRY_SOLIDS",
          "game_integrated":False,"views":["front","side","angle"],"files_sha256":checks,
          "quality_note":"Exterior face winding corrected, real fracture and internal geometry; artistic review still required."}
(ROOT/"manifest.json").write_text(json.dumps(manifest,indent=2),encoding="utf8")
print("TRUE_FRACTURE_COMPLETED",len(parts),photo_mode)
