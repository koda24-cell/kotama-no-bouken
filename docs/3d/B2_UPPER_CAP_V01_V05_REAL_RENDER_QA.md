# B2 upper wooden bearing cap V01–V05 actual Blender QA / 2026-11-19 JST

**Current visual candidate: V05. Artistic status: NOT_APPROVED.** Existing game, wheel, lower bearing, other parts unchanged.

## Input and structure
- Detailed design first: `docs/3d/B2_UPPER_TIMBER_BEARING_CAP_V01_DESIGN.md`.
- One standalone upper wooden cap, X-axis length1.16m, lower mating plane Z=.055m, actual Boolean cylindrical shaft groove radius .322m to complement lower unapproved block radius .318m and shaft R=.300m. Lower GLB full assembly/collision test **not done**.
- CC0-derived aged endgrain material inherited from existing rim V11 checkpoint, SHA256 source `addae90dd199b9f6d0417c70f5152a32bd504e83e2deffa8e0965a0fdf5e2c67`. No unapproved Pinterest image included as art asset.
- Visual refs/handoff: https://github.com/koda24-cell/pinterest-reference-library/pull/28

## Runs, actual files, failures and visual decisions
| Version | Action | Outcome | Actual visual observations |
|---|---|---|---|
| V01 | [44459757668](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44459757668), [44460030219](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44460030219) | initial Boolean arc QA threshold false alarm (66 vs 80) corrected; second run success, actual artifact acquired | entire exterior large white faces although GLB embedded brown JPEG |
| V02 | [44460892440](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44460892440) | success, actual GLB/Blend/4 PNG ZIP acquired | restored JPG images but Cycles still renders exterior white |
| V03 | [44461369142](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44461369142) | all renders succeeded, CI failed because it still expected three GLB images (clean PBR used only two); ZIP downloaded & verified | newly wired image shader still white in Cycles |
| V04 | [44461755666](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44461755666) | success, ZIP downloaded & verified | brown endgrain material copy still rendered exterior white due to material assignment/index issue |
| V05 | [44462233737](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44462233737) | **complete/success**, artifact **14499958628**, actual ZIP downloaded, all six manifest file SHA256+byte sizes independently verified, GLB **1 mesh, 1 embedded PNG image** | Assigning known-good endgrain material directly to all faces corrected the white exterior; all 4 Cycles images visually confirmed |

## Quality assessment
- V05 is visibly aged brown wood on top and side, with a true open semicircular saddle and two localized chips. No original bottom bearing, rim or shaft geometry was modified.
- Remaining art issue: **top grain looks evenly striped, side has a light horizontal step/band**, end corner chips resemble angular drilled holes. Must refine directional UV and breakup at close zoom before calling high-quality.
- Technical output success does not prove art approval, actual hub/shaft fit, watertightness, LOD/FPS, glTF Validator, or joint performance.
- Artifact is temporary until 2026-12-03; do not present as permanently stored GLB. This PR is Draft against development, no asset promotion or runtime edits.

## Review files
- `tools/b2-waterwheel-upper-cap/build_upper_cap_v05.py`
- `.github/workflows/b2-upper-timber-cap-v05.yml`
- Full 4-view PNG, Blend and GLB: Artifact `b2-upper-timber-bearing-cap-v05` / GitHub Actions run 44462233737.
