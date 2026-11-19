# B2 waterwheel wooden hub V08/V09 fracture geometry review (2026-11-19)

## User request and original problem
V07 render showed a too-geometrical triangular silhouette on visible wood fractures; user requested an improvement. Main concern is art quality, not merely whether a mesh exists.

## Verified steps
- Both V08 and V09 were built from original, SHA-verified V02 BLEND; the existing outer rim, spoke, hub central shaft bore, all original 14 mortise locations, and game runtime were not altered.
- V08 [run #44450368874](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44450368874) **success**, artifact 14494678310. V-shaped straight tapering cuts replaced by crooked channel cuts with varying width, plus two short branches. Actual Blender Cycles 4 views inspected after ZIP download.
- V09 [run #44450831688](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44450831688) **success**, artifact 14495223028. Broad irregular radial scallops replace previous sharp outer corner chip cutter profile. Actual 4 views, 1 GLB mesh, 5 GLB embedded images, generated original torn-wood texture, Blender file verified after download. All seven manifest file sizes and SHA256 agree.
- V08 590 fracture faces assigned original generated texture; V09 593 fracture faces.
- All artifacts temporary, expires 2026-12-03 UTC. Neither version is approved for formal asset promotion.

## Visual assessment
- V08 endface fractures have more meander and variable width; however outer corners still show V-shaped negative-space chips.
- V09 broadens and changes the outer chipped outline but in the 850px review it remains a **modest visual difference**. Stronger asymmetry and actual layered split wood fibers are still missing; natural deterioration is not certified.
- Center hole and 14 joinery socket shape visually preserved; no measured hub-to-spoke assembly or watertight/slice checks yet.
- Current preferred working candidate: V09 as experimental continuation, **not final artistic acceptance**. Do not report as finished just because Blender succeeded.

## Next improvement
Introduce explicitly splintered wood inner walls or thin irregular torn wood lips around the edges and compare close-up. Avoid symmetric dark triangular voids, retain CC0 photo wood on undamaged surfaces and generated original endgrain only on broken faces. Perform mesh overlap and real 14-socket geometry test before promoting.
