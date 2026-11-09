# Claude Handoff — Floor 5 Abyssal Star Realm

**Repository:** `koda24-cell/kotama-no-bouken`
**Branch:** `feature/gpt-floor5-abyss-throne-assets`
**Base:** `development`
**Asset authoring:** GPT
**Game integration:** Claude
**Final acceptance:** User

## Goal
Create an isolated Floor 5 preview in the existing 3D dungeon pipeline. This is a 3D environment, not a 2D map. Do not modify Floor 1 or Floor 2.

## Visual direction
1. The route is a ruined stone causeway and floating platforms over a bottomless abyss.
2. The abyss itself forms the apparent walls. The player must not see traversable paths or the far side of the dungeon beyond those walls.
3. Far beyond the ruins is a cosmic sky with stars/nebulae and enormous machine-like, skyscraper-shaped structures with scattered illuminated windows.
4. Violet flames and embers drift through the route and rise from cracks.
5. Gothic architecture gives the final approach solemnity: pointed arches, tall columns, ruined masonry, aged metal details.
6. Torn, faded banners hang from pillars.
7. Ancient ornament references: vertical geometric patterns and flowing organic/vine-like patterns. Use cyan/blue-white as older neutral rune light; shift to violet/magenta near the Demon King.
8. The final chamber is a grand, symmetrical throne hall with a monumental demon throne, violet lighting and restrained ornament.

## Asset pack — current version
- ZIP: `assets/3d/dungeons/b5_abyssal_star_realm/models/floor5_abyss_throne_refined_v2.zip`
- Contains `floor5_abyss_throne_refined_v2.glb` and `README_FLOOR5_V2.md`.
- GLB: 604 named meshes, approximately 407 KB.
- Includes broken causeway, layered abyss rim/cliff walls, floating ruins, parapets, gothic gate/colonnade, rune inlays, frayed banners, throne frame/dais/throne, chandeliers, violet flame and ember placeholders, starfield points, and distant machine towers with emissive windows.
- Extract the ZIP before loading. Do not pass the ZIP to the GLB loader.
- v1 is superseded by v2; use v2 as the integration source.

## Integration tasks
- Inspect the current 3D renderer, scene loading, floor selection, camera, movement, collision, and asset conventions.
- Add a separate Floor 5 scene/config and isolated preview route.
- Use broken stone slabs as the walkable route; side platforms and debris are visual unless explicitly traversable.
- Keep abyss-facing walls opaque/occluding so the route beyond is not visible.
- Add a cosmic sky/nebula background and distant mechanical skyline as a separate renderer layer. Star meshes are only supplementary markers.
- Use violet fire particles and embers; static fallback is acceptable if no suitable animation system exists.
- Use torn banners, rune inlays, gothic arches and throne assets as modular pieces.
- Separate visual meshes from collision; do not make the entire GLB one collider.
- Test scale, camera framing, occlusion, performance and browser console.

## Known limitations / renderer-side work
The GLB is a refined geometry/material prototype, not final hand-authored production art. Cosmic sky/nebula, depth fog, dynamic/volumetric lighting, animated flames/embers, rune pulses, collision and route validation remain game-side tasks.

## Constraints
- Do not modify Floor 1 or Floor 2.
- Do not convert the dungeon to 2D.
- Do not alter combat, stats, saves, story progression, or unrelated UI.
- Do not merge this branch or PR; user approval is required.
- No Blender workflow is required; use GLB directly.

## Expected report
Changed files, preview route/link, mesh groups used/omitted, collision and camera decisions, particle/animation fallback, test results, and confirmation that Floors 1/2 and saves remain unchanged.
