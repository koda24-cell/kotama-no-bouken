#!/usr/bin/env python3
"""Pure decision helper for bounded Blender stage transitions.

Does not dispatch GitHub Actions, render, or alter checkpoints. Call only after
the current stage has been verified and durably uploaded.
"""
import argparse
import json
import time
from stage_budget import decide


def plan(completed_stage, max_stages, elapsed_seconds, budget_minutes=80, reserve_minutes=10):
    if not isinstance(completed_stage, int) or not isinstance(max_stages, int):
        raise ValueError("Stages must be integers")
    if not (1 <= completed_stage <= max_stages <= 12):
        raise ValueError("Expected 1 <= completed_stage <= max_stages <= 12")
    budget = decide(elapsed_seconds, budget_minutes, reserve_minutes)
    if completed_stage == max_stages:
        reason = "MAX_STAGES_REACHED"
        action = "finish"
    elif not budget["continue"]:
        reason = "HANDOFF_REQUIRED"
        action = "handoff"
    else:
        reason = "CONTINUE_IN_CURRENT_JOB"
        action = "continue"
    return {
        "action": action,
        "reason": reason,
        "completed_stage": completed_stage,
        "max_stages": max_stages,
        "next_stage": completed_stage + 1 if completed_stage < max_stages else None,
        "remaining_seconds": budget["remaining_seconds"],
        "handoff_required": action == "handoff",
        "status": "NOT_APPROVED",
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--completed-stage", type=int, required=True)
    parser.add_argument("--max-stages", type=int, required=True)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--start-epoch", type=float)
    group.add_argument("--elapsed-seconds", type=float)
    parser.add_argument("--budget-minutes", type=int, default=80)
    parser.add_argument("--reserve-minutes", type=int, default=10)
    args = parser.parse_args()
    elapsed = args.elapsed_seconds if args.elapsed_seconds is not None else time.time() - args.start_epoch
    print("STAGE_PLAN " + json.dumps(plan(args.completed_stage, args.max_stages, elapsed,
                                          args.budget_minutes, args.reserve_minutes),
                                      sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
