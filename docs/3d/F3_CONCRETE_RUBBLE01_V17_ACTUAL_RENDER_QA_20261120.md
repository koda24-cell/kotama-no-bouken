# F3 concrete rubble V17 — actual Blender 5.3 review (2026-11-20)

## Evidence
- Source generator: `tools/floor3/concrete_rubble01/build_v17.py`
- Workflow: `.github/workflows/f3-concrete-rubble01-v17-render.yml`
- [Verified run 44672443123](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44672443123): completed/success. All code check, Blender 5.3 render, validation and artifact upload steps success.
- Artifact 14600143442 `f3-concrete-rubble01-v17`, 5,738,473 bytes (ZIP wrapper reported by GitHub). Retrieved archive with 5 real PNG views (front, side, angle, top, fracture_detail), GLB, Blend, 4 PBR maps, manifest. All ten? Actual manifest contains eleven files (GLB, Blend, four PBR maps, five PNG); each ZIP SHA256 matches manifest.

## Actual image visual critique
- V17 genuinely breaks the formerly planar top and shows an offset depression in top/angle views.
- **NOT APPROVED**: the upper surface has smooth radial ripples and a crater-like center instead of discontinuous fractured concrete. Side surface retains exaggerated triangular facets, and aggregate renders as white specks rather than a grounded cut-through mixture. Overall retains too-obvious slab silhouette.
- V18 should replace gradual top noise/depression with two or three discrete stepped fracture panels, asymmetric thickness loss and genuinely missing corner volumes; isolate the surviving original finished face to a smaller patch. Fix side fracture appearance and integrated aggregate separately, avoiding bright white dots and external spheres.
- Keep all original V1-V17 generators and outputs. Draft PR #642 only; no merge or asset promotion until explicit user approval.
