# Assassin head V18 — posterior cranial patch implementation blueprint (2026-11-19)

Status: **DESIGN COMPLETE / GEOMETRY NOT BUILT / NOT_APPROVED**. This document is a geometry and test plan, **not evidence** that V18 mesh/PNG exists. Before production, verify the run-linked 36-point JSON and visually inspect the Pinterest candidates. Preserve the original Shibu Face completely.

## Canonical sources, exclusions and evidence
- Shibu Face from `Sendagaya_Shibu.vrm`, imported via `tools/character-mesh-research/` in branch `feature/gpt-character-mesh-reference-study-20261116`. Source: `madjin/vrm-samples` (VRoid beta), sample/license applicability to redistribution must be rechecked before promotion.
- Original 36-vertex Face boundary: **component 5, path 0**; start point order from the boundary loop report, not spatial sorting.
- Investigated artifacts: 2026-11-18 successful run [44239396646](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44239396646), artifact `character-boundary-fast-diagnostics`. This contains V16, V17, boundary overlays and measured bounds. V18 rim `*.rim-geometry.json` first introduced after this run and is subject to later verification.
- On 2026-11-19 recheck run [44436213466](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44436213466) was in progress at time of this draft. Its final status/artifact JSON MUST be checked before numerical parameter locking.
- **Do not source or compare to obsolete self-generated Assassin head variants** PR #309/#310/#313/#513 (`tools/assassin-bare-head`, `tools/assassin-rebuild`), even if they have successful six-view renders. V16/V17 are failure exemplars only.
- Source research: `docs/3d/research/ASSASSIN_HEAD_V18_REFERENCE_STUDY_20261118.md` on the study branch and `pinterest-reference-library/handoff/assassin-head-v18-anatomy.md`.

## Verified geometry and failure diagnosis
- Shibu Face component 5: 36 rim vertices; width **0.184673756 m**, height **0.224611282 m**; original component depth span **0.05504 m**, total perimeter **0.723135 m**. These values originate in successful 2026-11-18 geometry audit and V17 report. They describe the rim, **not a full cranium**, and no universal skull dimensions should be inferred from them.
- V16: 901 added vertices/900 polygons/36 remaining seam boundary edges; no welded integration.
- V17: 865 added vertices/864 polygons/36 remaining seam boundary edges; minimum face area **1.0747447e-05 m²**. Passing this single area check is not evidence of smooth curvature, valid normals, self-intersection-free topology or manifold integration.
- V16/V17 implementation constructs all 36 points of each ring by a uniform XZ shrink, decreases Y per ring, and ends with a single center fan. This creates a visible back-center star / swirl and a peaked sagittal rear silhouette; ring tangents do not follow distinct upper occiput and nape anatomy. An independent overlapping rim with no welded connection causes lighting seams. Do **not** repeat this generator.
- Target is **back-of-head alone** while preserving original face silhouette, eyes/mouth/ears and original vertex indices. No premature hair, eyelid, body or game runtime edits.

## Reproducible V18 measurement gate (before applying mesh)
1. Run `analyze_boundary_loops.py` on Shibu and Vita, verify Face component 5 is one oriented 36-edge closed cycle; independently compute original Blender world-matrix transformed positions and inverse-transpose normals.
2. Run `measure_head_rim.py` and retain `Sendagaya_Shibu.rim-geometry.json` and `Vita.rim-geometry.json`; record 36 entries: `order,source_vertex_id,xyz_m,vertex_normal,next_edge_m,interior_turn_angle_deg`. Verify unique IDs, finite values, closed loop, bounds, perimeter and winding.
3. Before assigning crown/temple/nape labels, use 6-view wire/solid overlays to classify vertices **by actual XYZ and anatomy** (not hard-coded index slices). Mark topmost, left/right temporal extremities, the ear-back transitions and lower/nape extremities. Store mapping in `v18_landmarks.json` with source IDs and reference screenshots. If ambiguous, stop modeling instead of guessing.
4. Compute each rim vertex's outgoing tangent and face normal; project patch first-ring tangent and normals to keep continuous silhouette. Compare the Shibu/Vita measurements, but treat Vita as a reference, **not replacement geometry**.

## V18 topological patch architecture
Coordinate conventions follow imported Shibu Face as measured (front +Y, posterior -Y) and must be reconfirmed on inspection.

**Four anatomical zones**, built as separate parameter domains but with a shared contiguous vertex network:
- A. Crown: round parietal dome, gentle zenith; distributed quads, no single apex fan in the visible posterior.
- B. Temporal sides: retain width just behind ear level; smooth retreat toward occipital volume; respect ears and temples without intersection.
- C. Occiput: a continuous broad posterior bulge in side view, smoothly turning into crown and descending nape; no rearward spike, pinched center, spiral pole or star fan.
- D. Inferior occiput / nape: narrowing toward the neck smoothly below the widest occipital band; nape geometry and future neck loop are separate from the original face boundary and not closed at an arbitrary point.

