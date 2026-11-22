# PR #714 — actual material stress-test image review

## Evidence from actual GitHub artifacts
- Successful Actions run: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44965880886
- Single-frame reference Artifact ID **14731268719**, with real `front.png` (1000×760).
- Separate left/right composite Artifact ID **14730953574**, with real `front.png` (1000×760).
- Both ZIP artifacts were downloaded, opened, and compared side by side visually (not illustrative reference images).
- Scene shows pale refractive spheres, partially transparent teal foreground plane, blue glowing center, and opaque white-blue stone pillars. Important: the test scene renders these synthetic QA materials only, not an approved game model.
- In the 1000×760 images, the principal glass refractions and foreground alpha layer align, including across the center x=500. No conspicuous color jump or discontinuity is visible at the center in the whole-image comparison.
- Seam gate result: **PASS**. `seam_rgb_delta=0.9044`, nearby median `0.5539`, ratio `1.6326` vs limit 2.5; seam excess vs reference `0.4768` vs 8; full-image RGB MAE `0.2085` vs 12.
- Three separate jobs baseline, left, right-and-qa succeeded; ClamAV scans and SHA/manifest verification passed; artifacts retained for 14 days.

## Narrow conclusion
Blender 5.3 border-crop/stitch with existing automatic quality gate passes the synthetic refractive, semi-transparent and emissive test at 24 Cycles samples and 1000×760. This does not prove quality on volumetrics, moving image sequences or very high sample/resolution renders. All GLB/Blend/PNG remain NOT_APPROVED.
