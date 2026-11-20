# Floor 3 Concrete Rubble V19 — broken-edge contour repair
Status: NOT_APPROVED, pending actual Blender 5.3 five-view quality review.

V18 Run 44673279020 finished Blender+file validation successfully. Actual V17/V18 five-view montage showed sawtooth vertical fences at terrace boundaries because V18 applied discontinuous piecewise height after mesh subdivision and mixed top fracture/cast material facets.

V19 retains the damaged slab envelope, side, embedded PBR grains and two material primitives. It changes ONLY the upper rupture function and upper face material assignment:
- Smoothstep transition lips, nominal widths 12–20mm instead of hard zero-width jumps.
- Front terrace recessed 22mm; middle 13mm; right front corner 31mm; rear partial shelf 18mm.
- Upper fracture panel transitions retain irregular directional lines but do not produce vertical extruded slats.
- No thin black groove or alternating upper materials; top stays unified concrete cast material and fractured side still uses interior PBR.
- Original V1–V18 source files untouched. Output GLB/Blend/5 PNG/4 texture PNG/SHA manifest with run ID, NOT_APPROVED.

Acceptance: verify front/side/angle/top/detail physically on actual GLB render and ensure fence artifacts vanish. This candidate cannot automatically be considered approved.
