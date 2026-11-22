# Blender 5.3 — Six-stage real checkpoint validation

## Why
PR #704 verified four stages using a reusable Blender 5.3 worker. This isolated run exercises **stages 5 and 6** in addition to the prior four, without changing game code or approved assets.

- Branch: `feature/blender53-six-stage-validation-20261122`
- Caller: `.github/workflows/blender53-six-stage-validation.yml`
- Worker: `.github/workflows/blender53-reusable-stage-worker.yml` (only this branch's simulation-guard ref changed; no runtime asset changes)
- Run uses six stages by default, with bounded manual selection 5 or 6.
- Each stage verifies the previous source script+commit and file digests; ClamAV scans before Blender import; Blender 5.3 renders; QA packs and scans output; the next stage starts only after a durably uploaded NOT_APPROVED Artifact.

## Acceptance criteria
1. `preflight` and jobs 1–6 all complete with success.
2. Each stage 2–6 downloads and verifies the **immediate predecessor's** checkpoint, not stage 1.
3. Six distinct `reusable-stage-N-NOT-APPROVED-<run>` Artifacts exist and are unexpired.
4. Stage 6 emits `finish` at `max_stages=6`; no stage 7 is configured.
5. All jobs use the pinned Blender 5.3+ClamAV container and real GLB/Blend/3-angle PNG.
6. Keep Draft and do not merge the executable workflow before inspecting results.

## Limits
- The stage handoff is triggered by **simulated 71 elapsed minutes**, not a real 80-minute workload.
- This validates 6 stages, not a successful 12-stage execution.
- It is still a **fixed upper bound** in GitHub Actions, not an indefinite self-dispatching loop.
- Mid-render interruption may lose work performed since the last uploaded checkpoint.
- Existing test scene is B2 watergate with additive QA markers. No arbitrary production model or game deployment is implied.
- Artifacts expire in 14 days; approval is NOT_APPROVED unless the user explicitly approves previews.
