# Floor 3 Rubble01 V18–V19 actual Blender render review — 2026-11-20

Status: **NOT_APPROVED**. No production asset promotion or development/main merge.

## Actual run evidence
- V18: [GitHub Actions run 44673279020](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44673279020). Completed success; Blender 5.3 generated GLB, Blend, four texture PNGs, front/side/angle/top/detail PNGs; artifact 14600539015. All 11 manifest-listed payload SHA256 hashes matched independently on downloaded ZIP.
- V19: [GitHub Actions run 44673777806](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44673777806). Completed success; equivalent 11-file GLB/Blend/PNG output and SHA256 validation; artifact 14601570792.

## Five-view visual result
- V18: strong, rigid, spiked vertical step fences in the upper center caused by applying hard piecewise height jumps after subdivision. It is not a plausible concrete fracture.
- V19: those fence-like artificial vertical stripes are substantially removed. The upper surface transitions are now soft and mostly continuous, but this goes too far: the top reads like worn/folded stone instead of separated, angular broken concrete plates.
- Both: side faces still have oversized geometric triangular patches and read as stylized basalt. Aggregate is weak and not exposed realistically. Form remains wide and slab-like.

## Required next steps
1. Build the top as **two or three independent angular surface regions** with dedicated vertical side walls around plate breaks (watertight joins), not a single heightfield forced into abrupt or blurred edges.
2. Add actual missing corner volume and broken-face material mapping on those new faces. Maintain the nominal 450 x 310 x 120mm silhouette and source V1–V19.
3. Rework side polygon planes independent of the upper fracture. Avoid white protruding aggregate stones.
4. Render five real PNG views and verify mesh/GLB, manifest hashes, performance, clipping and UV continuity before artistic approval.
5. Existing per-version workflow push paths share `tools/floor3/concrete_rubble01/**`, which launched unnecessary old V1–V17 runs when V18/V19 sources changed. Future workflows should use precise source+workflow paths, never a blanket all-version directory glob.

This note records evidence and limits. No claim that V19 passes aesthetic QA.
