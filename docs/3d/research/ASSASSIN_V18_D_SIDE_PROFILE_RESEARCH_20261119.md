# Assassin V18 D — Side-profile-focused research & review plan (2026-11-19)

## Why A/B/C failed (measured via real Blender PNG, 2026-11-19)
Actual [A](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44439384500), [B](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44440184232), [C](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44440734080) show a wedge or shelf-shaped skull behind the ear, plus a dark V-shaped underside. All use a single disk cap over the entire Shibu Face 36-point boundary. The full jaw-to-crown region must not be treated as one posterior cap.

## New evidence to use
- Original Shibu rim has 36 source IDs and exactly measured XYZ/normals in Actions [44436213466](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44436213466). Sample ID 2 is low center of chin at approx (0.00026,0.03824,1.36191)m, sample ID 20 is top center at (0.00026,0.03851,1.58652)m, symmetric ear-transition corners near loop indices 7/33 at z~1.41041m. These confirm that simply capping the whole loop bridges jaw to scalp incorrectly.
- [Blender Studio: Retopo Head](https://studio.blender.org/training/stylized-character-workflow/8-retopo-head/) emphasizes edge loops into back of head, separate neck anatomy. [Blender Studio: Clean Retopology](https://studio.blender.org/training/stylized-character-workflow/chapter/5d384edea5b8f5c2c32c8507/) provides reference examples.
- [Blender Artists: human retopology](https://blenderartists.org/t/human-retopology-advice-welcome/1248218) demonstrates a quad layout continuing along cranium into neck as distinct curvature region (reference only, not license to copy mesh). [Blender Artists: practicing female topology](https://blenderartists.org/t/practicing-female-topology/640591) provides side-profile continuity from ear to nape.
- [NCBI anatomy: occipital bone](https://www.ncbi.nlm.nih.gov/sites/books/NBK541093/) and [Kenhub: posterior/lateral skull](https://www.kenhub.com/en/library/anatomy/posterior-and-lateral-views-of-the-skull): posterior surface curves inward below superior nuchal line; should not taper to a sharp point. Apply as anatomical concept, not exact numerical proportions for stylized head.

## Candidate D experiment
- Replace 9x9 rectangular Coons **disk** with 36×12 quad annular surface; original 36 Face vertices are exact, seam edges are shared. A separate open 36-vertex neck ring is left for subsequent body connection.
- Spatial target: upper occipital dome wider than nape; nape retreats smoothly toward neck. The side profile must have a rounded posterior high region and no wedge, plateau, V-shaped lower shadow or self-intersection.
- Geometry QA: 36 original seam edges each incidence 2; expected 36 new neck boundary edges; all new faces quad; no >2-incidence edges; minimum face area >1e-10 m²; original Face vertex positions unchanged. Additional cross-sectional profile and self-intersection checks are **not yet implemented** and must not be reported passed.
- Render six matching Blender clay views and dedicated side_closeup; save review GLB/.blend/PNG/QA/manifest in Artifacts, `NOT_APPROVED`.
- If the side profile remains unnatural, stop tweaking only numerical dome factors and split topology between cranial region and ear/jaw-to-neck transition as proposed in A–C review. Preserve each candidate and source.

## Provenance
The imported VRM Shibu/Vita source may not have a confirmed redistribution license. No game asset promotion or public GLB redistribution until checked against source-specific license. Old self-generated Assassin prototypes PR #309/#310/#313/#513 are excluded from shape or source reference.
