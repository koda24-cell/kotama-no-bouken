# B2 wooden hub V02–V05: user feedback, real Blender iteration and QA

2026-11-19 JST. **NOT_APPROVED**. No permanent asset promotion, game integration or merge.

## User feedback
User noted the effect of 5 tiny chips in V02 was visually **much too weak**. The real V02 front/side/angle/back inspection confirmed: regular smooth annular face, barely visible spots. Design-first response was to move from tiny scratches to actual removed wood volumes while preserving existing models.

## Actual run evidence
| Candidate | Real GitHub Actions run | Verification | Visual result |
|---|---|---|---|
| V02 | [44443721959](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44443721959) | success, artifact 14492157006 | Five tiny chips: insufficient impact |
| V03 | [44444643131](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44444643131) | success, artifact 14491874710 | Round hole-looking chips and inconsistent face detail: reject aesthetic |
| V04 | [44445350990](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44445350990) | success, artifact 14493500445 | Sawtooth/straight triangular notches; front less changed: reject aesthetic |
| V05 | [44445940324](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44445940324) | success, artifact 14492943413 | Corrected cutter winding; both exposed faces now show actual removed wood. Visible but still very geometric dark cut shapes, requiring refinement |

All Actions had successful Blender, four rendered Cycles PNG, GLB, Blend, SHA manifest and temporary Artifacts. V05 ZIP was **downloaded** and six manifest file SHA256/size values independently verified. V05 GLB one mesh and four embedded images independently checked. Original V02 checkpoint SHA256 `8e6f827c5fb4dfe8ffe47c33e545a7ff982acc4d01cdb5e82e782c3f402de4d1` kept as immutable source.

## V05 design details
- Real geometric difference using irregular polygonal cutters; six broad angular endcorners + six longitudinal end-face cracks.
- Explicit closed cutter volume/winding normalization using bmesh signed volume fixes failure on one side.
- Unmodified original center bore radius 0.303m, nominal 14 spoke mortise locations, wood PBR from V11 preserved *at design level*. Actual dimensional collision/probe test not complete.
- This was sculpted from V02 itself so V03/V04 unsuccessful damage was not carried forward.

## Art direction remaining
- V05 establishes more readable silhouette but the splits remain sharply triangular and evenly lit, looking like engineered saw cuts rather than weathered split timber.
- Next correction should vary fracture depth and direction, add sidewall breakup and exposed rough fibers at the torn edge, fade dark gaps, and verify hub-to-spoke fit before acceptance. Do not lose the 14 load-bearing sockets or enlarge bore.
- Avoid claiming final-quality pass from geometry-only manifest and file integrity checks.
