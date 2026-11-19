# V13 crystal ore: user-approved 10 variants, floor assignment and base-rock expansion

Date: 2026-11-19

## Approval
The user visually reviewed the contact sheet of ten actual Blender renders and explicitly approved **all ten visual variants**. This approval is for the pictured appearance, not proof of runtime placement, export fidelity or performance. Preserve the source boulder and the accepted V12-B crystal appearance where relevant. Never overwrite the originals. No main merge without authorization.

## Floor assignments (canonical)
| Floor | Variant ID | Intended placement |
|---|---|---|
| 1 — forest | f1_01_moss_cluster | mossy rocky ground |
| 1 — forest | f1_02_lichen_spires | forest ruins and trees |
| 1 — forest | f1_03_rootside_specks | path edges and vegetation |
| 2 — icy water | f2_01_ice_blue | primary cave crystal deposits |
| 2 — icy water | f2_02_frost_shelf | ice walls and ledges |
| 2 — icy water | f2_03_cave_glacier | deep shaded cave |
| 2 — icy water | f2_04_riverbed_crystals | waterways and banks |
| 4 — volcano | f4_01_basalt_vein | dark basalt surfaces |
| 4 — volcano | f4_02_ember_cluster | near lava, with glare checked |
| 4 — volcano | f4_03_obsidian_glow | dark volcanic chambers |

## Source evidence
- Render run: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44446394039
- Artifact: ore-dense-crystal-original-boulder-not-approved (ID 14493586915); includes V13 PNG and GLB files and manifest.
- Generation script: tools/ore/render_dense_crystal_boulder.py on feature/gpt-ore-v10-pbr-compare-20261119.
- User's approval of visuals overrides the generic NOT_APPROVED label for review decisions; the artifacts remain temporary and require explicit promotion and runtime review.

## Next task: distinct base rock silhouettes
The ten approved variants reuse the same base boulder silhouette. Build additional **non-destructive** base-rock alternatives, rather than only recoloring:
- 1F: asymmetrical mossy low boulder, root-side flattened rock, angular partially buried stone
- 2F: smooth glacial erosion rock, stratified blue-gray shelf, broken icy bank stone
- 4F: sharp basalt chunk, layered volcanic rock, cracked obsidian slab
Use real geometric changes to silhouette, edge wear, cracks, top/bottom profile, contact footprint; avoid repetitive crystal positions. Keep rock geometry low-cost at a distance and retain high-detail near variants. Make separate multi-angle renders and GLBs, audit FPS and draw calls, then request review of the new rock silhouettes only. Do not disturb ten approved crystal colorways.

## Integration status
Floor assignment **recorded**, not yet placed into the live maps. Existing exported lighting differs from Blender's visual review; verify Three.js materials, emissive behavior, brightness/Bloom and LOD before integration. Store final approved GLBs/PNGs in official assets only through reviewed development PR, not solely Actions artifacts.
