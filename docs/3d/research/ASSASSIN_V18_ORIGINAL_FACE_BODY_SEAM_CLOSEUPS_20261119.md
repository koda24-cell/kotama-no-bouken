# V18 native Shibu Face/Body closeups — bilateral ear seam evidence (2026-11-19)

## Actual Blender run
- [Run #44448802780](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44448802780): **success**, artifact `assassin-v18-original-face-body-seam-closeups-NOT-APPROVED` ID `14494238245`.
- Original `Sendagaya_Shibu.vrm` mesh **unmodified**, Hair disabled; Body and Face visible. Ten actual PNG renders (6 baseline + 4 bilateral closeups). Artifact ZIP CRC passed.
- Closeup filenames `ear_seam_order_8_side.png`, `ear_seam_order_8_rear_angle.png`, `ear_seam_order_32_side.png`, `ear_seam_order_32_rear_angle.png`. Two analogous source surface outliers are Face rim order 8 / vertex 2071 and order 32 / vertex 1506.
- BVH triangle surface distances from run #44447509958: **0.008223736m** and **0.008223733m**; adjacent orders 9 and 31 about **0.000816872m**. The rest of the original 36 Face border is largely within <1mm of Body surfaces.

## Visual examination
- Both sides display a hard-looking plane/shadow near the rear lower ear base, visible in rear-oblique as well as lateral closeup. The image alone **does not prove** whether the boundary is an actual hole, a normal discontinuity, overlapping separate meshes, or intentionally sharp design.
- Do not deform the native rounded occiput or move any other Face/Body vertices. In particular **do not merge by proximity automatically**, since it may distort ear silhouette/skin weights.
- Next diagnostic: show source Face vs Body as distinct contrasting materials, export wireframe passes at both ear bases, record oriented normals on the nearest Body polygons and the Face boundary, and inspect actual triangle adjacency. Then decide whether localized material/normals fix suffices, or whether a 2-sided ~8mm bridge is warranted.
- Any bridge is a **separate unapproved candidate** with source mesh preserved, independent 6-angle baseline + bilateral closeups. Check UV/materials/armature before joining. Reject if side silhouette, lower ear contour or native occiput become worse.

## Non-approval and source limits
The original Shibu Body supplies a natural full posterior cranium and nape; no synthetic A-F caps should be used. Shibu-specific redistribution licensing still unresolved. This work is research and review only; do not merge unapproved geometry or promote GLB to game assets.
