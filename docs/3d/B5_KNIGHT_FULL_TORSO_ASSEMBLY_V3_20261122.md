# B5 knight V3 continuous side junction geometry

Status NOT_APPROVED. Existing five original GLB files and V2 seam work are preserved (source SHA-256 checked).

- L/R side hip cheek: actual curved surface, not tube, z 0.817–0.953 m, outside x around ±0.172–0.197 m, y half span up to 0.146 m.
- 4 subtle pins, diameter 6mm, at y ±0.104 m.
- 6 independent added objects; V2 14 retained, making total 20. All can be removed without modifying earlier GLB geometry.
- Objective: make lateral breastplate/waistline silhouette appear more continuous rather than visually hidden underlapping seam.
- Real multi-angle Blender 5.3 + ClamAV + PNG-only preview workflow. This is a review-only candidate, not a quality approval.

## Actual execution and images (2026-11-22)
- [Actions run #44966687374](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44966687374): Blender 5.3 actual render successful, input/output ClamAV successful, six-view checksum/image QA successful, PNG-only publisher successful.
- Verified exact `render-preview/run-44966687374-1` Git branch listing with six PNG (front, back, left, right, angle, top) and review-manifest.json, no GLB or Blend committed.
- [V3 front](https://raw.githubusercontent.com/koda24-cell/kotama-no-bouken/render-preview/run-44966687374-1/front.png), [V3 angle](https://raw.githubusercontent.com/koda24-cell/kotama-no-bouken/render-preview/run-44966687374-1/angle.png), [V3 left side](https://raw.githubusercontent.com/koda24-cell/kotama-no-bouken/render-preview/run-44966687374-1/left.png), [V3 back](https://raw.githubusercontent.com/koda24-cell/kotama-no-bouken/render-preview/run-44966687374-1/back.png).
- Compare V2 [front](https://raw.githubusercontent.com/koda24-cell/kotama-no-bouken/render-preview/run-44965554605-1/front.png) and [angle](https://raw.githubusercontent.com/koda24-cell/kotama-no-bouken/render-preview/run-44965554605-1/angle.png).
- **Technical success does not equal artistic approval**: details may still need geometry-level adjustment after visual comparison. No merge or game integration.
