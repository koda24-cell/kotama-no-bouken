"""Render one camera view from a verified Blender checkpoint; isolate risky work.

A calling workflow must validate source manifest and ClamAV scan before import.
Never mutates original .blend; only output/<view>.png is generated.
"""
import bpy
import os
from pathlib import Path
from mathutils import Vector
import signal

VIEWS = {"front": (0, -23, 10), "side": (22, -3, 10), "angle": (17, -21, 12)}
view = os.environ["RENDER_VIEW"]
if view not in VIEWS:
    raise RuntimeError("Unknown view")
source = Path(os.environ["RESUME_BLEND"]).resolve(strict=True)
output = Path(os.environ["RENDER_OUTPUT"]).resolve()
if not source.is_file() or source.suffix != ".blend":
    raise RuntimeError("Invalid .blend source")
output.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(source), load_ui=False)
scene = bpy.context.scene
world = scene.world or bpy.data.worlds.new("QA World")
scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.035, 0.07, 0.13, 1)

def light(pos, power, size):
    bpy.ops.object.light_add(type="AREA", location=pos)
    obj = bpy.context.object
    obj.data.energy = power
    obj.data.shape = "DISK"
    obj.data.size = size
    obj.rotation_euler = (Vector((0, 0, 3)) - obj.location).to_track_quat("-Z", "Y").to_euler()

light((1, -5, 12), 2100, 9)
light((-8, 2, 7), 1200, 7)
bpy.ops.object.camera_add(location=VIEWS[view])
cam = bpy.context.object
cam.rotation_euler = (Vector((0, 0, 3.8)) - cam.location).to_track_quat("-Z", "Y").to_euler()
cam.data.type = "ORTHO"
cam.data.ortho_scale = 20
scene.camera = cam
scene.render.engine = "CYCLES"
scene.cycles.samples = int(os.environ.get("RENDER_SAMPLES", "24"))
if not 1 <= scene.cycles.samples <= 512:
    raise RuntimeError("RENDER_SAMPLES outside safe range 1..512")
scene.render.resolution_x = 1000
scene.render.resolution_y = 760
scene.render.resolution_percentage = 100
scene.render.filepath = str(output / (view + ".png"))

if os.environ.get("KILL_AT_RENDER_PRE") == "1":
    sentinel = Path(os.environ["KILL_PROBE_SENTINEL"]).resolve()
    sentinel.parent.mkdir(parents=True, exist_ok=True)
    def on_render_pre(_scene):
        sentinel.write_text("KILL_DURING_" + view.upper() + "_RENDER_PRE\n", encoding="ascii")
        print("KILL_DURING_VIEW=" + view, flush=True)
        os.kill(os.getpid(), signal.SIGKILL)
    bpy.app.handlers.render_pre.append(on_render_pre)

bpy.ops.render.render(write_still=True)
print("SINGLE_VIEW_RENDER_COMPLETE=" + view)
