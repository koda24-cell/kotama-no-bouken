"""Probe HairMesh and GBH addon compatibility without altering source character assets.
Run via Blender --background --python tools/vroid-shibu/addon_probe.py.
Addons are downloaded separately from their upstream GitHub repositories.
"""
import bpy, os, json, sys, traceback
from pathlib import Path
out=Path(os.environ.get("OUTPUT_DIR","output/vroid-shibu"));out.mkdir(parents=True,exist_ok=True)
result={"blender_version":bpy.app.version_string,"addons":{}}
for name,folder in (("hairmesh","/tmp/hairmesh-upstream"),("gbh","/tmp/BlenderGBHTool-upstream")):
    p=Path(folder)
    result["addons"][name]={"downloaded":p.is_dir(),"registered":False}
    if not p.is_dir():continue
    try:
        # Do not enable arbitrary upstream scripts in this automated smoke test.
        # Explicitly record presence and compatibility; registration needs reviewed code.
        init=p/"hairmesh"/"__init__.py" if name=="hairmesh" else p/"__init__.py"
        result["addons"][name]["entrypoint_present"]=init.is_file()
        result["addons"][name]["entrypoint"]=str(init)
        result["addons"][name]["status"]="source acquired; not enabled; pending Blender compatibility review"
    except Exception as exc:
        result["addons"][name]["error"]=repr(exc)
(out/"addon_probe.json").write_text(json.dumps(result,indent=2),encoding="utf-8")
print("ADDON_PROBE",json.dumps(result))
