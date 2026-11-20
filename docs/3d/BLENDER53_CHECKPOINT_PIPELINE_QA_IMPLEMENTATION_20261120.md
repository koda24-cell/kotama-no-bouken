# Blender 5.3 反復制作・途中保存・再開の実装契約 (Draft)

2026-11-20 / base: `development`. Existing shared gateway and production assets remain unchanged.

## Verified baseline
- `.github/workflows/shared-blender53-render.yml` runs pinned Blender 5.3 + ClamAV, outputs temporary artifacts and SHA-256 list.
- Watergate compatibility run [44665210370](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44665210370) succeeded.
- Existing B5 throne prototype has **job-to-job checkpoint recovery evidence** in runs 43794461689 and 43794997803. This is **not** universal resume.
- API-based visual aesthetics assessment is **not** connected or proven. Do not conflate PNG signature checks with aesthetic approval.

## Phase 1: durable per-iteration checkpoint (highest priority)
Each completed iteration must upload an independently downloadable artifact BEFORE the next iteration. Artifact payload:
`checkpoint.json`, `progress.json`, `scene.blend`, candidate `model.glb`, actual `front.png`, `side.png`, `angle.png`, `qa.json`, optional textures and scan logs.

`checkpoint.json` must include:
- `schema_version`, `asset_id`, `iteration`, `source_commit`, `source_script_sha256`, `blender_version`, `docker_image_digest`, `parent_checkpoint`, `parameters`, `files` (relative path, bytes, SHA-256), `status: NOT_APPROVED`, `next_step`.
- Reject path traversal, symlinks, missing files, hash mismatch, incompatible asset ID/source/Blender version. Keep immutable parent checkpoints.
- Validate before resume and refuse to resume on mismatch. Preserve last known good artifact; never delete prior iteration when new iteration fails.
- **Limitation:** GitHub Actions artifacts are temporary. A hard-killed job may not run final upload. Save at iteration boundaries in separate jobs; use independent durable checkpoints/PR commits where necessary. Do not promise recovery of unsaved work.

## Phase 2: complex pipeline adapter
- Reusable gateway accepts a narrowly-scoped adapter config: preparation step (Node/Three.js GLB export or CC0 texture fetch), security gate before unpack/import, multiple Blender scripts, output verification and final scans.
- Never execute arbitrary shell supplied by untrusted workflow inputs. Use reviewed repo-local allowlisted scripts.
- Migrate waterwheel, elevated bridge and similar pipelines individually with baseline comparison, no bulk replacements.
- Pin external source URLs, expected digests and license records; fail closed on unsafe inputs.

## Phase 3: bounded automated QA loop
- Geometry checks: watertightness where required, nonmanifold counts, normals, triangle/draw-call budgets, camera framing, transparency and missing textures.
- Image checks: PNG dimensions, blank/overexposed areas, bounding box coverage, perceptual regression vs previous approved checkpoint. Numeric QA is **not** a substitute for artistic judgment.
- Up to 3 revisions initially; preserve original geometry, vary only explicitly allowlisted parameters; rerender each candidate. If worse, revert to prior verified checkpoint.
- Vision API is opt-in and **unverified**. Never send images or enable paid endpoints without user approval.
- Passing QA creates a `NOT_APPROVED` review candidate only. User approval is required before promotion to game asset folders.

## Acceptance tests (not yet executed)
1. Resume same source and hashes succeeds from iteration N to N+1.
2. Deliberately corrupt GLB/PNG -> resume rejects and parent remains.
3. Change source hash -> incompatible checkpoint rejected.
4. Simulate failure after iteration N -> N artifact still accessible and N+1 is not falsely reported.
5. Node-prepared waterwheel and downloaded-texture bridge each produce actual 3-angle PNG + GLB + Blend with ClamAV evidence.
6. QA catches known framing/blank-output regression and does not auto-promote assets.

## Implementation status
**Specification committed only.** No new checkpoint runner, adapter or quality loop is claimed to be working. Implement in isolated PRs; test on a non-production asset before integrating with the shared gateway.