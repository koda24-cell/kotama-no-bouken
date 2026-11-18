"""V15 forge iron only: add original UV corrosion color and roughness maps.
The V14 timber, carved cracks, ice and preserved V12 wood backup remain unchanged.
"""
import bpy,sys,json,hashlib,math
import numpy as np
from pathlib import Path
inp=Path(sys.argv[sys.argv.index("--")+1]);out=Path(sys.argv[sys.argv.index("--")+2]);out.mkdir(parents=True,exist_ok=True)
expected="0c24b2c1b389bd361d90b84db0af086120fa652e6518952b6b84a2cf9d84081a"
sha=hashlib.sha256(inp.read_bytes()).hexdigest()
if sha!=expected:raise RuntimeError("V14 checkpoint mismatch")
bpy.ops.wm.open_mainfile(filepath=str(inp))
wood=bpy.data.objects.get("solid_curved_scoop_timbers")
backup=bpy.data.objects.get("V12_core_unmodified_backup")
assert wood and backup and wood!=backup
oldverts=len(wood.data.vertices);oldfaces=len(wood.data.polygons)
W=512
ys,xs=np.mgrid[:W,:W].astype(np.float32);x=xs/W;y=ys/W
rng=np.random.default_rng(20261118)
noise=rng.normal(0,1,(W,W)).astype(np.float32)
fine=(.3*np.sin(x*97+y*31)+.26*np.cos(x*126-y*93)+.16*np.sin(18*y+43*x))
large=.45*np.sin(x*13+y*11)*np.sin(x*8-y*12)+.32*np.cos(x*19-y*7)
pit=np.maximum(0,(noise*.38+fine*.38+large*.45)-.40)
rust=np.clip(pit*1.6+.07*np.sin(x*17+y*7)**2,0,.50).astype(np.float32)
base=np.stack((.095+.018*large,.119+.016*large,.134+.014*large),axis=-1)
oxide=np.array([.255,.153,.114],dtype=np.float32)
color=np.clip(base*(1-rust[...,None])+oxide*rust[...,None]
              -np.maximum(0,noise[...,None]*.014),.025,.40)
rough=np.clip(.70+.16*rust+.055*noise+.048*large,.5,.97)
def pack_image(name,rgb,noncolor=False):
 image=bpy.data.images.new(name,width=W,height=W,alpha=True)
 rgba=np.concatenate([rgb,np.ones((W,W,1),dtype=np.float32)],axis=2)
 image.pixels.foreach_set(rgba.astype(np.float32).ravel())
 if noncolor:image.colorspace_settings.name="Non-Color"
 image.pack();return image
col=pack_image("V15 forged iron oxide diffuse",color)
roughimg=pack_image("V15 forged iron oxidized roughness",np.repeat(rough[...,None],3,axis=-1),True)
m=bpy.data.materials.new("V15 wrought iron cold corrosion UV PBR")
m.use_nodes=True;nodes=m.node_tree.nodes;links=m.node_tree.links
bs=nodes.get("Principled BSDF")
bs.inputs["Metallic"].default_value=.52
bs.inputs["Roughness"].default_value=.78
color_node=nodes.new("ShaderNodeTexImage");color_node.image=col
rough_node=nodes.new("ShaderNodeTexImage");rough_node.image=roughimg
links.new(color_node.outputs["Color"],bs.inputs["Base Color"])
links.new(rough_node.outputs["Color"],bs.inputs["Roughness"])
targets=[]
for obj in list(bpy.context.scene.objects):
 if obj.type!="MESH":continue
 name=obj.name
 if name.startswith(("curved_ironstrap_","real_iron_rivet","V09 washer anchored to original rivet","V08 bent bracket lip")):
  targets.append(obj)
assert len(targets)>=8, "Unexpected forged hardware inventory"
for obj in targets:
 bpy.ops.object.select_all(action="DESELECT")
 obj.hide_set(False);obj.select_set(True);bpy.context.view_layer.objects.active=obj
 if not obj.data.uv_layers:
  bpy.ops.object.mode_set(mode="EDIT")
  bpy.ops.mesh.select_all(action="SELECT")
  bpy.ops.uv.smart_project(island_margin=.03)
  bpy.ops.object.mode_set(mode="OBJECT")
 obj.data.materials.clear();obj.data.materials.append(m)
assert len(wood.data.vertices)==oldverts and len(wood.data.polygons)==oldfaces
# Do not export protected backup; keep it in the saved editable blend.
backupcoll=backup.users_collection[0];backupcoll.objects.unlink(backup)
tag="b2_bucket_paddle_blender_v15"
glb=out/(tag+".glb")
bpy.ops.export_scene.gltf(filepath=str(glb),export_format="GLB",export_yup=True)
backupcoll.objects.link(backup);backup.hide_set(True);backup.hide_render=True
scene=bpy.context.scene;scene.render.engine="CYCLES";scene.cycles.samples=32
scene.render.resolution_x=820;scene.render.resolution_y=820;scene.render.resolution_percentage=100
cam=scene.camera;cam.data.type="ORTHO";cam.data.ortho_scale=1.7
files=[glb]
for view,pos in [("front",(0,-2.5,.12)),("side",(2.8,0,.12)),
                 ("angle",(1.65,-2.15,.72)),("back",(0,2.5,.12))]:
 cam.location=pos;cam.rotation_euler=(-cam.location).to_track_quat("-Z","Y").to_euler()
 path=out/(tag+"_"+view+".png");scene.render.filepath=str(path)
 bpy.ops.render.render(write_still=True);files.append(path)
blend=out/(tag+".blend");bpy.ops.wm.save_as_mainfile(filepath=str(blend));files.append(blend)
manifest={"asset":tag,"status":"NOT_APPROVED","source_v14_sha256":sha,
 "timber_geometry_preserved":True,"retextured_hardware_objects":len(targets),
 "forged_iron_texture_maps":2,"wood_CC0_photo_maps":"Poly Haven wood_planks, unchanged",
 "files":{}}
for path in files:
 b=path.read_bytes();manifest["files"][path.name]={"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest()}
(out/(tag+"_manifest.json")).write_text(json.dumps(manifest,indent=2))
print("V15_NATIVE_BLENDER_FORGED_METAL_PBR",len(targets),flush=True)
