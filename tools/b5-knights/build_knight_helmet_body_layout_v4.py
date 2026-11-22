#!/usr/bin/env python3
"""Actual GLB-to-GLB fauld V2 / tassets V1 dry assembly; no changes to source meshes."""
import bpy, os, json, hashlib, math
from pathlib import Path
from mathutils import Vector, Matrix
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
out=Path("render-output/b5-knights/knight_helmet_body_layout_v4").resolve()
out.mkdir(parents=True,exist_ok=True)
sources={
 "helmet_v22": Path("inputs/helmet/render-output/b5-knights/sallet_v22/sallet_v22.glb"),
 "breastplate_v6": Path("inputs/breastplate/render-output/b5-knights/gothic_breastplate_v6/gothic_breastplate_v6.glb"),
 "backplate_v2": Path("inputs/backplate/render-output/b5-knights/gothic_backplate_v2/gothic_backplate_v2.glb"),
 "culet_v1": Path("inputs/culet/render-output/b5-knights/gothic_culet_v1/gothic_culet_v1.glb"),
 "fauld_v2": Path("inputs/fauld/render-output/b5-knights/gothic_fauld_v2/gothic_fauld_v2.glb"),
 "tassets_v1": Path("inputs/tassets/render-output/b5-knights/gothic_tassets_v1/gothic_tassets_v1.glb"),
}
parts=[]
reports={}
for label,src in sources.items():
 assert src.exists(),str(src)
 raw=src.read_bytes()
 assert raw[:4]==b"glTF" and len(raw)>1000
 existing={o.name for o in bpy.data.objects}
 bpy.ops.import_scene.gltf(filepath=str(src.resolve()))
 imported=[obj for obj in bpy.data.objects if obj.name not in existing and obj.type=="MESH"]
 assert imported,(label,"empty geometry")
 if label=="helmet_v22":
  # Blender glTF importer may parent mesh nodes under coordinate-conversion empties.
  # Set exactly one world-space transform after freezing world matrices.
  # This avoids per-child local-Euler updates being canceled by imported glTF parents.
  orig_world={o:o.matrix_world.copy() for o in imported}
  helmet_matrix=(Matrix.Translation(Vector((0,-.018,1.49))) @ Matrix.Rotation(math.pi,4,"Z"))
  for ob in imported:
   ob.parent=None
   ob.matrix_world=helmet_matrix @ orig_world[ob]
 for ob in imported:
  ob.name=label+" | "+ob.name
  ob["source_component"]=label
  parts.append(ob)
 bbox=[ob.matrix_world @ Vector(corner) for ob in imported for corner in ob.bound_box]
 bounds={"x":[min(v.x for v in bbox),max(v.x for v in bbox)],
         "y":[min(v.y for v in bbox),max(v.y for v in bbox)],
         "z":[min(v.z for v in bbox),max(v.z for v in bbox)]}
 reports[label]={"source_sha256":hashlib.sha256(raw).hexdigest(),"mesh_count":len(imported),"bbox":bounds}
# Detect coarse joint alignment; this is not a mesh-level collision guarantee.
fa=reports["fauld_v2"]["bbox"];ta=reports["tassets_v1"]["bbox"]
assert fa["z"][0] < ta["z"][1] and ta["z"][0]<fa["z"][1],(fa,ta)
assert abs(fa["x"][0])<.5 and abs(ta["x"][1])<.5
joint_z=[max(fa["z"][0],ta["z"][0]),min(fa["z"][1],ta["z"][1])]
reports["joint"]={"z_overlap":round(joint_z[1]-joint_z[0],5),"note":"coarse AABB check only; inspect six views for actual contact"}
for a,b in [("breastplate_v6","fauld_v2"),("backplate_v2","culet_v1")]:
 aa=reports[a]["bbox"];bb=reports[b]["bbox"]
 overlap=max(0,min(aa["z"][1],bb["z"][1])-max(aa["z"][0],bb["z"][0]))
 reports["joint_"+a+"_"+b]={"z_overlap":round(overlap,6),"status":"COARSE_CHECK_ONLY"}
 assert overlap>0,(a,b,aa,bb)
