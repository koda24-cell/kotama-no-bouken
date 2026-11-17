# 第5層 石像台座「破断面再設計」— 実物調査 / 2026-11-17
**STATUS: NOT_APPROVED**, previous A/B/C refused; independent revision; source V1–V3, weathered A/B/C cycles, original knight V14 are preserved.

## Source observations
- Observed real statue cracks in Pinterest image: https://www.pinterest.com/pin/574138652485892090/ . A principal fissure branches, traverses the sculpted face and has apparent physical depth. This *image is a reference*, not transferable artwork or texture.
- Photographs of damaged ancient masonry show large discontinuous 3D interior break surfaces and smaller flaked edges. Pale fresh interior of a broken stone differs from dark weathered outer skin.
- NPS / conservation classification: https://www.nps.gov/orgs/1739/upload/book-glossary-masonry-deterioration.pdf . **Distinguish open fracture from spalling, scaling, edge chipping and soot accumulation.**

## New geometry approach, replacing rejected crack workflow
1. Build long rectangular architectural base and projecting top cap in separate mesh objects with negligible bevel. Sculpted main shaft should retain large flat stone planes and cornice proportions.
2. Instead of a tubular dark curve at y≈front, split shaft **into two solids** along a branching, nonuniform X/Z polyline; use actual facing fracture interior, with an opening gap and small displacement in z.
3. Top lid must carry the same broad fracture into the cap, with a missing outside fragment near one corner. Do not render a black curve on top of a whole uninterrupted slab.
4. Add secondary *local* spalls adjacent to main fracture: surface and masonry edges removed by geometry, not stones floating in front. Rough fracture surfaces are grayer than the outer dark-aged skin.
5. Thin crack branches can be shallow recesses only where appropriate, while the main open fracture must be visible in side and 3/4 views.
6. AmbientCG Rock063 CC0 photo is optional for albedo/roughness and never used to fake a deep crack. Do not reuse Pinterest pixels as game textures.

## QA gates
- Actual Blender headless GLB + Blend source + 3 rendered PNG (front/side/angle), SHA-256, and manifest; technical QA ≠ user approval.
- Face-on and diagonal images should show a physical negative gap, not a black raised line; no black tubes for fractures; avoid identical symmetric cuts.
- The third-person game-scale silhouette and rectangle architectural mass must remain. No new changes to game map or original assets.
- Reject if the crack looks like a zigzag lightning icon or if the fracture faces look like smooth plastic.
- Only after review and approval promote official assets through separate PR.
