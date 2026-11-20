# Floor 3 Rubble V22 — genuinely missing upper corner (Boolean difference)
NOT_APPROVED until full actual render, file QA and visual inspection.

V21 render 44675036078 confirmed the prior width-gate transition softened serrations but failed visually as realistic concrete demolition. V22 keeps existing 450×310×120mm base and V1–V21 generators intact, cuts off a FRONT-RIGHT part of the old upper surface by exact Boolean difference.

## Actual geometry design
- Hexagonal cutter XY: (105,-185),(270,-185),(270,9),(218,10),(169,-41),(121,-85) mm, z from -10 to +135mm.
- Removed upper corner material is genuine missing geometry, not alpha masking or fake dark pixel groove.
- Existing side mesh and PBR retained; exposed upper-cut faces use interior cement material. No new visible independent white aggregate pieces.
- Five Blender 5.3 real 840px PNGs, one GLB, Blend, four PBR PNGs and manifest with SHA256 checks. One GLB mesh, two material primitives required.
- Technical gate: ensure Boolean solver completes, no inverted cut walls, no open seams, correct corner silhouette in top/angle/front, and no detached object exported.
- Artistic gate: do not claim natural collapse until actual images compared with V21. If Boolean result is a clean machined bite, V23 will need secondary irregular edge breaks and gravel texture refinement.
