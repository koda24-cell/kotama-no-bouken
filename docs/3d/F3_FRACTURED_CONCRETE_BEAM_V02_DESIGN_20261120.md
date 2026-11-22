# 第3層折れたコンクリート梁 V02 — 実レンダリング前の修正仕様
Status: **NOT_APPROVED**.

V01 [run 44688227691](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44688227691) Blender 5.3 success and 5 real PNG review. V01 visually rejected: white box beam, a 12-triangle regular star on fracture cap, almost no old-material dirt. 3 rebar rods have correct placement but too thin/straight and bright.

V02 targets, retaining all original V01 files and measured geometry:
- Real irregular fracture center: introduce an irregular ring with 12 vertices at 66–71% section radius, uneven X offsets up to ~23mm, inner center shifted (x=.482,y=.018,z=-.023). Connect exterior to new ring, fan only inside for physically varied cut.
- Lower concrete base to linear ~0.20–0.24. Two newly authored 256² albedo maps for cast/inner concrete, with mottled grayscale dirt and physically UV mapped to X/Z or Y/Z planes. Bake to PNG, embed in GLB. No external download/license dependency.
- Rebar darker and less metallic: brown rust rather than copper tubes. Preserve three welded-in roots.
- Reduce lighting from 450/270 W to 310/185 W and exposure from -0.10 to -0.42 for neutral material review.
- Blender5.3 5 real render PNGs front/side/angle/top/break_detail; GLB, Blend, 2 albedo PNGs, SHA manifest. Check glTF embedded textures and silhouette.

Still candidate, never merge to development or formal game assets until user's explicit approval.
