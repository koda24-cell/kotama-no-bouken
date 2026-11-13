# F6 white lily V13: connection failure root cause and prevention

Date: 2026-11-13. Status: fix committed, Blender verification pending.

## Observed failure
- V12 visually appeared to have a gap between the green stalk and the six-petal flower head.
- V13 added a collar mesh spanning from the bent stalk into the actual tepal-root ring, and an assertion measuring all 60 base-row vertices (10 for each of six petals).
- GitHub Actions run #56 (43443551683) failed in `white_lily_single.py` at `assert max(root_distances)<.055`; observed maximum distance was 1.5119454283362674 Blender units.
- This is close to the +1.50 Z translation applied to the flower objects. It strongly suggests stale `matrix_world` evaluations after updating `obj.location.z`, rather than evidence of a genuinely 1.5-unit modeling gap. This is a hypothesis pending a successful rerun.

## Fix applied
- Commit fc69a58e9d2a1fd4d5b0d2171d5014f4ed5a3e24 inserts `bpy.context.view_layer.update()` immediately after translating the flower assembly and before converting vertex coordinates, and again before measuring the final root vertices.
- Preserve the approved six-petal mesh and all 1000 control coordinates; do not solve this by reshaping the petals.
- Keep a connecting collar overlapping the last stalk segment and reaching the actual petal-root ring.

## Verification gate
1. Blender Actions run must succeed; inspect the exact commit SHA and logs.
2. The 60-root assertion must pass; record min/max distances.
3. Inspect real angle, front, side, and top PNGs for visible gap, protruding green collar, stalk tangent, and natural droop.
4. Check GLB output and do not promote to permanent game assets or merge until user approval.
5. If assertion still fails, print both `obj.location`, `obj.matrix_world.translation`, the first petal-root world position, and `head_aligned(head_anchor)` to identify coordinate-space mismatch before changing geometry.

Links: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43443551683 ; PR https://github.com/koda24-cell/kotama-no-bouken/pull/306
