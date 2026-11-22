# Blender 5.3 — Real elapsed-clock budget handoff experiment

## Context
PR #706 verified twelve successive Blender 5.3 checkpoint handoffs in a single run, but each 71-minute stage decision was simulated. This PR tests the guard using **actual wall-clock time**. It is separate from a future forced-kill recovery drill.

## Procedure
- Execute `.github/workflows/blender53-realclock-boundary.yml` only on the isolated feature branch.
- Stage 1 creates an actual B2 watergate Blender 5.3 scene, runs render QA and ClamAV, packs/verifies a checkpoint and **uploads it before prolonged waiting**.
- With a 90-minute per-job timeout, stage 1 waits until **71 elapsed minutes** since the job recorded its start. The wait is intentionally idle; it tests the clock, GitHub runner lifetime and uploaded-checkpoint durability, **not 71 minutes of heavy Blender computation**.
- Call `stage_route.py --simulate-minutes 0` with the *original* epoch and require `handoff_required=true`. An inline stage 2 must skip.
- A downstream job must automatically download the real stage-one Artifact, verify source SHA/checkpoint manifest, run ClamAV on restored files, resume Blender 5.3, render three directions, verify+scan the result and upload its own NOT_APPROVED Artifact.
- Pass only if both jobs, routing tests and two distinct Artifacts succeed; checkpoint uploads must precede handoff decisions.

## Limits and risk
- The original time budget is **80 minutes with a 10-minute reserve**. Its safe handoff threshold is **70 minutes of elapsed job time**, so 71 minutes tests past that cutoff. This is *not* a literal greater-than-80-minute continuous Blender load test.
- Real wall-clock wait consumes GitHub Actions runner time, may be delayed by runner availability/quotas and can fail if hosted runner constraints intervene.
- A process killed during Blender rendering is not recovered by this design. Only checkpoints already uploaded survive reliably.
- Current scene is an isolated watergate QA model, not production asset generation or artistic acceptance. Keep all Artifacts NOT_APPROVED for 14 days. Never merge an unverified executable change, approved asset or changes to main.