**Patch construction algorithm:**
- Clone the canonical source only into isolated review output. Source vertex indices, positions, UVs, materials, vertex groups and shape keys must remain unchanged. In the working mesh, identify and preserve the 36 outer boundary vertices exactly.
- Create a curated smooth 3D target guide surface anchored to the measured crown/ear/occiput/nape landmarks. Preferred construction: Blender bmesh/quads with a smooth loft or Coons/bicubic surface domain across back planes, or shrinkwrap-to-guide + Laplacian fairing with protected boundary constraints. No radially collapsed 36-point rings; no central triangle fan.
- Establish 2–3 early transition rows whose tangents and normals blend from the existing source face, then 6–12 broader crown/occipital rows depending on curvature. Use **non-uniform distribution**: more loops around changes of curvature (temples/ear rear/nape), fewer across the broad nearly flat occipital region. Counts are design initial values, not validated topology.
- Orient longitudinal lines crown→occiput→nape and transverse loops left→right. Route any unavoidable poles to low-curvature regions outside silhouette and deformation zones, with valence mostly 4 (allow occasional 3/5 only after visual review). Don't place pole at rear-center or nape crease.
- Candidate patch should share true edges/vertices with the exact source boundary **in the evaluation mesh** (weld only matched duplicate vertices after preserving the original source copy). Never claim manifold if the two surfaces merely overlap or if 36 seam edges remain.
- Apply normals/weighted normals only after checking face winding and mesh topology; hiding a geometric defect via smoothing is prohibited.
- Test at least a neutral crown/occiput/nape curvature variant and a slightly fuller-occiput alternative, rather than assuming a single ratio. These are **unapproved candidate variants**, not automatically accepted results.

## Acceptance gate and review artifacts
### Geometry
- Exact source Face vertex positions/normals/indices preserved before post-join review; allowed patch seam weld is checked against source vertex IDs and coordinates with max position delta <=1e-6 m.
- All 36 expected edges become two-face shared edges in the joined candidate; zero unexpected seam boundary edges; zero nonmanifold >2 incidence; outward consistent normals.
- Reject duplicate faces, tiny area (<1e-10 m²), zero-length edges (<1e-7 m), self-intersections, flipped surfaces, overlapping duplicate shells and hair/ear collisions. The last two require actual mesh/visual tests, not just counts.
- Quantify seam angular discontinuity (normal angle histogram + max), adjacency edge-length ratio and Laplacian curvature changes. Record measurements and tolerances *after* testing on source; a single arbitrary numerical threshold is not proof of natural anatomy.
### Visual (must be examined by GPT/user)
- Six orthographic PNGs on identical camera/lights: front, back, left, right, three-quarter front, back-upper; extra: top and two seam close-ups.
- Render two passes: smooth solid clay and clear wireframe overlay. Add side-by-side **V17 baseline vs V18** with fixed crop/scale; use hair hidden, no texture to mask geometry.
- Explicit rejection if spiral/shadow pinching reappears, silhouette has spike/flat or severe dent, ear roots become detached, nape has globular protrusion, or face-to-shell seam catches light.
- Compare with anatomical/retopology references: Blender Studio [head retopo](https://studio.blender.org/training/stylized-character-workflow/8-retopo-head/), [clean retopology](https://studio.blender.org/training/stylized-character-workflow/chapter/5d384edea5b8f5c2c32c8507/) and actual selected Pinterest pins logged separately. Reference is **visual guidance**, never a substitute for the original Shibu source.
- Export review-only GLB + .blend + all PNG + `v18_landmarks.json`, `rim-geometry.json`, `QA.json`, `manifest.json` (SHA256, source SHA, run ID, approval=NOT_APPROVED) to Actions Artifacts. No promotion until human approval.

## Run / checkpoint plan
1. Confirm latest `character-boundary-fast.yml` run and download its artifact. Use GitHub REST `/actions/runs?branch=...` for push runs; don't use PR-only commit-run lookup.
2. Freeze source VRM SHA and 36-point rim JSON; baseline six views and labeled wireframe. Check geometry JSON against V17 established bounds.
3. Produce only V18 **candidate A** head back patch in separate branch, save script and design checkpoints immediately; do not replace existing head GLB.
4. Run Blender six-view + quality gate; log detailed visible failures. Produce candidate B only after A QA; save checkpoints and compare against V17.
5. Keep `NOT_APPROVED` until explicit user review, then prepare a separate promotion PR against `development`. Never change `main` or gameplay in the research step.

## Research sources / licenses
- Blender Studio stylized character workflow: https://studio.blender.org/training/stylized-character-workflow/8-retopo-head/ ; https://studio.blender.org/training/stylized-character-workflow/chapter/5d384edea5b8f5c2c32c8507/
- VRoid sample README and separate license conditions must be checked before redistribution: https://github.com/madjin/vrm-samples
- Related visual candidate samples for **inspection only** (download/attribution/license must be checked individually): https://sketchfab.com/3d-models/anime-head-pratice-free-download-3fd6a9ccdcaf444aaf01d55b58ea50d8 (CC BY displayed); https://sketchfab.com/3d-models/genshin-style-anime-female-base-mesh-for-blender-c2d6727e8c9742feb9a4a3bccac6e0e0 (CC BY displayed); https://sketchfab.com/3d-models/anime-head-base-mesh-58e291934379438584012d09faefedf6 (CC BY displayed). No third-party meshes imported or approved.
