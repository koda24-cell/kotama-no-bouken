# Assassin V18 — Ear / posterior scalp technical blog research (2026-11-19)

**Status: SOURCES READ / TECHNIQUES TRIAGED / NO MODEL CHANGES.** The source `Sendagaya_Shibu.vrm` original `Body` skull/neck must be preserved. This supersedes earlier attempts to fabricate a whole scalp from `Face` perimeter. Commercial redistribution of Shibu is **not yet verified**, so this is research-only. Never refer to standalone obsolete Assassin prototypes as shape references.

## Existing evidence to constrain the research

- Real Blender native source: run [44446328687](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44446328687). The `Body` mesh already includes rounded occiput and nape.
- BVH Face-to-Body surface audit: run [44447509958](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44447509958). 34/36 source Face rim points are within 1mm of Body triangles; source Face point IDs **2071 and 1506**, at rim orders **8 and 32**, each about **8.22mm** away.
- Original bilateral source seam closeups: run [44448802780](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44448802780) and Draft [PR #541](https://github.com/koda24-cell/kotama-no-bouken/pull/541). At last verified source closeups, a dark hard edge appears under/behind each ear, **not yet proven to be a hole or bad normals**.
- Old V18 A–F have been visually rejected. Do not use their procedural geometry for V18 continuation.

## Highest-priority technical blogs & implementation takeaways

| Priority | Source and evidence | Concrete technique | Applied to Shibu V18 | Status |
| --- | --- | --- | --- | --- |
| P0 | [Blender Secrets — Anime Character Modeling, Lessons 19–22](https://blender-secrets-school.teachable.com/p/anime-character-modeling-in-blender) | Block out the whole skull *before* fine topology. Lesson 21 explicitly says borrow actual geometry from the blockout to construct the back of the head and attach the ear; Lesson 22 addresses shrinkwrap and refining neck/head geometry. | The unmodified Shibu `Body` is **already the correct blockout/final native posterior shape**: do not replace it. Consider bridge topology only after local seam analysis. | Description verified. Paid course lesson playback **not accessed**. |
| P0 | [Melvina Sakura — VRM head transplantation](https://note.com/melvina/n/n9540605adf51) | Explains Face/Body object alignment, how gaps occur at the throat and during Head/Neck motion, correct `Body` only as needed, and review **skin weights** on Face+Body; if weights do not suffice, edit local mesh. | After static ear tests, check neutral vs head-turn/tilt animation at joints, compare Face/Body Head/Neck vertex-group weights and shape keys. Never global merge-by-distance. | Article text read (sections 3.5 and 3.8). |
| P0 | [みずぴょん — Blender VRM facial normals via Data Transfer](https://note.com/mizupyon/n/nc9a36d368b78) | Uses a reference sphere and Data Transfer of custom normals to reduce anime face dented lighting after MToon→Principled changes. | Diagnostic **only**: compare native vs smooth-shaded normal transfer on a copy when triangles align and the gap is proven a lighting discontinuity. Never treat normals as a fix for an actual 8.22mm separation. | Article description verified; source notes that Mask modifier can invalidate method. Blender 5 API to be tested. |
| P1 | [Blender 5.x Manual — Mesh Normals](https://docs.blender.org/manual/en/latest/modeling/meshes/editing/mesh/normals.html), [Data Transfer](https://docs.blender.org/manual/en/5.3/modeling/modifiers/modify/data_transfer.html) | Explains split/corner normals, smooth/Sharp edges and transferring normals/UV/vertex groups between meshes. | Measure Face corner normals and Body nearest-triangle normals at orders 7–9/31–33 before changing anything. Test local copied normal transfer **only if** real geometry is aligned and there is a shading-only seam. | Official manual descriptions checked; **no real V18 data-transfer render yet**. |
| P1 | [Blender Studio — Stylized Head Retopo](https://studio.blender.org/training/stylized-character-workflow/8-retopo-head/), [Timelapse Head Retopology](https://studio.blender.org/training/stylized-character-workflow/5e70a510db0e8bc0c8b226e2/) | Route quad loops naturally toward the rear scalp and neck and around the ear; avoid a fan of triangles from face to a single posterior pole. | Evaluate actual Shibu Body topology and ear bridge, only redesign the two problematic local transitions if needed; no whole-head retopology. | Public course summaries checked; lesson content may require subscription and was **not fully viewed**. |
| P1 | [Blender Artists — Help with stylized faces](https://blenderartists.org/t/help-with-stylized-faces/1462034), [CG Cookie — Strange ear loops](https://cgcookie.com/community/8362-strange-loops-after-finishing-ear-retopology) | Public side/head wireframes show ear perimeter loops and crown/cheek/neck connections. | Use as visual error-detection references when viewing source ear seam wireframe, not as topology template to copy directly. | Public images/metadata retrieved; examples differ from Shibu's specific topology. |
| P1 | [Blender Studio — Realistic Base Meshes](https://studio.blender.org/training/realistic-human-research/use-of-base-meshes/) | Public page advertises `realistic_human_base.blend` with CC-BY. Start from/retain strong existing basemesh geometry. | Source shape reuse is preferable to repeatedly creating artificial rear caps. Reference only: do **not** replace the anime head with realistic base mesh. | Listing checked; file not downloaded or scanned. |
| P2 | [VRoid Studio and Blender — Melvina Sakura](https://note.com/melvina/n/n3dc83c2f3905), [VRoid head editing](https://note.com/shun_zz/n/ncad975b0cee7) | VRM can contain materials, MToon rendering, blend shapes, bone groups, UV masks. Unrestricted subdivisions and edits may ruin identity and exports. | Source `Body`, `Face`, UV, materials, weights and expressions must be preserved and compared. | Public article content/summary checked, no addon installed. |

## Concrete QA plan (do before any actual deformation)

1. **Ground truth freeze:** source hash, original Face and Body source vertex IDs/coordinates, UVs, material indices, shape keys, vertex groups and armatures; preserve native `Body` silhouette.
2. **Separate 4 possible causes:** (a) true spatial gap/intersection; (b) distinct objects and missing shared connectivity; (c) corner-normal/sharp-smooth edge shading; (d) deform weights and shape-key seam at nonneutral poses. Those cannot be diagnosed from one dark line alone.
3. **Measurements:** compare original Face rim 36 positions to nearest Body triangles and also nearest vertices. At 2071/1506 inspect adjacent rim segments, face corners, ear-area Body triangles; compute world-space face-corner normal and nearest Body normal angle plus seam edge incidence. Render both sides with opposing materials and wireframe overlay.
4. **A/B copied test, only if warranted:** a) same original neutral clay (baseline); b) original normals under alternate lighting; c) copied local normal transfer (shading-only candidate, no vertex edits); d) local bridge/patch only if spatial topology actually reveals hole, preserve source Body/Face and rig. Each variant should be review-only with identical cameras/materials.
5. **Pose tests:** neutral; head yaw/pitch moderate rotations using existing armature; blink and mouth shape keys where available. Verify no new gap when bones move.
6. **Acceptance:** no changed original `Body` posterior silhouette, no changed source facial landmarks/UV/weights, no light/dark hard wedge at the ear, no new intersections, side/back/front closeup evidence, no false claims of manifold unity if Face and Body are separate objects. Keep `NOT_APPROVED`; source-specific rights still unresolved.

## Supplementary model candidates — inspection only, no imports

1. [Blender Studio realistic human base](https://studio.blender.org/training/realistic-human-research/use-of-base-meshes/) — `.blend`, displayed CC-BY, more realistic proportions; topology reference only.
2. [Sketchfab Anime Head — LessaB3D](https://sketchfab.com/3d-models/anime-head-pratice-free-download-3fd6a9ccdcaf444aaf01d55b58ea50d8) — listed free download, specific licence requires direct reconfirmation.
3. [Sketchfab Anime Head Base — MarFab](https://sketchfab.com/3d-models/anime-head-base-mesh-58e291934379438584012d09faefedf6) — free download listing; precise license and mesh quality still unchecked.
4. [Sketchfab Genshin Style Female Base — David Onizaki](https://sketchfab.com/3d-models/genshin-style-anime-female-base-mesh-for-blender-c2d6727e8c9742feb9a4a3bccac6e0e0) — free download listing; check per-model license before any file download.
Do not assume every asset listed as `free download` is licensed for reuse/redistribution or compatible with AI tools. No asset was downloaded, malware-scanned, imported, rendered, or adopted in this research.

## Pinterest search results (not visually endorsed)
Account `soukodama5165` authorized; board `878835383474826139` ("3d アートワーク") has 61 saved pins. Search used `anime head topology ear back neck blender wireframe` and `VRoid anime head side view ear retopology 3d`. Relevant URL candidates:
- https://www.pinterest.com/pin/561613016027005845/ — title "3d Topology Head" (metadata relevance excellent)
- https://www.pinterest.com/pin/765963849173024184/ — ear step topology, links to legacy Photobucket (verify availability)
- https://www.pinterest.com/pin/426997608415794638/ — "Face topology", metadata relevance very-good
- https://www.pinterest.com/pin/803962971020790031/ — CLIP STUDIO head asset reference, not necessarily Blender wireframe
- https://www.pinterest.com/pin/438115869981675994/ — metadata relevant, title absent.
These were **metadata/thumbnail URL searches only**: individual full images and license/source provenance have not been checked and none was saved.

## Ownership / status
Research recorded by GPT, 2026-11-19 JST. Blender implementation, actual geometry improvement, custom-normal experiments, and license/virus safety checks are **not performed in this phase**.
