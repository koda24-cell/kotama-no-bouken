# B5 Sallet V8 / V9 visual review and checkpoint — 2026-11-19

Status: NOT_APPROVED; V8 TECHNICAL PASS, ART NOT APPROVED. V9 render launched but not verified yet.

Reference: Walters Art Museum Sallet 51.470, original 10 photographs and 11-view gallery.
Reference handoff: https://github.com/koda24-cell/pinterest-reference-library/blob/main/handoff/b5-sallet-full-view-20261118.md

## V8 verified
- Source: `tools/b5-knights/build_sallet_v8.py`, preserving V1-V7.
- GitHub Actions https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44440295755 completed success.
- Artifact ID 14490044074, `b5-sallet-v8-walters-NOT-APPROVED`, GLB + editable Blend + front/left/right/back/angle/top 800px PNG and manifest/progress.
- Local materialization verified all eight manifest SHA256 entries; source SHA ee3cf5826bcb169d61f476d3664c1ba76f30f8f3.
- Actual six-view visual review: front square cavity fixed; sides no longer show rectangular hole; swept rear nape smoother. Failures: straight horizontal lower visor band, flat appearing rear metal segment, too even artificial speckle and strong light hot spots.
- No model approval. Performance GLB audit not run on this temporary artifact. No approved production path touched.

## V9 independent iteration
- Source: `tools/b5-knights/build_sallet_v9.py`, original V8 unchanged.
- Changed: tapered lower visor edge with center-vs-temple sculpting; extra rear loft sections, softened studio lighting.
- Workflow: `.github/workflows/b5-knight-sallet-v9-render.yml`.
- Run: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44440744699 .
- Render/result/artifact/visual verdict: NOT YET VERIFIED at writing. Do not report success before actual PNG and SHA review.

## Next
- Poll V9 until complete, download and inspect 6 PNG/GLB/Blend.
- Compare side silhouette and visor at close crop to Walters actual references. If still not acceptable, make V10 independent script; never overwrite V7/V8/V9.
- Asset promotion requires explicit user approval, separate PR to development and proof of saved GLB + PNG.
