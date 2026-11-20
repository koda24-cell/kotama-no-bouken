# Floor3 Concrete Rubble01 — V24/V25 actual Blender5.3 render QA (2026-11-20)
Status: NOT_APPROVED, do not merge or promote.

## Confirmed execution
- V24 [run 44680779951](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44680779951): success. Artifact 14604735660. Python syntax, Blender5.3 5-view Cycles, GLB and SHA manifest validation success.
- V25 [run 44681409250](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44681409250): success. Artifact 14604606770. Equivalent production/format checks success.
- Downloaded both archives and checked all eleven manifest payload SHA256 hashes for each: 0 mismatches.
- Blender log V24/V25 geometry source validation: 233 original vertices, 462 polygons, all original face-use edges exactly twice. Approx dimensions **446.96 × 311.01 × 112.63 mm**.
- GLB V24 1,320,376 bytes, V25 1,423,080 bytes; both 1 mesh, 2 primitives, 2 materials.

## Actual 5-view images inspected
- V23 is the strongest visually among current versions for naturally rough, non-machined edges, although still too slab-like.
- V24 changed mesh to closed angular fracture wall, and missing front-right footprint; however image reads artificial **basin or decorative basin slab** rather than fallen city rubble. Prominent regular horizontal side bands and dark lower PBR.
- V25 reduced side band color contrast, fixed UV classification and reduced inner cliff depth. It removes some of V24's dark side banding, **but now looks like a shallower artificial tray**. The broken edge walls are still too geometrically even.
- Both technically passed, both aesthetic fail. V24/V25 geometry source is documented, prior versions unchanged.

## Next structural work
1. **Reject the full perimeter inner cliff.** Replace V24's concentric inner wall with two localized open fracture discontinuities reaching a perimeter segment; avoid closed oval/heart-shaped trough. Use unique joints and no zero-area faces.
2. Return natural jagged outside chip quality from V23 and retain V24's manifold design, with scattered 7–25mm missing corner chunks, not a clean polygon plate footprint.
3. Create separate surface material for exposed broken core, improve face UVs, and apply grain variation. Avoid bright white aggregate dots and avoid horizontal side bands.
4. Validate topology, GLB manifold normals, UV seams and five actual renders, then compare against V23 not just previous version.
5. Old per-version workflows still broadly trigger all historical jobs on changes to tools/floor3/concrete_rubble01/**. New V24/V25 callers use precise trigger, but full cleanup needs an independent review before modification.

**No game integration; draft PR #642; development/main unchanged.**
