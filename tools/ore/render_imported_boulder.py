"""Render the actual downloaded CC0 boulder Blender scene from three angles.
Temporary review only; no game asset promotion.
"""
import bpy, sys, math, json, hashlib
from pathlib import Path
from mathutils import Vector
args=sys.argv[sys.argv.index("--")+1:]
src=Path(args[0]).resolve(); out=Path(args[1]).resolve();out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(src))
scene=bpy.context.scene
meshes=[o for o in scene.objects if o.type=="MESH" and not o.hide_render]
if not meshes:raise RuntimeError("no visible mesh in downloaded .blend")
# Use imported original geometry; no replacement or synthetic stand-in.
pts=[o.matrix_world @ Vector(corner) for o in meshes for corner in o.bound_box]
lo=Vector([min(p[i] for p in pts) for i in range(3)])
hi=Vector([max(p[i] for p in pts) for i in range(3)])
center=(lo+hi)/2
size=max((hi-lo).length,0.1)
for o in list(scene.objects):
    if o.type in {"CAMERA","LIGHT"}:bpy.data.objects.remove(o,do_unlink=True)
world=bpy.data.worlds.new("Ore Review Neutral World")
scene.world=world;world.use_nodes=True
world.node_tree.nodes.get("Background").inputs["Color"].default_value=(0.35,0.37,0.42,1)
world.node_tree.nodes.get("Background").inputs["Strength"].default_value=0.7
def light(name,loc,power,area):
    data=bpy.data.lights.new(name,"AREA");data.energy=power;data.shape="DISK";data.size=area
    obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj)
    obj.location=center+Vector(loc)*size
    obj.rotation_euler=(center-obj.location).to_track_quat("-Z","Y").to_euler()
light("Key",(0.7,-0.8,1.1),600,5)
light("Fill",(-0.7,0.3,0.6),350,6)
camera_data=bpy.data.cameras.new("ReviewCamera");cam=bpy.data.objects.new("ReviewCamera",camera_data)
scene.collection.objects.link(cam);scene.camera=cam
camera_data.type="ORTHO";camera_data.ortho_scale=size*1.35
scene.render.engine="CYCLES";scene.cycles.samples=24
scene.render.resolution_x=768;scene.render.resolution_y=768;scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.render.film_transparent=False
files={}
for name,direction in {"front":(0,-1,0.45),"side":(1,0,0.45),"angle":(1,-1,0.65)}.items():
    cam.location=center+Vector(direction).normalized()*size*2
    cam.rotation_euler=(center-cam.location).to_track_quat("-Z","Y").to_euler()
    p=out/(name+".png");scene.render.filepath=str(p)
    bpy.ops.render.render(write_still=True)
    files[p.name]={"sha256":hashlib.sha256(p.read_bytes()).hexdigest(),"bytes":p.stat().st_size}
manifest={"status":"NOT_APPROVED","source":str(src.name),"mesh_count":len(meshes),"bounds":[list(lo),list(hi)],"files":files}
(out/"render_manifest.json").write_text(json.dumps(manifest,indent=2))
print("RENDERED_REAL_IMPORTED_BLEND",json.dumps(manifest))