assert len(parts)>=10
# V2 non-destructive seam fitting: two thin forged underlapping connector bands.
# All five original GLBs remain at their original transforms, and their SHA256 are preserved.
def seam_material(name, tint):
 m=bpy.data.materials.new(name)
 m.use_nodes=True
 bsdf=m.node_tree.nodes.get("Principled BSDF")
 bsdf.inputs["Base Color"].default_value=(*tint,1)
 bsdf.inputs["Metallic"].default_value=.76
 bsdf.inputs["Roughness"].default_value=.78
 return m
dark_steel=seam_material("V2 aged dark-metal moving joint",(.145,.151,.164))
rivet_steel=seam_material("V2 muted steel pin",(.24,.245,.264))
added=[]
def connect_arc(label, sign, z0, z1, width, depth, front=True):
 # Curvature tucks connector inside imported plates rather than covering engraved faces.
 # z0..z1 bridges their intended vertical mating line by only ~45 mm.
 N=36; M=5
 vertices=[]; faces=[]
 for j in range(M+1):
  f=j/M; zz=z0+(z1-z0)*f
  for k in range(N+1):
   t=2*k/N-1
   ang=t*1.14
   xx=width*math.sin(ang)/math.sin(1.14)
   radial=depth*(1-.13*(1-f))
   yy=sign*(.125+radial*math.cos(ang))
   yy+=sign*.0016*math.sin(math.pi*f)*math.cos(t*math.pi*1.3)
   vertices.append((xx,yy,zz+.0015*math.cos(math.pi*t)*(1-f)))
 for j in range(M):
  for k in range(N):
   a=j*(N+1)+k
   faces.append((a,a+1,a+N+2,a+N+1) if sign>0 else (a,a+N+1,a+N+2,a+1))
 mesh=bpy.data.meshes.new(label+" geometry")
 mesh.from_pydata(vertices,[],faces);mesh.update()
 ob=bpy.data.objects.new(label,mesh)
 bpy.context.collection.objects.link(ob)
 ob.data.materials.append(dark_steel)
 sol=ob.modifiers.new("thin rolled steel backing","SOLIDIFY");sol.thickness=.0012
 bevel=ob.modifiers.new("soft worn edge","BEVEL");bevel.width=.0006;bevel.segments=2
 ob["is_review_only_added_geometry"]=True
 added.append(ob);parts.append(ob)
 return ob
# Front edge of breastplate and 1st fauld lame; rear backplate/culets.
# These are fitted visually, never asserted collision-free from bounding boxes.
connect_arc("V2 FRONT hidden flexible underlap", -1, .850,.907,.163,.025)
connect_arc("V2 BACK hidden flexible underlap",  1, .845,.907,.163,.025)
# Side articulating keeper tabs: tiny, darkened fasteners rather than exposed tubes.
for side in (-1,1):
 for orientation in (-1,1):
  x=side*.169; y=orientation*.079; z=.875
  bpy.ops.mesh.primitive_cube_add(size=1,location=(x,y,z))
  ob=bpy.context.object
  ob.name="V2 %s hip keeper %s"%("front" if orientation<0 else "rear","L" if side<0 else "R")
  ob.dimensions=(.010,.0024,.035)
  bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
  bevel=ob.modifiers.new("rounded forged keeper ends","BEVEL");bevel.width=.0013;bevel.segments=2
  ob.data.materials.append(dark_steel)
  ob["is_review_only_added_geometry"]=True
  added.append(ob);parts.append(ob)
  for dz in (-.011,.011):
   bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=6,radius=.0024,location=(x,y+orientation*.002,z+dz))
   pin=bpy.context.object
   pin.name=ob.name+" pin"
   pin.scale=(1,.34,1)
   pin.data.materials.append(rivet_steel)
   pin["is_review_only_added_geometry"]=True
   added.append(pin);parts.append(pin)
