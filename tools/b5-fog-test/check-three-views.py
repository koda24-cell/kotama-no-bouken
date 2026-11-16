#!/usr/bin/env python3
"""Technical image QA for B5 VFX preview, not artistic approval."""
from pathlib import Path
from PIL import Image, ImageStat
import hashlib, json, os
root=Path("render-output/b5-fog")
views={}
for view in ("front","side","angle"):
    path=root/f"b5-v5-{view}.png"
    if not path.exists(): raise SystemExit(f"Missing {path}")
    with Image.open(path) as image:
        image.load()
        if image.size != (1100,620): raise SystemExit(f"Unexpected {view} size {image.size}")
        rgb=image.convert("RGB")
        stat=ImageStat.Stat(rgb)
        gray=rgb.convert("L")
        hist=gray.histogram()
        total=sum(hist)
        black_fraction=sum(hist[:6])/total
        mean_luma=sum(i*v for i,v in enumerate(hist))/total
        if black_fraction>.98: raise SystemExit(f"{view}: nearly blank image")
        if mean_luma<2: raise SystemExit(f"{view}: too dark to evaluate")
        views[view]={"file":str(path),"sha256":hashlib.sha256(path.read_bytes()).hexdigest(),"width":image.width,"height":image.height,"mean_luma":round(mean_luma,3),"black_fraction":round(black_fraction,5),"rgb_mean":[round(x,3) for x in stat.mean]}
report={"source_sha":os.environ.get("GITHUB_SHA","unknown"),"run_id":os.environ.get("GITHUB_RUN_ID","unknown"),"approval":"NOT_APPROVED","renderer":"Playwright Chromium Three.js WebGL","qa":"TECHNICAL_IMAGE_CHECK_ONLY","views":views,"checkpoint_note":"VFX output uses deterministic source and GitHub commit for rerun. Blender .blend checkpoint and GLB are not applicable."}
(root/"manifest.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps(report,ensure_ascii=False,indent=2))
