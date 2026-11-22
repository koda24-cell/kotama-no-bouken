# B5 metal armor V4 — neck gorget + hip relief (review-only)

Status: **NOT_APPROVED**, no game integration, no merge. Stacked on PR #721 (V3). Source six GLBs and separate sentinel V14 untouched. V3 successful render run: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/45039247167

## Measured reference from Blender 5.3 V3 job

- Helmet lower AABB: Z=1.52200 m, upper torso (backplate) Z=1.45319 m. Z separation 0.06881 m; this is an AABB measurement **not** proof of local clearance/contact.
- Gorget trial Z 1.432–1.535 m, elliptical neck opening X radius 91→78 mm and Y radius 87→76 mm; thickness 1.5 mm. Collar includes a discreet chest-front point.
- Both V3 hip side-cheek plates are preserved. Four low-relief forged lamellar strips add depth to otherwise flat sides.
- Materials use the existing aged dark steel; no bright chrome. Render front/side/back/oblique/top and comparative sentinel views. Verify no visor obstruction, intersection, or floating edge from real PNGs before additional shoulder/arm construction.

## Boundaries

- This is a test of 5 added mesh objects, not completion of shoulders/arms/knees/feet/weapons.
- Original GLB SHA256 gates retained; sentinel V14 remains a distinct **reference-only** object and is not included in exported metal-armor GLB.
- Visual QA, collision inspection, ClamAV and actual run status remain unverified until workflow completes. Never auto-promote.
