"""Fetch Poly Haven CC0 diffuse maps; scan each file immediately before making it available."""
import hashlib
import json
import os
import subprocess
import tempfile
import urllib.request

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "textures")
os.makedirs(ROOT, exist_ok=True)

class SecurityScanFailure(RuntimeError):
    """ClamAV detection or scanner error: never silently fall back."""

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "kotama-asset-research/1.0"})
    with urllib.request.urlopen(req, timeout=25) as response:
        return response.read()

def verified_download(url, destination):
    blob = get(url)
    if not blob:
        raise ValueError("Empty texture download")
    fd, pending = tempfile.mkstemp(prefix=".pending-scan-", dir=ROOT)
    try:
        with os.fdopen(fd, "wb") as out:
            out.write(blob)
        scan = subprocess.run(["clamscan", "--no-summary", pending], text=True, capture_output=True)
        if scan.returncode != 0 or " OK" not in scan.stdout:
            raise SecurityScanFailure(
                "ClamAV blocked download (infected or scanner error): "
                + scan.stdout[-1500:] + scan.stderr[-1500:]
            )
        os.replace(pending, destination)
        return len(blob), hashlib.sha256(blob).hexdigest()
    finally:
        if os.path.exists(pending):
            os.unlink(pending)

for query, dest in [("concrete", "concrete_diff.jpg"), ("rust", "rust_diff.jpg")]:
    try:
        assets = json.loads(get("https://api.polyhaven.com/assets?t=textures&c=" + query))
        candidates = [(key, val) for key, val in assets.items()
                      if query in (key + " " + str(val.get("name", ""))).lower()]
        if not candidates:
            candidates = list(assets.items())
        if not candidates:
            raise RuntimeError("No texture assets returned")
        key, _ = candidates[0]
        files = json.loads(get("https://api.polyhaven.com/files/" + key))
        options = files.get("Diffuse") or files.get("diffuse") or {}
        variants = options.get("1k") or options.get("2k") or {}
        item = variants.get("jpg") or variants.get("png") or next(iter(variants.values()), None)
        if not item or not item.get("url"):
            raise RuntimeError("No diffuse map")
        size, sha256 = verified_download(item["url"], os.path.join(ROOT, dest))
        print("TEXTURE_FETCH_SCANNED_OK", query, key, size, sha256, item["url"])
    except SecurityScanFailure:
        raise
    except Exception as exc:
        print("TEXTURE_FETCH_FAILED_USING_PROCEDURAL_FALLBACK", query, repr(exc))
