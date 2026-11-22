# F6 mature tree vs Breath of the Wild — visual direction audit (2026-11-19)

Status: **research / gap audit completed; no new model approved**. User approved **V25 crown breadth/branch-leaf spread ONLY**; retain that silhouette. Focus next revisions on leaf appearance, clump lighting, and trunk/bark quality. Optimize geometry only after artistic approval.

## Evidence and limitations

- **First-party Nintendo / official CEDEC 2017 talk**: [Layering the world — art and rendering](https://cedec.cesa.or.jp/2017/session/VA/s58eed7182c81b.html). Official description explicitly says visuals were conceived as layers of foreground/midground/background, time/space, and atmosphere. Presentation slides were marked private, so the official description does **not** establish an exact tree mesh/foliage shader algorithm.
- **Nintendo DREAM CEDEC reporting**: https://www.ndw.jp/post-1121/ : shade, fog, layer interactions and atmospheric perspective; NOT an exact tree asset recipe.
- **Takizawa art direction, translated Creating a Champion interview**: https://nintendoeverything.com/art-director-on-why-zeldas-art-style-constantly-changes-and-how-breath-of-the-wilds-look-was-made/ : deliberately painterly aesthetic balancing real-world recognizability with expressive simplification.
- **Independent artist tutorial, NOT Nintendo implementation**: https://polycount.com/discussion/209623/smooth-foliage-like-in-breath-of-the-wild-europa-by-helder-pinto-mini-tutorial : hemispherical/projected foliage vertex normals, corrected two-sided normals, subtle internal AO or vertex-color shading create smoother leaf volume. Requires testing in Blender/glTF/Three.js, no assumption of direct compatibility.
- **Independent BotW palm material examination, NOT Nintendo documentation**: https://alexanderzawadski.artstation.com/blog/44EaO/breath-of-the-wild-palm-tree-deep-dive : blend special root/trunk sections with tiling bark, distinct foliage masks. Palm-specific, not proof of normal broadleaf tree design.
- **Historical implementation research**: `docs/3d/F6_TREE_BOTW_PERFORMANCE_RESEARCH_20261117.md` distinguishes confirmed Nintendo 2D-tree-placement/distance loading from reverse engineering, estimates and SpeedTree analogies. Do not claim Nintendo's exact canopy mesh, billboards or alpha algorithms without further primary evidence.

## Visual comparison: retained F6 tree vs BotW screenshots

Original F6 evidence:
- V25 four-angle actual renders: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44444418918 . V25 crown breadth approved, but bark beige, leaf cards distinct and messy.
- V27 four-angle actual renders: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44447197961 . Crown breadth retained, bark photo textured; small uniform leaf specks and overly straight exposed trunk remain.
- V28 photo atlas proof: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44448510813 ; check success and visually inspect 4+2 camera images before any conclusions.
- Comparison visual references: BotW forest canopy https://cdn-ak.f.st-hatena.com/images/fotolife/s/sittokuchance/20240624/20240624182429.png ; woods undercanopy https://ga-m.com/image/news/2018/05/20/zelda-breath-of-the-wild-souzou-monolith-2.jpg . These are screenshot interpretations, NOT downloadable game assets.

| Property | F6 V25-V27 visual gap | Target for original F6 tree | Status |
|---|---|---|---|
| Crown silhouette | Width is strongest yet; some isolated jutting leaf sprays still appear | Preserve approved umbrella width, make contiguous layered volumes with irregular, softened edge | **Width accepted, rest not** |
| Crown interior | Tiny leaf cards leave too many pinholes, thin branch sticks and straight pale trunk exposed | Overlap 4-8 medium irregular foliage masses with depth gradients (not a spherical ball); keep only strategic windows through canopy | Missing |
| Micro shape | Many identically sized spear/point leaves; grainy noisy crown, especially side/angle/top | Photo-derived or stylized broadleaf silhouettes; asymmetry, soft rounded tips, varied size and orientation; silhouette should resolve by visual clump | Missing |
| Foliage normals | Per-leaf planar smooth normal/shadows still reveal hard-card discontinuities | Trial: project normals toward each clump's soft outer volume; correct backface lighting; gentle AO darkening toward interior, not pure black holes | Not implemented/verified |
| Foliage palette | High-frequency mixed highlights and mottling look photographic/noisy | Painterly large-value groupings: dark interior, mid green at front, warm subtle tips; simplify local color detail | Missing |
| Trunk geometry | Skinny straight exposed vertical stem, sharp narrow joins, root-like mangrove silhouette | More gradual taper, structural forks and branch thickness rhythm; soften junctions by incremental additive modeling; preserve base roots | Missing |
| Bark | Bark015 photo PBR present but contrast/tiling and streaks look pale/striped | Photo grain under stylized dark warm/grey brown albedo, hand-shaped grooves & roughness; root/branch UV match, ambient shaded crevices | Partially implemented |
| Presentation | Isolated gray-background studio render makes comparisons of atmosphere difficult | Same-camera, same-light trees side-by-side in miniature BotW-like woodland scene at near/mid/far distance; include shade, terrain, fog and scale cues | Not done |

## Next implementation proposal — strict order

1. **Freeze crown spread V25** by comparing canopy horizontal bounds/central void profile from actual baseline. Never accidentally accept V26 (render was canceled).
2. Before any full tree iteration, render **one 1:1 leaf and a complete 5-8-leaf twig spray** in close-up using two candidate pipelines: A (natural rounded curved leaf mesh + mapped color/normal), B (LeafSet023 CC0 photographic cutout alpha atlas). Inspect actual diffuse, alpha, normal, backfaces under 3 lights; do not infer success from a file existing.
3. Replace individually random leaf specks with several **branch-connected layered clumps** using major/subordinate branches. This is new artistic configuration inside the accepted wide silhouette, not just an increase in leaf count. Controlled canopy holes and coherent soft edges.
4. Implement testable projected / hemisphere foliage normals and internal AO as an **opt-in candidate** separate from original geometry, based on non-Nintendo polycount technique. Validate side, diagonal, and underside views.
5. Refine bark photography to painterly controlled contrast and real raised grooves, and revise primary visible fork transitions without deleting original roots/trunk.
6. Four full-tree camera renders plus leaf, twig, trunk close-up, in neutral studio **and in-game-style light/fog**; compare visual with game screenshots by canopy shape, value grouping and branch rhythm. Only after user visual approval explore LOD / lightening.

## Safety / record

- Visual observations are judgments from imagery, not Nintendo-exclusive source code access.
- Pinterest handoff `koda24-cell/pinterest-reference-library/handoff/f6-tree-mature-20261117.md` records task and source refs; no unrequested pin saving and no reuse of copyrighted Zelda pixels.
- All experimental GLBs remain NOT_APPROVED in PR #501 and GitHub Actions artifacts; no integration to development/main.
