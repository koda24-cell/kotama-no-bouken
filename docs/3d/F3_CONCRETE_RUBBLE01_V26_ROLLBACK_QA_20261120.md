# F3 Concrete Rubble01 V26 — restore V23 and apply only one chip
Status NOT_APPROVED pending actual multi-angle Blender 5.3 render.

Baseline: V23 (Blender success run 44675940537); V24/V25 rejected because closed inner recessed contour made a tray/basin. V26 copies V23 geometry, topology, original texture setup and exterior contour verbatim. Only addition is a locally bounded 7.5mm depression in top 65–80mm patch centered x=-138mm, y=+78mm (upper side), after original V23 bmesh construction.

- Entire previous corner fold, all side facets, original 450 x 310 x 120 mm nominal footprint untouched.
- No Boolean, no full-top radial deformation, no artificial closed fracture ring.
- New local fracture chip geometry only, with approximately 1mm inward x shift.
- Blender 5.3: GLB/Blend/5 real views, 4 PBR PNG and SHA manifest; compare against V23 and visually reject if worse. No asset promotion or merge without explicit approval.
