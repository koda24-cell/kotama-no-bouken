# Claude Integration Handoff — Floor 2 Water Source

**Project:** Kotama no Bouken  
**Repository:** `koda24-cell/kotama-no-bouken`  
**Working branch:** `feature/gpt-floor2-water-source-assets`  
**Related PR:** #121 (draft; do not merge without the user's approval)  
**Owner:** Claude — game-side integration  
**Asset authoring:** GPT  
**Final acceptance:** User

## Goal

Integrate the Floor 2 water-source dungeon asset pack into the existing **3D dungeon/map pipeline**. This is a 3D environment task, not a 2D character-walking map. Preserve the existing first-floor scene and its behavior.

## Source assets

Existing starter/reference assets are in `assets/floor2-water-source/`:
- `background-cavern.svg`
- `crystal-cluster.svg`, `crystal-spikes.svg`, `ore-vein.svg`
- `waterfall.svg`, `waterfall-mist.svg`, `water-pool.svg`, `water-ripples.svg`
- `rock-spires.svg`, `rock-wall-segment.svg`
- `ancient-arch.svg`, `ruined-bridge.svg`, `water-gate.svg`
- `thorn-plant.svg`, `aquatic-thorns.svg`, `stone-floor-tiles.svg`

A higher-detail GLB prototype v3 was generated separately in this handoff conversation:
- Filename: `floor2-water-source-quality-v3.glb`
- 222 named meshes; modular blockout, not final art.
- Contains floor slabs, cavern boulders, crystal outcrops, ancient arch, broken bridge, water gate, water plane/ripples, layered waterfall sheets, foam and thorn plants.
- The GLB is currently a conversation attachment/download artifact and has **not yet been committed to this repository**. Do not assume it exists under `assets/` until it is supplied/added. If the file is not available in your workspace, continue with scene integration scaffolding and report the missing binary clearly; do not silently substitute the SVG reference art as 3D geometry.

## Required integration work

1. Inspect the current 3D dungeon renderer, scene loading path, floor selection/transition logic, asset conventions, camera, player movement and collision implementation before editing.
2. Identify the correct Floor 2 scene entry point and add a separate Floor 2 scene/config. Do not replace or alter Floor 1 assets, scene setup, navigation, or save data.
3. Integrate the GLB as modular scene content when the binary is available. Keep object names/groups meaningful so individual elements can be repositioned or toggled.
4. Arrange a readable playable route:
   - walkable stone floor through the center;
   - water pools as visual/physical hazards only where intended;
   - crystals and boulders frame the path without blocking the camera;
   - ancient arch / water gate as landmarks;
   - broken bridge as a deliberate traversal feature only if the current game supports it;
   - thorn plants/crystal spikes as hazards or decoration according to existing gameplay conventions.
5. Separate visual meshes from collision. Do not use the entire GLB as one solid collider. Ensure walkable floor is continuous and player cannot pass through solid rocks/columns.
6. Tune camera framing and scale to the existing 3D JRPG dungeon presentation. Keep player and route visible; avoid excessive foreground occlusion and camera clipping.
7. Materials:
   - cyan/blue crystals with restrained glow;
   - violet accents indicate danger;
   - wet dark slate rock and pale mineral stone;
   - water should read as water, not opaque blue floor.
   - Test GLB transparency in the actual renderer; if alpha blending is unreliable, use an opaque fallback material rather than breaking the scene.
8. Waterfall and water animation should be implemented using the project's existing animation/rendering approach. If no suitable system exists, keep a static, visually clean fallback and report what is missing. Do not add a heavyweight dependency without justification.
9. Keep the scene performant: instance repeated props where supported, avoid unnecessary draw calls, and test on the project's normal target device/browser.
10. Add a Floor 2 preview/test route that does not affect normal progression or existing saves, following the project's existing admin/test conventions.

## Constraints

- Do not modify Floor 1.
- Do not convert the dungeon into a 2D map.
- Do not rewrite the renderer or movement system unless essential; explain and isolate any necessary changes.
- Do not change combat, character stats, save schema, story progression, or unrelated UI.
- Do not merge this branch or PR. User approval is required before any merge to `development` or `main`.
- Claude does not need Blender. Use the GLB directly; no `.blend` workflow is required.

## Validation checklist

- [ ] Floor 1 remains visually and functionally unchanged.
- [ ] Floor 2 loads independently through the existing 3D dungeon flow/test entry.
- [ ] Player movement and camera work at the intended scale.
- [ ] Walkable path is continuous and collision is sensible.
- [ ] Crystals, rocks, ruins, bridge, water and thorns are positioned without unwanted overlaps.
- [ ] Water transparency/fallback renders correctly.
- [ ] No console errors, missing assets, or broken asset paths.
- [ ] No save compatibility regression.
- [ ] Preview link/screenshot and concise changed-file report are provided.
- [ ] Any missing GLB binary or unsupported animation behavior is explicitly reported.

## Expected report from Claude

1. Files changed and purpose.
2. How to enter/preview Floor 2.
3. Which GLB meshes were integrated and any meshes omitted.
4. Collision and camera decisions.
5. Water/waterfall animation implementation or fallback.
6. Test results, known limitations, and preview URL/screenshot.
7. Confirmation that Floor 1 and saves were not modified.

**Start with inspection and a minimal isolated Floor 2 integration. Do not merge.**