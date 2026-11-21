# PR #710 visual QA — real Blender 5.3 PNGs

## Evidence
- GitHub Actions run: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44940325596
- Source reference Artifact: `half-frame-base-NOT-APPROVED-44940325596` (archive artifact ID 14721825517)
- Restored/stiched Artifact: `half-frame-RECOVERED-NOT-APPROVED-44940325596` (archive artifact ID 14720904210)
- Both archives downloaded and their actual `front.png` files independently opened and visually inspected as 1000×760 RGB PNG.

## Findings
- The front image reconstructed from left/right 500×760 cropped renders depicts the same watergate scene and layout as the single-pass reference, with no visually conspicuous vertical displacement or color stripe at x=500.
- Pixel metrics: mean absolute RGB delta at the stitch boundary (adjacent columns 499 and 500) **2.780** / 255; nearby median between-column delta over x=450–494 and 505–549 **3.035** / 255; seam-to-neighborhood ratio **0.916**.
- A separate single-pass baseline has **3.529** / 255 adjacent-column delta at the same x=500.
- Mean absolute RGB difference of full stitched vs original full render **2.903** / 255. This reflects rendering/sampling/denoising differences and does not establish bit-for-bit equivalence.
- Zoom inspection of the central wheel and ice near x=500 revealed no conspicuous seam. The tiled image appears smoother (less noisy) than the single-pass reference, so broader parity testing with higher sample counts, transparent materials, volumetrics and other production cameras is still required.
- The crash test was at `render_pre` for the right tile, with real Blender exit code **137**, verified left-tile byte reuse and final technical three-view QA success. This does not resume work within an unfinished tile.

## Approval
**Technical QA: PASS** for this fixed watergate test case. **Limited visual seam QA: PASS** for this fixed camera and scene. Not a general artistic acceptance and not asset promotion.
- Keep all generated GLB/PNG/Blend `NOT_APPROVED`; no `main` change.
- Base sample and composite test are from the same GitHub run (44940325596).
