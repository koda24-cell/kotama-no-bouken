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


## Assassin face render: failure and correction (2026-11-14)
- Goal: render a face close-up with a separate silver-lavender fringe that occludes the camera-near (+X) eye in the three-quarter view. Preserve the original VRoid face/body mesh.
- Failed run: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43478815499 (commit `e3b0b58`).
- Symptom: the first eight full-body and repair PNGs rendered, but the face stage aborted before any `face_*.png` files or final Blender/GLB export. The validation step failed because the script had terminated.
- Root cause: `NameError: name 'fs' is not defined` at `fw=fs.x;fh=fs.z`. The fringe construction used face dimensions `fs` and face center `fc` before calculating face bounding-box coordinates.
- Fix: commit `81e6d0db39288f164b81a5ab6974124bebdf535e` calculates `face_bounds`, `fmin`, `fmax`, `fc`, and `fs` before the fringe geometry is built. The separate fringe mesh and original geometry are retained.
- Verification: rerun https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43480789914 was in progress when this note was written. **Do not mark the face renders successful until this run finishes and its actual `face_front.png`, `face_side.png`, and `face_three_quarter.png` are inspected.**
- Next checks: confirm the near eye is covered in the three-quarter view; confirm fringe is not floating, clipping the cheek, or hiding the far eye; compare against the user's assassin reference. If the render still fails, inspect the Blender traceback before editing again.
- Workflow hygiene: always initialize geometry-dependent dimensions before generating derived meshes; include face PNG presence in the output validation step once the face stage is stable.

- Follow-up failure (run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43480789914): `TypeError: mathutils.Vector(): takes at most 1 argument (3 given)` at the first `V(fc.x, ..., ...)` fringe point. Blender's `Vector` constructor requires one sequence argument. Fixed all five fringe points to `V((x, y, z))` in commit `1f21817eee15dd7c75c8444f4ad8607986ee42cf`. Render verification still pending; inspect face images before marking success.

## Layered hair geometry trial (2026-11-14)
- Commit `e5f0a92662c02ab860977c0de63ab5776f69f72f`: replaced a single flat fringe polygon strip with four independent, closed, smooth-shaded tapered mesh strands, each built from 10-vertex elliptical cross-section rings. Original Face mesh is unchanged. Render isolation now includes all four strands.
- Goal: obscure the camera-near eye while preserving the far eye, and avoid a visibly planar hair sheet. This is a Blender-native mesh prototype; it does **not** claim the third-party HairMesh addon or Geometry Nodes modifier is installed. Geometry Nodes-based generation and addon compatibility testing remain future steps.
- Verify the new workflow run succeeds and inspect front, side and three-quarter PNGs before claiming quality improvement. Do not promote assets before user approval.
