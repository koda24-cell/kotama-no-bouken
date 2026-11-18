"""Fetch CC0 Poly Haven diffuse maps; scan incoming bytes before release."""
import json
import os
from pathlib import Path
import sys
import urllib.request

REPO_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_ROOT / "tools" / "security"))
from safe_asset_download import fetch

root = Path(__file__).resolve().parent / "textures"
root.mkdir(parents=True, exist_ok=True)


def get_metadata(url):
    with urllib.request.urlopen(
        urllib.request.Request(url, headers={"User-Agent": "kotama-asset-research/1.0"}),
        timeout=25,
    ) as response:
        return json.load(response)


for query, dest in [("concrete", "concrete_diff.jpg"), ("rust", "rust_diff.jpg")]:
    try:
        assets = get_metadata("https://api.polyhaven.com/assets?t=textures&c=" + query)
        candidates = [
            (key, val)
            for key, val in assets.items()
            if query in (key + " " + str(val.get("name", ""))).lower()
        ]
        if not candidates:
            candidates = list(assets.items())
        if not candidates:
            raise RuntimeError("No texture assets returned")
        key, _ = candidates[0]
        files = get_metadata("https://api.polyhaven.com/files/" + key)
        options = files.get("Diffuse") or files.get("diffuse") or {}
        variants = options.get("1k") or options.get("2k") or {}
        item = variants.get("jpg") or variants.get("png") or next(iter(variants.values()), None)
        if not item or not item.get("url"):
            raise RuntimeError("No diffuse map")
        destination = root / dest
        if destination.exists():
            raise RuntimeError("Target already exists; refusing unscanned overwrite")
        result = fetch(item["url"], destination, False, 100 * 1024 * 1024)
        print("TEXTURE_FETCH_SCANNED_OK", query, key, result["sha256"], item["url"])
    except Exception as exc:
        print("TEXTURE_FETCH_BLOCKED_USING_PROCEDURAL_FALLBACK", query, repr(exc))
