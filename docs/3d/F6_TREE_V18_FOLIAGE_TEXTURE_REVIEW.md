# F6 Mature Tree V18 foliage texture review — 2026-11-18

Status: **NOT_APPROVED / not integrated**. Work branch: `feature/gpt-f6-tree-mature-v1-20261117`; PR #452.

## Changes
- Kept the V17 woody meshes, curved leaf geometry, branches and roots.
- Introduced four packed, UV-mapped original procedural leaf color maps at 128² each: longitudinal midrib, secondary veins, fine pigmentation variation, rim darkening and tip color.
- UV assignment is on each of the existing leaf triangles; no external photo pixels are redistributed.
- Source: `tools/floor6/tree_mature_v1.py`; review run must confirm Blender GLB export, 4 PNGs, file checksums and visual quality.

## CC0 photographic reference candidates
- [ambientCG Leaf 001](https://ambientcg.com/view?id=Leaf001): single green leaf; ambientCG states CC0, free commercial use. Candidate for future true photograph-based leaf atlas, **not currently downloaded, included or tested**.
- [Poly Haven licensing](https://polyhaven.com/license): website states CC0 for its assets.
- [Poly Haven Leaves Forest Ground](https://polyhaven.com/a/leaves_forest_ground): CC0 forest floor/leaf litter, **not suitable as direct living-leaf alpha atlas**; useful as separate garden floor material.
- Pinterest foliage references are shape/composition guidance, not automatically licensed texture sources. Refer to `koda24-cell/pinterest-reference-library/handoff/f6-tree-mature-20261117.md`.

## Upcoming visual and performance checks
1. Compare V17 and V18 front, side, angle, top renders including close crop; inspect veins, mottling and clipping.
2. Inspect GLB texture packing and UV correctness; compare material count and estimated triangles.
3. Test real CC0 leaf photograph with cutout/opacity and appropriate double-sided normal; compare against curved-mesh procedural baseline, avoiding high transparency overdraw.
4. Preserve original GLB and compare material-group foliage batching, LOD and impostor. No production model promotion without explicit user approval.

## Implementation status
V18 source committed. **Render success and image inspection must be separately verified**; neither source commit nor pass of general workflow proves appearance.
