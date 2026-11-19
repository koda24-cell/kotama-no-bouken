# B5 sallet V18 — restrained localized crack coverage increase (2026-11-19)

Status: NOT_APPROVED. V1–V17 source and assets preserved. Existing V16 corroded metal albedo and V17 crack image remain baseline.

## User feedback
V17 local fractures looked good but sparse; increase a little, NOT over the whole helmet.

## Changes relative to V17
- Old area 1 (back-side): UV ellipse center (0.29,0.44), radius (0.092,0.145) expanded to (0.108,0.165), weight .80→.88.
- Old area 2 (rear lower hem): (0.105,0.265), radius (0.060,0.094) expanded to (0.069,0.108), weight .68→.77.
- One small new area 3: rear upper/side UV ellipse (0.390,0.365), radius (0.052,0.085), weight .55.
- Strength .90→.94 and detail exponent .65→.61: fine cracks remain visible without artificial painted thick straight lines.
- Existing steel and the preserved V16 clean-visor material unchanged. Do not add marks to the face or forward crown.
- Use source generated crack image `tools/b5-knights/textures/cracks_imagegen_v17_192.webp.b64` with SHA256 `b9560e690caebf216df9ccadd434dbe6e6dbbca5e8f5c085c8b4d4129ac2955c`; no external downloads.

## Evidence / QA
- Generator `tools/b5-knights/build_sallet_v18.py`
- Workflow `.github/workflows/b5-knight-sallet-v18-render.yml`
- Run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44452119890 (running at document time)
- Six Blender Cycles directions, 800px, GLB/Blend, baked base color/roughness and localization mask PNG. SHA manifest and mandatory nonapproval.
- Art gate: front and visor unchanged, back and side slightly more weathered; check for unwanted uniform dark graffiti / UV stretching.
- Artifact is temporary. Do not promote to official `assets` until user approval.
