# B4 Dragonfire — asset inventory and Claude integration handoff

Status: Asset organization only. Not integrated into runtime; no validation in game yet.
Source: user-uploaded split ZIP archives on development, organized without altering binary blobs.

## Stored archives

- `assets/3d/dungeons/b4_dragonfire/models/floor4_Part1_Models.zip` — 16,354,690 bytes; 3D models and integration docs.
- `assets/3d/dungeons/b4_dragonfire/textures/floor4_Part2_Textures.zip` — 13,947,225 bytes; texture images.

## Expected contents (from creation manifest, not independently unpacked from GitHub)

Part 1: `floor4_dragonfire_environment_v1.glb`, `floor4_corrupted_barrier_v1.glb`, `floor4_dragon_boss_v1.glb`, `floor4_gothic_fortress_addon_v1.glb`, `floor4_lavafall_ember_fx_seed_v1.glb`, `ASSET_MANIFEST.json`, `CLAUDE_FLOOR4_INTEGRATION_HANDOFF.md`, `floor4_texture_preview.png`.

Part 2: 13 PBR texture images (4 base color/albedo, 4 normal, 4 roughness, 1 lava emissive).

## Intended art direction

Fourth floor is a dragon-and-fire volcanic fortress, surrounded by magma, gothic masonry, dragon motifs, lavafalls and a boss gate. A separate irregular corrupted barrier blocks the route just before the boss. The dragon model is static; no rig or animation is supplied.

## Claude integration checklist

1. Extract both archives into appropriately named B4 asset subfolders. Do not load ZIP files directly as GLB models.
2. Inspect GLB coordinate system, materials, texture references and scale; map textures to meshes only after verifying compatibility with the current renderer.
3. Connect models to the existing 3D dungeon exploration system. Preserve the 3D first-person/depth view and optional 2D minimap; do not replace the exploration view with a 2D character map.
4. Keep B1–B3 assets, game balance, existing save data, and navigation unchanged.
5. Implement collision, map layout, lava hazard visuals, and boss-path barrier as separate game logic; do not infer these from the static GLB alone.
6. Add runtime lavafall/ember motion, lighting, fog, and dragon animation separately. None of these is completed by this archive organization.
7. Test loading, material appearance, mobile performance, collisions and boss progression before proposing integration.
8. Record any extracted assets and credits in the project's asset manifest/credits documentation.

## Review state

This organization PR is targeted at `development` and should remain a Draft pending user approval. No merge into `development` or `main` is authorized by this handoff.
