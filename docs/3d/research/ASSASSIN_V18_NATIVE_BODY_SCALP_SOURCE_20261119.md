# Assassin V18 source Body recovery — verified posterior cranium and rim alignment

Date: 2026-11-19. **Research evidence, not an approved production GLB.**

## Major result
The Shibu source VRM `Sendagaya_Shibu.vrm` already contains a rounded **posterior scalp and connected nape in the `Body` mesh**. Do **not** generate a new posterior cap from the 36-point Face rim. That was the erroneous assumption underlying rejected V16/V17 and V18 A-F head mesh prototypes.

### Verified real Blender evidence
- [Source Body-only and Face+Body six-view Blender run #44446328687](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44446328687), artifact ID `14493735809`. Hiding Hair and rendering Body-only front/side/back-upper shows real back-of-head and nape. Face+Body left/back images show that the unaltered source is visually much more anatomically convincing than the synthesized heads.
- Source meshes: Face 2,339 vertices; Body 7,796; Hair001 15,206. Raw filter `1.38<=Z<=1.60, abs(X)<.14,Y<-.03` finds 203 Body posterior-head **candidate vertices**. This is not a validated disconnected 203-vertex scalp submesh or licence proof.
- [Per-vertex matching audit run #44446953188](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44446953188): of the 36 Shibu Face component-5 rim source vertices, **28** lie within 0.1mm of an original Body vertex; **34** lie within 1mm. Max nearest-vertex distance **0.01048095m**, mirrored rim orders 8 and 32 (Face source vertex IDs 2071 and 1506).
- [Body triangle-surface BVH audit run #44447509958](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44447509958), artifact `v18-source-body-scalp-audit`: **30** Face points within 0.1mm of Body surface; **34** within 1mm; max nearest Body triangle **0.008223736m** for same two mirrored points, near lower ear transition. Mean nearest Body triangle distance 0.000539578m. This independently distinguishes vertex-sampling gaps from real distance to Body surface.

## What is established vs pending
- Establish: original Body contains visually natural posterior skull and neck; 34/36 original Face rim vertices lie within 1mm of Body triangles, two mirrored outliers 8.22mm away.
- Not established: Face and Body share true welded topology, identical normals, no self-intersection, original license permits public derivative assets, or any revised final V18 GLB is approved.
- The two outliers are source geometry **at the lower ear/jaw transition**, not generic back-of-head shape failure. They require local triangle closeups, face-normal/UV/weight comparison and carefully limited bridge review, rather than replacing the rest of the original head.

## Next implementation
1. **Preserve original source Face and Body unchanged** and render with Hair hidden in identical camera/light conditions.
2. Locate 36 rim Face IDs, nearest original Body vertices and nearest Body triangle indices in the JSON from run #44447509958; establish material/UV/armature consistency and actual seam status in Blender.
3. Create a local review-only bridge **around orders 8,32 and adjacent 9/31** if inspection confirms a visible seam; keep unaffected source vertices and faces exactly, no global smoothing/subdivision.
4. Render side closeups and back/front comparisons against the unmodified original; reject if original silhouette worsens or facial landmarks move. Verify geometry consistency and source license.
5. Only after user approval may an appropriate separate asset-promotion PR be considered. Keep `NOT_APPROVED` throughout research.

## Preservation / exclusions
- Do not use legacy standalone Assassin prototypes PR #309/#310/#313/#513.
- V18 Candidate A-F live in draft PR #526/#529; all are **art rejected** despite technical render success. Do not reuse their wedge, box, cone or shell shapes.
- Source-specific redistributability of `Sendagaya_Shibu` and Vita is not established; no formal game asset folder promotion.
- Reference Pinterest handoff: `koda24-cell/pinterest-reference-library/handoff/assassin-head-v18-anatomy.md`.
