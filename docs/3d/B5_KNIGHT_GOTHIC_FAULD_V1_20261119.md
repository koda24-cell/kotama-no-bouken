# B5 knight fauld V1 — three separate Gothic waist lames (2026-11-19)

Approval: NOT_APPROVED. Latest accepted design pieces: sallet V22 and breastplate V6. This V1 is *not* accepted, promoted, or assembled in game.

## References and research
- Existing Pinterest reference handoff: `koda24-cell/pinterest-reference-library/handoff/b5-decayed-knight-statues-20261116.md` (candidates; visual reference review incomplete).
- Met Museum Bulletin, recent acquisitions 1990–1991, discusses Innsbruck/Mühlau German ca.1490 armours and connected overlapping fauld/tassets. https://resources.metmuseum.org/resources/metpublications/pdf/Recent_Acquisitions_A_Selection_1990_1991_The_Metropolitan_Museum_of_Art_Bulletin_v_49_no_2_Fall_1991.pdf
- Antique fauld/tassets photograph from Olympia Auctions: https://www.olympiaauctions.com/auction/lot/173-a-fauld-and-tassets-in-the-late-gothic-fashion/?lot=8943&sd=1
- Pinterest cross-sectional overlap reference: https://www.pinterest.com/pin/58265388907747414/ (different, modern reproduction; use only conceptual construction, NOT a texture).

## Individual model specification
- `tools/b5-knights/build_gothic_fauld_v1.py` is an independent Blender script for **three distinct independent forged metal lames** and small paired sliding pivots, not a combined or full suit.
- Waist/hip sculpt contour follows V6 chest lower rim: prior breastplate ends around Z=0.875m, uppermost fauld starts Z=0.892m so the pieces should overlap when assembled.
- Three rows: Z .892–.807, .832–.739, .762–.665; overlaps 25mm and 23mm. Widths flare gradually toward hip from ~0.17 to .228m half-width. Front is convex, not a flat grid, each sheet thickness 1.8mm, separate GLB meshes.
- Material uses the **same ImageGen grime source** and V22 oxide/soot/roughness algorithm already integrated into accepted sallet / approved breastplate V6. Source `tools/b5-knights/textures/grime_imagegen_v15_256.webp.b64`, SHA256 `7287744136ebb3c4e43854306131fd215bdc396fd9aaa57ae7c32099190d8a23`. No externally downloaded binaries.
- Do not fabricate cracks across all rows. Default aging should remain restrained, similar to the helmet.
- No tassets, backplate, or waist cloth included. Those will each be independent asset tasks.
- Original V22, V6, prior sentinel model untouched, `development` and `main` untouched.

## QA
- Dedicated workflow `.github/workflows/b5-gothic-fauld-v1.yml`, run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44514615106 .
- Pinned prior validated shared Blender+ClamAV image, source malware scan and output malware scan.
- Actual 6-direction 800px Blender Cycles PNG, independent GLB/Blend, two PBR PNG. Manifest 10 SHA-256 entries and GLB material/mesh check.
- Real preview must verify no giant cylinder, no horizontal flat tape, edge contact/overlap and credible separate metal sheets. Artist approval is distinct from CI pass. Keep NOT_APPROVED until approved.
