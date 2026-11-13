# Low-poly body iteration 7: quad topology experiment

Reference: Pinterest pin 878835314813441339 (aligned front and side). Draft PR #314, base development.

## Baseline
Iteration 6 Action 43450856691: Eevee success; proxy mean absolute edge error front 16.67 px, side 11.57 px; nonmanifold edges 0. Existing unified mesh remains heavily triangulated (voxel remesh + decimation). Shoulder and groin surfaces are angular.

## Change
After voxel-union and decimation, attempt Blender QuadriFlow retopology with 1100 target faces and X symmetry. Record resulting vertices, faces, quad count and fallback reason in iteration7_retopology.txt. Existing geometry preserved as fallback if operator throws. Re-run four Eevee solid views and Pinterest overlays; this is a test, not yet approved.

## Risks / next verification
QuadriFlow can be slow or fail in headless Blender. It may smooth away anatomical features and alter the silhouette. Confirm artifact and visually inspect front/side/three-quarter, verify quad ratio, compare landmark errors against iteration 6. Do not promote or merge without quality approval. The reference outer contour includes overlapping arm/leg regions, so proxy metrics are not ground truth.
