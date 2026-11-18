#!/usr/bin/env python3
"""Inspect a .blend without enabling embedded Python. Run only in an isolated container."""
import bpy, hashlib, json, os, re, sys, traceback
path = sys.argv[sys.argv.index("--")+1]
result = {"file":path.replace("/assets/","assets/",1),"status":"error","autoexec_disabled":True,"embedded_texts":[],"drivers":[],"external_references":[],"warnings":[]}
PAT = re.compile(r"\b(?:exec|eval|compile|__import__|subprocess|Popen|os\.system|socket|urllib|requests|httpx|ctypes|pickle|base64|importlib|bpy\.app\.handlers)\b|https?://",re.I)
try:
    bpy.context.preferences.filepaths.use_scripts_auto_execute = False
    # Blender's saved .blend may be wrapped in a zstd stream. Decode without running scripts.
    # A strict file-size limit protects this sandbox against decompression bombs.
    import tempfile, subprocess, resource
    with open(path, "rb") as f:
        magic=f.read(4)
    if magic == bytes((0x28,0xB5,0x2F,0xFD)):
        tmp="/tmp/decoded.blend"
        with open(tmp,"wb") as dest:
            def restrict():
                resource.setrlimit(resource.RLIMIT_FSIZE,(256*1024*1024,256*1024*1024))
            subprocess.run(["zstd","-d","-q","-c",path],stdout=dest,stderr=subprocess.PIPE,check=True,timeout=35,preexec_fn=restrict)
        result["decompressed_zstd"]=True
        path=tmp
    with open(path,"rb") as f:
        result["decoded_header"]=f.read(7).decode("ascii","replace")
    if result["decoded_header"] != "BLENDER":
        raise ValueError("Decoded file has no BLENDER header")
    bpy.ops.wm.open_mainfile(filepath=path, load_ui=False, use_scripts=False)
    bpy.context.preferences.filepaths.use_scripts_auto_execute = False
    for t in bpy.data.texts:
        body=t.as_string()
        result["embedded_texts"].append({"name":t.name,"length":len(body),"sha256":hashlib.sha256(body.encode("utf-8","replace")).hexdigest(),"risk_indicators":list(dict.fromkeys(m.group(0) for m in PAT.finditer(body)))[:30],"starts_with_python":body.startswith("#!") or "import " in body})
    for coll in (bpy.data.objects,bpy.data.materials,bpy.data.node_groups,bpy.data.scenes,bpy.data.worlds,bpy.data.cameras,bpy.data.lights,bpy.data.shape_keys):
        for block in coll:
            anim=getattr(block,"animation_data",None)
            if not anim:continue
            for fcurve in getattr(anim,"drivers",()):
                drv=fcurve.driver
                result["drivers"].append({"owner":block.name,"path":fcurve.data_path,"type":drv.type,"expression":str(drv.expression)[:300]})
    for label,coll in (("library",bpy.data.libraries),("image",bpy.data.images),("sound",bpy.data.sounds),("movieclip",bpy.data.movieclips),("font",bpy.data.fonts)):
        for item in coll:
            p=getattr(item,"filepath","")
            if p and not p.startswith("//"):
                result["external_references"].append({"kind":label,"name":item.name,"filepath":p[:350]})
    result["status"]="inspected"
except BaseException as e:
    result["error"]=str(e)[:300]
    result["warnings"].append(traceback.format_exc()[-1200:])
finally:
    print("AUDIT_RESULT_JSON "+json.dumps(result,ensure_ascii=False),flush=True)
    # exit cleanly; the workflow independently rejects status != inspected
