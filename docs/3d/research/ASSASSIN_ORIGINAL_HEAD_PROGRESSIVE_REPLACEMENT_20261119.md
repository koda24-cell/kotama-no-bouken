# Assassin head: original modeling / progressive replacement — user-corrected goal (2026-11-19)

## Goal correction
The desired **final output is a head independently modeled from scratch** for the Assassin character. Shibu/Vita/third-party heads are **measurement and visual references only**, not production geometry or permanent base meshes. Prior guidance to always keep the native Body as final target was incorrect for this end goal.

## What previous failures taught us
- V18 A–F procedural rear caps made wedges, shelves, cones because they tried to connect the full Shibu face perimeter including jaw directly to one posterior cap. Do NOT repeat.
- Real Shibu Body gives a good **reference cranial side silhouette**, but its mesh topology/vertices must not be copied into the original model.
- Local normal transfer A/B (run #44452066673) succeeded technically but does not improve the modeled geometry; it was a source diagnostic, **not a substitute for sculpting a complete custom head**.
- In the original model, shape should be built **region-by-region** as independently authored quad surfaces, staged and reviewed, and only later joined into a single coherent mesh. Use measurements and drawings as constraints, not Shibu vertices.

## Progressive replacement sequence
1. **New posterior cranial shell** (this PR, V1). Analytic cross-sections with separate controls for upper occiput and nape; rear hemisphere only. Open front and lower interfaces deliberately remain so we do not force jaw into a big cap. No Shibu source import into generator.
2. **New bilateral temporal shells**. Original geometry from ear behind to crown, matching posterior rim, no hard step. Test profile and glancing angles.
3. **New cheek/jaw/lower face**. Build separately from a custom front face topology. Do not simply copy Shibu Face rim or assume its jaw contour equals neck opening.
4. **New ear structures**, separately modeled pinna/helix/antihelix/concha/tragus root.
5. **New neck and nape topology**. Link jaw/ear/occiput with preserved facial silhouette and smooth curvature.
6. **Custom face expressions/UV/skin weights, hair**. New independent topology and appropriate deformation. Evaluate 7+ views neutral and moving.
7. Replace any temporary reference-included parts only after exact original-mesh counterpart is **accepted by user**. Never delete earlier candidates; no asset promotion until approval/license review.

## V1 model truth
- `tools/character-mesh-research/build_original_occiput_v1.py`: analytic new quad mesh with 957 vertices, 896 quads, 120 intentional perimeter boundary edges, zero edges with >2 faces.
- **No source VRM read or imported**; no inherited vertex, topology, normals, UV, skinning, Shibu material or copyright-dependent mesh output. Scale/silhouette can be studied using real Shibu reference screenshots/measurements, like any concept reference.
- Render `right,left,back,back_three_quarter,back_upper,front,side_closeup`, output review-only Blend/GLB/PNG/QA/manifest.
- `NOT_APPROVED` by design. It is a *partial shell*, not a completed head or a finished VRM character. Open edges are intentional until stages 2–5.

## Acceptance gates before next stage
- Side view must be naturally rounded; no wedge, flat shelf, single rear pole, triangular cone, nape abrupt kink.
- Upper/back transitions must remain smooth at three-quarter and back upper angles.
- Independent mesh source proof: no VRM imported by generator and zero copied source vertices; verify quad/grid counts, boundary count, visible PNG outputs.
- Do not claim aesthetic success from passing geometry tests. Review actual PNG first.
- Retain source baseline as comparison only and keep previous source-audit PRs as diagnostic history.

## Compatibility with prior AGENTS rules
Preserve **existing game assets and functions**; this is an isolated new original asset. Maintaining original Shibu Body still applies to **reference tests**, not as a requirement for the new final Assassin. Do not touch gameplay/main. Run source/outbound malware scans before importing external binary assets in any later stage, and verify licenses before promotion.
