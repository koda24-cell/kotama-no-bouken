# B5 Knight fauld V2 + tassets V1 assembly review

**State:** NOT_APPROVED. Do not merge assets into game, development or main until visual approval.

## Actual sources and run
- Fauld V2 from successful Actions [#44515259679](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44515259679), Artifact `b5-gothic-fauld-v2-NOT-APPROVED`.
- Tassets V1 from successful Actions [#44682515055](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44682515055), Artifact `b5-gothic-tassets-v1-NOT-APPROVED`.
- Actual imported-GLB assembly script: `tools/b5-knights/build_fauld_tassets_assembly_v1.py`, retaining both sources' original local transforms without changing geometry.
- Blender 5.3 pinned Docker + ClamAV source/input/output scan, 6-view Cycles output, combined GLB+Blend+manifest/checksums.

## Result verified 2026-11-20
- Actions [#44685947499](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44685947499): render job success, ClamAV and SHA validation success, publisher job success.
- Verified `render-preview/run-44685947499-1` with GitHub Contents API: 6 real PNG images and review manifest only. **Artistic judgment not yet approved**.
- [Front](https://raw.githubusercontent.com/koda24-cell/kotama-no-bouken/render-preview/run-44685947499-1/front.png) / [Angle](https://raw.githubusercontent.com/koda24-cell/kotama-no-bouken/render-preview/run-44685947499-1/angle.png) / [Left](https://raw.githubusercontent.com/koda24-cell/kotama-no-bouken/render-preview/run-44685947499-1/left.png) / [Back](https://raw.githubusercontent.com/koda24-cell/kotama-no-bouken/render-preview/run-44685947499-1/back.png).
- Next verify localized contact surfaces and adjust independent assembly transforms if visibly needed, retaining original source GLBs and comparison previews. Existing AABB intersection is a coarse diagnostic, not sufficient to prove mesh-level absence of clipping.
