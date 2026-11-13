# Low-poly human iteration 6 — 2026-11-14

## Purpose
Continue improving Pinterest pin 878835314813441339 front/side orthographic silhouette and joint continuity. Hair and assassin outfit remain excluded. Use Eevee solid renders.

## Baseline and measured error
- Iteration 5 GitHub Actions run 43449532946 succeeded.
- Front proxy MAE 16.74 px; side proxy MAE 11.78 px (iteration 4 side 11.53 px).
- Iteration 5 abdomen and calf depth additions did not improve the side metric, so revert them before testing new changes.
- Proxy measurement has segmentation errors around hand/leg transition. Do not optimize blindly to this score.

## Iteration 6 code
- Revert iteration 5's localized abdomen and posterior calf depth increases.
- Build adjacency from actual mesh edges, then run 3 conservative neighborhood relaxation passes near shoulder and hip/groin bands.
- Per-pass blend limited to 0.16 times smooth anatomical mask, and vertical coordinates are preserved.
- Keep one unified mesh; do not alter the head or overall arm/leg lengths.
- Record number of non-manifold edges and mesh vertices/polygons in iteration6_geometry.txt.
- Validate front, right/left side, oblique Eevee renders, overlays and CSV metrics after Action run. Do not mark successful until inspected.

## Next work
If shoulder/hip still show pinched triangles, replace voxel remesh+decimate with controlled quad topology at the joint, not additional silhouette-only deformations.
