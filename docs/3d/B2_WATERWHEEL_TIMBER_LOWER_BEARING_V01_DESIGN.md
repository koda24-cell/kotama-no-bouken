# B2 木製水車 — 軸受け台 下半分1個 / 設計V01

Status: DESIGN-FIRST / NOT_APPROVED / 2026-11-19 JST
- Scope: **one timber lower bearing/pillow block only**. No wheel, shaft, cast-iron bearing, bracket, bolts, rubber, ice or mounting stones are included. The upper clamp, lubrication, mounting and game fitting remain separate.
- Existing development game: axle runs along X, center of wheel (0, 3.7, 0), shaft radius R=.300m, wheel radius 2.55m, 14 radial spokes. Existing wheel/scene functions must remain untouched.
- Prior wheel components: aged rim V11 PR #503, spoke V02 PR #524, wood hub V11 PR #531, iron ferrule PR #561, single paddle V06/07 PRs #485/#498. These are separate review stages; no assumption that their GLBs are game-integrated.

## Dimensions and geometry (local shaft axis X)
- Material core: old oak/heavy timber, beam extends X ∈ [-.60,+.60], Y ∈ [-.55,+.55], Z ∈ [-.70,+.055]. It remains one continuous timber body.
- Saddle: genuine cylindrical **open U-groove** along X, **radius .318m**, centered on Y=0,Z=0, while shaft nominal R=.300m. That is an 18mm radial working clearance in this visualization, **not a validated functional historical bearing tolerance**.
- The opening cuts through the top for complete access; no apparent cap. Bearing bottom at Z≈-.318m, leaving ~0.38m solid wood underneath.
- Chamfered edges and tapered ends support a large worn timber silhouette; sculpt only outside non-load-bearing corners.
- One asymmetric longitudinal surface fissure on an exposed lateral face and two localized endgrain splinters, both physically separated from the saddle and mounting faces.
- Inner U-seat is dark-worn oiled wood with softened gloss, not white bright raw oak. Outside is V11 existing Poly Haven Fine Grained Wood photo PBR (read-only, SHA verified checkpoint).
- Endgrain uses V11 existing exposed-endgrain image. Optional wet/dark saddle material is a modified node material; don't claim engineering friction simulation.

## Structural intent and boundaries
- Traditional mill bearing blocks often act as replaceable timber or bearing inserts. Many historic wheels use distinct metal journals, so this is a **fantasy-ruin timber support candidate**, not an exact one-to-one reconstruction of a specific real bearing.
- Do not glue a second visible saddle on top or create a trough with a black painted stripe. The underside and ends must form a watertight continuous solid with **real Boolean U-cut**.
- The existing rendered scene has stone supports. This one asset has no proven world position until joint mock-up.
- Touch only this branch and its `tools/b2-waterwheel-bearing/**`, workflow, design and QA documentation. No modifications to game runtime or previous approvals.

## Reference and available texture
- [Mills Archive, Wood in Millwrighting](https://millsarchive.org/2022/03/29/wood-in-millwrighting/): oak in water-driven mill mechanisms.
- [SPAB, Repair of Waterwheels](https://www.spab.org.uk/sites/default/files/Repair%20of%20Waterwheels%20v4%20FINAL.pdf): maintenance and wheel bearing support context, specific joint measurements vary.
- Pinterest candidate URLs collected from Tailwind keyword `old waterwheel wooden axle bearing block timber pillow block mill restoration`: https://www.pinterest.com/pin/474848354471818572/ , https://www.pinterest.com/pin/176203404168852726/ , https://www.pinterest.com/pin/472174342174594433/ , https://www.pinterest.com/pin/396598310934288709/ , https://www.pinterest.com/pin/671951206880321029/ . **Full-size images not verified, no pin saved and not applied as textures**.
- Packed CC0 photo PBR source: outer rim V11 `b2_waterwheel_single_rim_segment_v11.blend`, SHA256 `addae90dd199b9f6d0417c70f5152a32bd504e83e2deffa8e0965a0fdf5e2c67` from [successful run 44436858908](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44436858908).

## Planned quality gates
1. Actual Blender edit of ONE timber block, Boolean U cut and selectively distressed broken edges; ensure no geometry change to approved components.
2. Front/side/angle/back **actual Blender Cycles PNG**, GLB, editable BLEND, SHA256 manifest. Keep image embed packed.
3. Inspect U cross-section and clearance visually; verify GLB has one mesh, no lights or cameras. Test actual mesh open bearing seat against shaft R=.3 in a later *non-promoted* assembly.
4. Quality judgment must be separate from successful workflow and file integrity. A simple pristine cube or uniformly chipped edges are aesthetic failures.
5. Approval before asset promotion; maintain individual PR → development; main untouched. Run cross-floor GLB audit when possible, note any gaps.
