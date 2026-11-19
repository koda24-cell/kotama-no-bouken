# B5 sallet V15 — original generated grime image catalog and texture-blending QA

Date: 2026-11-19 / Status: NOT_APPROVED; Actions pending.
Target: Stage 5 ruined knight sallet helmet, preserve original metallic forged steel rather than replace entire surface with rust.

## Source image
- Generated at user request specifically as an aged steel grime/soot/rust/scratch texture (no Pinterest or third-party image downloaded).
- Full-resolution PNG is conversation deliverable; generated model image is not a screenshot of an actual art object.
- Reproducible branch-staged image content: `tools/b5-knights/textures/grime_imagegen_v15_256.webp.b64`, a 256x256 WebP derivative of the generated image, compressed for transport.
- The derivative source SHA-256 of the decoded WebP: `7287744136ebb3c4e43854306131fd215bdc396fd9aaa57ae7c32099190d8a23`.
- GitHub Actions decodes with Pillow, validates SHA/256px dimensions, saves `render-output/b5-knights/grime_source_v15.png`; the current generation does not depend on downloading from external websites.
- Use: B5 sallet weathered steel. Not a physically measured PBR set; creative image primarily supplies albedo/wear color. Roughness is a derived grayscale map.

## Actual material pipeline (planned or tested per run)
1. Load the **actual generated image** after decoding it, blend it in Blender with the original metal color (not a procedural replacement), retaining visible steel near highlights.
2. Weight corrosion toward low areas and areas with reddish signal; avoid equal strength rust everywhere.
3. Bake the resulting color and roughness into named PNG images, then pack these into the exported GLB.
4. Use cylindrical UV projection for the bowl, planar front projection for the face visor, preserving previous crown and shaped edges.
5. Render actual front/left/right/back/angle/top PNG and inspect texture scale, repetition/seams, color cast and edge readability.
6. Validate that GLB includes packed baseColorTexture, manifest SHA-256, Blend and actual images; keep older V14 independent.
7. If the texture is too dark or strong, make an isolated V16 with lower blend and local dirt mask; never overwrite V15 checkpoint.

## Code and execution evidence
- Generator: `tools/b5-knights/build_sallet_v15.py`
- Workflow: `.github/workflows/b5-knight-sallet-v15-render.yml`
- Latest run: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44448101296
- At document creation: job in progress, DO NOT mark model or texture application verified yet.
- All outputs remain `NOT_APPROVED` and game runtime is untouched.

## Verified actual rendering / comparison (2026-11-19)
- V15 https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44448101296 : SUCCESS. Artifact 14494785856, six Cycles PNG, .GLB, .blend, baked albedo/roughness. 10/10 SHA-256 hashes recomputed and matched. Generated image WebP exact SHA validated in Action before Blender, then composited and packed. Real image looked too clean/understated, not approved.
- V16 independent enhancement: `tools/b5-knights/build_sallet_v16.py` and `.github/workflows/b5-knight-sallet-v16-render.yml`. Uses SAME generated image (not newly invented texture), increases localized oxidized brown and soot contrast, increases roughness in source-image rusty patches.
- V16 https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44448728821 : SUCCESS. Artifact 14493924229; 10/10 manifest SHA-256 checks matched including GLB, Blend, baked albedo and roughness PNG, six viewing PNG.
- Actual screenshot review: V16 visible old brown discoloration at brow, tail crown, rear nape and top; still retains broad steel highlights. Compared to V15 it now looks dirtier rather than uniformly pale/new. However the visor join and overall rounded shape still need separate geometry QA. V16 is a candidate, not final artistic approval.
- No automatic asset promotion, no changes to `development`, `main` or the official GLB asset directory.
