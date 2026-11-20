# Floor3 Rubble01 V22 failure and V23 real render quality review
**NOT_APPROVED**. No development/main merge or production GLB placement.

## Evidence
- V22 Actions run 44675681991: **failure**. Blender 5.3 Boolean modifier against inherited concrete mesh yielded zero body polygons, detected by explicit assertion. No complete GLB/Blend/5 renders. This is a failed technical experiment.
- V23 Actions run 44675940537: **success**. Artifact 14601843714, name f3-concrete-rubble01-v23. Full GLB/Blend, four PBR PNGs, front/side/angle/top/fracture-detail five 840px PNGs, manifest present. All **11** referenced file SHA256 hashes independently verified against downloaded artifact.
- V21 comparison run 44675036078 / artifact 14602281671 included to isolate the forward-right corner geometry.

## Visual assessment
- V23 produces a localized damaged right-front corner in front, angle and top, unlike V21's intact-looking corner.
- The overall object still reads like a weathered rectangular slab. Most upper area is too continuous and lacks large 3D angular broken planes.
- Side remains too cleanly tiered and faceted, aggregate too much a texture impression rather than physical cut-through inclusions. The corner fold may stretch or overlap triangles.
- Thus **V23 is technically verified but artistically rejected**.

## Next design change
Stop changing a single heightfield and sine perimeters. Build V24 as dedicated **watertight broken-section topology**: measured slab fragment with one surviving plaster/cast patch and several explicitly joined irregular fracture walls, including a real triangular/corner cut. First verify face winding and manifold edges, then assign side-material UV and repair render light/exposure. Maintain versions V1–V23, no destructive replacement. Fix old wide push-trigger workflows in a separate CI housekeeping PR after comparing existing triggers.

Materials remain non-protruding (no floating bright white aggregate spheres). Approval requires user's multi-view image review.
