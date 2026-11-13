# VRoid CC0 girl base — import experiment (2026-11-14)

## Selection
- Official pixiv sample: β Ver AvatarSample_1, character Sendagaya Shibu.
- Official license: https://vroid.pixiv.help/hc/ja/articles/360012381793-%CE%B2-Ver-AvatarSample-1 (CC0; use of VRM/.vroid may be subject to relevant platform terms).
- Download mirror: https://github.com/madjin/vrm-samples/blob/master/vroid/beta/Sendagaya_Shibu.vrm
- GitHub Actions fetches source and records SHA-256; binary is kept in ephemeral artifact, not committed to Git until review.

## Plan
1. Download exact VRM 0.x model from mirror and validate size.
2. Blender glTF import of VRM container; do not modify original file.
3. Hide named hair/clothing objects for body-focused evaluation, preserving geometry.
4. Render Eevee solid-clay front, right/left side, and oblique; record mesh counts.
5. Compare to Pinterest pin 878835314813441339 with calibrated silhouette overlays after import passes.
6. No merge or asset promotion before visual review and user approval.

## Limitations
VRM import may not preserve VRM-specific shader/rig behavior using generic glTF importer. Body-only visibility is name-based and must be visually checked; no promise that costume removal is complete. This branch is independent of the ongoing custom lowpoly PR #314.
