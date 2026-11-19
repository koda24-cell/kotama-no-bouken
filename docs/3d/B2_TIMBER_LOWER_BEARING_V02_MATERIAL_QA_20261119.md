# B2 lower timber bearing V02 material QA — 2026-11-19

V01 source remains safely preserved. V02 was created by SHA-verifying V01 Blend and only changing lateral wood PBR UV/material; geometry unchanged.
- V01 complete/success: [run #44456466568](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44456466568).
- V02 complete/success: [run #44457226670](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44457226670), artifact ID `14499065245`.
- Actual ZIP downloaded, all six GLB/Blend/four view PNG file sizes and SHA256 manifest values checked; V02 side material correction applied to 23 faces.
- Visual comparison: V02 still shows bright horizontal strips at top and intermediate chamfer height; center of lateral wood becomes too light/flat. **V02 aesthetically rejected** despite technical success.
- V03 independent revision on same branch: original V01 source checkpoint, smaller UV sample range and unified side plus corner faces, darker multiplication. Source `tools/b2-waterwheel-bearing/build_lower_bearing_v03_resume.py` + workflow `.github/workflows/b2-timber-lower-bearing-v03.yml`. Real render and QA **not yet confirmed at time of this note**.
- Model/shaft collision test and full shared GLB performance audit still not done. No permanent asset storage, promotion, game integration or merge.
