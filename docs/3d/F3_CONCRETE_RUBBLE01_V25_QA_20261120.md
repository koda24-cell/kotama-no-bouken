# Floor 3 concrete rubble V25 — correct V24 bowl and stripe artifacts
Status NOT_APPROVED. Real comparison V23 vs V24: V24 manifold validated and 5-view Cycles rendering succeeded at run 44680779951 / artifact 14604735660, but inner fracture looked like uniform recess of an artificial stone basin and vertically banded external surfaces.

- Preserve V24 physically closed shell, 33 perimeter stations and missing front-right wedge. Still 1 mesh and 2 material primitives.
- Inner broken contour enlarges from 0.63 to 0.72 plan scale (jagged +/-0.09), creating a narrower uneven ledge.
- Cliff wall drops unevenly 8–19mm rather than 23–31mm.
- Inner triangular broken plate lifted near 33–39mm, with 8mm spatial noise to avoid smooth concave bowl.
- Side/base and cast faces use worn concrete albedo; ONLY exposed cliff vertical wall uses interior aggregate texture. Remove earlier broad dark gray stripes caused by material assignment.
- UV selection based on face role (side and vertical fracture mapping) instead of vertex index, which mistakenly wrapped horizontal top surfaces onto circumference.
- One fine subdivision for edges with submillimeter noise on old lower side; avoid spikes by leaving true cliff normals untouched.
- Blender 5.3 real 5-angle render, GLB/Blend, 4 PBR PNGs, SHA-256 manifest and mesh checks required. Aesthetic approval strictly pending.
