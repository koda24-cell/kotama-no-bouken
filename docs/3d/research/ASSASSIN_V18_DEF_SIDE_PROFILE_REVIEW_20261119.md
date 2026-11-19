# Assassin V18 posterior profile: D/E results and F redesign (2026-11-19)

## Actual Blender evidence
| Candidate | Run | Structural success | Artistic decision |
|---|---|---|---|
| D | [44442557041](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44442557041) | 432 new quads and vertices; all 36 Shibu edges welded; neck ring 36 open edges | **REJECT**: large underslung black face, pointed inferior occiput, visible lip |
| E | [44443514559](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44443514559) | 432 quads and vertices; all 36 seam edges shared; 36-edge neck opening; +one rear light | **REJECT**: moving neck ring below chin produces a long conical shell and detached-looking collar |

Failed E run [44443307092](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44443307092) only lacked the `output/assassin-v18-e` directory before writing `source.sha256`. Fixed and rerun successfully. No source mesh data lost.

## Updated root cause
The source Shibu Face's 36-edge component includes **lower chin center ID 1880 (order 2)** and **upper scalp ID 2034 (order 20)**. A single posterior patch connected to *all 36* necessarily forces the chin to wrap into the back skull/neck, creating a wedge/cone. Blender rear-fill light confirms E's lower shape is an actual large geometric panel rather than only a light issue.

## F is a strict domain isolation experiment
- **Only original rim order 7 through 33 (27 vertices, 26 edges)** follows the upper ear/temple/crown contour. Lower jaw/chin perimeter is intentionally **untouched and unfilled**.
- A 26-by-12 quad strip projects the upper crown boundary toward a broad, low rear-scallop seam; no lower jaw-to-neck connection. Output 312 quads and 324 vertices; 26 true shared Shibu cranial seam edges.
- Its exposed end edges and lower back edge are **expected temporary open boundaries**, not a finished solid. QA should reject any unexpected nonmanifold >2 edges or shifted source vertices. A future separate jaw/neck surface is required.
- Side view is the primary acceptance gate; require rounded crown-to-occiput, ear-rear transition, no sharp lower tip. Back and close-up must be checked before considering integration.
- This is a research test only, `NOT_APPROVED`. Do not present F as a complete/closed head.

## Source/reference anchors
- [Blender Studio retopology head](https://studio.blender.org/training/stylized-character-workflow/8-retopo-head/) and [clean retopology](https://studio.blender.org/training/stylized-character-workflow/chapter/5d384edea5b8f5c2c32c8507/)
- [Blender Artists side-profile quad head](https://blenderartists.org/t/human-retopology-advice-welcome/1248218)
- [NCBI occipital anatomy](https://www.ncbi.nlm.nih.gov/books/NBK541093/)
- The sample-specific Shibu/Vita redistribution license remains unresolved. No formal game asset promotion.
