# Floor3 rubble three variants V29 — shape differentiation pass
Status NOT_APPROVED until real Blender 5.3 render.

V28 completed successfully at run 44685616444. All 3 GLBs / 15 real PNG previews and 33 manifest checksum files verified. Dimensions V28 small 334x208x81mm, medium 467x323x119mm, large 691x398x145mm. However actual top/angle preview still made them appear like scaled copies.

V29 corrections:
- Preserve V23-based medium, identical original shape.
- Small: diagonal shard via independent x/y shear (+0.18*y and +0.24*x) and nonuniform 0.64×0.57×0.65 dimensions; 47mm corner collapse and opposite +20mm offset in base geometry.
- Large: independent shear (+0.045*y, -0.085*x), enlarged 1.31×1.25×1.25 before corner cuts, with up to 54mm inward right-corner shift and up to 35mm relocated far corner, 30mm upper corner recess. 
- No central bowl, no white floating pebbles. All transforms on single original mesh topology, no Boolean.
- Each separate GLB, Blend, 5 840px PNGs, four PBR PNGs, SHA manifest.
- Compare 3 at same orientation, evaluate silhouette diversity and genuine surface. If quality falls, V28 and V23 remain unchanged.
