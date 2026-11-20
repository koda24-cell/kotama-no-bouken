# Floor3 V29 — three rubble variants verified real Blender 5.3 render QA (2026-11-20)

Status **RENDERED / NOT_APPROVED**. No merge or asset promotion.

## Evidence
- V28 initial three-size run [44685616444](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44685616444) success; artifact 14606602309. All 33 file sha256 checks matched from downloaded artifact.
- V29 shape-diversity follow-up [44686638121](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44686638121) success. Artifact 14607256281, 16,908,583 bytes. 3 GLBs, 3 Blend files, 15 real Blender5.3 render PNGs (front/side/angle/top/fracture_detail per asset), 12 PBR PNGs and SHA manifest.
- All **33 V29 SHA256 entries** independently checked against downloaded GitHub ZIP, no mismatches. GLB 1 mesh, 2 material primitives per variant.
- Blender log actual mesh bounds:
  - small 341.62 × 275.84 × 80.11 mm
  - medium 467.10 × 323.54 × 119.15 mm
  - large 580.20 × 402.37 × 149.62 mm

## Real image QA
Three-column top and angle PNG composite genuinely rendered by Blender (not synthetic drawn asset). V29 has stronger silhouette diversity than V28: small is thin and diagonal, medium preserves V23's moderately rectangular silhouette, large has a different missing-corner profile and stronger vertical height. A separate relative-scale view was assembled using each orthographic view's camera-scale factor (not a single true scene render); this makes size comparisons fair while retaining the actual Blender pixels.

Remaining caveats: the small fragment looks somewhat *long and thin* rather than a volumetric broken wall, and large/medium continue to share some V23 lower side facets. Not yet high quality approved. Do not auto-promote or merge.

Saved source and CI workflow on Draft PR #642, targeting development; V23 and all earlier versioned assets retained.
