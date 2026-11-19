"""Reject embedded Python code and scripted drivers in downloaded .blend files.
Run using Blender --background --disable-autoexec --python this_script.py -- <folder>.
This is defense in depth, not a proof that a Blender file is harmless.
"""
import bpy
import pathlib
import sys
import json

root = pathlib.Path(sys.argv[sys.argv.index("--") + 1]).resolve()
files = sorted(root.rglob("*.blend"))
if not files:
    raise SystemExit("FAIL: no downloaded Blender files to inspect")
report = []
for path in files:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.wm.open_mainfile(filepath=str(path), load_ui=False, use_scripts=False)
    findings = []
    for text in bpy.data.texts:
        findings.append("embedded text datablock: " + text.name)
    for action in bpy.data.actions:
        anim = getattr(action, "animation_data", None)
        if anim:
            for fcurve in anim.drivers:
                findings.append("scripted action driver: " + action.name)
    for collection in (bpy.data.objects, bpy.data.materials, bpy.data.worlds,
                       bpy.data.node_groups, bpy.data.scenes, bpy.data.cameras,
                       bpy.data.lights, bpy.data.meshes):
        for item in collection:
            anim = getattr(item, "animation_data", None)
            if anim:
                for fcurve in anim.drivers:
                    if fcurve.driver.type == "SCRIPTED":
                        findings.append("scripted driver: " + item.name)
    report.append({"file": path.name, "findings": findings})
    if findings:
        print("BLEND_PYTHON_SAFETY_FAILED", json.dumps(report))
        raise SystemExit(1)
print("BLEND_PYTHON_SAFETY_PASSED", json.dumps(report))
