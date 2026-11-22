# B5 Knight Full Torso Assembly V2 — non-destructive seam underlays
Date: 2026-11-22. Status: NOT_APPROVED.

## Source
V1 [PR #687](https://github.com/koda24-cell/kotama-no-bouken/pull/687) [run #44686999964](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44686999964): five GLBs assembled and six actual PNGs.

V2 reimports the **same five source GLBs** directly from their successful Actions artifacts (breastplate V6, backplate V2, fauld V2, culet V1, tassets V1) without deleting, merging or modifying their meshes. Original SHA256 validated by script. Fourteen **new, independently editable** components are a preliminary fit test, not a finished knight.

## Dimensions / proposed improvement
- Front curved underlap z 0.850–0.907 m, rear z 0.845–0.907 m. Half-width 0.163 m, 1.2 mm metal thickness, 0.6mm beveled edge.
- Four flanking keeper plates at x ±0.169m, y ±0.079m, each 10×2.4×35 mm; eight small 2.4 mm pin heads.
- Gray-black aged roughened joint material to keep fittings visually subordinate to pre-existing textured PBR steel.
- Check at six angles for unwanted floating, exposed spikes, unnecessary bulk, clipping, and z-fighting; source GLBs are never touched.

## QA requirements
Blender 5.3 pinned Docker, existing five original Artifacts, ClamAV scan before importing, actual six Cycles PNGs, GLB/Blend, hashes and input source identity. Publish ONLY review PNG to `render-preview/run-*`, leave GLB NOT_APPROVED in temporary artifact. Verify real run, then compare front/side/back of V1 vs V2 and iterate.
