# B2 iron axle ferrule V01 actual QA — Nov 19 2026

- Model goal: **one forged iron central-shaft mouth ferrule**, not whole hub, iron reinforcement around the 0.30m axle. Original waterwheel and all 14 mortises untouched.
- Design: docs/3d/B2_WATERWHEEL_IRON_FERRULE_V01_DESIGN.md
- Real Blender Cycles GitHub Actions: [run #44454120299](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44454120299), success. Artifact ID **14496848164**, 14 day temporary retention.
- Downloaded the ZIP, verified all eight files in manifest by byte size/SHA256: 1 GLB, 1 BLEND, 4 four-direction PNGs and 2 generated PNG textures. Mesh: **1,232 polygons**, one standalone ferrule, 384x384 color/rust and roughness images.
- Actual preview: the ring has substantial inner bevel and plausible thickness; however brown corrosion covers too much of surface and metal resembles wood, and a sharp UV seam appears at approximately 3 o'clock in front view.
- Artistic V01 verdict: **NOT_APPROVED** despite successful technical QA.
- V02 code written on same PR: `tools/b2-waterwheel-ferrule/build_ferrule_v02.py`, with corrected per-face cylindrical seam, tileable iron map, more limited rust and darker iron metallicity. Do not report actual V02 render success without its own run/artifact.
- Direct Pinterest candidate reference handoff: https://github.com/koda24-cell/pinterest-reference-library/pull/26 . No external pin photos used as PBR.
- Actual hub-to-ferrule fit, metal geometry collision, game performance and formal source promotion remain unverified. No game runtime changes.
