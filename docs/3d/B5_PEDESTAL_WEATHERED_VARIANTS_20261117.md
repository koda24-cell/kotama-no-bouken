# B5 knight pedestal weathering A/B/C (2026-11-17)

**Status: NOT_APPROVED; no permanent asset promotion; V1–V3 and knight V14 preserved.**

## Inspiration / evidence
- Pinterest reference-library handoff: https://github.com/koda24-cell/pinterest-reference-library/blob/main/handoff/b5-decayed-knight-statues-20261116.md
- Real historical knight effigy and masonry quatrefoil motifs previously documented in `B5_KNIGHT_PEDESTAL_V1_DESIGN_20261117.md`.
- AmbientCG Rock063 CC0 photogrammetric stone from official zip, adjusted to cool slate gray; original remains in transient workflow Artifact only. NormalGL photograph not claimed applied.

## Distinct visual directions
- **A: Gothic funerary plinth**: four damaged cornice and shaft corners, front-stepped weathering crack, dust and soot deposited beneath projecting cap. Preserve architectural symmetry except for selective erosion.
- **B: Ritual altar**: weathered top surface and shallow worn patch, a long irregular stress crack crossing the cap, rainfall-like vertical dark runoffs and dark horizontal crevice.
- **C: Collapsed monument**: larger missing stone volumes on the near cap and shaft, diagonal structural fracture, shifted cap section and two coarse fallen fragments. Broken not universally rounded.

## Real geometry vs shader
- Boolean difference cuts, curves for cracks/masonry joints, large stone chunks as actual mesh. Photograph used for albedo/roughness *only if actually downloaded*.
- Never call dark crack curves true fissure-depth geometry; dark lines and recesses are still a stylization.
- V3 old GLB and Blend remain intact.
- One unique GLB, Blend and 800x800 front/side/angle PNG per variant, plus manifest/hash/license source.
- Actual renderer: Blender Ubuntu GitHub Actions. Review: visual front, side, diagonal and game-scale footprint. Map integration pending.

## Render run
https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44023310660

## Issues to review after images
- Does the floor plinth show believable age, not scattered model-kit detail?
- Are crack widths and soil deposits visible at expected map distance?
- Are Boolean chips physically recessed (not floating)?
- Does large face remain readable as architectural stone?

## Actual QA and art review (2026-11-17)
- Initial three candidates: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44023310660 . All three actual 800×800 front/side/angle Blender renders and GLB/Blend generated, but QA failed because manifest lacked variant key; review Artifacts uploaded. **Do not call this run successful.**
- First corrected three candidates: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44023539202 . All three jobs **SUCCESS**. 3 GLBs, 3 Blends, 9 PNG, 3 manifests, all checks passed. Photos applied: `AMBIENTCG_ROCK063_CC0_PHOTOGRAPHIC`.
- Second cycle: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44023733642 . All three jobs **SUCCESS**. Recessed cap grooves and more large Boolean corner cuts added. Images inspected; still too-new appearance in A/B; C reads as most damaged.
- Third cycle: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44024122713 . All three jobs **SUCCESS**; each 1200×800 front/side/angle PNG, GLB, Blend, manifest. Actual ZIPs fetched, **SHA-256 independently recomputed and matched for all 15 model/PNG/Blend files**. Artifact IDs: A `14301768463`, B `14301678731`, C `14301843080`. All source photos were fetched from ambientCG and their cool-toned variant used in the model. Evidence comparison image generated from actual ZIPs.
- Third-cycle **image issues**: closeup camera crops both left/right of front on some views, so whole-model assessment must still use full-view second-cycle images. C shows the clearest broken corner and damaged ornament, but rubble appears as low-poly chunks, most flat stone faces remain pristine, and four-leaf motifs are regular; B's cap fissure looks like raised dark strokes rather than entirely inset cracked stone. **No candidate meets the final quality threshold**.
- The actual material is diffuse photographic CC0 Rock063 plus roughness; imported NormalGL is *not connected*. Genuine Boolean corners were cut, but drawn crack curves do not prove all hairline fractures are recessed. Do not claim perfect photorealism.
- Source, GLB, Blend and screenshots stay in PR #424 Draft branch and 14-day Actions artifacts, not official asset folder or game.
- Next design stage: replace line-like fissures by mesh-displaced actual fracture surfaces and bake real surface roughness/normal maps; make damage vary with gravity and water flow. Don't just add another round of uniform black strokes.
