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
