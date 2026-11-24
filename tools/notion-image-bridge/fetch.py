#!/usr/bin/env python3
"""Fetch a Notion page image property with checksum and content validation."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import urllib.request

MAX_BYTES = 20 * 1024 * 1024
MAGIC = {".jpg": b"\xff\xd8\xff", ".png": b"\x89PNG\r\n\x1a\n", ".webp": b"RIFF"}

def request_json(url, token):
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}", "Notion-Version": "2022-06-28", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as res:
        return json.load(res)

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--page-id", required=True)
    p.add_argument("--property", default="写真")
    p.add_argument("--out", default="notion-image-output")
    a = p.parse_args()
    token = os.environ.get("NOTION_TOKEN")
    if not token:
        raise SystemExit("NOTION_TOKEN is required as a GitHub Actions secret")
    page = request_json("https://api.notion.com/v1/pages/" + a.page_id, token)
    prop = page.get("properties", {}).get(a.property)
    if not prop or prop.get("type") != "files" or not prop.get("files"):
        raise SystemExit("Notion image property not found or empty")
    item = prop["files"][0]
    url = item.get("file", {}).get("url") if item["type"] == "file" else item.get("external", {}).get("url")
    if not url or not url.startswith("https://"):
        raise SystemExit("HTTPS image URL missing")
    expected_prop = page.get("properties", {}).get("SHA256", {})
    expected = "".join(t.get("plain_text", "") for t in expected_prop.get("rich_text", [])) if expected_prop.get("type") == "rich_text" else ""
    req = urllib.request.Request(url, headers={"User-Agent": "NotionImageBridge/1.0"})
    with urllib.request.urlopen(req, timeout=60) as response:
        data = response.read(MAX_BYTES + 1)
    if not data or len(data) > MAX_BYTES:
        raise SystemExit("Image empty or exceeds 20 MiB")
    extension = next((ext for ext, sig in MAGIC.items() if data.startswith(sig)), None)
    if not extension or (extension == ".webp" and data[8:12] != b"WEBP"):
        raise SystemExit("Invalid or unsupported image signature")
    digest = hashlib.sha256(data).hexdigest()
    if expected and digest.lower() != expected.strip().lower():
        raise SystemExit("SHA256 mismatch; image not saved")
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    (out / ("reference" + extension)).write_bytes(data)
    (out / "manifest.json").write_text(json.dumps({"page_id": a.page_id, "property": a.property, "sha256": digest, "bytes": len(data), "filename": "reference" + extension, "verified_against_notion": bool(expected), "status": "REFERENCE_ONLY_NOT_APPROVED"}, indent=2), encoding="utf-8")
    print(f"Validated {len(data)} bytes; SHA256={digest}")

if __name__ == "__main__":
    main()
