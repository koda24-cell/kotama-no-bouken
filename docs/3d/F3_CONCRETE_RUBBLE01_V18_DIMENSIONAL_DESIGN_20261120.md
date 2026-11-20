# Floor 3 concrete rubble V18 — stepped top fracture experiment

Status: **NOT_APPROVED**, Blender 5.3 run and aesthetic assessment still required.

## Why
The real V17 five-view render (run 44672443123) showed a smooth crater rather than a fallen wall fragment. This V18 candidate replaces the broad radial bowl function with piecewise collapse terraces while retaining the original outer perimeter, side texture, source archive and asset IDs.

## Numeric design
- Footprint approximately 450 × 310 mm, old top datum +51 mm; nominal thickness 120 mm.
- Rear-left original cast-face patch: survives near +50 mm.
- Middle broken terrace: 14 mm below old top.
- Front collapse: 24 mm below old top.
- Right fracture wedge: 37 mm below old top.
- Local rear-left torn shelf: 21 mm step.
- Narrow branch crack: additional 6 mm cut, 8 mm wide, localized to x −150...+130 mm.
- Nonperiodic procedural noise on panel flats <= ~1.7 mm combined.
- Original perimeter geometry preserved and join zone protected; subdivided interior top vertices receive piecewise shape function after subdivision.
- 5 evidence views (front, side, angle, top, fracture_detail), 840×840 each, one GLB mesh / two PBR primitives, Blend, four texture maps, SHA-256 manifest.

## Review gates
Evaluate top view for three separate jagged stepped planes, side for false vertical pillars, edge transition for spikes/cracks and GLB for flipped normals, holes or manifold issues. Workflow verification does not imply artistic approval. No integration or merge until user visually approves.
