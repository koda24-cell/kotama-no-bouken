# B2水車 木製軸受け締結用 鍛鉄ボルト V01 設計 (2026-11-19)

**DESIGN FIRST / ONE BOLT ONLY / NOT_APPROVED**

## Previous artifacts and purpose
- Lower timber pillow block PR #568 and upper cover PR #580: all stay unchanged, both as independent unapproved candidates.
- New single forged bolt, not an assembly, washer, nut, bracket, axle or wood beam. Scene integration is intentionally **not** attempted.
- Traditional millwright hardware can use square headed bolts, with some mills specifically choosing square fixings rather than hexagon. Historical use varies; this is a coherent fantasy-ruin stylization, not museum-exact reconstruction.
- Structural and historical reading: https://www.spab.org.uk/sites/default/files/Repair%20of%20Waterwheels%20v4%20FINAL.pdf ; https://www.eskdalemill.co.uk/wp-content/uploads/2019/01/6b-Mill-Machinery-Progress-Report-Dec-2018.pdf ; https://dowsingarchaeology.org.uk/Ironwork/Chapter%205/5.Types6.htm . No copied photographs.

## Geometry and fit strategy
- Bolt axis local **Z**, centered origin. Shank nominal radius **0.035m** (70mm dia), full length **0.68m**, Z=-.65..+.03m. Oversized as game prop but physically legible. Installed position not yet fixed: do not edit wooden cover to drill an unapproved hole.
- Hand-upset **square head** across flats 0.125m, slightly irregular, Z=+.03..+.085m. Rounded corners and uneven forged edge; not standard perfect modern hex head.
- Shafts have modest taper, worn end, **short visible helical thread** on distal Z=-.65..-.46m, moderate density (approximately 8 turns) and narrow 0.008m raised triangle-like thread (part of *one joined mesh*).
- No loose washer or square nut included. Nut will be a later separate part to maintain micro-component workflow.
- Dark black-iron / brown oxide with small locally mottled patches, no regular rust stripes, no pristine polished chrome. Original procedural texture 512x512 generated in Blender, packed into GLB.
- Geometry should avoid needle-sharp threads, disconnected floating fragments, protruding fins and monochrome smooth surfaces.

## Visual & performance gates
- 4 actual Blender Cycles PNG (front, side, 3/4, back), GLB and editable BLEND, PNG PBR, SHA256 manifest.
- Single selected mesh in GLB, no lamps/camera, cap geometry, tri count measured; nominal near-view detail, medium/long distance should LOD or hide fine threads without changing silhouette.
- User aesthetic approval required; check whether square head silhouette, iron rust breakup, physically modeled threads and wear read clearly at 850px.
- Real fit with upper/lower bearing and hole clearances **not tested**; do not bore existing wood or treat proposed dimensions as a match. Real game FPS/rigid LOD and shared GLB audit pending.
- GitHub Actions Artifacts temporary; formal promotion to `assets` only after visual review and explicit user approval.
