#!/usr/bin/env python3
"""Fail-closed bounded retry decision for a GitHub Actions workflow_run event.

No API calls, no dispatch: emits a decision for a separate reviewed dispatcher.
"""
import argparse
import json
import re
import sys

SHA = re.compile(r"^[0-9a-f]{40}$")
WORKFLOWS = {"blender53-resume-watergate.yml", "b2-watergate-checkpoint-qa.yml"}
FAILURES = {"failure", "timed_out"}


def decide(event, attempts, expected_repo):
    if not isinstance(event, dict) or not isinstance(attempts, int) or not 0 <= attempts <= 2:
        raise ValueError("invalid event or attempt counter")
    run = event.get("workflow_run")
    if not isinstance(run, dict):
        raise ValueError("missing workflow run")
    if run.get("status") != "completed" or run.get("conclusion") not in FAILURES:
        return {"retry": False, "reason": "not a failed completed run"}
    repo = run.get("repository") or {}
    if repo.get("full_name") != expected_repo:
        raise ValueError("repository mismatch")
    if run.get("head_branch") != "development" or not SHA.fullmatch(str(run.get("head_sha", ""))):
        raise ValueError("untrusted branch or SHA")
    workflow = run.get("path", "").split("/")[-1]
    if workflow not in WORKFLOWS:
        raise ValueError("workflow not allowlisted")
    if run.get("event") == "workflow_run":
        raise ValueError("recursive workflow_run retry rejected")
    if attempts >= 2:
        return {"retry": False, "reason": "retry limit reached"}
    return {"retry": True, "reason": "eligible", "source_run_id": run["id"],
            "source_sha": run["head_sha"], "workflow": workflow, "attempt": attempts + 1}


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--event-json", required=True)
    p.add_argument("--attempts", type=int, required=True)
    p.add_argument("--repository", required=True)
    a = p.parse_args()
    try:
        with open(a.event_json, encoding="utf-8") as f:
            result = decide(json.load(f), a.attempts, a.repository)
        print(json.dumps(result, sort_keys=True))
    except (OSError, ValueError, KeyError, TypeError) as exc:
        print("RETRY_REJECTED: " + str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
