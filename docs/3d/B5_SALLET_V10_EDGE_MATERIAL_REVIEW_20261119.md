# B5 Sallet V10 — silhouette / metal surface balance, 2026-11-19

## User's correction
- Prior V7/V8 overall silhouette too uniformly round.
- Real forged armor combines a round skull with sharper, distinct folded metal arrises, stamped plane changes, thin plates and a sharply defined flange.
- Existing material uniformly speckled and mechanically bland; independent visual variation is important. Do not add noise just for texture.

## Verified reference
- Walters Art Museum 51.470 same-object 10 fetched official CC0 photographs, reference handoff: https://github.com/koda24-cell/pinterest-reference-library/blob/main/handoff/b5-sallet-full-view-20261118.md
- Do not treat photos as redistribution-ready game textures; comparison only.
- Required views: front, left, right, back, angle, top.

## Separate V10 changes
- Preserve all V1-V9 script and assets unchanged, create `tools/b5-knights/build_sallet_v10.py`.
- Skull remains smooth and rounded so the silhouette supports an actual cranium.
- Rear nape has a thin independent local angular flange geometry on each side, rather than more overall smoothing; visible small line highlights.
- Central comb becomes a crisp narrow line.
- Visor lower edge tapered, faceted surface normals instead of smoothing entire piece to cylindrical curvature.
- Weathered steel PBR: reduce uniform black speckle, combine broad low-frequency patina, rare pits and narrow directional abrasion. Metallic/roughness differentiated between broad shell and edge.
- Actual Blender six-direction rendering plus GLB/Blend/hash/manifest required. Matching the photo's silhouette and metal edge/contact judged manually; technical QA success does not mean visual acceptance.

## Running
- Workflow `.github/workflows/b5-knight-sallet-v10-render.yml`
- Run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44442544804
- Status at document creation: RUNNING, results not yet verified.
- V9 failed Blender dependency installation; V9 was not rendered (run 44440744699). Keep V9 code for history, do not claim output.

## Remaining requirements for artistic pass
- No floating visor plates or large rectangular opening at either side.
- Thin metal plate look with bevels catching glancing highlights, not toy-like wide rounded strips.
- No unnaturally straight hard lines dividing the rear, or uniformly white/highly reflective base.
- Check the glTF material for real metallic/roughness textures/numbers and visually judge the generated 6 PNG before promotion.
- Independent rigid GLB performance audit is pending; do not infer FPS.
- `NOT_APPROVED` remains unchanged pending user approval.
