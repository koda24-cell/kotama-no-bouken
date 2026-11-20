# Floor 3 Rubble V24 — watertight fractured-section topology

Status: NOT_APPROVED; require actual five-view artistic QA.

V1–V23 generators preserved. V22 Boolean failed (empty mesh), so V24 builds one complete manifold shell, not a Boolean over an invalid inherited mesh.

## Measured structural construction
- 450mm × 310mm nominal plan, surviving former 120mm slab. Source footprint derived from V23's former cast slab but missing front-right wedge: right-front transition p=(98,-102),(109,-70),(141,-30),(176,+5),(221,+38) mm.
- Polygon outline 25 original stations plus 8 uneven corner midpoints (33 stations).
- Four outer rings at nominal z -61,-34,+9,+48mm, each with small spatial noise.
- Three distinct *inner fracture* rings: inside upper at scale 0.63 ± 0.09, lower inner **same XY positions** approximately 23–31mm recessed, and central floor at scale 0.33 ± 0.09.
- Duplicated XY seam with unequal Z forms an actual vertical fracture wall instead of V21's smooth heightfield transition. Interior center +18mm.
- Top surface geometry is deliberately angular, with a prominent broken shell/ledge, rather than an entirely flat slab.
- A single manifold mesh (each source edge shared by exactly 2 faces), two material primitive groups, retained embedded PBR colors and normal roughness. No detached pebble meshes or artificial Boolean.
- Existing Blender 5.3 pinned Docker run; GLB, Blend, 4 PBR maps, 5 840px PNGs, SHA manifest.
- Evaluate front/side/angle/top/fracture-detail for realistic demolished concrete vs ring-shaped basin or obvious tessellation.

No game integration and no branch merge until visual approval.
