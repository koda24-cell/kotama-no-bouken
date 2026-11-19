# B5 Gothic backplate V1 — independent knight rear torso armour (2026-11-19)

Status: **NOT_APPROVED**, no game integration, branch `feature/gpt-b5-knight-statues-v1-20261116`.

## Accepted design direction and next piece
- Sallet V22 and breastplate V6 previously accepted as artistic direction; user also accepted fauld V2 with 「おk、次」. This is *not* an instruction to merge into `development` or `main`, nor a completed official asset promotion.
- Next unmade individual part is **backplate**, not a full armor suit. Back culet / tassets / strap fasteners / pauldrons remain distinct future tasks.
- Reference: [Met Museum, 15th-century backplate (22881)](https://www.metmuseum.org/art/collection/search/22881) and [Elements of an Armor (22906)](https://www.metmuseum.org/art/collection/search/22906), which explicitly describes late Gothic breastplate and backplate overlapping plates.
- Existing Pinterest handoff: `koda24-cell/pinterest-reference-library/handoff/b5-decayed-knight-statues-20261116.md`, candidates not represented as reviewed source images. Further specific reference: https://www.pinterest.com/pin/late-15th-c-backplate-leeds--161566705367010567/ , found in public image research, **not saved** and museum attribution in pin remains unverified.

## V1 engineering and geometry
- Generator: `tools/b5-knights/build_gothic_backplate_v1.py`.
- 10-stage back profile, base Z .872m width ±.172m matching the **lower chest V6** z .875 / half-width .172m. Upper shoulder Z1.455m width ±.191m; side max width .231m.
- Rearward Y convexity .077m plus broad shoulderblade volumes. Pressed spine and double broad folded planes are in the main mesh; avoid floating tube relief.
- Anatomical neck dip and shoulder/side cuts use *physical z* to avoid the breastplate V3 spike regression.
- Actual thin metal thickness from SOLIDIFY plus narrow rolled waist and collar edges, minimal paired fastening dimple markers. The front of the backplate remains open to mate separately to V6 breastplate.
- Use same **ImageGen-generated sallet V22 rust/patina source and formula**, verified source SHA256 `7287744136ebb3c4e43854306131fd215bdc396fd9aaa57ae7c32099190d8a23`. GLB embeds color and roughness via actual image maps.
- Correct outward normal direction (toward +Y) on rear plate; height-based UV, no repeated source patches across long Z extent.

## QA
- GitHub Actions `.github/workflows/b5-gothic-backplate-v1.yml` run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44517120521 .
- 6 actual 800px Cycles PNG (front, left, right, angle, back, top), GLB + Blend, two PBR PNGs, manifest 10 SHA256 entries, ClamAV on source and output.
- Verify back silhouette and shoulder notch; side curve enough to be a rigid forged plate rather than a strip; no floating trim or mesh spikes. Check waist edges against breastplate in later assembly.
- Real GLB and screenshot verification mandatory before saying complete. Technical pass is not art approval. Old models preserved.

## Actual V1–V2 execution and visual QA
- V1 run [44517120521](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44517120521): Blender generated GLB/Blend/six PNG and 10 manifest checksums, but workflow marked FAILURE because PBR output filenames retained `_v2` from source generator while workflow expected `_v1`. Fixed source output naming, retaining original V1 mesh.
- V1 corrected run [44517590092](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44517590092): SUCCESS. Downloaded artifact `14526570814`; real six directions, GLB and Blend present; **10/10 SHA-256 matches** locally. ClamAV gates success.
- V1 visual issue: back and front have too much continuous smooth metal slab; shallow low-level panel relief does not show Gothic armor language distinctly.
- V2 independent generator `tools/b5-knights/build_gothic_backplate_v2.py` kept all previous geometry and adds six curved tapered / radiating forged flutes directly as local mesh deformation across back plate. No extra cylindrical rods.
- V2 run [44518192273](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44518192273): **SUCCESS**, artifact `14526467690` `b5-gothic-backplate-v2-NOT-APPROVED`.
- Independently extracted artifact and matched **10/10 SHA-256** against actual GLB/Blend/6 PNG/2 maps. GLB **651,988 bytes**, Blend **1,966,828 bytes**. ClamAV output 12 scanned, zero infected.
- Visual comparison: V2 exhibits clearer diagonal Gothic pressed-plate folds on left/right back and an articulated shoulder blade feeling. The V1 convex shell/curved waist remains; V22 aging image and PBR remain. Side views still appear to be a single sheet—not a completed torso assembly, which is the intended modular design.
- Remaining art gap: two visible broad folds could be refined toward actual museum backplate fan structure; chest V6 / fauld V2 joint assembly is not yet rendered. Upper corner can look needle-like in oblique view and needs future spot assessment.
- **NOT_APPROVED**, no official asset promotion or game integration, old V1 retained.
