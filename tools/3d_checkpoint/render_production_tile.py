"""Render a planned tile from a verified scene using its existing named camera.
Caller must verify and scan scene and settings before invoking Blender.
"""
import bpy
import os,sys,json
from pathlib import Path
sys.path.insert(0,os.environ.get("PRODUCTION_SCRIPT_DIR",str(Path(__file__).resolve().parent)))
from production_tiles import plan_tiles
settings=json.loads(Path(os.environ["RENDER_PLAN"]).read_text())
units=plan_tiles(settings["width"],settings["height"],settings["columns"],settings["rows"],settings["views"],settings["frames"])
unit=next(u for u in units if u["id"]==os.environ["RENDER_UNIT"])
source=Path(os.environ["RESUME_BLEND"]).resolve(strict=True)
output=Path(os.environ["RENDER_OUTPUT"]).resolve()
output.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(source),load_ui=False)
scene=bpy.context.scene
camera=bpy.data.objects.get(settings["cameras"][unit["view"]])
if camera is None or camera.type!="CAMERA" or camera.name not in scene.objects:
    raise RuntimeError("Missing scene camera")
scene.camera=camera
scene.frame_set(unit["frame"])
w,h=settings["width"],settings["height"]
x0,y0,x1,y1=unit["bounds"]
r=scene.render
r.resolution_x=w
r.resolution_y=h
r.resolution_percentage=100
r.use_border=True
r.use_crop_to_border=True
r.border_min_x=x0/w
r.border_max_x=x1/w
r.border_min_y=y0/h
r.border_max_y=y1/h
r.image_settings.file_format="PNG"
r.image_settings.color_mode="RGBA"
r.image_settings.color_depth="8"
r.filepath=str(output/(unit["id"]+".png"))
bpy.ops.render.render(write_still=True)
print("PRODUCTION_TILE_COMPLETE",unit["id"],unit["bounds"],flush=True)
