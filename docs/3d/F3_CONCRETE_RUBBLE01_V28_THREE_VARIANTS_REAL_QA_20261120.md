# Floor 3 concrete rubble — V28 three actual Blender 5.3 variants QA

Status: **THREE CANDIDATES RENDERED, NOT_APPROVED**; no merge into development or game asset folders.

## Evidence
- GitHub Actions [run 44685616444](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44685616444), completed success.
- Artifact 14606602309 (f3-concrete-rubble-v28-three-variants), archive 17,090,656 bytes.
- Actual separate Blender 5.3 Cycles outputs for small, medium and large: five views each (front, side, angle, top, fracture_detail), one GLB, one Blend, and four authored PBR maps each.
- Complete 33-file manifest: all 33 per-file SHA256 hashes independently recomputed from downloaded artifact ZIP and matched.

## Measured dimensions (full transformed mesh)
- Small: 333.99 x 208.46 x 80.96 mm.
- Medium: 466.67 x 322.93 x 119.15 mm (baseline V23 mesh dimensions, not source datum).
- Large: 690.59 x 397.60 x 144.51 mm.
- Each GLB validation: 1 mesh, 2 material primitives, nonempty GLB file, real PNG render and Blend files.
- The three view snapshots were composited for a 3-column angle/top comparison; all frames genuinely came from Blender, NOT image-generated art.

## Visual review
The three sizes are numerically distinct and there are modest silhouette deformations on small and large, but visually they **still resemble a scaled family of the same underlying slab**. The small fragment is somewhat narrower and its corner is chipped; large fragment thicker and wider, but the broad flat-looking upper region and faceted side layers repeat.
Therefore this is a successful technical preview **but shape diversity is not yet at high-quality final-art threshold**. In a future focused iteration, add a more pronounced corner cut on large and angular, thinner shard on small; do not modify V23 medium or introduce V24/V25 basin. Keep all variants separate for user approval.

No official model promotion or main/development merge.
