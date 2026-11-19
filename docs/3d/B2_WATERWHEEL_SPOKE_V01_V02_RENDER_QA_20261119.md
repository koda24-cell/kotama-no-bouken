# B2 Waterwheel single spoke V01→V02 — actual Blender QA (2026-11-19 JST)

## Evidence and verified status

- Design: `docs/3d/B2_WATERWHEEL_SINGLE_SPOKE_V01.md`. Fits conceptual wheel axle X, R=2.55m and 14-spoke arrangement. This does **not** assert actual fitted assembly with V11 rim GLB and hub.
- Blender V01 run: [44439116144](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44439116144), artifact `14490391254`. Blender/Cycles 4-view render succeeded. Workflow failed **only because compressed Blender .blend ZSTD magic was rejected** by a simplistic noncompressed header assertion. The downloaded ZIP contained GLB, Blend, 4 PNG and manifest; all six byte lengths and SHA-256 hashes matched.
- Blender V02 run: [44439763572](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44439763572), artifact **14491355757** `b2-waterwheel-single-spoke-v02`, final job **success**.
- V02 restored existing rim V11 source Blend from run [44436858908](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44436858908); original SHA256 `addae90dd199b9f6d0417c70f5152a32bd504e83e2deffa8e0965a0fdf5e2c67` verified. No modification to original.
- The V02 source imported the already packed photo-based material `Cold wet aged oak - actual CC0 photo if retrieved` and endgrain from the V11 Blend. Source credited to Poly Haven [Fine Grained Wood](https://polyhaven.com/a/fine_grained_wood), CC0 as documented in prior rim pipeline. V02 new external network download **not performed**.
- Local ZIP examination after successful Action: GLB **1,432,888 bytes**, editable BLEND **994,528 bytes**; GLB **3 meshes**, 3 materials, **4 embedded images**. Four PNGs present. Actual GPU draw calls / FPS not measured.
- Actual 4-view visual inspection: oak grain is more convincing than V01 flat grey material. Silhouette is too regular and uniformly straight; root is blunt, shoulder not prominent, lateral split and recessed joinery are difficult to read. **Aesthetic approval not granted**.
- The V02 pipeline accepts valid Zstandard-compressed Blender files; run success includes file-by-file byte length and SHA-256 validation.
- All files are **NOT_APPROVED**, ephemeral Actions artifacts (14-day retention), no game integration, no asset promotion, no development/main merge.

## Remaining aesthetic and structural work

1. Verify actual X-offset/radial fit into V11 double rim: original game uses two rims at X=±0.42, center hub/cylinder radius≈0.3. The standalone spoke model is positioned at X=0 in its review GLB and must be translated for fitting. Do not claim tested assembly.
2. Shape a true root mortise and more readable transition/shoulder, without carving the approved V11 rim.
3. Introduce controlled surface irregularity following grain (not scratch-line ribbons floating off timber), retain current timber thickness and load-bearing geometry.
4. Use multi-view fitting preview with rim/hub *before* duplicating 14 spokes.
5. Run shared GLB performance audit and user visual acceptance before permanent save.

## Source links

- [PR #524](https://github.com/koda24-cell/kotama-no-bouken/pull/524)
- `tools/b2-waterwheel-spoke/build_single_spoke_v02.py`
- `.github/workflows/b2-waterwheel-single-spoke-v02.yml`
