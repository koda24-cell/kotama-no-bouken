# Floor 2 — Water Source Asset Pack

Initial modular SVG asset pack for the second dungeon floor.

## Visual direction
Beautiful but dangerous: clear water, luminous blue/violet ore, sharp crystal spines, wet ancient stone, thorny aquatic plants, and waterfall mist.

## Files
- `background-cavern.svg`: panoramic cavern backdrop / composition reference
- `waterfall.svg`: looping waterfall strip source
- `crystal-cluster.svg`: blue-violet crystal cluster
- `thorn-plant.svg`: dangerous waterside plant
- `water-pool.svg`: transparent pool / water surface decal
- `ancient-arch.svg`: ruined stone arch landmark

## Integration notes
- SVGs are scalable source assets with transparent backgrounds where applicable.
- These are initial 2D renderable assets, not Blender meshes or finished 3D models.
- Claude: integrate only after checking the current floor rendering pipeline. Keep floor 1 untouched.
- Waterfall animation can be implemented with a vertical translate/opacity loop; pool shimmer can use a subtle scale/opacity loop.
- Do not treat the panoramic background as a replacement for the existing navigable 3D dungeon renderer.


## Expanded modules
- `rock-spires.svg`: jagged mineral outcrops
- `ruined-bridge.svg`: broken stone crossing
- `water-ripples.svg`: concentric pool ripples
- `crystal-spikes.svg`: sharp crystal field
- `water-gate.svg`: ancient sluice gate
- `stone-floor-tiles.svg`: modular wet stone floor tiles
- `rock-wall-segment.svg`: cave wall variation
- `aquatic-thorns.svg`: thorny aquatic foliage
- `waterfall-mist.svg`: waterfall spray and mist
- `ore-vein.svg`: mineral seam embedded in rock

## 3D prototype
A procedural 3D prototype generator is provided:
- `tools/generate_floor2_water_source.py` — builds a modular GLB with faceted crystal meshes, rock wall chunks, ancient arch stones, water gate bars, and floor slabs. Requires `pip install trimesh numpy`.
- `tools/import_floor2_glb_to_blender.py` — imports the generated GLB into Blender, organizes it into a collection, and saves an editable `.blend` project.

The initial prototype contains 37 separately named meshes. It is a geometry/material blockout, not a final art pass: inspect scale, normals, material appearance, UV needs, and collision separation before game integration. The GLB generated for this first review is supplied separately as a downloadable artifact; rerun the generator to reproduce it locally.
