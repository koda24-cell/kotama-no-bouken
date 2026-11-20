# Floor 3 Concrete Rubble 01 V17 — fallen-wall broken top
Status: NOT_APPROVED; render and artistic approval pending.

## Reason for structural change
V14–V16 reproduce a broken-sided concrete **slab** but leave nearly the entire upper surface flat. V17 keeps the original roughly 450 × 310 × 120 mm concrete fragment and intact surviving rear-left patch, but deforms the former top into a physically broken falling-wall fragment.

## Dimensions and construction
- Original plan: 450 × 310 mm. Nominal former thickness: 120 mm.
- Upper surface: 4 radial rings × 54 perimeter stations (216 top vertices) and off-center impact region. Original top perimeter and side core remain; no deletion of earlier versions.
- Primary offset impact depression centered (x=+60 mm, y=-25 mm), Gaussian radii 110 × 92 mm; maximum 34 mm depression.
- Secondary missing cap region at (-122,+90) mm; up to 21 mm recession.
- Nonstraight fork fracture trench y=-20mm + 0.17(x+30mm) + 9mm sine warp; about 12mm locally deep.
- Uneven broken right-front rim: up to 13mm additional collapse.
- Surface grain geometry 4.5mm broad noise + 2.8mm micro-noise. Rest of subtle roughness remains in existing PBR normal.
- Surviving finish: only some rear-left/off-impact patches; exposed texture on torn upper edge and selected top facets.
- No separate white pebble geometry; aggregate stays inside exposed face PBR.
- Four inherited views plus fifth orthographic elevated `top` view, all Cycles 840px and GLB/Blend/sha-manifest required.

## QA
Check actual geometry against former envelope, GLB 1 mesh/2 primitives, top silhouette and side crack coherence in five real PNG views; compare V16 on top, angle and fracture closeup before approving. Preserve production assets, Draft PR #642, no merge.
