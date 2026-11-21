#!/usr/bin/env python3
"""Fail-closed wall-clock budget guard for durable Blender iteration boundaries.

This guard is deliberately called BETWEEN verified, uploaded stages, never in the
middle of a Blender save/render. It does not promise to recover a killed process.
"""
import argparse
import json
import os
import time


def decide(elapsed_seconds, budget_minutes=80, reserve_minutes=10):
    if budget_minutes <= 0 or reserve_minutes < 0 or reserve_minutes >= budget_minutes:
        raise ValueError("Invalid stage budget")
    if elapsed_seconds < 0:
        raise ValueError("Invalid elapsed time")
    remaining = budget_minutes * 60 - elapsed_seconds
    return {"continue": remaining > reserve_minutes * 60,
            "remaining_seconds": max(0, round(remaining)),
            "budget_minutes": budget_minutes,
            "reserve_minutes": reserve_minutes}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start-epoch", type=float, required=True)
    parser.add_argument("--budget-minutes", type=int, default=80)
    parser.add_argument("--reserve-minutes", type=int, default=10)
    args = parser.parse_args()
    result = decide(time.time() - args.start_epoch, args.budget_minutes, args.reserve_minutes)
    print("STAGE_BUDGET " + json.dumps(result, sort_keys=True))
    if not result["continue"]:
        print("STAGE_BUDGET_STOP=1; do not begin another Blender iteration; upload existing verified checkpoint")
    return 0 if result["continue"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
