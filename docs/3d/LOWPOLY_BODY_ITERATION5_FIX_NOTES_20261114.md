# Low-poly full-body — iteration 5 fix and rerender notes (2026-11-14)

## Source and workflow
- Reference: Pinterest pin https://www.pinterest.com/pin/878835314813441339/
- Target: low-poly full-body reference, front and side at shared head/foot heights. Assassin costume/hair out of scope.
- Draft PR: https://github.com/koda24-cell/kotama-no-bouken/pull/314
- Last successful overlay generation: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43448751729
- Previous failure: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43443262370

## Error and fix
- Blender Eevee four-view render succeeded, but PIL's `Image.resize(... NEAREST)` returned `SystemError: ImagingCore returned NULL` while writing enlarged comparison crop.
- Fix: write native-resolution zoom crop directly, avoiding the failing resize operation.
- Re-run 43448751729 completed successfully; generated reference overlay PNG, zoom PNG, landmark-error CSV and metrics JSON.

## Measured mismatch (iteration 4 mesh)
- Front outer-edge mean absolute error: **16.74 px**, 21 landmark rows.
- Right-side outer-edge mean absolute error: **11.53 px**, 20 landmark rows.
- These are approximate proxy values from manually traced image bounds, not true polygon vertex correspondence.
- IMPORTANT: front Y=411 row crosses the hand-to-leg envelope transition, yielding spurious -122/+116px. Exclude this from fit optimization and do not report the raw mean as a reliable overall accuracy score.
- Front: shoulder around Y=179 -31/+29px, upper arms around Y=220 -34/+38px. Lower legs Y=499..654 are ~7–12px wider than trace.
- Side: abdomen Y=251..321 model front boundary ~22–28px behind reference. Calf rear at Y=555..608 ~17–23px forward of reference. Head profile differs substantially and needs separate topology correction.

## Iteration 5 change
- Localized front abdomen depth increase, peak 0.045 Blender units near Z=4.05.
- Localized posterior calf depth increase, peak 0.035 Blender units near Z=1.15.
- No global scaling, no changes to face/hair, no merge. The geometry is a test hypothesis; rerender and compare before claiming improvement.

## Next evaluation
- Verify all four Eevee views, zoomed reference overlays, and landmark CSV.
- Check that torso/arms remain anatomically connected and the side profile improves without damaging front silhouette.
- Next priority: fix reference envelope segmentation and shoulder/groin quad topology instead of repeatedly deforming a voxel-decimated mesh.
