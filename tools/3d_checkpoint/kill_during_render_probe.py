"""Isolated destructive-in-process QA: terminate only this Blender child at render_pre.

Never load untrusted files. The caller must separately verify and ClamAV-scan
the original checkpoint BEFORE launching this process.
"""
import bpy
import os
from pathlib import Path
import signal
from mathutils import Vector

source = Path(os.environ["RESUME_BLEND"]).resolve(strict=True)
if source.suffix != ".blend" or not source.is_file():
    raise RuntimeError("Verified .blend path required")
bpy.ops.wm.open_mainfile(filepath=str(source), load_ui=False)
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 128
scene.render.resolution_x = 900
scene.render.resolution_y = 650
scene.render.resolution_percentage = 100
bpy.ops.object.camera_add(location=(17, -21, 12))
cam = bpy.context.object
cam.rotation_euler = (Vector((0, 0, 3.8)) - cam.location).to_track_quat("-Z", "Y").to_euler()
cam.data.type = "ORTHO"
cam.data.ortho_scale = 20
scene.camera = cam
scene.render.filepath = os.environ.get("KILL_PROBE_OUTPUT", "/tmp/blender-kill-probe.png")
sentinel = Path(os.environ["KILL_PROBE_SENTINEL"]).resolve()
sentinel.parent.mkdir(parents=True, exist_ok=True)

def kill_own_render_process(_scene):
    sentinel.write_text("BLENDER_RENDER_PRE_REACHED\n", encoding="ascii")
    print("BLENDER_RENDER_PRE_REACHED=true; SIGKILL THIS BLENDER PROCESS", flush=True)
    os.kill(os.getpid(), signal.SIGKILL)

bpy.app.handlers.render_pre.append(kill_own_render_process)
bpy.ops.render.render(write_still=True)
raise RuntimeError("Kill probe reached render completion unexpectedly")
