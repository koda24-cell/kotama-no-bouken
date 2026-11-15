"""Attempt isolated addon registration in background Blender and record results.
Third-party addon source is fetched from upstream in GitHub Actions, never committed
into the game repository. This smoke test does not modify imported character meshes.
"""
import bpy, os, json, sys, traceback, importlib, shutil
from pathlib import Path
out=Path(os.environ.get("OUTPUT_DIR","output/vroid-shibu"));out.mkdir(parents=True,exist_ok=True)
root=Path("/tmp/addon_modules");root.mkdir(exist_ok=True)
result={"blender_version":bpy.app.version_string,"addons":{}}
for name,source,module in (
    ("hairmesh",Path("/tmp/hairmesh-upstream/hairmesh"),"hairmesh"),
    ("gbh",Path("/tmp/BlenderGBHTool-upstream"),"gbh_tool"),
):
    item={"source_present":source.is_dir(),"registered":False}
    result["addons"][name]=item
    if not source.is_dir():continue
    target=root/module
    try:
        if target.exists():shutil.rmtree(target)
        shutil.copytree(source,target,ignore=shutil.ignore_patterns(".git","__pycache__"))
        sys.path.insert(0,str(root))
        addon=importlib.import_module(module)
        item["imported"]=True
        if hasattr(addon,"register"):
            addon.register()
            item["registered"]=True
            item["registered_classes"]=[c.__name__ for c in bpy.types.Operator.__subclasses__() if module in getattr(c,"__module__","")][:40]
        else:item["error"]="No register() entrypoint"
    except Exception as exc:
        item["error"]=repr(exc)
        item["traceback"]=traceback.format_exc()[-4500:]
    finally:
        if item["registered"]:
            try:
                addon.unregister()
                item["unregistered"]=True
            except Exception as exc:item["unregister_error"]=repr(exc)
(out/"addon_probe.json").write_text(json.dumps(result,indent=2,ensure_ascii=False),encoding="utf-8")
print("ADDON_PROBE",json.dumps(result,ensure_ascii=False))
