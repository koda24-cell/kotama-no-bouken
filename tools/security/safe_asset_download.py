#!/usr/bin/env python3
"""Download an external asset to quarantine, scan with ClamAV, then release it.

Use in acquisition jobs BEFORE importing, unzipping, or executing third-party files.
A clean signature scan is not a guarantee that the file is safe to execute.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import urllib.parse
import urllib.request
import zipfile


def scan(path: Path) -> None:
    # Non-zero includes infection, scanner errors, or an unavailable scanner.
    cmd = ["clamscan", "--infected", "--no-summary", "--alert-exceeds-max=yes",
           "--max-filesize=100M", "--max-scansize=500M", str(path)]
    result = subprocess.run(cmd, text=True, stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT, timeout=600, check=False)
    if result.returncode != 0:
        raise RuntimeError("ClamAV blocked the asset (infection or scan error): " +
                           result.stdout[-4000:])


def digest(path: Path) -> str:
    sha = hashlib.sha256()
    with path.open("rb") as src:
        for part in iter(lambda: src.read(1024 * 1024), b""):
            sha.update(part)
    return sha.hexdigest()


def safe_extract(zf: zipfile.ZipFile, output: Path) -> None:
    members = zf.infolist()
    if len(members) > 2000:
        raise ValueError("Archive exceeds member-count limit")
    total = 0
    for info in members:
        name = info.filename.replace("\\", "/")
        parts = Path(name).parts
        mode = (info.external_attr >> 16) & 0o170000
        if (name.startswith("/") or any(part in ("..", "") for part in parts)
                or ":" in parts[0] or mode == 0o120000):
            raise ValueError("Unsafe ZIP path or symlink")
        total += info.file_size
        if total > 500 * 1024 * 1024 or info.file_size > 100 * 1024 * 1024:
            raise ValueError("Archive exceeds extraction size limit")
        if info.compress_size and info.file_size / info.compress_size > 100:
            raise ValueError("Excessive archive compression ratio")
    for info in members:
        target = output.joinpath(*Path(info.filename.replace("\\", "/")).parts)
        if info.is_dir():
            target.mkdir(parents=True, exist_ok=True)
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        with zf.open(info) as src, target.open("xb") as dst:
            shutil.copyfileobj(src, dst, length=1024 * 1024)
        scan(target)


def fetch(url: str, destination: Path, unpack_zip: bool, max_bytes: int) -> dict:
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme != "https" or not parsed.hostname:
        raise ValueError("Only HTTPS downloads are allowed")
    destination = destination.resolve()
    if destination.exists():
        raise FileExistsError("Refusing to overwrite existing destination")
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="asset-quarantine-") as tmp:
        quarantine = Path(tmp)
        incoming = quarantine / "download"
        request = urllib.request.Request(url, headers={"User-Agent": "KotamaAssetSafety/1.0"})
        with urllib.request.urlopen(request, timeout=60) as response:
            if urllib.parse.urlsplit(response.url).scheme != "https":
                raise ValueError("HTTPS redirected to an insecure location")
            with incoming.open("xb") as dst:
                count = 0
                while True:
                    data = response.read(1024 * 1024)
                    if not data:
                        break
                    count += len(data)
                    if count > max_bytes:
                        raise ValueError("Download exceeds size limit")
                    dst.write(data)
        if not incoming.stat().st_size:
            raise ValueError("Empty download")
        scan(incoming)  # Mandatory before opening any archive
        sha = digest(incoming)
        if unpack_zip:
            if not zipfile.is_zipfile(incoming):
                raise ValueError("Unpack requested but download is not ZIP")
            extracted = quarantine / "extracted"
            extracted.mkdir()
            with zipfile.ZipFile(incoming) as zf:
                safe_extract(zf, extracted)
            shutil.move(str(extracted), str(destination))
        else:
            shutil.move(str(incoming), str(destination))
        return {"source": url, "sha256": sha, "bytes": count,
                "destination": str(destination), "zip_extracted": unpack_zip,
                "clamav": "passed", "code_review": "not_performed"}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("url", help="HTTPS source URL")
    parser.add_argument("destination", type=Path, help="New output file or extracted directory")
    parser.add_argument("--unpack-zip", action="store_true")
    parser.add_argument("--max-mb", type=int, default=100)
    args = parser.parse_args()
    if not 1 <= args.max_mb <= 100:
        parser.error("--max-mb must be between 1 and 100")
    try:
        result = fetch(args.url, args.destination, args.unpack_zip,
                       args.max_mb * 1024 * 1024)
    except Exception as exc:
        parser.exit(1, f"BLOCKED: {exc}\n")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
