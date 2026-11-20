# Assassin original V8-V11 real Blender QA (2026-11-19)

**All four versions technically render; all four remain NOT_APPROVED artistically. No external Shibu VRM or its vertices imported.**

| Version | Actual run | Artifact ID | Actual visual result |
| --- | --- | --- | --- |
| V8 | https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44478965826 | 14507787261 | Deep black nasal/cheek shadow; ear pieces artificial. REJECT |
| V9 | https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44479707243 | 14508505741 | Dark hole decreased, but nasal profile too flat. REJECT |
| V10 | https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44480485157 | 14508117873 | Restored nasal prominence causes recurrent dark shade. REJECT |
| V11 | https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44481429168 | 14509296851 | New actual ear quad-loop cups but ear resembles symmetric donut and isn't welded. REJECT |

All artifacts include seven real 720px Blender PNG views, GLB, Blend, QA and manifest. Downloaded ZIP CRC passed. Original head: 8545 vertices, 8448 quads, 96 cap triangles, 96 open bottom rim edges, PCHIP derivative jump 0.003106, zero imported source vertices. V11 each independent ear: 161 verts, 120 quads, 40 triangles. No final user approval.

## Method correction
1. Stop solely increasing Gaussian protrusion of ellipse-based facial head; repeated tests V8 and V10 introduce visually unacceptable dark nasal holes, and V9 suppresses the nose completely.
2. Build **independent anatomical facial quad topology**, including an eye socket loop/lids, cheek volume, nose root and tip, nasal wings, mandible corner, lip loops. Match shading and profile without arbitrary localized dark creases.
3. Ear V11 supplies a geometrically sound source-free parametric auricle cup baseline, but lacks anatomical asymmetry, antihelix branches, concha divisions, tragus, lobule and skull-root attachment. Design and construct those as true surfaces, not symmetrical donut.
4. Continue testing *entire face and rear skull together* in identical front, both side, both oblique, back and upper views; baseline V7/V9 posterior should not be needlessly deformed. Shibu original only visual and measurement reference, not final mesh.
5. User requests repeated actual Blender render, image review and revision until an acceptable result. Current automatic QA checks topology/execution, NOT beauty. Do not merge candidate geometry to development/main or promote any GLB until explicit user approval.

PR status: draft, review-only, NOT_APPROVED.
