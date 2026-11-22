# Blender 5.3 half-frame automated seam-quality gate

## Existing proof
PR #710 merged after a real Blender 5.3 front-frame tiled recovery, one intentionally SIGKILLed right tile and recovery using the byte-identical saved left tile. The visual review was limited to a single watergate scene. Its reported central adjacent-column delta: 2.780 RGB/255; nearby median 3.035; original single-pass boundary 3.529; mean composite-to-reference absolute RGB difference 2.903.

## Added gate
- Python tool: `tools/3d_checkpoint/seam_qa.py` reads actual RGBA8 PNG pixels with the existing strict `stitch_half_frame.py` decoder.
- Requires 1000x760 for both merged front and single-pass reference.
- Measures mean adjacent RGB variation at x=500, median variation across neighboring off-seam columns, original single-pass x=500 variation, and full-frame average RGB deviation.
- Fail-closed thresholds selected conservatively for this *fixed* watergate scene: seam / neighboring median ≤2.5; stitched seam minus original seam ≤8 RGB values; global stitched-vs-original MAE ≤12 RGB values.
- Positive test: identical synthetic image accepted. Negative test: deliberate right-half +45 RGB vertical seam rejected.
- Strict validation and ClamAV scanning of the original reference checkpoint and seam script in the recovery job. Run the seam gate **before** final QA, checkpoint pack or upload, so failed seam cannot be published as a passing artifact.
- Keep intentional SIGKILL testing: overall GitHub Actions run is expected to show FAILURE due to kill-right job, while `original`, `front-checkpoint`, `resume-right` and `seam-unit-tests` must succeed. See recovered `seam_qa.json` for actual measurements.
- Blender uses `--python-exit-code 1` for normal rendering to prevent Python exceptions from escaping as successful steps. An isolated kill probe expects process exit code 137.

## Limitations
- This is pixel-level technical quality, **not proof of artistic quality**.
- Fixed image size, scene and camera; threshold is empirical and should be calibrated separately for transparent, volumetric and highly noisy scenes.
- Tiling can alter denoising/sample noise, even if seam metrics pass; visually assess several materials before broader adoption.
- All rendered scenes, GLB, Blend, PNG and artifacts stay NOT_APPROVED. Do not touch main or promote unapproved material.
