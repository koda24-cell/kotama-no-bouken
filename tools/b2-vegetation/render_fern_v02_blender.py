"""Render one generated wet fern GLB — front, side and angle.
Usage: blender -b --python-exit-code 1 --python tools/b2-vegetation/render_fern_blender.py
GLB remains an independent asset; no game files are touched.
"""
import bpy, os, math, json, hashlib
from pathlib import Path
from mathutils import Vector
root=Path(os.environ.get("B2_FERN_V02_OUTPUT","render-output/b2-wet-fern-v02")).resolve()
glb=root/"b2_wet_fern_v02_review.glb"
if not glb.exists():raise FileNotFoundError(glb)
bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(glb))
meshobjects=[o for o in bpy.context.scene.objects if o.type=="MESH"]
if not meshobjects:raise RuntimeError("GLB contains no meshes")
world=bpy.context.scene.world or bpy.data.worlds.new("World")
bpy.context.scene.world=world;world.use_nodes=True
world.node_tree.nodes["Background"].inputs["Color"].default_value=(.45,.51,.56,1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value=.7
def area(name,location,energy,size):
 bpy.ops.object.light_add(type="AREA",location=location)
 obj=bpy.context.object;obj.name=name;obj.data.energy=energy;obj.data.shape="DISK";obj.data.size=size
area("soft cool skylight",(2,-2,4),330,4)
area("warm bounce",(-3,2,2),110,3)
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type="ORTHO";cam.data.ortho_scale=2.15
sc=bpy.context.scene;sc.camera=cam
sc.render.engine="BLENDER_EEVEE"
sc.render.resolution_x=900;sc.render.resolution_y=900;sc.render.resolution_percentage=100
sc.render.image_settings.file_format="PNG"
sc.view_settings.view_transform="Standard"
sc.render.film_transparent=True
target=Vector((0,0,.34))
for name,position in [("front",(0,-2.7,1.15)),("side",(2.7,0,1.16)),("angle",(2,-2.7,1.55))]:
 cam.location=position;cam.rotation_euler=(target-cam.location).to_track_quat("-Z","Y").to_euler()
 sc.render.filepath=str(root/("b2_wet_fern_v02_review_"+name+".png"))
 bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(root/"b2_wet_fern_v02_review.blend"))
manifest=json.loads((root/"manifest.json").read_text())
manifest["status"]="NOT_APPROVED"
manifest["blender_render_views"]=["front","side","angle"]
files=[root/"b2_wet_fern_v02_review.glb",root/"b2_wet_fern_v02_review.blend"]+[root/("b2_wet_fern_v02_review_"+n+".png") for n in ("front","side","angle")]
manifest["files_sha256"]={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
(root/"manifest.json").write_text(json.dumps(manifest,indent=2,ensure_ascii=False))
print("B2_FERN_V02_BLENDER_RENDER_DONE",len(files),"files")
