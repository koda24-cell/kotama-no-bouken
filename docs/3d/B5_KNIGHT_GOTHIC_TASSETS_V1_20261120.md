# Stage 5 Gothic Knight — paired articulated thigh tassets V1 (2026-11-20)

Status: **NOT_APPROVED** — independent candidate, no game integration or permanent asset promotion.

## Existing geometry preserved
Continue knight series on top of culet V1 review branch, retaining sallet V22, breastplate V6, fauld V2, backplate V2, culet V1 and all earlier versions. New asset has standalone script `tools/b5-knights/build_gothic_tassets_v1.py`.

## Engineering geometry (metres, matching fauld V2 coordinate system)
- Front is -Y, standing Z up; left/right thigh plate centres approximately x=±0.124 m.
- Two separate steel plates per thigh (four meshes total), with their own 1.8mm shell thickness and 0.65mm bevels.
- Upper plates Z=0.690–0.475m, lower plates Z=0.515–0.347m. Gapless overlaps 40mm; upper begins above fauld V2 lower rim ~0.665m.
- Width ~0.16–0.20m depending on height; convex front bulge up to 32mm, forged keels up to 9mm, gentle hem scallop (<=17mm). Narrow aged rivets; no thick rods/tubes or generic square sheets.
- Common sallet V22 generated grime texture and resulting oxide/roughness formula; no new third-party asset download.
- Geometric fit and end-to-end assembly with fauld V2 still require visual inspection; no model can be called complete from numerical checks alone.

## Workflow
`.github/workflows/b5-gothic-tassets-v1.yml` renders six real Cycles PNGs (front, left, right, angle, back, top), GLB, Blend, 2 PBR maps and manifest hashes. Uses dedicated ClamAV pre/post scan. Preview publisher publishes PNG-only to isolated `render-preview/run-*` branch after all technical QA passes, without promoting assets.

### Art evaluation
Compare frontal taper, plate overlap, side wrap, off-centre keel and roughness with V6/V22. Next work: assembly render fauld V2 + tassets V1, then improve without overwriting original generator.
