# Floor 3 ruined building: verified Blender review (2026-11-18 JST)

Status: **NOT_APPROVED / not game-integrated**

## Verified source and render evidence
- Existing base prototype: PR #256, `feature/floor3-ruined-building-prototype-20261112`; original geometry preserved.
- Three-pass additive comparison: PR #497 / [Actions run #44104207251](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44104207251), success; three GLBs and nine actual Blender PNGs; artifact SHA manifest checked locally.
- V1: 1086 geometries / 27,352 triangles; V2: 1290 / 36,400; V3: 1494 / 45,448. These are GLB structural statistics, not measured GPU draw calls.
- First brighter render: [run #44126792521](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44126792521): Blender rendering succeeded and GLB/Blend/three PNGs uploaded, but verification failed because Blender 5.3 compressed .blend has Zstandard header rather than plain BLENDER header.
- Corrected lighting and validation: [run #44127549303](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44127549303): **success**. Artifact `floor3-building-brighter-review-v3` ID `14348926323` contains V3 GLB, compressed .blend, front/side/angle PNGs and SHA-256 manifest. All 5 manifest file hashes and sizes verified locally. The original model is unchanged.
- Intermediate failed run [#44126436583](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44126436583) exposed Blender 5.3 AgX look enum mismatch, corrected to `AgX - Medium High Contrast` and rerun.
- Shared 3D Performance Audit run #44104259706 succeeded for committed GLBs in repository; **do not treat it as a performance audit of the uncommitted newly generated V3 GLB**.

## Visual review of actual images
- Original render was significantly underexposed; image details were hard to inspect.
- First lighting revision was too bright/washed out; next revision balances the three views.
- Final corrected V3 images are usable for identifying modeling failures, but still **not aesthetically acceptable**:
  1. Black triangular holes/tears seen in side and angle; likely mesh winding/triangulation/material issues. Diagnose with face normal/manifold checks and Blender face-orientation views before adding more geometry.
  2. Green vegetation reads as rectangular blocks; replace with properly modeled stems and foliage, retaining existing meshes during comparison.
  3. Flat concrete remains too smooth and regular; focus on believable sectional fractures, embedded surface roughness and structural failure around supports, rather than arbitrary floating shards.
  4. Roof and debris distribution remain repetitive and scattered. Favor varied mass, load-bearing damage and gravity-driven debris groups.
- Avoid simply increasing V3 triangle counts: added details did not significantly change silhouette. Preserve 2D footprint and gameplay/collision semantics.

## Checkpoint and resume boundary
- `render_quality.py` saves a full Blender checkpoint before the 3-angle render; workflow uses `if: always()` to upload partial evidence.
- The successful artifact contains GLB/Blend/PNG/manifest; reproducible source SHA and run ID are stored in the manifest.
- **Stage 3 job-to-job automatic checkpoint recovery has not been implemented or demonstrated.** The validated resume procedure is manually retrieving the archived files and matching their hashes/source before a new job. B5-specific experimental checkpoint tooling must not be reported as already available for this model.
- User approval is required before any permanent asset promotion or game integration. Do not merge unapproved asset into `assets/models/floor3`.
