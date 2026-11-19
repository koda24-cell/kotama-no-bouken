"""Download a pinned CC0 ambientCG bark PBR pack for a review-only Blender job.

Only fixed official URLs are accepted. Never use unverified Pinterest imagery as
a redistributable texture. Fail closed on missing/invalid maps.
"""
from pathlib import Path
import hashlib
import io
import json
import os
import urllib.request
import zipfile

ASSET = "Bark015"
URL = "https://ambientcg.com/get?file=Bark015_1K-PNG.zip"
LICENSE = "https://docs.ambientcg.com/license/"
OUT = Path("render-output/floor6/cc0-bark-source")
OUT.mkdir(parents=True, exist_ok=True)
MAX_ARCHIVE = 60 * 1024 * 1024
MAX_MAP = 30 * 1024 * 1024

request = urllib.request.Request(URL, headers={"User-Agent": "Kotama-CC0-Asset-Validation/1.0"})
with urllib.request.urlopen(request, timeout=60) as response:
    final_url = response.geturl()
    if not final_url.startswith(("https://ambientcg.com/", "https://acg-media.struffelproductions.com/", "https://ambientcg-downloads.struffelproductions.com/")):
        # ambientCG may use CDN redirects; reject unknown hosts rather than fetch arbitrary data.
        from urllib.parse import urlsplit
        host = (urlsplit(final_url).hostname or "").lower()
        if not (host == "ambientcg.com" or host.endswith(".ambientcg.com") or host.endswith(".struffelproductions.com")):
            raise ValueError("Unexpected asset CDN host: " + host)
    blob = response.read(MAX_ARCHIVE + 1)
if not blob.startswith(b"PK") or len(blob) > MAX_ARCHIVE:
    raise ValueError("Invalid or oversized zip")
# Scan downloaded ZIP before opening or extracting untrusted archive.
import subprocess
raw_archive=OUT/"Bark015_1K-PNG_unscanned.zip"
raw_archive.write_bytes(blob)
scan=subprocess.run(["clamscan","--infected","--no-summary",str(raw_archive)],capture_output=True,text=True)
if scan.returncode!=0:
    raise RuntimeError("ClamAV ZIP validation failed: "+(scan.stdout+scan.stderr)[-1000:])
archive_sha = hashlib.sha256(blob).hexdigest()
archive = zipfile.ZipFile(io.BytesIO(blob))
candidates = {}
for f in archive.infolist():
    if f.is_dir():
        continue
    if f.file_size > MAX_MAP:
        raise ValueError("Oversized map")
    basename = Path(f.filename).name
    if not basename.lower().endswith(".png"):
        continue
    low = basename.lower()
    kind = None
    if "color" in low or "albedo" in low or "diffuse" in low:
        kind = "color"
    elif "normal" in low and "dx" not in low and "directx" not in low:
        kind = "normal"
    elif "opacity" in low or "alpha" in low:
        kind = "opacity"
    elif "roughness" in low:
        kind = "roughness"
    if kind and kind not in candidates:
        data = archive.read(f)
        if not data.startswith(b"\x89PNG\r\n\x1a\n"):
            raise ValueError("Invalid PNG " + basename)
        target = OUT / (kind + ".png")
        target.write_bytes(data)
        candidates[kind] = {
            "filename": target.name,
            "original_filename": basename,
            "sha256": hashlib.sha256(data).hexdigest(),
            "bytes": len(data),
        }
if "color" not in candidates:
    raise ValueError("Color map missing. Archive entries: " + str(archive.namelist()[:25]))
meta = dict(asset=ASSET, official_page="https://ambientcg.com/view?id=Bark015",
            source_url=URL, license="CC0", license_url=LICENSE,
            archive_sha256=archive_sha, maps=candidates, status="SOURCE_FETCHED_NOT_APPROVED")
(OUT / "source_manifest.json").write_text(json.dumps(meta, indent=2) + "\n")
print("F6_CC0_BARK_DOWNLOAD_OK", list(candidates))
