# Floor 3 rubble V23 — recover from V22 boolean failure, corner sculpt

Status NOT_APPROVED. The dedicated V22 Blender5.3 run [44675681991](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44675681991) **FAILED** during Boolean difference: after modifier application 0 body polygons, no GLB/render. Keep the failed script/diagnostic; do not claim output produced.

V23 restarts from verified V21 (run 44675036078). It retains all old original surface/side faces and takes an isolated, nondestructive versioned route: after bmesh subdivision, fold the forward right uppermost corner inward in XYZ:
- X negative offset up to 35mm; Y inward offset up to 28mm, Z lowering up to 20mm.
- Weight = (right * front * upper)^1.6 with right starts x 80mm, front starts y +30mm, top starts z -24mm, taper smoothly to 0 at boundary.
- Existing mesh connectivity and PBR faces retained. No Boolean modifier, new bodies or extra light colored aggregates.
- Keep 5-view actual GLB/Blend/4 PBR PNG + manifest checks; verify geometry not inverted/self-overlapping and compare with V21. This is sculpted damage, not a claim of a topologically removed volume.

If V23 still reads like a slab, the next approach must use a watertight rebuilt corner topology with controlled polygon loops, not Boolean against old nonmanifold mesh. No production merge.
