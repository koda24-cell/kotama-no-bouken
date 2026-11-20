# F2 Water V16 — user visual approval checkpoint

- Approval: **VISUAL_OK**. User explicitly replied 「まあokとします」 after viewing actual V16 front/side/angle renders.
- Approved visual baseline: **V16** shore-parallel reflections, V14-derived shallow-to-deep water, expanded water/riverbed domain. Do not silently modify these in later edits.
- Source run: [GitHub Actions #44642462947](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44642462947), status `success`, source commit `c6d4111d3f8780e3adb1464a7aa19f93f5c7e63b`.
- Verified artifact: `f2-water-scan-render-candidate`, ID `14589827915`; actual ZIP contains `f2-water-v16.blend`, `front.png`, `side.png`, `angle.png`, material PNGs, scan/render manifests.
- User-approved scope is **visual design**, not an instruction to force-merge into main or immediately change the game.
- **Promotion blocked:** the artifact contains **no GLB**. The promotion and Three.js handoff requirements call for approved GLB + PNG + manifest; GLB export and inspection have not been executed. A previous B4-specific promotion action does not automatically support F2 water. This checkpoint is a truthful approved reference, not an assertion that the final asset is permanently stored.
- Follow-on: use a dedicated F2 promotion procedure that exports GLB from the reviewed Blender scene, checks material compatibility and geometry dimensions, scans output, verifies hashes, and commits GLB/PNGs/manifest in an isolated promotion PR to `development`; obtain appropriate review before merge. Keep V16 render source unchanged.
- Source artifact ZIP and Blender file are only in temporary GitHub Actions artifact storage; **preserve before expiration**.
