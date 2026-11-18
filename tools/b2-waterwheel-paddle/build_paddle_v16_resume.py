"""V16: restore forged iron readability without losing UV corrosion roughness.
Reopen V15 .blend, change linked iron color image and oxidized metal response only.
"""
import bpy,sys,json,hashlib
from pathlib import Path
import numpy as np
inp=Path(sys.argv[sys.argv.index("--")+1]);out=Path(sys.argv[sys.argv.index("--")+2]);out.mkdir(parents=True,exist_ok=True)
expected="45f70dcfa42fbec79c47abf8737a20982179d038219f15d4d59b57dd80b55f72"
sha=hashlib.sha256(inp.read_bytes()).hexdigest()
if sha!=expected:raise RuntimeError("wrong V15 checkpoint")
bpy.ops.wm.open_mainfile(filepath=str(inp))
wood=bpy.data.objects.get("solid_curved_scoop_timbers")
assert wood is not None
vertex_count=len(wood.data.vertices);poly_count=len(wood.data.polygons)
mat=bpy.data.materials.get("V15 wrought iron cold corrosion UV PBR")
if not mat:raise RuntimeError("V15 UV metal material missing")
bs=mat.node_tree.nodes.get("Principled BSDF")
linked=[lnk.from_node for lnk in mat.node_tree.links if lnk.to_node==bs and lnk.to_socket.name=="Base Color"]
if len(linked)!=1 or linked[0].type!="TEX_IMAGE":raise RuntimeError("No unique packed iron diffuse")
src=linked[0].image
w,h=src.size
arr=np.empty(w*h*4,dtype=np.float32);src.pixels.foreach_get(arr);arr=arr.reshape((h,w,4))
enhanced=np.clip(arr[:,:,:3]*2.10+.023,0,.68)
# preserve the photo-inspired fine oxidation distribution but avoid charcoal-black.
dst=bpy.data.images.new("V16 readable cold wrought iron oxide diffuse",width=w,height=h,alpha=True)
dst_rgba=np.concatenate((enhanced,np.ones((h,w,1),dtype=np.float32)),axis=-1)
dst.pixels.foreach_set(dst_rgba.astype(np.float32).ravel());dst.pack()
linked[0].image=dst
bs.inputs["Metallic"].default_value=.36
assert len(wood.data.vertices)==vertex_count and len(wood.data.polygons)==poly_count
backup=bpy.data.objects.get("V12_core_unmodified_backup")
assert backup
collection=backup.users_collection[0];collection.objects.unlink(backup)
tag="b2_bucket_paddle_blender_v16"
glb=out/(tag+".glb")
bpy.ops.export_scene.gltf(filepath=str(glb),export_format="GLB",export_yup=True)
collection.objects.link(backup);backup.hide_render=True;backup.hide_set(True)
sc=bpy.context.scene;sc.render.engine="CYCLES";sc.cycles.samples=32
sc.render.resolution_x=820;sc.render.resolution_y=820;sc.render.resolution_percentage=100
cam=sc.camera;cam.data.type="ORTHO";cam.data.ortho_scale=1.7
files=[glb]
for view,pos in [("front",(0,-2.5,.12)),("side",(2.8,0,.12)),
                 ("angle",(1.65,-2.15,.72)),("back",(0,2.5,.12))]:
 cam.location=pos;cam.rotation_euler=(-cam.location).to_track_quat("-Z","Y").to_euler()
 f=out/(tag+"_"+view+".png");sc.render.filepath=str(f)
 bpy.ops.render.render(write_still=True);files.append(f)
blend=out/(tag+".blend");bpy.ops.wm.save_as_mainfile(filepath=str(blend));files.append(blend)
m={"asset":tag,"status":"NOT_APPROVED","source_v15_sha256":sha,
 "timber_unchanged":True,"cold_wrought_iron_corrected":True,
 "UV_iron_diffuse_rebuilt":True,"iron_roughness_unchanged":True,
 "CC0_photo_wood_unchanged":True,"files":{}}
for f in files:
 b=f.read_bytes();m["files"][f.name]={"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest()}
(out/(tag+"_manifest.json")).write_text(json.dumps(m,indent=2))
print("V16_COLOR_FIX_REAL_BLENDER",flush=True)
