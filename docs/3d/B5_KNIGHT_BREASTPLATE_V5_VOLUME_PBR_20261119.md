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
