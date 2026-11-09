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

## Prototype asset
A first-pass modular GLB was generated as `floor5_abyss_throne_prototype_v1.glb` (136 named meshes). It is a geometry/material blockout. The cosmic sky and distant illuminated structures should be renderer/background layers, not literal small meshes. Flame meshes are static placeholders; use the existing particle system for motion.

## Integration tasks
- Inspect the current 3D renderer, scene loading, floor selection, camera, movement, collision, and asset conventions.
- Add a separate Floor 5 scene/config and isolated preview route.
- Use broken stone slabs as the walkable route; side platforms and debris are visual unless explicitly traversable.
- Keep abyss-facing walls opaque/occluding so the route beyond is not visible.
- Add cosmic background and distant mechanical skyline as a separate layer.
- Use violet fire particles and embers; static fallback is acceptable if no suitable animation system exists.
- Use torn banners, rune inlays, gothic arches and throne assets as modular pieces.
- Separate visual meshes from collision; do not make the entire GLB one collider.
- Test scale, camera framing, occlusion, performance and browser console.

## Constraints
- Do not modify Floor 1 or Floor 2.
- Do not convert the dungeon to 2D.
- Do not alter combat, stats, saves, story progression, or unrelated UI.
- Do not merge this branch or PR; user approval is required.
- No Blender workflow is required; use GLB directly.

## Expected report
Changed files, preview route/link, mesh groups used/omitted, collision and camera decisions, particle/animation fallback, test results, and confirmation that Floors 1/2 and saves remain unchanged.
