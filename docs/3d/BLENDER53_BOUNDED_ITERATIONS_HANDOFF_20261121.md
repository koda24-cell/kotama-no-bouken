# Blender 5.3 bounded multi-stage resume — rollout experiment

Previous verified runs:
- PR #696: simulated 71-minute guard, two-stage recovery: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44870246205
- PR #697: three consecutive real Blender job-boundary restores: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44874695004

## New scope
This isolated branch tests 2–4 stage selection, with `workflow_dispatch.inputs.stage_count` selecting 2, 3 or 4. A branch push automatically runs all four. Each new stage must restore **the immediate preceding stage's actual checkpoint**, validate source SHA/digests and `NOT_APPROVED`, scan input before Blender opens it, run real Blender, QA multi-angle renders, verify packed checkpoint and scan outputs, and upload stage-specific Artifacts (14-day retention).

Workflow: `.github/workflows/blender53-bounded-stage-resume.yml`
Experiment branch: `feature/blender53-bounded-four-stage-20261121`

## Safety and limitations
- This is **bounded** (2, 3 or 4 stages), NOT unlimited iterations or automatic cross-workflow continuation.
- Each job has its own 90-minute GitHub Actions timeout. A running Blender process can still time out; only prior successfully uploaded checkpoints are durable.
- Prior PR #696 guard's 80-minute decision is not yet integrated into this bounded workflow. That remains a separate integration step.
- GitHub Actions `workflow_dispatch` normally requires workflow registration on the default branch. Do not change `main`; use branch-scoped push for the 4-stage test.
- No external assets are downloaded; existing pinned Blender 5.3 + ClamAV image is reused. Scan failures must block import.
- This exercises QA-only watergate markers, not general-purpose production modeling. Never auto-promote GLB/PNG to game assets or merge to `main`.
- Verify the new run's full 4-job status and **four** unexpired artifact entries before declaring success or merging executable workflow.

## Follow-up if successful
Refactor to a tested reusable stage runner; integrate budget guard with clear stage boundaries and explicit recovery triggers, with max-run or max-iteration limits and protections against self-triggering cycles. Evaluate actual 80+ minute duration separately. Avoid silent migration of existing 3D jobs.
