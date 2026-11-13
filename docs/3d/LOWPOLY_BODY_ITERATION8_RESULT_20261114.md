# Iteration 8 verified result — 2026-11-14

Run: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43455475228

## Results from downloaded artifact and rendered images
- Eevee workflow: SUCCESS.
- QuadriFlow: CANCELLED on dense voxel mesh (11,556 vertices / 11,554 faces). Root cause still undetermined.
- Conservative triangle-to-quad fallback: 652 vertices, 986 polygons, 314 quads (~31.8% of faces); previous iteration 652 vertices, 1,251 faces, 49 quads.
- Mesh edge nonmanifold count: 0.
- Traced silhouette proxy MAE: front 16.64px (previous 16.67); side 11.78px (previous 11.57). Slight front improvement, side regression; comparison rows include arm/leg ambiguity.
- Visual inspection of three-quarter Eevee: squared shoulder tops, overly thin neck, abrupt groin/upper thigh edge, simplified feet and hands. No meaningful anatomical silhouette improvement.

## Next actions
1. Stop assuming triangle pairing is anatomical retopology. Quad ratio remains only ~32%.
2. Replace shoulder/groin joint geometry with explicit quad-ring bridges or dedicated quad topology, not another global scale/relax pass.
3. Segment reference silhouette by head/torso/arms/pelvis/legs before optimizing numerical error. Current global outer envelope confuses hands and legs.
4. Render front, both sides, three-quarter and inspect before promotion.
5. Draft PR #314 only; no development merge or asset promotion until approved.
