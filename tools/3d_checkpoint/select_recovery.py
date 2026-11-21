#!/usr/bin/env python3
"""Select last successful checkpoint artifact from trusted GitHub Actions metadata.

Reads JSON input (API response), never downloads or executes artifact contents.
"""
import argparse
import json
import re
import sys

NAME = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,99}$")


def select(runs, artifacts, asset_id, max_attempts=2):
    if not NAME.fullmatch(asset_id):
        raise ValueError("invalid asset id")
    if not isinstance(max_attempts, int) or not 1 <= max_attempts <= 3:
        raise ValueError("retry limit outside 1..3")
    if not isinstance(runs, list) or not isinstance(artifacts, list):
        raise ValueError("invalid metadata")
    completed = {}
    for run in runs:
        if not isinstance(run, dict):
            continue
        if run.get("conclusion") == "success" and run.get("status") == "completed" and run.get("head_branch") == "development":
            completed[run.get("id")] = run
    matches = []
    prefix = f"{asset_id}-checkpoint-NOT-APPROVED-"
    for artifact in artifacts:
        if not isinstance(artifact, dict) or artifact.get("expired") is not False:
            continue
        name = artifact.get("name")
        if not isinstance(name, str) or not name.startswith(prefix):
            continue
        suffix = name[len(prefix):]
        if not suffix.isdecimal():
            continue
        run_id = int(suffix)
        if run_id not in completed or artifact.get("workflow_run", {}).get("id") != run_id:
            continue
        matches.append((run_id, artifact))
    if not matches:
        raise ValueError("no eligible successful checkpoint")
    run_id, artifact = max(matches, key=lambda pair: pair[0])
    return {"source_run_id": run_id, "artifact_id": artifact["id"], "artifact_name": artifact["name"],
            "max_attempts": max_attempts, "status": "NOT_APPROVED"}


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--runs-json", required=True)
    p.add_argument("--artifacts-json", required=True)
    p.add_argument("--asset-id", required=True)
    p.add_argument("--max-attempts", type=int, default=2)
    args = p.parse_args()
    try:
        with open(args.runs_json, encoding="utf-8") as f:
            runs = json.load(f)["workflow_runs"]
        with open(args.artifacts_json, encoding="utf-8") as f:
            artifacts = json.load(f)["artifacts"]
        print(json.dumps(select(runs, artifacts, args.asset_id, args.max_attempts)))
    except (OSError, KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
        print(f"RECOVERY_SELECTOR_REJECTED: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
