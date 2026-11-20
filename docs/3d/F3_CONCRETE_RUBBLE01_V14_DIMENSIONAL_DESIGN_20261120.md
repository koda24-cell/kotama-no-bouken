# Floor 3 Concrete Rubble 01 — V14 dimensional experiment

Status: NOT_APPROVED (design/code candidate; actual Blender run and visual review required).

## Context and retained source

- Baseline: V13 in Draft PR #642, successful Blender 5.3 four-view run 44660555946 (artifact 14595107431).
- Preserve all V1–V13 generators, original GLBs and unrelated floor 3 walls/windows.
- V13 issue: six similarly aligned perimeter tiers visually produce upright, vertically cleaved side facets; aggregate reads as spotted rather than mixed inside concrete.

## V14 dimensions and tolerances

| Feature | Value |
| --- | --- |
| Nominal footprint | 450 × 310 mm |
| Nominal thickness | 120 mm |
| QA bounding limits | X 430–470 mm, Y 290–330 mm, Z 95–145 mm |
| Perimeter | 27 original stations + 27 midpoint stations, preserved |
| Edge rings | 6 (nonparallel wave phases per ring) |
| Main side lateral shift | 13 mm sin + 6 mm cos, per-ring phase |
| Mid fractured radial relief | 16 mm sin + 8 mm cos, phase-shifted |
| Inter-ring height irregularity | 9 mm + 5 mm wave + 7 mm larger ledge variation |
| Embedded aggregate patches | 18 low-contrast irregular patches, 512² fracture albedo only; no extra stone meshes |
| Patch radius in fracture UV | U 0.004–0.010, V 0.016–0.038 |
| Texture contrast | max ~0.045 gray uplift, rather than 0.10 |
| Rendering | Cycles 36 samples, four 840² PNG views: front, side, oblique, fracture-detail |
| Export | single GLB mesh, two material primitives, plus .blend, 4 PBR 512² PNGs, SHA manifest |

## Acceptance gate

1. Confirm Blender 5.3 job completes, source/GLB/Blend/PNG signatures and hashes pass.
2. Inspect all four *actual* PNGs for vertical pillar appearance, stretched side UV, protruding white aggregate, over-bright texture and distorted slab silhouette.
3. Check screen-size readability and non-destructive rigid-prop GLB performance QA before promotion.
4. Failed artistic review → V15; never automatically merge this draft asset into development or main, and do not promote to game.

The changes create a specific *candidate*, not a claim of improvement without visual inspection.
