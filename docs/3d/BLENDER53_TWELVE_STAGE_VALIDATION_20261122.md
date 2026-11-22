# Blender 5.3: bounded twelve-stage real checkpoint validation

## Starting point
- PR #704: reusable worker and 4-stage proof, verified successful
- PR #705: 6 stages with actual Blender 5.3 builds and immediate predecessor checkpoint restoration, verified successful; artifacts remain NOT_APPROVED
- Development branch is the base; neither production 3D assets nor main are changed

## This isolated experiment
- Branch: `feature/blender53-twelve-stage-validation-20261122`
- Caller: `.github/workflows/blender53-twelve-stage-validation.yml`
- Worker: `.github/workflows/blender53-reusable-stage-worker.yml`
- Push-triggered max stages **12**, with individual jobs chained by successful `handoff_required=true`. The worker simulation guard permits 71 simulated elapsed minutes only on the isolated test branch.

Every stage must verify the preceding stage's uploaded Artifact hash manifest and source commit, scan checkpoint before loading it, render actual Blender 5.3 GLB/Blend/front-side-angle PNG, QA/pack and verify the current checkpoint, run ClamAV on outputs, and upload `reusable-stage-<N>-NOT-APPROVED-<run>` before determining whether to proceed.

## Pass criteria
1. Preflight and all 12 stage jobs report completed/success.
2. All 12 distinct unexpired Artifacts exist; stage N>1 downloads and verifies stage N-1.
3. Final stage returns `action=finish`, with no thirteenth job.
4. Blender version, actual rendering, quality checks, ClamAV scans, and checkpoint verification are all successful.
5. Log any failed steps or resumed partial runs accurately before considering merge.
6. No asset promotion or change to gameplay / main.

## Important limits
- Simulated 71-minute budget decisions are **not a genuine 80-minute endurance test**.
- The chain is a capped set of 12 jobs, not an unlimited workflow or generic per-model auto-sculpt.
- Mid-render crashes can lose work that has not yet reached the next durable uploaded checkpoint.
- `workflow_dispatch` UI may be unavailable unless workflow is registered on the default branch; branch push is the supported experiment trigger.
- Artifacts expire after 14 days. No real production 3D asset should be treated as approved by this technical test.
