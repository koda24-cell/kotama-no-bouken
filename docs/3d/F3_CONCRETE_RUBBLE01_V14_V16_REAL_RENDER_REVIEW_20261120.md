# Floor 3 Rubble01 — V14/V15/V16 actual render review (2026-11-20)

## Verified evidence

- V14 Blender 5.3 four-view success: [run 44666054813](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44666054813), artifact 14597858066.
- V15 Blender 5.3 four-view success: [run 44667853495](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44667853495), artifact 14598407276. Archive 10 manifest files; SHA256 all independently verified against artifact ZIP.
- V16 Blender 5.3 four-view success: [run 44668240046](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44668240046), artifact 14598083580. Archive 10 manifest files; SHA256 all independently verified against artifact ZIP.

## Visual review

1. V14: fracture flank has large exaggerated triangular faces, weak internal aggregate. NOT_APPROVED.
2. V15: subdivided fracture and side-only smooth shading remove triangles but form rounded/cloudy clay-like sculpted rock, with little exposed aggregate. NOT_APPROVED.
3. V16: increased subdivision and restored flat shading but large planar dark/bright triangles still dominate; still reads like rock rather than demolished concrete, and texture-mapped aggregate is too subtle. NOT_APPROVED.

## Required next structural revision

- Stop cycling only flat/smooth shading. Build a mixed fracture material with exposed embedded aggregate and chipped irregular section planes, while maintaining roughly 450×310×120mm slab silhouette.
- Remove periodic striping on top and in section material; texture must be nonperiodic across UV and not white pebbles projecting beyond section.
- Test a different face construction (faceted partial broken-section patch + worn cast top), not another ring-wise sinusoid displacement variation.
- Preserve V1–V16 and existing unrelated game assets. Keep PR #642 draft, never auto-promote to production. Require actual four-view PNG and SHA manifest for each revision.
