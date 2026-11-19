# B2 hub V10 and V11 - thickness variation review (2026-11-19)

User feedback: '割れ目の入り方が、太さが一定で雑です' — current fissures resemble mechanically milled uniform-width slots.

## V10 design
- From SHA verified V02 editable Blender source (kept unmodified), design 13-station irregular opening-width profiles with per-crack variation, abrupt narrowed middle portions, secondary widened segments and thin tips.
- Art code: `tools/b2-waterwheel-hub/build_single_hub_v10_texture.py`.
- Real Blender [run 44451756292](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44451756292) **success**, artifact 14495847133. ZIP downloaded, actual four views inspected and SHA256 manifest all 7 files matched. Fracture texture faces 628.
- Finding: even with numeric max/min slit variation above 10x, the widest section is at radius 0.663m outside hub surface (~0.615m), so visual variance remains small. Do not claim the 10x number as displayed width variation.

## V11 corrective test
- Shift cut mouth to radius 0.633m (visible on the edge) and increase entrance width individually for two larger cracks. Preserve all other features and generated fracture PBR image.
- Real Blender [run 44452329534](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44452329534) **success**, artifact 14496426774. ZIP downloaded, seven files SHA256/bytes independently verified, four actual Cycles PNG inspected. Generated PNG, GLB and Blend exported; 647 fracture mesh polygons assigned generated material.
- Visual review comparing V09/V11 front: there is an improved uneven taper and softer cut, but face-on it is still dominated by a few dark irregular slots, not yet convincing deep torn wood. The visible variance in thickness remains less than ideal; insufficient ragged interior walls and physically split fibers.
- Technical pass ≠ user aesthetic acceptance. No actual hub+spoke fit or 14 mortise collision probe (manifest documents nominal 14), game test, optimization benchmark, formal asset promotion or merging.

## Art improvements still needed
- Real grain-aligned surface tearing on the wood endgrain, not only negative-space cuts.
- Several narrow internal hanging splinters with physical thickness and rough material, breaking the monotone black cavities.
- Macro asymmetry and controlled local depth, fewer evenly spaced cuts, preserve center bore and spoke seats. Re-render front, macro close-up and oblique.
- Do not increase fracture count blindly or uniformly enlarge all cracks.

PR #531 remains draft / NOT_APPROVED. Artifacts temporary until 2026-12-03.
