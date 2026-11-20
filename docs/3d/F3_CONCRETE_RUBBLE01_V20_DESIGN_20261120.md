# F3 Concrete Rubble01 V20 — jagged fracture lips, not melted rock
Status: NOT_APPROVED / render pending.

V19 run 44673777806 successfully generated 5 PNG views, GLB, Blend, textures and SHA manifest, but real visual comparison shows too-smooth folded/crater-like top, low aggregate realism and triangular side facets.

## Design parameters (metres)
- Retain base 0.45m by 0.31m plan and 0.12m nominal thickness; preserve V1–V19 source files.
- 3 partial top plate collapses (front 23mm, middle 13mm, front-right corner 35mm), plus rear-left local chip 19mm.
- Fracture lips span 7–10mm; boundary jitter uses spatial noise, not periodic sawtooth vertical slices.
- Finished-surface fine irregularity limited to about 2.7mm combined, with no global radial crater.
- Break side x/y micro displacement 1.2mm + 0.75mm finer detail, z 1.1mm + 0.65mm; smooth only broken interior side facets.
- Embedded aggregate texture color uplift reduced to 0.065 to avoid bright white dots.
- Existing 2-material GLB/Blend/4 texture PNG + 5 camera PNG/manifest QA stays mandatory.
- Precise V20-specific push path prevents *this* workflow from restarting on later versions. Earlier all-version triggers still require separate housekeeping.

## Required checks
Inspect real top, angle and fracture-detail PNG to confirm recognizable irregular chipped concrete, not smooth basin or sawtooth fences. Confirm no open mesh defects, inverted normals, obvious UV seams or spikes before approval; check GLB and hashes, then perform shared performance audit. V20 remains unapproved and cannot be promoted to production.
