# Ore V12-B — approved visual target; floor 2 placement next

Date: 2026-11-19

## User decision
- The standalone crystal ore V12-B visual is approved as complete for the standalone review stage.
- Retain V11 Glass-like transparent crystals, including bright white highlights on large crystals.
- Use V12-B cyan rock illumination reference intensity 450 (Blender point-light setting; **not** a directly transferable Three.js intensity).
- Do not use the Milky variant.
- Preserve the original CC0 boulder geometry and 110 added crystals.
- Defer further artistic revisions until the asset has been placed across the floor 2 environment and judged in context.

## Verified evidence
- Successful GitHub Actions run: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44437491761
- Run artifact: ore-dense-crystal-original-boulder-not-approved (artifact ID 14488539183).
- Real ClamAV scan: 18 scanned, 0 infected; Blender embedded-Python safety check passed, security preflight passed.
- Actual V12-B render: v12_glass_radiant_450.png in that artifact.

## Critical distinction before integration
The current artifact GLB, dense_crystal_on_original_boulder.glb, is exported **after restoring the old V10 baseline shader and 80-energy review lights**. It does **not** yet encode the V12-B Glass shader. Blender point lights are also not exported as part of the selected mesh GLB. Thus the approved V12-B **render** is verified, but the final V12-B **game-ready GLB and in-game cyan spill** have NOT yet been verified or permanently promoted.

## Next implementation
1. Export a distinct V12-B Glass material GLB without modifying the original source mesh; keep source and review evidence.
2. In an isolated integration branch, place instances in floor 2's real scene and add separate cyan lights/VFX with measured Three.js intensities and falloff, starting from the visual reference, not the Blender numeric value.
3. Review close/mid/far views, exposure/Bloom, clipping, and FPS/draw calls. Preserve the existing floor and gameplay.
4. After verified render and performance audit, promote the approved asset via a reviewed PR to development. Do not merge into main automatically.