reports["V2_added_connectors"]={"count":len(added),"geometry":"two curved flexible underlaps, four keeper tabs, eight pins","source_meshes_unchanged":True}
assert len(added)==14
# V3 forged overlapping side-junction cheek plates: two continuous swept surfaces.
# This strengthens the side silhouette rather than stacking a bright tube on the waist.
v3_added=[]
for side in (-1,1):
 vertices=[]; faces=[]
 N=28; M=12
 for j in range(M+1):
  f=j/M
  z=.817+f*.124
  for k in range(N+1):
   t=2*k/N-1
   # curved side-hip surface, widest around the lower third; keep a soft pointed hem.
   yy=.146*t
   taper=.83+.17*math.sin(math.pi*f)
   xx=side*(.172+.018*(1-f)**1.3+.007*(1-t*t)*math.sin(math.pi*f))
   zz=z+.012*(1-abs(t))**2*(1-f)**2
   vertices.append((xx,yy*taper,zz))
 for j in range(M):
  for k in range(N):
   a=j*(N+1)+k
   faces.append((a,a+1,a+N+2,a+N+1) if side<0 else (a,a+N+1,a+N+2,a+1))
 mesh=bpy.data.meshes.new("V3 forged hip flank cheek")
 mesh.from_pydata(vertices,[],faces);mesh.update()
 ob=bpy.data.objects.new("V3 %s curved hip joint"%("L" if side<0 else "R"),mesh)
 bpy.context.collection.objects.link(ob);ob.data.materials.append(dark_steel)
 ob.modifiers.new("1.3mm forged sheet","SOLIDIFY").thickness=.0013
 bevel=ob.modifiers.new("worn outside edges","BEVEL");bevel.width=.0007;bevel.segments=2
 ob.modifiers.new("subtle normal smoothing","WEIGHTED_NORMAL")
 ob["is_review_only_added_geometry"]=True
 parts.append(ob);v3_added.append(ob)
 for yi in (-.104,.104):
  bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=.0030,location=(side*.190,yi,.877))
  pin=bpy.context.object
  pin.name="V3 %s articulated side pivot %s"%("L" if side<0 else "R","front" if yi<0 else "back")
  pin.scale=(.35,1,1)
  pin.data.materials.append(rivet_steel)
  pin["is_review_only_added_geometry"]=True
  parts.append(pin);v3_added.append(pin)
assert len(v3_added)==6
reports["V3_side_joint_upgrade"]={"count":len(v3_added),"side_plates":2,"pivot_heads":4,
"limits_z":[.817,.953],"max_side_x":.197,"input_meshes_unchanged":True}


# V4 collar: preserve all six source GLBs and V2/V3 junctions.
# Observed source AABBs in successful V3 run: torso top 1.45319m, helmet bottom 1.52200m.
# Articulated 1.5mm steel gorget spans their vertical interval; validation is visual, not collision proof.
collar_added=[]
n=64; rings=9; verts=[]; faces=[]
for j in range(rings):
 f=j/(rings-1)
 z=1.432+f*.103
 # Lower edge sits inside upper torso; upper edge tucks beneath helmet lower rim.
 rx=.091-.013*f + .0025*math.sin(math.pi*f)
 ry=.087-.011*f
 for k in range(n):
  theta=2*math.pi*k/n
  # Center the neck opening and retain a subtle point towards chest front (-Y).
  x=rx*math.cos(theta)
  y=.012+ry*math.sin(theta)
  zlocal=z- .009*(1-f)*max(0,-math.sin(theta))**4
  verts.append((x,y,zlocal))
for j in range(rings-1):
 for k in range(n):
  a=j*n+k; b=j*n+(k+1)%n; c=(j+1)*n+(k+1)%n; d=(j+1)*n+k
  faces.append((a,b,c,d))
