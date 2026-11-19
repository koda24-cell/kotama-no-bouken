# B5 sallet — V13 actual render and V14 design review (2026-11-19)

## Source / rules
- Previous V1–V13 preserved. Work isolated in `feature/gpt-b5-knight-statues-v1-20261116`, do not commit unapproved assets to game.
- Model primary reference: Walters Art Museum Visored Sallet 51.470 real same-object photographs; library: `koda24-cell/pinterest-reference-library/handoff/b5-sallet-full-view-20261118.md`.
- Official art direction: a relatively smooth steel crown but sharply formed visor/brow/tapered nape; intricate formed plate transitions, not attached glowing stripes or uniform noise.

## V13 rendering
- First run 44444782454: failed during apt package fetch, exit 124, no renderer started.
- Recovery run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44446037721: **success** after increasing apt timeout/retries.
- Artifact 14492993311 `b5-sallet-v13-walters-NOT-APPROVED`. 6 actual PNG 800px + GLB + Blend + SHA256 manifest/progress; locally validated all eight sha256 entries.
- Artistic review: front visor gains a pointed central lower tip and side silhouette becomes more dramatic. FAIL: unconvincing wide horizontal banding across rear and lower shell, sharp transition looks like stepped low-poly mesh rather than forged steel. Root cause is blanket `poly.use_smooth=False` for `z<.171` and coarse ring faceting.
- Technical pass does not equal user acceptance.

## V14 mitigation
- New isolated `tools/b5-knights/build_sallet_v14.py`; old versions unchanged.
- Replace blanket flat shading with selectively smooth crown and nape; keep true geometric bevel at very lowest .052m flange. Reduce hard undulations by roughly half.
- Rebuild visor with more graded lower-to-upper section samples and smooth normals; keep pointed mask from V13.
- New workflow: `.github/workflows/b5-knight-sallet-v14-render.yml`, https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44446660090 .
- Status at writing: RUNNING; no claim of visual pass. Required front/side/angle/back/top/right real render, GLB, Blend, SHA, and manifest NOT_APPROVED.
- Optimization audit and game FPS are not yet measured.
