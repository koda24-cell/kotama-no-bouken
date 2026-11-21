#!/usr/bin/env python3
"""Strict adapter: route a bounded Blender stage plan to GitHub Actions outputs.

Run after stage-one checkpoint has been verified AND uploaded. Never approves
assets and never dispatches a cross-workflow or cross-repository event.
"""
import argparse
import json
import os
from pathlib import Path
import time

from stage_plan import plan


def outputs(completed_stage, max_stages, elapsed_seconds):
    result = plan(completed_stage, max_stages, elapsed_seconds)
    if result["action"] not in ("continue", "handoff", "finish"):
        raise ValueError("Unexpected action")
    return result


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--completed-stage", type=int, required=True)
    p.add_argument("--max-stages", type=int, required=True)
    p.add_argument("--start-epoch", type=float, required=True)
    p.add_argument("--simulate-minutes", type=int, default=0)
    args = p.parse_args()
    if args.simulate_minutes < 0 or args.simulate_minutes > 79:
        raise ValueError("Simulation minutes out of safe test range")
    if args.simulate_minutes and os.getenv("BUDGET_DRILL_ALLOWED") != "true":
        raise ValueError("Simulation forbidden outside isolated drill branch")
    elapsed = args.simulate_minutes * 60 if args.simulate_minutes else time.time() - args.start_epoch
    result = outputs(args.completed_stage, args.max_stages, elapsed)
    print("STAGE_ROUTE " + json.dumps(result, sort_keys=True))
    output = os.getenv("GITHUB_OUTPUT")
    if output:
        with Path(output).open("a", encoding="utf-8") as stream:
            stream.write(f"action={result['action']}\n")
            stream.write(f"handoff_required={str(result['handoff_required']).lower()}\n")
            stream.write(f"next_stage={result['next_stage'] if result['next_stage'] is not None else ''}\n")
            stream.write(f"remaining_seconds={result['remaining_seconds']}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
