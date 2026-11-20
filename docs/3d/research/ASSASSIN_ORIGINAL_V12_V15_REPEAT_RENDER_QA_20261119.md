# Assassin original full head V12–V15: repeat Blender5.3 real visual review (2026-11-19)

**Result:** Four successive independent review candidates generated, **28 actual seven-direction PNGs**, 4 review GLBs and 4 Blender project files. **None is artistically approved.** No original Shibu/Vita mesh imported, no original vertices copied, no game asset promotion/merge to main.

| Version | GitHub Actions run | Artifact ID | Main experiment | Result from 7-view actual PNGs |
| --- | --- | --- | --- | --- |
| V12 | [44513606903](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44513606903) | 14523904129 | Bilateral orbital quads 192 verts /144 faces each, original V11 auricle cups | Real orbital edge topology renders; visibly raised eye-ring, ears sticking out like detached vertical strips front. **FAIL** |
| V13 | [44514972406](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44514972406) | 14526280275 | Reduced orbital relief, ear asymmetry 5x48 rings: 241 verts /192 quads each | Eyelids less pronounced and ear profile smaller; back/neck retained, but still weak nose/face silhouette, ear root disconnected. **FAIL** |
| V14 | [44516403643](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44516403643) | 14526436522 | Independently authored nasal bridge/tip patch 483 verts /440 quads on face | Stronger nose side silhouette but **black hole-like cast shadow below nose** and seam risk from separate overlapping geometry. **FAIL** |
| V15 | [44517864181](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44517864181) | 14527570833 | No floating patch: compact-support C1 nose displacement of original head quads | Nose no longer casts a separate shell shadow and transition is softer than V14; nevertheless dark nose/cheek shading and simplistic face remain. **FAIL** |

## Verified evidence
- Every row used immutable Blender **5.3.0** image `ghcr.io/koda24-cell/kotama-blender53-clamav@sha256:5ce601f79b1ab09405b3ebc36b1a596be76cb8b105b1524fcbafcb186ebf7e99` and actual success status for render, structural QA, source/output scan and artifact upload.
- ZIP extraction CRC: 4 of 4 passed. All 4 output manifests' bytes and SHA256 matched every file, all GLB files started with `glTF`. Every version had seven real 720px PNGs: front, left, right, front-three-quarter, back, back-three-quarter, back-upper.
- **ClamAV:** every version scan 1 source file and 11 output files, **0 infected** in each of eight source/output scan logs. This is a verified scan, **not** an assertion of complete malware safety.
- Original main head V12–V15 remains 8545 vertices, 8448 quadrangles, 96 crown triangles, 96 intentionally open lower boundary edges. Separate ear and eye meshes are not welded to main head; user approval needed.
- Reference Shibu Body remains visual comparison only and is not included in artifacts.

## Next technical direction (not implemented in V12–V15)
1. **Priority: correct facial proportions and surface topology**, not more additive Gaussian lumps or floating shells. Build a coherent front facial mesh with loops around eye sockets, nostrils, cheeks, philtrum, lips and jaw, then match/open/weld as needed to original side/occiput without shifting posterior points.
2. Investigate **shading independently from shape**: render evenly lit clay with shadow disabled for diagnostics vs regular area lights, face normal overlay and actual UV / normals. This will distinguish cast shadows from geometry holes.
3. Fix ears at skull-root with quad bridge and natural cartilage lobule/antihelix geometry; from front and back current separate ear meshes appear flat like tabs.
4. Need rigorous matched-camera visual reference (including actual original Shibu). The relative proportions are qualitatively worse than source; no automatic aesthetic acceptance threshold validated. Keep **NOT_APPROVED** and compare front/side/back for every candidate.
5. Only after the user actually approves should an asset-promotion PR be made; temporary Actions artifacts expire and can be rerendered from committed scripts.

**State:** highest-dimensional continuity improvements: V13 best without dark nose hole, V15 smoother side nose than V14 but unresolved frontal shadow. Neither is finished or accepted. Both remain separate feature PR research results.
