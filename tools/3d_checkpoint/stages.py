#!/usr/bin/env python3
"""Fail-closed stage config validator for checkpointed Blender pipelines."""
import argparse
import json
from pathlib import Path
import re
import sys

ID = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,99}$")
SCRIPT = re.compile(r"^tools/[a-zA-Z0-9_./-]+\.py$")
ALLOWED = {"build", "resume", "render", "export", "qa"}


def validate(config, root=Path(".")):
    if not isinstance(config, dict) or set(config) != {"asset_id", "stages"}:
        raise ValueError("Invalid config keys")
    if not isinstance(config["asset_id"], str) or not ID.fullmatch(config["asset_id"]):
        raise ValueError("Invalid asset id")
    stages = config["stages"]
    if not isinstance(stages, list) or not 1 <= len(stages) <= 12:
        raise ValueError("Stage count must be 1..12")
    names = set()
    for i, stage in enumerate(stages):
        if not isinstance(stage, dict) or set(stage) != {"name", "script"}:
            raise ValueError("Invalid stage keys")
        name, script = stage["name"], stage["script"]
        if not isinstance(name, str) or name not in ALLOWED or name in names:
            raise ValueError("Invalid or repeated stage")
        if not isinstance(script, str) or not SCRIPT.fullmatch(script) or ".." in script.split("/"):
            raise ValueError("Unsafe script path")
        path = root / script
        if path.is_symlink() or not path.is_file():
            raise ValueError("Missing or symlinked stage script")
        names.add(name)
    return stages


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    parser.add_argument("--stage", type=int, required=True)
    args = parser.parse_args()
    try:
        path = Path(args.config)
        if path.is_symlink() or not path.is_file():
            raise ValueError("Missing config")
        data = json.loads(path.read_text(encoding="utf-8"))
        stages = validate(data)
        if args.stage < 1 or args.stage > len(stages):
            raise ValueError("Stage index outside config")
        stage = stages[args.stage - 1]
        print(json.dumps({"asset_id": data["asset_id"], "stage": args.stage, **stage}))
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"STAGE_REJECTED: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
