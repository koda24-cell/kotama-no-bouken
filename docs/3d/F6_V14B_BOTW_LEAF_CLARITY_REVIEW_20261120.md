# F6 V14b: BotW参考・葉の輪郭を分離する復元試作 (2026-11-20)

Status: **NOT_APPROVED**. Original lost V08 is not recovered. Candidate is derived from V13 (V27 trunk + V31 substitute texture).

## Reference analysis
- Zelda Breath of the Wild forest screenshot: https://cdn-ak.f.st-hatena.com/images/fotolife/s/sittokuchance/20240624/20240624182429.png (gameplay screenshot, reference only, no texture reuse).
- Helder Pinto-inspired foliage shading community explanation: https://polycount.com/discussion/209623/smooth-foliage-like-in-breath-of-the-wild-europa-by-helder-pinto-mini-tutorial (NOT Nintendo internal implementation).
- Game tree card texture guidance: https://polycount.com/discussion/98091/best-practices-for-creating-3d-trees-for-games (empty alpha regions for readable silhouettes).
- Art direction context: https://nintendoeverything.com/art-director-on-why-zeldas-art-style-constantly-changes-and-how-breath-of-the-wilds-look-was-made/ .
- Pinterest task handoff: https://github.com/koda24-cell/pinterest-reference-library/blob/main/handoff/f6-tree-mature-20261117.md . Pinterest pin image re-check and saving were NOT performed in this specific iteration.

## Real GLB workflow and corrective iteration
- Input V13 SHA256: `73d9ffce2fd273bacb9465c1a41145dfce8a054888236dcb2a09d72bab2ead7d`.
- V14a attempt: kept 422 original cards + added 185 individual geometry leaves; actual VTK EGL render showed spiky leaves floating off the canopy, rejected.
- **V14b**: preserve 227 trunk/branch mesh nodes (13 main branches), retain **422/687** original alpha cards with sector-based outline preservation; add **56 cupped individual leaves**, only near surviving cards, with upward-tilted orientation and restricted reach. No image-generative 'render'. Source wood untouched.
- Candidate SHA256: `3b9609492e1c874d1f0d3217c15acabcc2e36a8923df8803c958f23dd31ed2a6`. Candidate 264 scene nodes; preserve original tree silhouette bounds within 0.05m in each axis.
- Four real VTK 9.6.2 EGL renders for **front/side/angle/tips_close** and same-camera V13 vs V14b images generated. Save bundle `f6_tree_v14b_zelda_leaf_clarity_NOT_APPROVED.zip` (GLB, PNG/JPG, Python, SHA manifest) as chat artifact.
- **Visual outcome**: some canopy gaps are legible; depth/leaf-by-leaf segmentation remains too weak, and surviving exterior tufts appear detached. **Art quality not accepted.** V14a's stray spiky sprouts rejected. Blender 5.3 and Three.js verification were not executed.
- Next: re-author 6 original painted PNG alpha clump silhouettes as 3-5 leaf sprays with distinct non-overlapping lobes, reduce transparent-layer overdraw and test shading normals and alpha-mip at game distance. Preserve originals and repeat VTK/Blender 5.3/Three.js QA. Do not promote into game.
