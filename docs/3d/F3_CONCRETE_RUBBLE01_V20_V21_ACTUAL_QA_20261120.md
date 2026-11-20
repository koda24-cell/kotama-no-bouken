# Floor 3 concrete rubble V20 / V21 actual Blender QA

- V20 render [run 44674480501](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44674480501) completed success, Artifact 14602235816. Five real PNG previews, one GLB, one Blend, four texture maps and manifest. Eleven referenced file SHA256 hashes independently match ZIP.
- V21 render [run 44675036078](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44675036078) completed success, Artifact 14602281671. Equivalent 11-file checks completed from downloaded ZIP, all hashes match.
- Actual montage inspected for front/side/angle/top/fracture-detail. **V20** pronounced serrated top crease, exaggerated low-poly side. **V21** serration less apparent, but top again reads smooth/eroded and side reads too much like layered rock, not concrete fracture.
- Both retain too much of original rectangular upper slab; no genuine missing chunk. Flat heightfield blending between terraces cannot satisfy damaged-building-rubble look by itself.
- Next V22 should add an actual missing corner volume, preserving one cast-surface patch. Use a boolean cut with sloped chipped polygon on existing mesh only, no detached white aggregate meshes. Verify Blender Boolean real output, 1 GLB mesh and 2 primitives, check manifold/UV and 5 views, reject visually bad corner rather than promote.
- All V1–V21 sources remain. PR #642 draft, NOT_APPROVED; development/main untouched.
