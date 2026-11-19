# Assassin V18 posterior model — real Blender evaluation (2026-11-19)

**Status: ALL THREE CANDIDATES REJECTED ARTISTICALLY.** Source Shibu Face preserved; review-only. No promotion, no game integration.

## Runs, source and technical QA

| Candidate | Code | GitHub Actions run | Outcome |
| --- | --- | --- | --- |
| A | `build_v18_candidate_a.py` | [44439384500](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44439384500) | successful six-view render, rejected |
| B | `build_v18_candidate_b.py` | [44440184232](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44440184232) | successful six-view render, rejected |
| C | `build_v18_candidate_c.py` | [44440734080](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44440734080) | successful six-view render, rejected |

The first A run [44439062643](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44439062643) failed on stale Blender BMesh index table. Fixed with a stored source vertex lookup and `bm.verts.index_update()`; subsequent A run succeeded.

Each successful candidate: Shibu Face 36-vertex component 5 preserved; 2,339 base vertices and 3,150 source polygons, +64 new interior vertices and +81 quads; all 36 shared rim edges have incidence exactly 2; no new >2-face edge; minimum polygon area approximately 1.6467e-7 m² (including base). Exported review-only GLB, Blend, six PNGs, source rim JSON, geometry QA and sha256 manifest into artifacts. All are NOT_APPROVED.

## Visual inspection (actual Blender six-view PNGs, same camera/lights)
- **V17**: rear spiral shadow, peaked projection, seam line, abnormal lower protrusion.
- **A**: no center pole fan, but excessively pointed wedge in profile; dark V-shaped occipital underside. Reject.
- **B**: posterior wedge reduced, but broad flat cranial shelf; block/box silhouette; rear shadow and neck base still bad. Reject.
- **C**: upper crown is less flat than B; long sloping rear profile still looks wedge/cone-like. Back/nape dark V remains. Reject.
- **The original face/front was unchanged** in mesh position; clay override deliberately removes textures and may hide eye material/color, not evidence of altered facial anatomy.

## Root-cause evaluation and next corrective design (V18 D)
The common **9×9 Coons-filled whole 36-point rim** joins chin/jaw boundary and crown in one continuous dome. Although manifold along the seam, that **incorrect anatomical domain** forces the underside to taper to the chin and creates side-view wedge geometry. Changing only the depth falloff (A→B→C) cannot fix this; it trades pointed side shape for a flattened back.

**Do not continue parameter-only tweaks of the same topology.** Design a zoned topology:
1. Classify each of the 36 exact Shibu rim source vertices against ear/temple/jaw/nape landmarks in registered front, side, back-upper wireframe overlays.
2. Build a distinct cranial shell for upper lateral/crown/occiput, and a lower jaw-to-neck transition. Maintain exact source face boundary without translating original vertices; map appropriate lower contour into a **separate neck opening**, not a giant diagonal surface to chin tip. Conserve skin silhouette.
3. Use explicit topology that allows cranial loops to terminate in a neck-ring layout, avoiding center fan and keeping poles out of high-curvature silhouette. The candidate must satisfy true seam weld, no duplicate shell, oriented normals, self-intersection and curvature tests.
4. Add dedicated lateral silhouette and seam close-ups as automated evidence; compare with actual Shibu and Vita reference head views, not old generated Assassin prototypes.
5. Only after skull and neck are acceptable add hair. Any external source VRM redistributable license remains unverified; do not promote into games/assets.

## Artifacts / exact evidence
- A artifact `assassin-v18-candidate-a-NOT-APPROVED` (run 44439384500; ID 14491240990).
- B artifact `assassin-v18-candidate-b-NOT-APPROVED` (run 44440184232; ID 14489709701).
- C artifact `assassin-v18-candidate-c-NOT-APPROVED` (run 44440734080; ID 14490404059).
- Compare corresponding `front/back/left/right/three_quarter/back_upper.png` in each artifact.
- Never use old standalone Assassin head PRs #309/#310/#313/#513 as reference.
