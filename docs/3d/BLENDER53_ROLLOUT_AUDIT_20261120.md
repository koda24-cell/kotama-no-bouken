# Blender 5.3 shared production rollout — next phase

Date: 2026-11-20. Status: **IN PROGRESS — NOT all workflows migrated**.

## Verified baseline
- Shared reusable gateway is on `development`: `.github/workflows/shared-blender53-render.yml`.
- End-to-end reusable caller run succeeded: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44664360313
- Test PR #660 merged to `development`: https://github.com/koda24-cell/kotama-no-bouken/pull/660
- 5 previously verified Blender 5.3 migrations are documented in `BLENDER_SHARED_EXECUTION_ENTRYPOINT.md`.

## Existing workflow inventory
The `development` workflow directory contains 55 YAML workflows (snapshot 2026-11-20). Relevant candidates for **individual** compatibility audit include:
- Floor 2: `b2-frozen-waterwheel-render.yml`, `b2-frozen-watergate-render.yml`, `b2-ruined-aqueduct-render.yml`, `b2-bridge-props-render.yml`, `floor2-waterfall-render.yml`
- Floor 3: `floor3-elevated-bridge-render.yml`
- Floor 4: `b4-docker-batch-render.yml`, `b4-magma-bank-modules-review.yml`
- Floor 6: `f6-tree-foliage-batch-review.yml`, `f6-multiview-impostor-review.yml`
- Shared optimization: `shared-rigid-lod-review.yml`

These are **candidates, not claims of outdated version or failed compatibility**. Audit each workflow's current image, script, dependencies, output paths and recent successful run before editing.

## Safe implementation order
1. Inventory each candidate's Blender image digest/version, actual script, download/scan stages, generated output paths, checkpoint behavior and latest run.
2. Select one simple existing asset workflow with available source inputs. Keep its old workflow intact, add a separate caller to the shared gateway on an isolated feature branch.
3. Execute the caller and inspect run logs, PNG/GLB/Blend and ClamAV scans; compare front/side/angle with previous output.
4. Record per-asset pass/fail and migrate only after actual successful QA. No bulk replacement.
5. Expand the gateway to standardized manifest (source commit, run, output hashes, approval), optional checkpoints, geometry/LOD/performance audit and human visual review in separately tested changes.
6. Save all results in GitHub PRs and use `NOT_APPROVED` until the user approves; do not change `main` or permanent game assets.

## Known limitations
- The reusable gateway smoke validates one star script, not every legacy model, external asset, or performance path.
- ClamAV scan success is not a guarantee of safety; downloaded archives must be scanned before extraction/import.
- Auto visual correction and resume after interrupted execution are **not** established as universal capabilities.
- GitHub Actions artifacts expire and do not constitute permanent asset storage.
