# B5 Knight full torso assembly V1 — actual five GLBs

Status: **NOT_APPROVED**, no game integration or merge. 2026-11-20.

## Source assets
- Breastplate V6: Actions #44513263807
- Backplate V2: Actions #44518192273
- Fauld V2: Actions #44515259679
- Culet V1: Actions #44681535827
- Tassets V1: Actions #44682515055

The new script imports the five generated GLBs in their original world coordinates, preserving every original source object. The manifest includes exact SHA-256 of each imported GLB, per-component bounds, coarse vertical fit tests and six PNG hashes. The review is not a substitute for visual collision inspection.

## Actual verification
- [Actions #44686999964](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44686999964): Blender 5.3 render job **success**, input/output ClamAV **success**, SHA and six-camera 800px PNG QA **success**, artifact checkpoint success, PNG-only preview publisher **success**.
- Verified preview branch `render-preview/run-44686999964-1` contains six individual images (front, left, right, angle, back, top) and review-manifest.json; no mesh binaries.
- [Front PNG](https://raw.githubusercontent.com/koda24-cell/kotama-no-bouken/render-preview/run-44686999964-1/front.png), [angle](https://raw.githubusercontent.com/koda24-cell/kotama-no-bouken/render-preview/run-44686999964-1/angle.png), [back](https://raw.githubusercontent.com/koda24-cell/kotama-no-bouken/render-preview/run-44686999964-1/back.png).
- **Not yet artist-approved**. Confirm by actual image comparison: chest to front fauld, back to culet, thighs, side gaps, material mismatch. Do not falsely claim mesh collision-free from rough AABB tests.
