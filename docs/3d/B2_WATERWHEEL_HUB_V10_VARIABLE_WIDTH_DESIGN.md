# B2 wooden hub V10 — variable-width wood splitting design

Requested 2026-11-19, user feedback: V09 fissure thickness is too uniform and rough.

## Revision
- Rebuild V10 from verified original V02, NOT from previous degraded V09. Preserve actual hub shaft bore 0.303m, 14 real mortises, 0.36m thickness and existing photo PBR.
- Keep V09 broad chipped edge cutters but replace all 6 primary fissures and 2 branches with **13-station asymmetric profiles**, individually different for each crack.
- Broad mouth (not an empty triangle), abrupt middle pinch, localized secondary expansion where timber opens along a fiber, then rapid narrowing to a thin tip.
- Different kink/fold intervals for each crack; no uniformly sized parallel grooves or neat sawtooth pattern.
- In an actual wooden wheel fracture length/width shouldn't be identical between cracks. The mesh generation uses at least a 10:1 max/min slit width variation per crack.
- Reuse V07-style non-periodic generated broken-oak PNG on the new fracture faces and keep undamaged shell on photo PBR. User visual signoff is still required.
- **QA**: actual Blender Cycles four directions, GLB one mesh, fracture PNG+packed images, Blend and SHA manifest, compare with V09 and inspect mouth/tip and the branch joins. Technical success alone isn't art approval.

No formal asset promotion, game integration or PR merge without approval.
