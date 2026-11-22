# F3 broken reinforced-concrete beam V01–V02 real Blender 5.3 QA

Status: **NOT_APPROVED**. Keep off main/development and production asset folders.

## Execution proof
- V01 [run 44688227691](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44688227691): success; Blender 5.3 pinned Docker generated GLB, Blend and 5 real PNG previews. Artifact 14607392719. Downloaded and verified all 7 manifest file SHA-256 values against actual ZIP.
- V02 [run 44688915633](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44688915633): success; equivalent GLB/Blend and 5 view PNG plus **2 self-authored 256px albedo textures**, verified 9 manifest SHA-256 values. Artifact 14607532787. Workflow also required >=2 images embedded in glTF and completed success.

## Actual five-view review
V01 concrete surface is visually extremely bright, clean, too geometrically regular. Cut cap is a visible radial triangle fan. Three rebar rods are clear but overly straight/copper colored.
V02: gray stained concrete looks more appropriate under reduced exposure, but is homogeneous and lacks macroscopic erosion. Irregular inner fracture rim breaks the obvious star, but end cap still looks like a carefully recessed manufactured polygon/open cup. The exterior silhouette remains an elongated prism with very straight cast edges. Rebar still looks like 3 simple rods; rust texture and embedded cross section could be improved.
Result: **V02 is materially better than V01, but not art approved.** Technical output QA only.

## Next improvement scope
Keep V02 source intact. For V03, alter only broken end and two adjacent side zones: model two 30–55mm exterior chips, varied cap triangle elevation and exposed aggregate material limited to the newly cut faces. Avoid V24/V25 rubble's artificial closed rings, white bone-like aggregate pieces and heavy random surface noise. Test actual 5 PNG views and GLB against V02 before using.

## Project integration
Independent Draft PR #690 targets development. Three rubble fragments are separately in Draft PR #642. No merge/promotion to production until user image approval.
