# Floor 5 — Abyssal Star Realm / Demon Throne

## Concept
A ruined gothic route suspended over a bottomless abyss. The visible walls are abyssal drops; paths beyond the near cliff edge are intentionally hidden. The distant sky is cosmic, with stars, nebulae, and monumental machine-like towers whose windows glow faintly. Violet fire drifts through the ruins.

The final chamber is a solemn, monumental throne hall: gothic arches, weathered stone, dim violet illumination, torn banners, and a large demon throne.

## Asset groups
- Broken stone causeway and fragmented walkable slabs
- Layered abyss rim/cliff walls, floating platforms and broken pillars
- Gothic gate, pointed arch details, colonnade, buttresses and parapets
- Torn/faded banners, aged metal fittings and chandelier silhouettes
- Violet flame tongues and ember placeholders
- Geometric diamond and organic/vine-like rune inlays
- Distant machine-like towers with cyan emissive windows
- Starfield point placeholders
- Throne stairs, dais, throne frame, seat/back/arms and crest

## Current asset pack
- ZIP: `assets/3d/dungeons/b5_abyssal_star_realm/models/floor5_abyss_throne_refined_v2.zip`
- GLB inside: `floor5_abyss_throne_refined_v2.glb`
- 604 named meshes; approximately 407 KB GLB.
- v2 supersedes the earlier v1 blockout (136 meshes).

## Renderer-side requirements
- Build the abyss as a dark depth/background treatment; do not reveal traversable paths behind the cliff walls.
- Add a separate cosmic sky/nebula layer, depth fog and distant illuminated megastructures.
- Animate violet flames and embers with the project's existing particle/animation system.
- Add rune glow pulses and suitable lighting if supported.
- Treat visual meshes and collision separately; author and validate the walkable route.
- Keep Floor 1 and Floor 2 unchanged; isolate Floor 5 behind a test/preview route.

## Status
Refined geometry/material prototype. Not final production art; renderer-side sky, animation, lighting, collision and in-game validation remain.
