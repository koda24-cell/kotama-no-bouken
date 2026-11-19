# B2 Waterwheel spoke V01 — individual part design
Status: NOT_APPROVED, Blender execution and visual QA not verified yet.

## Handoff and compatibility
- Prior approved *appearance*: V11 outer rim, user said OK on 2026-11-19. Rendering evidence run #44436858908 (artifact #14488839107). This is visual approval, **not** confirmation of permanent binary promotion.
- New independent part: **one** spoke, not all 14, no runtime/game/asset folder modifications.
- Wheel axle X, radius 2.55 m, 14 radial arms, per development existing wheel specifications and PR #503 rim design. Spoke extends 0.34–2.47 m from hub. Maximum X half width .09m.
- Spoke silhouette has slight taper, beveled octagonal wood beam rather than perfectly rectangular primitive. Narrow outer mortise tenon is part of the *same* spoke. One restrained joinery pin and one longitudinal surface split.
- Next priority: real photographic CC0 wood PBR maps, proper UV orientation, hub/rim fitted render, frost layering; no downloaded/verified photo textures are claimed here.
- Review: four real Blender Cycles views; GLB/BLEND + SHA256 manifest in temporary Action artifact. Technical pass is not artistic approval. Only promote after user approves.
- Source: `tools/b2-waterwheel-spoke/build_single_spoke_v01.py`
- Workflow: `.github/workflows/b2-waterwheel-single-spoke-v01.yml`
- Historic reference: https://www.schoepfraeder.de/english/construc.htm , https://millsarchive.org/2022/03/29/wood-in-millwrighting/
- Existing CC0 photo candidate: https://polyhaven.com/a/fine_grained_wood ; V01 intentionally does not embed it (not retrieved by this script).
