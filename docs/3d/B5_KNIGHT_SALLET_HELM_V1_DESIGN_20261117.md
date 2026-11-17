# B5 Knight stone sallet helmet: independent component V1 (2026-11-17)
Status: NOT_APPROVED. Original knight V14 and pedestal V1–V17 remain untouched.

## Actual references
- Museum exemplar: Met German Nuremberg Sallet ca.1490: https://www.metmuseum.org/art/collection/search/25388 ; genuine long-tail nape guard and shallow comb.
- Wallace Collection Sallet ~1500–1520: https://wallacelive.wallacecollection.org/eMP/eMuseumPlus?module=collection&objectId=60563&service=ExternalInterface ; visor vs independent lower-face bevor.
- Pinterest discovery (not individually checked visually): https://www.pinterest.com/pin/373939575325476993/ , https://www.pinterest.com/pin/314196511521674487/ ; account soukodama5165, board 3d アートワーク, do not save without user selection.
- Real-world construction references are NOT direct copy assets or reusable textures.

## Component design
- **Crown/skull shell**: manually lofted elliptical sections; high forehead, smooth taper to peak; slightly pointed rear nape extension instead of circular toy bucket.
- **Separate visor**: curved steel plate with a true thin horizontal ocular opening; avoid applying eye-slit as painted line. Side pivots/rivets visible.
- **Separate bevor**: low chin/throat guard with a jaw-point and metal shell thickness; stays distinct from visor.
- **Combed ridge**: restrained shallow crown center seam; aged chiselled stone / carved plate reads as material.
- Asymmetric age: chipped visor edge at one corner and a few shallow split marks on the lower rim; do not fill every face with floating pebbles or fake cracks.
- All pieces organized as meshes with semantic names; export GLB+Blend+front/side/angle PNG; manifest SHA-256. Independent part has bottom at Z~0m, height ~0.37m, safe for 7-head body later.
- Stone tint B5 cold gray; avoid broken normals. Old V14 stays a reference, no gameplay integration.
- Review priorities: 3/4 silhouette, forward eye line, not cubical, no metal/plastic shine, natural tail/forehead proportions, beveled edges small.

## Real Blender V1 review (2026-11-17)
- Real Actions https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44069062877 SUCCESS, Artifact `14321408058` includes GLB (144868 bytes), Blend, and front/side/angle 900×900 PNG. GLB skull/visor/bevor nodes and actual source SHA verified in workflow.
- Downloaded 3 views and visually inspected (contact sheet `b5-sallet-helm-v1-contact.jpg` generated outside Git). **NOT APPROVED**: boxy bucket-like crown, disconnected horizontal visor bands, nape sheet floating behind skull; entire helmet hovering above ground; severely overbright surfaces.
- V2 code `tools/b5-knights/build_sallet_v2.py`: adjusted crown and tail integration, reduced visor gap / forward extension and rivet size; lower rendering surface under the part; reduced overbright lamp power and stone albedo. Not finished until actual new render and review.
- Historical reference is genuine museum armor but geometry is an original, standalone sculpt. No unapproved model inserted in game. Do not merge.

## V2 Blender rendered and visual QA
- Real run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44069781616 successful; artifact ID `14322246268` (name currently says v1 due workflow upload label typo, but **inside ZIP are sallet_v2.glb and sallet_v2.blend**). Do not confuse this artifact with actual V1 `14321408058`.
- Actual downloaded GLB 146348 bytes, Blend, three rendered 900x900 PNG. Manifest five SHA256 all independently recomputed and matched. Actual 3-way contact sheet `b5-sallet-helm-v2-contact.jpg` generated for user review.
- Changes: visor and chin guard closer to head, tail profile shorter, viewport lights reduced, stone darkened and base plane correctly moved under model. No changes to knight V14 or any pedestal.
- **Art quality not approved**: image still resembles a cylindrical toy bucket with rectangular forward visor bands, narrow crest appears like rod, neck-tail geometry looks like floating wing, horizontal ring shading obvious. Technical mesh count and PNG success alone are not acceptance.
- Next model V3 must rework major forms (skull smooth curved shell, properly hinged curved visor around brow, irregular metal plate and articulated bevor), not just add rivets or decals. Keep all previous code and screenshots.
- No permanent asset promotion, no merge, no gameplay.
