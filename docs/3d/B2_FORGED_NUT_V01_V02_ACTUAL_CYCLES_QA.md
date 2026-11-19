# B2 single forged bearing nut V01→V02 actual QA — 2026-11-19

User instruction: 「おｋ、次行こう」 after V04 bolt dome. Part chosen: **one standalone low-profile black-iron six-sided nut**.

## Scope and preservation
- Branch: `feature/gpt-b2-forged-bearing-nut-v01-20261119`, Draft PR #623 against `development`. No game runtime, V04 bolt, wooden bearing, old waterwheel wheel/hub/spokes changes.
- Nut one visible part only, local Z shaft axis. Nominal inner bore R0.037m for bolt R0.035m, thickness 0.068m, six slight irregularity facets, original 512x512 oxidized dark iron PNG.
- Internal axial/radial perturbation approximates thread. This does **not** certify actual thread engagement with the bolt; mechanical assembly still untested.

## Verifications
| Version | Run | Artifact | Result |
| V01 | [44515147691](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44515147691) | 14525341916 | complete/success. Actual 4 Cycles PNG + GLB + Blend + PNG texture + manifest downloaded and SHA checked. Visually **FAIL**: upper annular cap polygon winding crosses adjacent radial edges, causing big black spiky sunburst around the hole |
| V02 | [44515866251](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44515866251) | **14526215617** | **complete/success**. All seven output files verified against manifest size and SHA256; one GLB mesh / embedded original PNG. Four real views inspected. The upper annular face topology was corrected; sunburst gone, open bore visible, consistent rusty black metal |

- V02 model 1344 mesh faces, original PBR. Looks more realistic than V01. Outside hex still somewhat chunky and oxidation has dark bands; the internal bore texture is plain dark without clear mechanical grooves at this view scale.
- **Aesthetic NOT_APPROVED**, pending user review. Avoid claiming finished/high-quality just from successful Actions.
- Shared 3D Performance Audit, real bolt + nut collision/fit, in-game FPS and ClamAV output scan not actually run in this part. No new external files downloaded; only original generated texture.
- All GitHub Actions artifacts are temporary (V02 expires 2026-12-03T11:35:02Z). No formal promotion to assets folders and no merges.

## Reproduction
- Source: `tools/b2-waterwheel-nut/build_forged_nut_v02.py`
- Workflow: `.github/workflows/b2-forged-hex-nut-v02.yml`
- Pinterest research handoff: https://github.com/koda24-cell/pinterest-reference-library/pull/32 (5 candidate Pin URLs, no image saved/viewed).
