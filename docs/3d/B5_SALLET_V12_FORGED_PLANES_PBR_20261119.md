# B5 V12: forged planar transitions and nonuniform metal — review gate
2026-11-19. NOT_APPROVED.

## User feedback and why V11 was insufficient
- Spherical smooth crown dominates; side silhouette lacks definite brow line, angled cheek transition and hem.
- Armor requires a *hierarchy* of form: large curved bowl, medium distinct forged panels and narrow sharp edges, not uniform all-round smoothness or glued white lines.
- Material was uniformly gray-speckled; steel should have coherent wide highlights, patches of different roughness, wear and dark seams.

## V12 standalone source
`tools/b5-knights/build_sallet_v12.py` based on V11 with originals untouched.
1. Existing bowl remains a single continuous loft mesh; each lower crown ring gets 8 shallow forge-face transitions that fade toward the top. No detached sharp edge mesh.
2. Subtle brow flattening near ocular aperture to create deliberate planar break in a rounded head.
3. Lower visor has an angular lower chamfer and pinched temples while preserving a narrow slit.
4. Original baked steel color texture retained; separate packed grayscale roughness texture connected to shader metallic roughness input for local patches (validate actual GLB export). More material detail without multiplying black freckles.
5. Original decorative pin positions and nape shell preserved; V11 unchanged.

## Acceptance gates
- Real Blender PNG front/left/right/back/angle/top. Compare to Walters Art Museum 51.470 same-object CC0 photos in `pinterest-reference-library/handoff/b5-sallet-full-view-20261118.md`.
- Front: no cylindrical mask, brow formed into bowl, lower edge crisp but thin.
- Sides: neither floating white edge nor large square opening; distinctly formed cheek and back-to-tail transitions.
- Back: long tapered forged nape, no horns, no seams that suddenly stop.
- Materials: broad restrained reflection and irregular roughness; check GLB real packed maps and image noise, not just shader node existence.
- GLB/Blend/PNG SHA-256 and manifest NOT_APPROVED; preserve earlier V1–V11 checkpoint.
- Performance audit is required before promotion; NOT RUN yet.
- Approval solely from user; no asset promotion or game integration.

Run: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44444237905 — execution underway at writing; no aesthetic judgment yet.

## Verified V12 result
- Run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44444237905: **completed / success**; Artifact 14492647789, `b5-sallet-v12-walters-NOT-APPROVED`.
- All 8 binary file SHA256 entries checked against manifest: true. Six 800px PNG plus GLB and Blend present, progress/manifest present.
- GLB material inspected: steel material `metallicFactor=0.82` and a `metallicRoughnessTexture` index are present in the exported GLB; roughness texture is not only an unexported Blender node.
- Real six-view visual check: still predominantly smooth round helmet, visor front looks horizontal, weak forged edge and cheek plane definition; metallurgical appearance remains monotonous. **Aesthetic FAIL**.
- Decision: V13 independent profile revision `tools/b5-knights/build_sallet_v13.py` and `.github/workflows/b5-knight-sallet-v13-render.yml`, run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44444782454 . Initial run not yet verified at this document edit.
- No approved asset promotion; V12 and earlier immutable original files retained.
