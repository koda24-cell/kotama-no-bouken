# B4 basalt tile QA — real render visual comparison

## Reproducible evidence
- Run: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44964487709
- Existing source: `assets/models/floor4/props/b4p_basalt_columns.glb` (unchanged)
- Reference Artifact: `basalt-reference-NOT-APPROVED-44964487709` (14730599388)
- Stitched Artifact: `basalt-tiled-PASS-NOT-APPROVED-44964487709` (14731346402)
- Both Artifact archives were downloaded. Their actual 1000x760 `front.png` renders were opened side by side and visually inspected.
- The central pillars, hard-edged geometry and background align across the full and stitched images; no visible vertical band or displacement on x=500 at the overview scale.
- **Limit of visual QA:** the basalt appears relatively small within the frame; high-frequency textured, transparent and volumetric scene variations still need testing before universal adoption. This is a preview-framing test, not a final artistic assessment of the rock.
- Automatic seam QA: PASS. `seam_rgb_delta=1.8294`, neighboring median `0.9594`, ratio `1.9067` (limit 2.5), reference seam `1.3004`, seam excess `0.5289` (limit 8), overall RGB MAE `0.2608` (limit 12).
- Front image reused byte-for-byte as the left half, then right half rendered independently in a fresh job. Original and left/reconstructed Artifacts all exist.
- Each of `baseline`, `left`, and `right-and-qa` finished success. Blender Python failures are fail-fast, source asset and scripts scanned with ClamAV.
- **Technical and limited visual QA accepted for this fixed B4 scene only.** No source GLB modification, no production asset approval and no `main` changes.
