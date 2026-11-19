# B5 Knight Gothic Breastplate V5 — helmet V22 metal matching and three-dimensional shaping

2026-11-19 / NOT_APPROVED / development and main not modified

## Feedback
The user finds breastplate V4 too flat and wants a texture matching the already accepted V22 sallet helmet. Keep all prior V1-V4 and helmet variants.

## V5 changes
- File `tools/b5-knights/build_gothic_breastplate_v5.py`, independent previous generator preserved.
- Photoreference design intent: layered forged late Gothic breastplate, curved pectoral protrusion, narrow waist, integrated keel and flutes. Front-only shell; backplate and fauld separate future parts.
- Increase breast bulge from .042m to .051m base plus .034m at pectoral height; asymmetric shallow hammered plane to avoid planar billboard appearance.
- Raise central forged ridge to 7–10mm controlled by Z and radius; six subtle rib formations remain **actual mesh deformation** rather than floating cylinders, increased from 3.5 to 7.4mm.
- Preserve fail-closed X/Z vertex extent checks from V4 to prevent V3-style spiky shoulders.
- Decode exact **user-approved V22 helmet** imagegen grime source `tools/b5-knights/textures/grime_imagegen_v15_256.webp.b64`, SHA256 `7287744136ebb3c4e43854306131fd215bdc396fd9aaa57ae7c32099190d8a23`.
- Use the same V22 oxide/soot-driven base-color mixing and variable roughness approach; UV mapped on the actual shell and GLB PBR textures included. Retain muted steel sheen; weathering follows shared visual tone. Helmet-specific rear crack zones not pasted across a chest: they remain distinct and selective.

## QA
- Workflow `.github/workflows/b5-gothic-breastplate-v5.yml` run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44512473962
- Source scan, decoded image SHA validation, Blender Cycles six 800x800 views, GLB and Blend, 2 baked PBR PNG, manifest ten SHA256 records, GLB baked texture check, output ClamAV scan.
- Final art decision requires real six-view inspection and comparison to V4. No official assets promotion before approval.

## Confirmed V5 / additional V6 smoothing
- V5 actual GitHub Action [44512473962](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44512473962) **SUCCESS**: 6 Blender views + GLB + Blend + two PBR PNG.
- Downloaded original artifact `14522499587`; all **10 of 10** SHA256 entries independently verified. ClamAV actual scan: **12 files, 0 infected**.
- Actual front/angle/left/right compared directly with V4. Chest convexity and side projection visibly increased. V22 image-derived rusty patina now visible; GLB validation checked its embedded PBR textures. Outer silhouette and neckline remain inherited from V4.
- Remaining V5 issue: six visible vertical/diagonal Gothic embossed flutes have jagged stair-step pixels, because the mesh transverse resolution is too coarse for thin local folds.
- V6 independent generator `tools/b5-knights/build_gothic_breastplate_v6.py` doubles transverse ring resolution 160→320, widens flute smoothing σ 6→10.5mm and moderates fold height 7.4→6.8mm. Crown V22 source PBR and all inherited convex breast shaping unchanged.
- V6 dedicated workflow `.github/workflows/b5-gothic-breastplate-v6.yml` run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44513263807. Still requires actual result and visual QA.
- All V4/V5 source files preserved, none promoted; V6 NOT_APPROVED.
