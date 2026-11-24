import json, os, subprocess, sys
from pathlib import Path
spec=json.loads(os.environ["GALLERY_SPEC"])
if spec.get("publication_cleared") is not True:
    raise ValueError("Publication clearance required")
cmd=[sys.executable,str(Path(__file__).with_name("export_gallery_manifest.py")),"--source",os.environ["OUTPUT_DIR"],"--dest","gallery-output/model","--publication-cleared"]
for key in ("id","name","floor","version","kind"):
    cmd.extend(["--"+key,spec[key]])
for image in spec["images"]:
    cmd.extend(["--image",image["view"],image["file"]])
subprocess.run(cmd,check=True)
