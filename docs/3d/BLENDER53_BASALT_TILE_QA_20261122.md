# Blender 5.3: Basalt columns second-model seam test (PR #712)

## Objective
Test whether PR #711's quantitative half-frame seam gate generalizes beyond the B2 watergate reference to **real fourth-floor basalt columns** (`assets/models/floor4/props/b4p_basalt_columns.glb`). Do not modify the original GLB or promote any candidate.

## Protocol
- Use pinned Blender 5.3 + ClamAV Docker and only the isolated QA feature branch.
- Import the existing basalt GLB into a new `.blend`. Preserve mesh topology and material slots, normalize object transforms for fixed front camera presentation; copy original GLB unchanged for inspection. Save a separate NOT_APPROVED checkpoint.
- Render a genuine 1000×760 single-pass front image with existing `render_one_view.py`.
- Download/verify/scan the immutable first checkpoint, render the **left 500×760** crop with existing `render_half_frame.py`, verify and upload before rendering right.
- In a fresh job, verify and scan both preceding Artifacts; reuse left PNG byte-for-byte, render right 500×760, stitch with strict PNG decoder.
- Run the previously validated `seam_qa.py` against actual full-frame basalt reference. Reject rather than silently adjust fixed watergate-derived limits (ratio≤2.5, seam excess≤8, frame MAE≤12). If material-specific thresholds need adjustment, document evidence and require review.
- Pack/hash/scan and upload final NOT_APPROVED artifact only upon all tests passing. If failed, inspect logs, improve the renderer/QA separately, and do not merge unverified workflow.

## Caveats
- This is a second *existing* model, not a realistic comprehensive suite of transparent, volumetric, and emissive materials.
- Reference and tiled outputs use a preview lighting setup that may differ from the model's production shader configuration; original GLB retained.
- Full-frame appearance comparisons remain required even when automated metrics pass.
- No asset approval, production save, or `main` merge.
