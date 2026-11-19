# B5 Sallet V7: Walters original 11-view evidence and redesign
Date: 2026-11-18 / Status: DESIGN+CODE, REVIEW ONLY, NOT_APPROVED.

## Primary same-object evidence
Walters Art Museum Visored Sallet (1480–1490 Germany, 51.470), 11 original CC0 photographs from front/left/right/back/rear 3/4/front 3/4/top/interior/visor raised.
https://art.thewalters.org/object/51.470/
H25.5 cm W22.5 cm D39.6 cm. Official gallery images carry CC0 indication.
All exact photo links and angles: https://github.com/koda24-cell/pinterest-reference-library/blob/main/handoff/b5-sallet-full-view-20261118.md

### Dimensional assumptions
Reference object is 1:1 ratio target for new standalone helmet. Historical model includes no integrated fixed bevor; avoid inventing a bulky separate square jaw plate. V7 preserves V1–V6 generators, creates new single-piece steel bowl with swept long tail and thin independent pivoted visor.
Different museum artifacts can be consulted for generic material only, not combined into mismatched multi-view shape.

### Sculpt checkpoints
1. Directly compare front eye slit height and oval head silhouette.
2. Both profiles: extended rear tail 39.6 cm depth and continuous curve; hinge position.
3. Back and top: continuous fine comb, flared tail, no floating tabs.
4. Steel: moderately polished micro-pitting, scattered patina, no repetitive grid textures.
5. Mesh QA: no missing bowl/visor/tail, editable .blend, 6 real Blender PNG front/left/right/back/angle/top, GLB, SHA-256, manifest/progress. Approval NOT_APPROVED.
6. Existing knight body V14 and all pedestal versions unchanged. No asset promotion, no gameplay.

Workflow: .github/workflows/b5-knight-sallet-v7-render.yml
Source: tools/b5-knights/build_sallet_v7.py
Run: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44216423306
Performance follow-up: original V7 GLB via shared GLB Performance Audit / rigid LOD review (not claimed successful until executed).
Current artifact quality: NOT REVIEWED until actual files and six-view images are fetched.
