# B5朽ちた騎士像・部品別再設計 / architectural pedestal V1
Status: NOT_APPROVED — review-only standalone candidate; V14 geometry is preserved.

## Evidence / shape research
- Metropolitan Museum, *Tomb Effigy of a Knight in Gothic Armor*, ca.1425–50, actual sculpted stone: https://www.metmuseum.org/art/collection/search/34026
- Churches Conservation Trust, fourteenth-century knight effigy: https://www.visitchurches.org.uk/visit/our-churches/st-michaels-church-buslingthorpe-lincolnshire
- Pinterest candidate (not saved, visual not fully verified): https://www.pinterest.com/pin/1095289571895410060/ — Medieval Tomb Effigies
- Pinterest candidate (not saved, visual not fully verified): https://www.pinterest.com/pin/21744010695741644/ — Gothic Pedestal
- Preserve photographic stone PBR from V13/V14 as later material option (actual photo license evidence in existing Artifact). No Pinterest image is used as a texture.

## Pedestal-specific design and QA
- Carved masonry, **three crisp stepped registers**. Large horizontal slab, narrow hollow groove, broad shaft with carved Gothic quatrefoil recesses, bottom chamfer course. No toy-like broad rounded bevels.
- Individual mesh objects named and exported as a standalone `b5_knight_arch_pedestal_v1.glb` with corresponding `.blend` and `front/side/angle.png`.
- Keep the horizontal faces flat and full size; small chipped corners only in two chosen sites. Faint grout and localized joint erosion; no pebble carpet.
- Overall width 1.8m; depth 1.5m; height around .48m. Real origin at base center Z=0.
- Don't delete V14 original. This is a replacement **candidate**, not an overwrite or formal asset.
- Inspect screenshots for squared silhouette, shadow separation, scale, unnatural floating cracks/blocks, equal left/right positioning, texture realism.
- On approval: formal GLB/PNG, then separate integrated knight assembly and game test.

## Later separate assets
1. seven-head anatomical armature/proportion blockout
2. bascinet/gothic helm
3. breastplate and fauld
4. articulated shoulder/elbow/knee/gauntlet
5. longsword and shield as separate GLB
6. **thin** hanging carved cloth; mesh thickness chosen based on stone rather than blanket-like plates
7. full assembled statue three-view and map fit test

No approval, merge, or game inclusion before user review.
