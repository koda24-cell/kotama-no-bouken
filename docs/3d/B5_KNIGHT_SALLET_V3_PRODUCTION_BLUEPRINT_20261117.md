# B5 朽ちた騎士・サレット兜 V3 製作用設計図（造形前）
Status: **DESIGN ONLY / NOT APPROVED** (2026-11-17)
Existing V1/V2 helmet, knight V14, pedestal revisions retained. Do not change game runtime or merge into development.

## 1. Basis / references
- Met, German Nuremberg sallet about 1490: https://www.metmuseum.org/art/collection/search/25388 — note flat comb, unusually long tail, visor might be modified/associated; do not pretend the visor is universally original. 
- Wallace, high-quality 15th-c sallet: https://wallacelive.wallacecollection.org/eMP/eMuseumPlus?module=collection&objectId=60571&service=ExternalInterface — sharp file lines accent ridge and sight.
- Wallace, separate-visor sallet: https://wallacelive.wallacecollection.org/eMP/eMuseumPlus?module=collection&objectId=60572&service=ExternalInterface .
- Met Maximilian sallet: https://www.metmuseum.org/art/collection/search/23213 — later falling buffe pivots, for contrasting construction study only; do not mix eras blindly.
- Pinterest discovery (not image-confirmed or saved): https://www.pinterest.com/pin/373939575325476993/ and https://www.pinterest.com/pin/314196511521674487/ . See reference handoff repository.

## 2. Blueprint / overall arrangement
The concept blueprint attached in chat is an **illustrative design target**. Numbers must be reviewed against actual archaeological examples and measured digital body, not presented as dimensions measured from a historical artifact.

Coordinate system in Blender: +Y forward, -Y back, +Z up, X left/right. Full-scale candidate:
- Maximum **helmet width ≈0.24m**, crown+bevor height ≈0.34m, front-to-tail ≈0.37m; preliminary scale references only.
- Skull shape: tall-varying front arch, side cheek taper, top comb **low and integral with skull**, no separate raised pipe. Use upper arc cross-sections that follow head volume with subtle forehead lift.
- Crown material/thickness as sculpted stone: conceptual 3–5mm apparent shell around openings, structurally thicker where needed to prevent paper-thin unrealistic rock.
- Eye slit target 6–8mm open **negative-space gap**, not a dark rectangle material. The upper visor and lower cheek/face plate must be separately lofted **curved plate skins**, connected via genuine side hinge axis. Silhouette should not form rectangular shelves.
- Visor and bevor plate edges target 2–4mm appearance in render; stone-version edge strength and minimum printable mesh to be verified. Avoid brittle disconnected plate islands.
- Rear nape tail is an integrated low sweeping shield growing from the back of skull; it should curve toward -Y and down, not hang as a floating wing. Side silhouette root continuity must be verifiable with selected-mesh isolated render.
- Bevor protects chin/throat and sits visibly below visor with a genuine transition line, but no huge floating chin bowl. Hinges/rivets must align with realistic contact.
- 7-head knight fitting: build a simple head/neck proxy, render face-on, side and diagonal, then test whether visor and jaw cover head without occupying multiple head heights.

## 3. Separate editable objects / naming
1. `skull_shell`: smoothly subdivided crown with narrow comb formed from the same skin (NOT large ring loft / cylinder).
2. `integrated_tail`: edge loops blend from back of skull to narrow nape guard. Preserve source material separate for editing if necessary but no visible seam or gap.
3. `upper_visor`: pivoted single curved plate with high brow line.
4. `lower_visor`: one folded cheek plate, with 6–8mm continuous open horizontal gap.
5. `bevor`: throat and jaw piece, carved deep curve, independently edited.
6. `hinge_left`, `hinge_right`: low-profile 2-axis rivet details with mechanical alignment.
7. `chin_lip_trim`: crisp 1–3mm edge silhouette, no isolated piping.
8. `wear_mask`: only after initial geometry/fit passes, local nicks along exposed visor edge and worn tail tip.

## 4. Failure modes from V1/V2 and concrete fixes
- **Toy bucket silhouette**: too circular in horizontal rings -> controlled changing X-radius and forehead/rear curvature; sculpt from front/side upper contours.
- **Rectangular flat visor**: straight plate strip detached from bowl -> visor curvature follows cranial surface, true opening and hinge contact. Visor must not overlap through skull.
- **Floating neck tail**: disconnected flat wing -> continuous root loops, tail profile transitions from crown with thickness and curled-down tip.
- **Overbright stone**: lower albedo, expose roughness; screenshot vs gray card; use neutral three-point studio lights consistent across iterations.
- **Too symmetrical / fresh**: reserve asymmetric edge wear after accepted main forms; no default random chunks on crown; include rough photographic stone and verified GLB roughness in later step.

## 5. Execution order / gates
Gate A: three-view **contour/wireframe** only; review 7-head proportion and rim continuity with hidden materials.
Gate B: shell + tail 3-view smooth shaded, isolated; compare profile with documented museum sallet reference.
Gate C: visor and real ocular opening; check frontal and side geometry including pivot intersections and thickness.
Gate D: separate bevor + rivets, exploded and assembled 4-angle review; compare dimension proxies.
Gate E: B5 weathered stone finish; test CC0 albedo/roughness (not unverified normal map) and realistic erosion near damaged sections, GLB embedded-texture check.
Gate F: Blender front/side/angle+low-camera, GLB and Blend, manifest SHA; inspect full image and crop, mesh normals/gaps, draw calls/LOD candidate and size. Approval **only by user** before formal asset promotion or game integration.

## 6. Current checkpoint
Plan and illustrative blueprint completed; V3 production Blender render is **NOT YET EXECUTED**. Work must not be called fully complete, no misleading render claims.
