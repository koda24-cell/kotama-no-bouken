# Floor 5 — Abyssal Star Realm / Demon Throne

## Concept
A ruined gothic route suspended over a bottomless abyss. The visible walls are abyssal drops; paths beyond the near cliff edge are intentionally hidden. The distant sky is cosmic, with stars, nebulae, and monumental machine-like towers whose windows glow faintly. Violet fire drifts through the ruins.

The final chamber is a solemn, monumental throne hall: gothic arches, weathered stone, dim violet illumination, torn banners, and a large demon throne.

## Asset groups
- Broken stone causeway and floating platforms
- Ruined pillars, gothic gate, colonnade
- Torn banners and aged metal fittings
- Violet flame placeholders
- Geometric/organic rune pillar placeholders
- Throne dais, stairs, throne seat/back/arms
- Placeholder star lights

## Prototype status
A first-pass modular GLB blockout has been generated separately:
- `floor5_abyss_throne_prototype_v1.glb`
- 136 named meshes
- The current file is a geometry/material prototype, not final production art.

## Renderer-side requirements
- Build the abyss as a dark depth/background treatment; do not reveal traversable paths behind the cliff walls.
- Add a separate cosmic sky layer and distant illuminated megastructures.
- Animate violet flames and embers with the project's existing particle/animation system.
- Treat rune meshes as placeholders for carved/inlaid motifs based on the supplied geometric and organic references.
- Author collision separately from visual meshes.
- Keep Floor 1 and Floor 2 unchanged; isolate Floor 5 behind a test/preview route.
