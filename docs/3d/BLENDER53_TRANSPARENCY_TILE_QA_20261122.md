# Blender 5.3 transparent/transmissive material tile seam QA

Goal: Expand prior B2 watergate and B4 basalt **opaque** scene test to an isolated material-sensitive scene including Cycles glass transmission (0.9), alpha blended film (0.32), emissive material (strength 5), and opaque pillars.

- New procedural QA-only Blender scene: `tools/3d_checkpoint/prepare_transparency_qa.py`. All outputs remain `NOT_APPROVED`; no existing gameplay or 3D source asset edited.
- Camera, lighting, sample count and 1000×760 front reference use the already verified `render_one_view.py`. Left/right 500×760 tiles use `render_half_frame.py`.
- Intermediate left tile is verified, scanned and uploaded before a separate job renders the right tile. SHA equality is checked on reused left tile.
- PNG stitcher and fail-closed seam validator are reused unchanged, with the strict existing thresholds (seam/local ≤2.5, absolute excess over reference ≤8/255, overall mean RGB deviation ≤12/255).
- Baseline image, tiled image and seam report remain temporary Artifacts. Inspect actual PNGs before asserting visual equivalence.
- This is **not** an attempt to promote or replace a game texture or GLB. It does not yet test volumetric scattering.
- If the gate fails because of real Cycles denoising or transmission discontinuities, keep the failing report and investigate instead of silently loosening the quality thresholds.
