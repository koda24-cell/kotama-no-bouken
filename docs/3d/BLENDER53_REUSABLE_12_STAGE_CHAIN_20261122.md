# Blender 5.3 reusable bounded chain (2–12 steps)

## Purpose
Replace copied long YAML for each Blender checkpoint with a common reusable stage worker and a caller with 12 explicitly bounded job slots.

- Worker: `.github/workflows/blender53-reusable-stage-worker.yml`
- Caller: `.github/workflows/blender53-reusable-12-stage-chain.yml`
- Branch: `feature/blender53-reusable-12-stage-chain-20261122`

Each selected job restores the immediately previous stage's run-scoped Artifact, verifies it against the same git SHA and source script, scans it before loading the actual .blend with Blender 5.3, renders front/side/angle, QA packs and verifies the checkpoint, scans outputs, then uploads a new NOT_APPROVED Artifact before making the stage-budget decision. The maximum stage selection is 2–12. The default push CI selection is **4 stages** so normal pushes do not schedule 12 expensive Blender jobs.

### Boundaries
- The current worker uses **71 simulated elapsed minutes** at stage boundaries in this isolated test, so downstream stages are started automatically. This is NOT a real 80-minute endurance measurement.
- It currently tests the conditional **handoff** branch, not a unified inline vs new-job loop for arbitrary stages. The successful two-route 2-stage experiment is PR #700.
- The worker uses the existing B2 watergate QA scene, NOT general model production. Fixed 12 job slots are not unbounded self-dispatch.
- `workflow_dispatch` requires GitHub's default-branch registration; do not merge a test workflow to main merely to enable it.
- Artifacts last 14 days and must never be promoted until explicit user visual approval. No 3D gameplay sources, save files or real meshes are modified.
- Stop at first failing stage; no automatic retry of failed or incomplete renders and no claim of kill-in-the-middle recovery.

### Verification
1. Push-run default selects max_stages=4.
2. Stage tests and stages 1–4 succeed, stages 5–12 are skipped.
3. Four distinct NOT_APPROVED Artifacts exist, with checksum/source commit verification and 3-angle actual Blender outputs.
4. Stage 4 route outputs `finish`, the downstream stage 5 job does not run.
5. Only after testing the 4-stage path, consider specific runs with more steps; 12 actual steps are **not proven** by code deployment alone.
6. Document failure run if workflow file initially fails, and do not merge until verified.

## Historical evidence
- PR #696: 71-minute simulated guard and 2-stage resume
- PR #697: 3-stage real resume
- PR #698: 4-stage real resume without budget routing
- PR #699: bounded stage decision unit tests
- PR #700: 2-route handoff or inline
- PR #703: 3-stage conditional handoff
