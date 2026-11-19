# B5 sallet crown V22: softer forged apex (2026-11-19)

Status: **NOT_APPROVED**. V21 actual render showed a needle-like tip; user agrees the apex is too sharp. Preserve the rest of V20–V21 and the approved-direction grime/crack texture.

## Exact model change
- New independent generator: `tools/b5-knights/build_sallet_v22.py`, preserving V1–V21.
- V21 apex was z=0.269m, final loft ring z=0.263m at radius 0.004/0.006m. That produced a visually narrow cone.
- V22 apex z=0.266m, ring z=0.263m with 0.010m lateral and ~0.012m fore radius, ~0.011m rear radius. A lower 3mm lift and broader blended transition are directly part of the crown mesh.
- All other crown rings, visor, tail, old rust/scratch images, local crack ellipses, pivots unchanged. No detached crest, no new material.

## Verification gate
- Dedicated `.github/workflows/b5-knight-sallet-v22-render.yml`, running https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44460127042 .
- Shared pinned Blender/ClamAV image; actual source scan, reference texture scan, generated output scan.
- Six real 800px Cycles views, GLB/Blend, packed PBR and the SHA-256 manifest.
- Compare front/side/angle/top against V21; desired result: slightly sharp forged silhouette at crown top but not a spike. If too rounded, adjust the ring transition in the next isolated version, not old V21.
- Technical success does not imply aesthetic approval. Official assets and game runtime remain untouched.

## Verified execution and art review (2026-11-19)
- Run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44460127042: **SUCCESS**, artifact `14499397037`, `b5-sallet-v22-walters-NOT-APPROVED`.
- Actual Blender Cycles six views (front, left, right, back, angle, top) produced; GLB and Blend exported.
- Independently downloaded ZIP and SHA-256 recomputed all 13 manifest file entries; **13/13 match**.
- ClamAV signature refresh, source/texture scans and output scan passed.
- Compared V21/V22 actual front/left/angle/top: V21 visibly needle-like central tip; V22 broadens and lowers summit, now flows smoothly with crown, still a subtle forged apex.
- V22 seems closer to user-requested form; this is an **assistant art assessment**, not explicit user approval. Previous metallic PBR/corrosion/three rear-only local crack zones unchanged.
- No assets promoted; V22 and all previous independent generator checkpoints retained. User can select/approve later.
