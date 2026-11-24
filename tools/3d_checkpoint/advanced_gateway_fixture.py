"""Shared gateway fixture for crack geometry and normal baking."""
import os,sys,json,hashlib,struct
from pathlib import Path
import bpy
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
from advanced_surface import apply
from advanced_cracks import add_cracks
from advanced_bake import bake_normal
out=Path(os.environ["OUTPUT_DIR"]).resolve()
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.mesh.primitive_cube_add()
obj=bpy.context.object
mat=bpy.data.materials.new("Stone");mat.use_nodes=True;obj.data.materials.append(mat)
def fingerprint():return hashlib.sha256(repr([tuple(v.co) for v in obj.data.vertices]).encode()).hexdigest()
before=fingerprint()
apply(obj,"surface")
image=bake_normal(obj)
image.filepath_raw=str(out/"normal.png");image.file_format="PNG";image.save()
face=max(obj.data.polygons,key=lambda p:p.normal.y*-1)
details=add_cracks(obj,face.index)
assert fingerprint()==before
s=bpy.context.scene;s.render.engine="CYCLES";s.cycles.samples=8;s.render.resolution_x=256;s.render.resolution_y=256;s.render.resolution_percentage=100
bpy.ops.object.camera_add();cam=bpy.context.object;s.camera=cam;cam.data.type="ORTHO";cam.data.ortho_scale=4
bpy.ops.object.light_add(type="AREA",location=(3,-4,5));l=bpy.context.object;l.data.energy=800;l.data.size=4;l.rotation_euler=(-l.location).to_track_quat("-Z","Y").to_euler()
for name,loc in {"front":(0,-6,0),"side":(6,0,0),"angle":(4,-5,3)}.items():
    cam.location=loc;cam.rotation_euler=(-cam.location).to_track_quat("-Z","Y").to_euler();s.render.filepath=str(out/(name+".png"));bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/"model.blend"))
bpy.ops.object.select_all(action="DESELECT")
for o in [obj]+details:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(out/"model.glb"),export_format="GLB",use_selection=True)
raw=(out/"model.glb").read_bytes();length,kind=struct.unpack_from("<II",raw,12);doc=json.loads(raw[20:20+length])
assert any("normalTexture" in m for m in doc["materials"])
assert doc.get("images")
(out/"review.json").write_text(json.dumps({"approval":"NOT_APPROVED","original_mesh_preserved":True,"crack_meshes":len(details),"normal_texture_embedded":True}))
