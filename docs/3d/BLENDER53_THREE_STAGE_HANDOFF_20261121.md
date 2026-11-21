# Blender 5.3: three consecutive durable stage boundaries (PR #697)

## Goal
Expand the successful two-job checkpoint handoff from PR #696 to a **three-job chain** without changing live asset workflows. Each job runs in a fresh pinned Blender 5.3/ClamAV container.

1. Stage 1: build B2 watergate, validate PNG/GLB, pack and verify checkpoint, scan and upload.
2. Stage 2: download **stage 1**, confirm source commit and source-script hash, scan before loading, resume Blender, render front/side/angle, pack iteration 2 and upload.
3. Stage 3: download **stage 2** (NOT stage 1), verify its manifest and hashes, scan before loading, resume `watergate_resumed_v02.blend`, render, pack iteration 3 and upload.

Workflow: `.github/workflows/blender53-three-stage-resume.yml`
Development branch: `feature/blender53-three-stage-resume-20261121`
Run: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44874695004

## Acceptance criteria
- All three jobs have `completed/success` status.
- Three unique run-scoped artifacts exist and are unexpired.
- Stage 2 checkpoint manifests `iteration=2`, stage 3 `iteration=3`, with correct parent and source commit.
- Each restored file set passes digest and ClamAV verification.
- Actual Blender rerendering and output QA succeed.

## Limitations
- This is a sequential fixed-length three-stage **proof**, not arbitrary model scheduling, a cross-workflow auto-resume trigger, or guaranteed recovery from a killed Blender process.
- The 80-minute boundary guard was verified separately in PR #696 by simulation. This workflow validates repeated real handoffs, **not a genuine 80-minute wait**.
- The resume script currently adds a QA marker; it is not a production asset modification strategy.
- Artifacts expire after 14 days. Every candidate remains `NOT_APPROVED`, no merge to game assets and no changes to `main`.
- Keep PR Draft until the final run and artifacts are inspected. Visual quality needs separate image review.
