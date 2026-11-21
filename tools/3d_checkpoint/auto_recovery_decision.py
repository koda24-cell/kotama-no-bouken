#!/usr/bin/env python3
"""Validate a failed staged run and a matching uploaded stage-one artifact.

Never dispatch unless all provenance checks pass. This tool only prints a decision.
"""
import json
import re
import sys
import argparse

SHA = re.compile(r"^[0-9a-f]{40}$")
ARTIFACT = re.compile(r"^stage-one-b2-watergate-NOT-APPROVED-([0-9]+)$")


def choose(run, artifacts, repository, attempts=0):
    if not isinstance(run, dict) or not isinstance(artifacts, list):
        raise ValueError("invalid metadata")
    if not isinstance(attempts, int) or attempts < 0 or attempts > 2:
        raise ValueError("invalid attempts")
    if run.get("repository", {}).get("full_name") != repository:
        raise ValueError("repository mismatch")
    if run.get("head_branch") != "development" or not SHA.fullmatch(str(run.get("head_sha", ""))):
        raise ValueError("untrusted branch or SHA")
    if run.get("path") != ".github/workflows/blender53-stage-boundary-checkpoints.yml":
        raise ValueError("workflow not allowlisted")
    if run.get("event") == "workflow_run":
        raise ValueError("recursive trigger")
    if run.get("status") != "completed" or run.get("conclusion") not in ("failure", "timed_out"):
        return {"dispatch": False, "reason": "not a failed run"}
    if attempts >= 2:
        return {"dispatch": False, "reason": "retry limit reached"}
    matches = []
    for a in artifacts:
        if not isinstance(a, dict) or a.get("expired") is not False:
            continue
        name = a.get("name", "")
        m = ARTIFACT.fullmatch(name) if isinstance(name, str) else None
        if m and int(m.group(1)) == run.get("id") and a.get("workflow_run", {}).get("id") == run.get("id"):
            matches.append(a)
    if len(matches) != 1:
        return {"dispatch": False, "reason": "missing or ambiguous durable stage-one artifact"}
    return {"dispatch": True, "run_id": run["id"], "artifact_name": matches[0]["name"],
            "source_sha": run["head_sha"], "attempt": attempts + 1}


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--event", required=True)
    p.add_argument("--artifacts", required=True)
    p.add_argument("--repository", required=True)
    p.add_argument("--attempts", type=int, default=0)
    args = p.parse_args()
    try:
        with open(args.event, encoding="utf-8") as f:
            run = json.load(f)["workflow_run"]
        with open(args.artifacts, encoding="utf-8") as f:
            artifacts = json.load(f)["artifacts"]
        print(json.dumps(choose(run, artifacts, args.repository, args.attempts)))
    except (OSError, KeyError, ValueError, TypeError) as exc:
        print("AUTO_RECOVERY_REJECTED: " + str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
