# F3 Concrete Rubble V26/V27 real Blender5.3 conservative rollback QA — 2026-11-20

## Status
NOT_APPROVED. No game integration, no merge; V23 remains the visual reference and V24/V25 are rejected examples.

## Verified results
- V23 baseline run 44675940537 / artifact 14601843714, GLB + Blend + four texture PNGs + 5 actual render PNGs.
- V26 run 44682619397 / artifact 14604732700, **success**, Python, Blender 5.3 5-view render, GLB format QA, artifact upload, all 11 manifest file SHA256 independently verified after archive download.
- V27 run 44683156494 / artifact 14605123627, **success**, same Blender and artifact checks, all 11 manifest file SHA256 independently verified.
- V26 is V23 source plus a single up-to-7.5mm top depression around (-138,+78)mm; V27 adds a single up-to-14mm lowering of front upper rim centered around (-80,-145)mm. All old versions retained.

## Image comparison
Actual front/side/angle/top/fracture_detail composite reviewed, V23 above V27 and V23 vs V26. Neither V26 nor V27 creates a significant visually legible improvement at standard rendered asset framing. They do preserve the more natural V23 boundary, unlike the geometrically artificial basin V24/V25. V27 is NOT declared best merely because its job succeeded; do not overwrite baseline with it.
- The underlying problem remains oversized side facets and a broad slab top; trying tiny vertex displacement on inherited ring geometry is insufficient. Next iteration should target a small, local **topology edit** at an edge, with a focused close-up camera and pixel-difference inspection, not a new all-surface heightfield or a closed inner crater.

## Workflow hygiene
Legacy workflows V1–V19 still have blanket tool-folder push triggers, generating many queued historical runs. V26/V27 callers use precise source/own workflow paths; legacy triggers require a separate reviewed fix. Do not claim complete remediation.

Retain PR #642 draft; final GLB formal promotion only after explicit user visual approval.
