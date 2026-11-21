# Blender 5.3 budget-based branch routing experiment

## Goal
Connect previously verified PR #696 budget guard, #697/#698 checkpoint reconstruction, and #699 bounded planner into a **real GitHub Actions conditional next job**. In this isolated experiment, stage one always creates, verifies, scans and uploads an immutable NOT_APPROVED checkpoint **before** choosing a route.

- If stage 1 has time remaining, process stage 2 inside stage one's job.
- If stage 1 has reached its 70-minute safe boundary, skip in-job stage 2 and allow `stage-two-handoff` (a new job with an independently initialized Blender container) to download and verify stage 1, rerender and upload stage 2.
- Push-trigger test on `feature/blender53-budget-routed-handoff-20261121` injects 71 elapsed minutes **only after** stage-one files are real and uploaded. CI tests validate the route and output.
- `workflow_dispatch` can request clock-based or simulated route, subject to GitHub's default-branch registration rules. Never change `main` to enable it.

Workflow: `.github/workflows/blender53-budget-routed-handoff.yml`
Helper: `tools/3d_checkpoint/stage_route.py`
All generated checkpoints remain `NOT_APPROVED`.

## Validation gate
Verify:
1. Source/Blender version/ClamAV steps successful.
2. Stage-one Artifact uploaded before routing.
3. Push drill yields `handoff_required=true`; inline stage 2 steps are skipped.
4. Conditional `stage-two-handoff` job starts automatically, downloads the exact prior run Artifact, verifies hash+source commit, scans input, invokes Blender 5.3 and writes actual stage-two output.
5. Both Artifacts exist, are unexpired; test job succeeded.
6. For the non-expired path, independently verify that inline stage 2 runs while the conditional new job skips (optional follow-up test).

## Boundaries
- This is **a two-stage routing proof**, not an unlimited iteration loop, arbitrary scene adaptation, or an independent `workflow_dispatch` of a new run.
- The new job is a downstream GitHub Actions *job within the same run*, automatically evaluated from the prior job output. A run or Blender process killed mid-stage may still lose unsaved work.
- A simulation is not a genuine 80-minute stress test.
- Reuse of fixed B2 QA scene only. No production models, artwork approvals, permanent promotion, or `main` changes.
- Do not merge until real CI evidence confirms route, checkpoint and final Artifacts.
