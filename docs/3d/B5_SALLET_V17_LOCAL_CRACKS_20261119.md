# B5 sallet V17 localized crack application — 2026-11-19

Status: NOT_APPROVED. V16 preserved as the baseline. User requested cracks on *only selected areas*, not all of the helmet.

## Source and boundaries
- Specific source: user-requested AI-generated larger-crack iron surface (conversation image), not a Pinterest photo or a download.
- Downsampled compact WebP of the actual prior generated crack image: `tools/b5-knights/textures/cracks_imagegen_v17_192.webp.b64`.
- SHA256(decoded WebP): `b9560e690caebf216df9ccadd434dbe6e6dbbca5e8f5c085c8b4d4129ac2955c`.
- Source 192×192; decoded into 256×256 PNG and dark fracture valleys extracted with blur-minus-original algorithm.
- Older V16 weathered steel PBR preserved, including preexisting grime image / roughness.
- No full-surface replacement. No giant apparent breaks in the mesh. Texture-only hairline/shallow fractures.

## Exactly two placement areas
- Back-side shell: atlas cylindrical UV u~0.29, v~0.44, soft ellipse radii (0.092,0.145), 80% zone strength.
- Lower rear nape shell: atlas u~0.105, v~0.265, radii (0.060,0.094), 68% zone strength.
- A separate `steel_visor` material with clean V16 color/roughness ensures visor/face remain unchanged, despite overlapping atlas UV coordinates.
- Everywhere outside these soft ellipse zones is exactly original V16 color/roughness.

## Implementation and real QA
- `tools/b5-knights/build_sallet_v17.py` reads original V16 crackless color and roughness, applies *actual image-derived dark fracture valleys* in two locations, and saves `localized_cracks_albedo_v17.png`, `localized_cracks_roughness_v17.png` and `localized_cracks_mask_v17.png`.
- `.github/workflows/b5-knight-sallet-v17-render.yml` decodes source image from base64, checks SHA256, extracts crack detail, Blender renders six views, verifies GLB's material and per-file SHA256.
- Run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44451186961 . Current state at first write: IN PROGRESS.
- Review three mandatory images: side (rear patch), back (nape patch), front (must remain virtually unchanged). Inspect source vs V16, and make V18 independent if too subtle or too broad.
- Both GLB geometry and PNG must be verified before claiming success. User artistic approval needed before asset promotion.

## Actual execution and visual check (verified)
- Run [44451186961](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44451186961) completed **success**; Artifact ID `14495682708`, `b5-sallet-v17-walters-NOT-APPROVED`.
- Blender Cycles actually rendered six 800×800 front/left/right/back/angle/top PNG; GLB 633,884 bytes and Blend 1,739,276 bytes; 13 named output file SHA-256 entries locally recomputed and matched the manifest.
- Image-derived cracks `crack_active_texels=915`, sparse and localized to precisely two UV ellipses. No change to front/visor steel material, separate material `visor untouched by cracks` present.
- Side/back actual render review: cracks are visible primarily as short dark linear abrasions on the rear shell and lower nape. They do **not** cover the whole helmet.
- Art limitation: the extracted image still looks partly like dark scraping rather than a deeply split metal plate. This is a **texture-only** hairline fracture effect; geometry has no actual mesh rupture. No artistic approval claimed.
- The user can inspect `localized_cracks_mask_v17.png` and compare V16/V17 actual front/side/back screenshots.
- Official asset folder, `development`, `main` and game code untouched; `NOT_APPROVED` remains.
