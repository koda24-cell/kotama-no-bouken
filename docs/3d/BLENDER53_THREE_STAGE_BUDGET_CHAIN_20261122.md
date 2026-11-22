# Blender 5.3 — Three-stage budget-routed checkpoint chain (experimental)

## Verified predecessors
- PR #696: two-stage checkpoint and 71-minute **simulated** boundary
- PR #697: three successive real Blender stages without conditional routing
- PR #698: four successive real Blender stages without conditional routing
- PR #699: bounded decision helper 1–12
- PR #700: both routes in the two-stage workflow verified; simulated handoff run 44889746279 and real-clock inline run 44921556078

## This experiment
PR branch: `feature/blender53-three-stage-budget-chain-20261122`
Workflow: `.github/workflows/blender53-three-stage-budget-chain.yml`

A branch push runs the original stage-1 build and checkpoint verification. Stage 1 uploads a `NOT_APPROVED` artifact, then simulates 71 minutes elapsed and routes to an independently initialized stage-2 job. Stage 2 must read stage-1 Artifact, verify source SHA, checkpoint digests and ClamAV before opening the Blend, rerender, verify and upload stage-2 Artifact. Stage 2 then simulates 71 minutes elapsed to trigger **another conditional job**. Stage 3 restores **stage 2** (never stage 1), re-renders and uploads a third Artifact. It then asserts that `stage_plan` returns `finish` at max_stages=3.

### Required evidence
- All jobs `route-tests`, `stage-one`, `stage-two-handoff`, `stage-three-handoff` completed successfully.
- Stage 1 inline steps skipped in the late-time drill; conditional jobs 2/3 started automatically and succeeded.
- Three distinct, unexpired `NOT_APPROVED` Artifacts attached to the *same* run.
- Real Blender 5.3, input+output ClamAV, checkpoint verification and multi-angle QA successful, with stage 3 packed as iteration 3 and sourced from stage 2.
- Terminal max-stage decision succeeds. If any required evidence fails, retain Draft and investigate.

### Boundaries
- Simulated 71-minute decisions, **not** actual 80-minute endurance test.
- A fixed maximum three-job routing drill; it does **not** mean arbitrary 12-stage automatic job creation, runtime scene-wide generalization, or resumability after Blender is killed mid-save.
- No production asset modifications; Artifacts are temporary (14 days), no formal approval or promotion, no change to main.
- Manual workflow_dispatch option carried over from PR #700 may depend on main workflow registration. Push path is the intended validation mode.
