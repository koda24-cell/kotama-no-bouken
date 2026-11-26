"""Lossless delivery variants for the ten newly assigned enemy illustrations."""
from pathlib import Path
from PIL import Image
import hashlib, json, subprocess

ROOT = Path("assets/monsters")
NAMES = [
    "13964637-9c62-4394-a172-31b721771096.png",
    "33710b53-8af8-4ef3-b69b-a204696db496.png",
    "62ee5c0e-50b9-41c6-90f2-618d52d120a0.png",
    "64bb1648-e941-4a0f-b475-0e8b1a0c1181.png",
    "7a6e64a3-1704-4d0e-b46f-006befd1801d.png",
    "a7ceca83-c5cc-4b88-a19c-259865aa9347.png",
    "dcebcee7-80cb-4260-8ded-3680ee605f6b.png",
    "e16ff5a5-7daf-4a04-a823-3ab68e474647.png",
    "毒胞子を放つキノコもどき.png",
    "氷晶をまとった鉱石ガニ.png",
]
rows, replacements = [], {}
for name in NAMES:
    src = ROOT / name
    dst = src.with_suffix(".webp")
    tmp = dst.with_suffix(".webp.tmp")
    original = src.read_bytes()
    row = dict(path=src.as_posix(), png_bytes=len(original),
               original_sha256=hashlib.sha256(original).hexdigest(), selected=False)
    try:
        with Image.open(src) as im:
            if im.format != "PNG" or im.n_frames != 1 or im.mode not in ("RGB","RGBA","P","LA","L") or original[24] > 8:
                raise ValueError("Unsupported source format")
            profile = im.info.get("icc_profile")
            if not profile and "gamma" in im.info and abs(im.info["gamma"]-0.45455)>0.0001:
                raise ValueError("Non-sRGB gamma requires review")
            if not profile and im.info.get("chromaticity") and "srgb" not in im.info:
                raise ValueError("Unprofiled chromaticity requires review")
            rgba = im.convert("RGBA")
            options = dict(lossless=True, quality=100, method=6, exact=True)
            if profile: options["icc_profile"] = profile
            rgba.save(tmp, "WEBP", **options)
            with Image.open(tmp) as check:
                if check.size != im.size or check.convert("RGBA").tobytes() != rgba.tobytes():
                    raise ValueError("RGBA or dimensions mismatch")
                if check.info.get("icc_profile") != profile:
                    raise ValueError("ICC mismatch")
            row.update(width=im.width,height=im.height,rgba_exact=True,icc_exact=True,
                       webp_bytes=tmp.stat().st_size)
            if row["webp_bytes"] < len(original):
                tmp.replace(dst)
                row.update(selected=True,webp_sha256=hashlib.sha256(dst.read_bytes()).hexdigest())
                replacements[src.as_posix()] = dst.as_posix()
            else:
                row["reason"] = "Not smaller than PNG"
    except (ValueError,OSError) as e:
        row["reason"] = str(e)
    finally:
        tmp.unlink(missing_ok=True)
    if src.read_bytes() != original: raise RuntimeError("Original changed: "+name)
    rows.append(row)

changes = []
for name in subprocess.check_output(["git","ls-files","-z"]).decode().split("\0"):
    if not name or not name.endswith((".js",".css",".html",".mjs")): continue
    p = Path(name)
    if len(p.parts)>1 and p.parts[0] not in ("data","field","css") and name!="tools/test-image-lifetime-browser.mjs": continue
    before=p.read_text(encoding="utf-8")
    after=before
    for png,webp in replacements.items():
        after=after.replace(png,webp)
        if name=="tools/test-image-lifetime-browser.mjs":
            after=after.replace('"'+Path(png).name+'"','"'+Path(webp).name+'"')
    if after!=before:
        p.write_text(after,encoding="utf-8")
        changes.append(name)
result=dict(images=rows,changed_files=changes,
            total_png_bytes=sum(r["png_bytes"] for r in rows),
            total_display_bytes=sum(r["webp_bytes"] if r["selected"] else r["png_bytes"] for r in rows))
(ROOT/"recent-enemy-lossless-report.json").write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps(result,ensure_ascii=False,indent=2))
if not replacements: raise RuntimeError("No smaller pixel-identical variants produced")