mesh=bpy.data.meshes.new("V4 articulated gorget steel shell")
mesh.from_pydata(verts,[],faces);mesh.update()
collar=bpy.data.objects.new("V4 dark fitted steel gorget",mesh)
bpy.context.collection.objects.link(collar)
collar.data.materials.append(dark_steel)
solid=collar.modifiers.new("forged sheet thickness","SOLIDIFY");solid.thickness=.0015
bevel=collar.modifiers.new("rolled plate edge","BEVEL");bevel.width=.0008;bevel.segments=2
collar.modifiers.new("weighted normals","WEIGHTED_NORMAL")
collar["is_review_only_added_geometry"]=True
parts.append(collar);collar_added.append(collar)
# Additional relief on the flat hip side plates: two tapered embossed sub-panels,
# retaining the V3 cheek plate and every original input mesh underneath.
for side in (-1,1):
 for stripe in (-1,1):
  coords=[]; polygons=[]
  for j in range(7):
   f=j/6
   z=.831+f*.105
   for k in range(5):
    t=(k/4-.5)*2
    y=(stripe*.059)+t*.018*(.85+.15*math.sin(math.pi*f))
    x=side*(.172+.018*(1-f)**1.3+.0055*math.sin(math.pi*f)+.0028*(1-t*t)*math.sin(math.pi*f))
    coords.append((x,y,z+.004*(1-f)*(1-t*t)))
  for j in range(6):
   for k in range(4):
    a=j*5+k
    polygons.append((a,a+1,a+6,a+5) if side<0 else (a,a+5,a+6,a+1))
  relief_mesh=bpy.data.meshes.new("V4 relief forged ridge")
  relief_mesh.from_pydata(coords,[],polygons);relief_mesh.update()
  ob=bpy.data.objects.new("V4 %s side relief %s"%("L" if side<0 else "R","front" if stripe<0 else "rear"),relief_mesh)
  bpy.context.collection.objects.link(ob)
  ob.data.materials.append(dark_steel)
  ob.modifiers.new("thin hammered relief","SOLIDIFY").thickness=.001
  edge=ob.modifiers.new("soft relief lip","BEVEL");edge.width=.0006;edge.segments=2
  ob["is_review_only_added_geometry"]=True
  parts.append(ob);collar_added.append(ob)
reports["V4_neck_and_hip"]={"count":len(collar_added),"gorget_bounds_z":[1.423,1.535],"source_gap_z_m":round(reports["helmet_v22"]["bbox"]["z"][0]-max(reports["breastplate_v6"]["bbox"]["z"][1],reports["backplate_v2"]["bbox"]["z"][1]),6),"source_meshes_unchanged":True,"hip_relief_panels":4,"status":"RENDER_QA_REQUIRED"}
assert len(collar_added)==5

# Optional original complete stone sentinel V14 is a distinct comparison reference.
# It is NOT part of the metal armor GLB; arms/legs/weapon from statue are not claimed as fitted metal armor.
reference_matches=list(Path("inputs/sentinel").rglob("sentinel_v14.glb"))
assert len(reference_matches)==1,("Unexpected sentinel reference inventory", [str(p) for p in reference_matches])
reference_path=reference_matches[0]
assert reference_path.exists(),reference_path
reference_hash=hashlib.sha256(reference_path.read_bytes()).hexdigest()
previous={o.name for o in bpy.data.objects}
bpy.ops.import_scene.gltf(filepath=str(reference_path.resolve()))
reference=[o for o in bpy.data.objects if o.name not in previous and o.type=="MESH"]
assert len(reference)>=5,"Expected original multi-mesh complete statue"
# Use a single global transform for all source world matrices. V1 accidentally
# scaled only local mesh scale without scaling translations, exploding the layout.
saved_world={o:o.matrix_world.copy() for o in reference}
guide_transform=Matrix.Translation(Vector((1.20,0,0))) @ Matrix.Scale(.48,4)
for o in reference:
 o.parent=None
 o.matrix_world=guide_transform @ saved_world[o]
 o.name="REFERENCE ONLY sentinel V14 | "+o.name
 o["reference_only_do_not_export_with_metal_armor"]=True
 o.hide_render=True
reports["sentinel_full_body_reference"]={"source_sha256":reference_hash,"mesh_count":len(reference),"exported_to_armor":False,"height_scale":.48,"world_space_uniform_transform":True}
reports["helmet_fit"]={"source":str(sources["helmet_v22"]),"rotation_z_degrees":180,"offset_z_m":1.49,"transform_mode":"parent_detached_global_world_matrix","offset_y_m":-.018,"metal_armor_export":True}

