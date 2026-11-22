# B5 metal armor V5 — first separate layered shoulder pauldrons

Status **NOT_APPROVED / review-only**. Based on V4 successful Blender5.3 render #45041613673. V4 original 6 imported metal GLBs, V2/V3 connections, V4 collar and hip panels preserved. Stone sentinel V14 is comparison-only and must never be exported inside the metal GLB.

## Numeric design (meters)

- Torso external width from V4 source AABBs: chest X ±0.243, back X ±0.231; their tops Z≈1.453.
- Three concentric, independently editable curved armor lames on each shoulder; centers X=.210/.239/.268, Z=1.426/1.377/1.328; radii X=.082/.100/.118 and Y=.127/.137/.147.
- Plates 1.8mm sheet with ~1.1mm rounded edges, 26×10 subdivisions; asymmetric down-swept surface (max crown +50mm). Dark aged steel, matching prior seam material. One 12mm pivot each side.
- First pass includes 8 new meshes total (6 plates and 2 pivot caps). Not arms, elbow joints, gauntlets, greaves or weapons. Whole-armor aesthetic QA remains open.

## QA requirements

- Verify source GLB hash gate, 8 PNG views, GLB+Blend, ClamAV output scan and workflow status.
- In front, angle, left/right and back, check visible layering, excessive shoulder width, accidental intersections, plate normals, silhouette and color matching.
- Actual PNG visual inspection may not be available through this chat connector; describe technical run success separately from beauty/geometry acceptance.
- Work remains an unapproved Draft PR stacked on #722; do not merge into development or main without user review.
