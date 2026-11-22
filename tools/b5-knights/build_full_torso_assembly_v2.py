#!/usr/bin/env python3
"""Actual GLB-to-GLB fauld V2 / tassets V1 dry assembly; no changes to source meshes."""
import bpy, os, json, hashlib, math
from pathlib import Path
from mathutils import Vector
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
out=Path("render-output/b5-knights/full_torso_assembly_v2").resolve()
out.mkdir(parents=True,exist_ok=True)
sources={
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

bpy.ops.object.select_all(action="DESELECT")
for ob in parts: ob.select_set(True)
bpy.context.view_layer.objects.active=parts[0]
bpy.ops.export_scene.gltf(filepath=str(out/"full_torso_assembly_v2.glb"),export_format="GLB",use_selection=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/"full_torso_assembly_v2.blend"))
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
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type="ORTHO";cam.data.ortho_scale=1.48
sc=bpy.context.scene;sc.camera=cam;sc.render.engine="CYCLES";sc.cycles.samples=32
sc.render.resolution_x=800;sc.render.resolution_y=800;sc.render.resolution_percentage=100
sc.render.image_settings.file_format="PNG";sc.view_settings.view_transform="Standard"
views=[("front",(0,-2.1,1.12)),("left",(-2.1,0,1.12)),("right",(2.1,0,1.12)),
("angle",(1.6,-1.6,1.28)),("back",(0,2.1,1.12)),("top",(0,-.35,2.25))]
for name,pos in views:
 cam.location=pos;cam.rotation_euler=(Vector((0,-.06,.92))-cam.location).to_track_quat("-Z","Y").to_euler()
 sc.render.filepath=str(out/(name+".png"))
 bpy.ops.render.render(write_still=True)
files=["full_torso_assembly_v2.glb","full_torso_assembly_v2.blend"]+[n+".png" for n,_ in views]
hashes={f:hashlib.sha256((out/f).read_bytes()).hexdigest() for f in files}
manifest={"asset":"full_torso_assembly","version":2,"approval":"NOT_APPROVED","game_integrated":False,
"source_sha":os.getenv("GITHUB_SHA"),"run_id":os.getenv("GITHUB_RUN_ID"),"views":[n for n,_ in views],
"files_sha256":hashes,"input_assets":reports,"part_count":len(parts),"added_geometry_count":len(added),
"note":"Five existing GLBs unchanged plus 14 separate review-only seam connectors; geometry fit remains visually unapproved."}
(out/"manifest.json").write_text(json.dumps(manifest,indent=2))
print("ASSEMBLY_V1_SIX_VIEW_QA",json.dumps(reports))