bpy.ops.object.select_all(action="DESELECT")
for ob in parts: ob.select_set(True)
bpy.context.view_layer.objects.active=parts[0]
bpy.ops.export_scene.gltf(filepath=str(out/"knight_helmet_body_layout_v4.glb"),export_format="GLB",use_selection=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/"knight_helmet_body_layout_v4.blend"))
for ob in parts:ob.select_set(False)
def mat(name,rgb):
 m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,1);m.use_nodes=True
 p=m.node_tree.nodes.get("Principled BSDF");p.inputs["Base Color"].default_value=(*rgb,1);p.inputs["Roughness"].default_value=.88
 return m
floor=mat("QA floor",(.075,.081,.097))
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,.19))
stage=bpy.context.object;stage.dimensions=(1.35,1.35,.025);stage.data.materials.append(floor)
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
world=bpy.context.scene.world or bpy.data.worlds.new("soft studio")
bpy.context.scene.world=world;world.use_nodes=True
world.node_tree.nodes["Background"].inputs["Color"].default_value=(.25,.27,.30,1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value=.75
for name,loc,power,size in [("key",(-1.1,-1.5,1.6),90,1.3),("fill",(1.2,-.7,1.4),48,1.3),("rim",(0,1.3,1.8),110,1.1)]:
 d=bpy.data.lights.new(name,"AREA");d.energy=power;d.size=size
 ob=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(ob)
 ob.location=loc;ob.rotation_euler=(Vector((0,-.12,.62))-ob.location).to_track_quat("-Z","Y").to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type="ORTHO";cam.data.ortho_scale=2.02
sc=bpy.context.scene;sc.camera=cam;sc.render.engine="CYCLES";sc.cycles.samples=32
sc.render.resolution_x=800;sc.render.resolution_y=800;sc.render.resolution_percentage=100
sc.render.image_settings.file_format="PNG";sc.view_settings.view_transform="Standard"
views=[("front",(0,-2.1,1.12)),("left",(-2.1,0,1.12)),("right",(2.1,0,1.12)),
("angle",(1.6,-1.6,1.28)),("back",(0,2.1,1.12)),("top",(0,-.35,2.25))]
for name,pos in views:
 cam.location=pos;cam.rotation_euler=(Vector((0,-.06,1.09))-cam.location).to_track_quat("-Z","Y").to_euler()
 sc.render.filepath=str(out/(name+".png"))
 bpy.ops.render.render(write_still=True)
# Two additional full-body reference layouts with original complete stone sculpture alongside armor.
for o in reference:o.hide_render=False
cam.data.ortho_scale=2.65
for name,pos in [("fullbody_front",(.61,-3.8,1.10)),("fullbody_angle",(3.6,-3.1,1.28))]:
 cam.location=pos
 cam.rotation_euler=(Vector((.6,-.1,1.0))-cam.location).to_track_quat("-Z","Y").to_euler()
 sc.render.filepath=str(out/(name+".png"))
 bpy.ops.render.render(write_still=True)
for o in reference:o.hide_render=True
files=["knight_helmet_body_layout_v4.glb","knight_helmet_body_layout_v4.blend"]+[n+".png" for n,_ in views]+["fullbody_front.png","fullbody_angle.png"]
hashes={f:hashlib.sha256((out/f).read_bytes()).hexdigest() for f in files}
manifest={"asset":"full_torso_assembly","version":6,"approval":"NOT_APPROVED","game_integrated":False,
"source_sha":os.getenv("GITHUB_SHA"),"run_id":os.getenv("GITHUB_RUN_ID"),"views":[n for n,_ in views]+["fullbody_front","fullbody_angle"],
"files_sha256":hashes,"input_assets":reports,"part_count":len(parts),"added_geometry_count":len(added)+len(v3_added)+len(collar_added),"metal_components":6,
"note":"Six metal source GLBs (including rotated/offset helmet) plus V2 and V3 added joints; stone sentinel V14 is reference-only, not exported to armor. NOT_APPROVED."}
(out/"manifest.json").write_text(json.dumps(manifest,indent=2))
print("ASSEMBLY_V4_SIX_VIEW_QA",json.dumps(reports))
