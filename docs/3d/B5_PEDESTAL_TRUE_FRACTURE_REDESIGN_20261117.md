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

## First real render and image review
- V1 Actions success: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44026580207 ; Artifact `14303078042`. GLB (903,124 bytes), Blender source, three 1000×800 PNG and manifest were fetched and real images opened. 3-direction/GLB/hash technical QA passed.
- Actual **artistic failure**: most of the statue pedestal remains blank, white and studio-clean; open split reads as a highly repetitive lightning bolt with unconvincing zigzag angles; both sides appear excessively uniform. True physical separation is achieved but does not establish historically convincing erosion.
- V2 script `tools/b5-knights/build_pedestal_true_fracture_v2.py` changes upper and shaft split to less repetitive slopes, variable fracture-side vertex perturbations through depth, shallower gap, real removed-stone patches on cap/shaft, lower photographic influence and exposure.
- V2 Actions: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44027043326 . Results must be checked; a source commit alone is not completion.
- **No variant is approved**; original V1–V3, all old A/B/C, and knight V14 remain preserved without gameplay changes. Repair alternatives proceed one item at a time.

## Debugging and actual Blender artifact review, V1–V7 (2026-11-17)
- V1 run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44026580207 succeeded; a physical split was generated but the opening looked like a repetitive lightning stroke; surfaces looked too new.
- V2 run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44027043326 succeeded; more subdued zigzag and surface spall.
- V3 run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44027540791 succeeded; true mesh displacement. Still artificial and too pristine.
- V4/V5/V6 runs 44028069470, 44028643640, 44029176052 technically succeeded, **but artistic/structural regression**: both shaft meshes were present as GLB nodes with `mesh: null` (no geometry) after repeated destructive spall Booleans. This rendered an implausible empty alcove and floating ornaments. Not acceptable. Lighting change in V6 demonstrated the failure.
- **Root cause** identified by examining actual GLB JSON chunks from ZIPs, not inferring from screenshots. V2 and V3 both had mesh-index references for left/right shaft; V4–V6 did not. All defective versions preserved only as regressions, not candidate assets.
- V7 run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44029833293 succeeded; artifact `14304094681`. Derived from valid V3 instead of destructive V4. Fixed outward front/back/side face winding, restored both shaft meshes, avoided destructive repeated spall. New Actions QA asserts both named GLB shaft nodes point to valid mesh primitives.
- V7 downloaded actual images `front/side/angle` 1000×800; ZIP manifest GLB/Blend/3PNG SHA-256 recomputed and all matched. Both shaft nodes in GLB proven: left mesh index 3, right index 4. AmbientCG Rock063 CC0 color/roughness was included. Technical pass ≠ art pass.
- **V7 art review**: shaft restoration works and central open break is visible. Nevertheless sculpted ornament resembles applied clover stickers and surface roughness has low-resolution polygonal flaking, not authentic centuries-old damaged stone. Top course mostly straight and clean. **NOT APPROVED**, no promotion/merge/game insertion.
- Future iteration must favor observational sculpting of rough stone fracture interiors, deeper physically intact shell, erosion concentrated on water paths, and a real baked mineral roughness/normal study; don't use Booleans that invalidate the mesh.
