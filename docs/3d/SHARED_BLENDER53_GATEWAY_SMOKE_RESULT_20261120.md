# Blender 5.3 shared gateway smoke test — 2026-11-20

## Verified evidence

- Caller branch: `feature/shared-blender53-gateway-smoke-20261120`
- Draft PR: https://github.com/koda24-cell/kotama-no-bouken/pull/660
- Successful Actions run: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44664360313
- Head SHA: `b4501f614ceb04f2b96a74873fd84b07f4540849`
- Reusable workflow: `.github/workflows/shared-blender53-render.yml` (checked out from caller branch, originally present on `development`)
- Caller: `.github/workflows/shared-blender53-gateway-smoke.yml`
- Script: `tools/shared-blender53-smoke/render.py`
- Output: `render-output/star-smoke`
- Artifact: `shared-blender53-NOT-APPROVED-44664360313`, ID `14597576409`, 616593 bytes (temporary)

All reported job steps completed successfully: input path validation, Blender 5.3.0 assertion, ClamAV signature refresh, script scan, Blender render, output signature/hash manifest, generated output scan, artifact upload.

This confirms **one isolated caller** can invoke the shared workflow end-to-end. It does **not** confirm that every existing asset workflow or branch is compatible, or that the rendered art meets visual-quality requirements. No game assets were promoted; outputs remain **NOT_APPROVED**.

## Rollout requirements

1. Preserve existing production asset workflows; do not bulk rewrite them.
2. For each candidate asset branch, compare Blender script compatibility, input dependencies, output naming, and existing artifacts before switching.
3. Add a narrowly path-filtered caller using the shared gateway; verify an actual Actions run and PNG/GLB/Blend outputs.
4. Inspect multi-angle PNGs and obtain user approval before committing assets to permanent game folders.
5. Keep ClamAV input/output scans, provenance, hash manifest, and temporary artifacts. Record failures and successful runs per asset.
6. When changes to the reusable workflow are needed, test them on an isolated branch before updating `development`.
