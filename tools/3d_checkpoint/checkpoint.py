#!/usr/bin/env python3
"""Strict, stdlib-only Blender iteration checkpoint pack/verify.

Usage:
 python tools/3d_checkpoint/checkpoint.py pack --directory render-output/test --asset-id test --iteration 1 --source-script tools/test.py --source-commit SHA --next-step review
 python tools/3d_checkpoint/checkpoint.py verify --directory render-output/test --asset-id test --source-script tools/test.py
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import sys

SCHEMA = 1
MANIFEST = "checkpoint.json"
ASSET = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,99}$")
DIGEST = re.compile(r"^[0-9a-f]{64}$")


def sha256(path):
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def safe_files(root):
    for path in sorted(root.rglob("*")):
        if path.is_symlink():
            raise ValueError(f"Symlink forbidden: {path}")
        if path.is_file():
            rel = path.relative_to(root)
            if rel.as_posix() != MANIFEST:
                yield path, rel.as_posix()


def check_root(root):
    if not root.is_dir() or root.is_symlink():
        raise ValueError("Checkpoint directory missing or symlink")


def validate_name(name):
    if not ASSET.fullmatch(name):
        raise ValueError("Invalid asset id")


def pack(args):
    root = Path(args.directory).resolve(strict=True)
    check_root(root)
    validate_name(args.asset_id)
    script = Path(args.source_script)
    if not script.is_file() or script.is_symlink():
        raise ValueError("Source script missing or symlink")
    if (root / MANIFEST).exists():
        raise ValueError("Checkpoint manifest already exists: immutable checkpoint")
    files = {}
    for path, rel in safe_files(root):
        files[rel] = {"bytes": path.stat().st_size, "sha256": sha256(path)}
    if not files:
        raise ValueError("Cannot pack empty checkpoint")
    data = {
        "schema_version": SCHEMA, "asset_id": args.asset_id,
        "iteration": args.iteration, "source_commit": args.source_commit,
        "source_script": args.source_script,
        "source_script_sha256": sha256(script),
        "blender_version": args.blender_version,
        "docker_image_digest": args.docker_image_digest,
        "parent_checkpoint": args.parent_checkpoint,
        "parameters": {}, "next_step": args.next_step,
        "status": "NOT_APPROVED", "files": files
    }
    with (root / MANIFEST).open("x", encoding="utf-8") as output:
        json.dump(data, output, indent=2, ensure_ascii=False)
    print(f"CHECKPOINT_PACKED {args.asset_id} iteration={args.iteration} files={len(files)}")


def verify(args):
    root = Path(args.directory).resolve(strict=True)
    check_root(root)
    data = json.loads((root / MANIFEST).read_text(encoding="utf-8"))
    validate_name(args.asset_id)
    if data.get("schema_version") != SCHEMA or data.get("asset_id") != args.asset_id:
        raise ValueError("Incompatible checkpoint schema or asset")
    if data.get("status") != "NOT_APPROVED":
        raise ValueError("Checkpoint approval state invalid")
    if not isinstance(data.get("iteration"), int) or data["iteration"] < 1:
        raise ValueError("Invalid iteration")
    if args.source_commit and data.get("source_commit") != args.source_commit:
        raise ValueError("Source commit mismatch")
    script = Path(args.source_script)
    if not script.is_file() or script.is_symlink() or sha256(script) != data.get("source_script_sha256"):
        raise ValueError("Source script hash mismatch")
    if data.get("source_script") != args.source_script:
        raise ValueError("Source script path mismatch")
    if args.blender_version and data.get("blender_version") != args.blender_version:
        raise ValueError("Blender version mismatch")
    if args.docker_image_digest and data.get("docker_image_digest") != args.docker_image_digest:
        raise ValueError("Container digest mismatch")
    files = data.get("files")
    if not isinstance(files, dict) or not files:
        raise ValueError("Missing file inventory")
    actual = {rel: path for path, rel in safe_files(root)}
    if set(actual) != set(files):
        raise ValueError("Checkpoint file set mismatch")
    for rel, path in actual.items():
        meta = files[rel]
        if not isinstance(meta, dict) or not DIGEST.fullmatch(str(meta.get("sha256", ""))):
            raise ValueError(f"Invalid digest: {rel}")
        if path.stat().st_size != meta.get("bytes") or sha256(path) != meta["sha256"]:
            raise ValueError(f"Corrupt checkpoint: {rel}")
    print(f"CHECKPOINT_VERIFIED {args.asset_id} iteration={data['iteration']} files={len(files)}")


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    for command in ("pack", "verify"):
        p = sub.add_parser(command)
        p.add_argument("--directory", required=True)
        p.add_argument("--asset-id", required=True)
        p.add_argument("--source-script", required=True)
        p.add_argument("--source-commit", default="")
        p.add_argument("--blender-version", default="5.3.0")
        p.add_argument("--docker-image-digest", default="sha256:5ce601f79b1ab09405b3ebc36b1a596be76cb8b105b1524fcbafcb186ebf7e99")
        if command == "pack":
            p.add_argument("--iteration", type=int, required=True)
            p.add_argument("--parent-checkpoint", default=None)
            p.add_argument("--next-step", default="review")
    args = parser.parse_args()
    try:
        if args.command == "pack":
            if args.iteration < 1:
                raise ValueError("Iteration must be positive")
            pack(args)
        else:
            verify(args)
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as exc:
        print(f"CHECKPOINT_REJECTED: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
