# B5 knight Gothic rear culet V1 — model handoff (2026-11-19)

Status: NOT_APPROVED, independent review candidate; no production assets or gameplay changes.

## Source continuity
- From original knight branch `feature/gpt-b5-knight-statues-v1-20261116`; retain sallet V22, breastplate V6, fauld V2 and backplate V2.
- Latest backplate review: run 44518192273; backplate lower Z 0.872 m, half-width 0.172 m.
- New source `tools/b5-knights/build_gothic_culet_v1.py`, distinct from fauld. Rear face +Y, three overlapping Gothic rear plates, with 1.8mm sheet thickness and discrete side rivets. Top z 0.902, lower z 0.658; progressive outward flare.
- V22 ImageGen grime source (SHA256 7287744136ebb3c4e43854306131fd215bdc396fd9aaa57ae7c32099190d8a23), same bronze-gray oxidation/roughness conversion used by adjacent components. No new external binary.

## Validation gates
1. Workflow `.github/workflows/b5-gothic-culet-v1.yml`: pinned Blender + ClamAV with preflight and postflight scan, GLB, Blend, 6 Cycles PNG, PBR maps, sha256 manifest.
2. Evaluate rear, side, angle against upper backplate V2; all overlaps should read as attached forged plates, not flat disconnected strips.
3. Confirm separate meshes, normals, GLB material maps, render files and 10 hashes; review any failure without claiming completion.
4. Future assembly test: backplate V2 + rear culet V1 + fauld V2 for silhouette / side transitions; do not auto-merge unapproved assets.

## Reference and limitations
Existing museum sources: Met Gothic armor https://www.metmuseum.org/art/collection/search/22906 and backplate https://www.metmuseum.org/art/collection/search/22881. Prior Pinterest handoff `handoff/b5-decayed-knight-statues-20261116.md`; this iteration adds no Pinterest image, does not claim image verification. The first render remains **art unapproved** until real PNG review.
