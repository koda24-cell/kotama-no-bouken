# Original Assassin head V2/V3 — actual face-context Blender review (2026-11-19)

## What the user requested
A posterior-only piece cannot be judged without front face proportion. V2/V3 include **independently generated new front/face, jaw, temporary ears and neck** and seven genuine Blender views; **no Shibu Face or Body data is imported or copied**. The final face is not yet modeled.

## V2 real run
- Run [44460076972](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44460076972) success; artifact 14499213219. Seven 720x720 PNGs, new GLB, Blend, manifest and QA; ZIP CRC passed. Main head: 3281 vertices, 3200 quads + 80 cap triangles, open lower ring 80 edges, no edges with >2 incident polygons.
- **Artistic reject:** pinched chin, abruptly flat-looking side/top cap, detached-looking eyes and ear placeholders, neck appears to terminate separately. Back/nape taper too abrupt. Front and 3/4 prove side-back proportions cannot be judged in isolation.

## V3 real run
- Run [44460807596](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44460807596) success; artifact 14500630571. Same seven angles and geometry/QA structure; ZIP CRC passed.
- Rebuilt skull cross-section with 10 explicit profile control layers and smoother crown reduction. More rounded crown/less extreme point chin in some views, but **strong horizontal ripples/banding around jaw and head** due to independently eased `smoothstep` between each control layer producing zero derivatives at every knot, further exacerbated by clay specular shading. These are geometric slope discontinuity effects, not just texture. **V3 visually fails.**
- Critical next technique: use **monotone cubic Hermite / Catmull-Rom (continuity controlled), or B-spline sampled profile** with continuous first derivatives across landmarks, not piecewise smoothstep. Check derivative sign/curvature, no oscillation, and evaluate 7 real PNGs. Existing V1–V3 remain unapproved.

## Overall constraints
- The original head/face/ears/neck are blockout experiments only, not game-ready, not rigged, and face proportions/expressions require iterative sculpting.
- Shibu remains measurement/reference only. Do not copy source vertices/faces or integrate a VRM sample as original character.
- No changes to game runtime, `development` or `main` 3D assets; user approval required.
