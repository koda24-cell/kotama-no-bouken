# Assassin original face rebuild — Pinterest / 3D multiview reference intake (2026-11-20)

## Decision and scope
**USER GOAL: MODEL ENTIRELY FROM SCRATCH.** Existing Shibu/Vita/Sketchfab heads and Pinterest images are **visual / measurement reference only**. Do not import their geometry, reuse vertices, topology indices, UVs, textures, weights, sculpt data, or distribute reference models as our result. If external mesh has been used for measurements, store only the independently authored findings and attribution; license verification is required before downloading/importing external models. Generated GLB/Blend must contain original geometry only.

- Game repository target: development (information-only PR; no gameplay changes)
- Previous iteration: [V17 PR #639](https://github.com/koda24-cell/kotama-no-bouken/pull/639) / [successful render run](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44680419629).
- V17 A/B/C are **failed artistic models**. Do NOT use their spherical ring geometry as anatomy ground truth, and do not repeat Gaussian nose extrusion as main facial structure.
- Reference research: [Pinterest library PR #37](https://github.com/koda24-cell/pinterest-reference-library/pull/37), [face multiview references](https://github.com/koda24-cell/pinterest-reference-library/blob/research/assassin-face-multiview-20261120/references/assassin-face-multiview-3d-20261120.md), and [handoff](https://github.com/koda24-cell/pinterest-reference-library/blob/research/assassin-face-multiview-20261120/handoff/assassin-face-multiview-3d-20261120.md).
- Original game model's appearance and exact design must be separately measured/approved as a style target.

## 3D references — study only
1. [Genshin-style anime female base mesh](https://sketchfab.com/3d-models/genshin-style-anime-female-base-mesh-for-blender-c2d6727e8c9742feb9a4a3bccac6e0e0): front profile/eye-to-cheek transition candidate.
2. [Anime head base mesh](https://sketchfab.com/3d-models/anime-head-base-mesh-58e291934379438584012d09faefedf6): profile, ear root and cranium.
3. [Anime head practice](https://sketchfab.com/3d-models/anime-head-pratice-free-download-3fd6a9ccdcaf444aaf01d55b58ea50d8): brow, nose, chin, neck transitions.
4. [Pinterest anime head wireframe](https://www.pinterest.com/pin/1089519334868982509/): eye-loop candidate.
5. [Pinterest face topology](https://www.pinterest.com/pin/426997608415794638/): nostril/cheek/mouth edge-loop candidate.

**Evidence boundary:** Pinterest recommendations and Sketchfab pages identified; full-resolution pin inspection, individual model licensing, downloaded geometry and direct multiview measurement are NOT verified. Treat the reference list as a research queue, not measured examples. Never label approximate values below as measured from third-party meshes.

## Original-face modeling architecture (independent Blender geometry)
1. Sketch **original** 2D front and side outlines first: hairless skull oval, temples, cheekbone arc, mandibular angle, chin, nape; decide where the facial plane turns into lateral skull. Do not build using one elliptical cylinder covering every facial feature.
2. Place original semantic control curves / landmarks in neutral units with local head height H=1. Normalized prototype *design targets only*, subject to visual review: jaw-tip y=0.10H, mouth=0.24H, nose base=0.37H, eye line=0.54H, brow=0.62H, crown=0.96H. Do not claim these are universal anatomy proportions.
3. Build a connected front facial quad surface using manually authored front-plane cross-sections and radial loops around original eyes and mouth. Add cheek and nasolabial planes. Mesh continuity to temporal/back-of-head is a geometric requirement, not a material trick.
4. Build the nose as **original bridge planes → lateral wall → bulb/tip → alar wings → columella**, with mirrored quad connectivity. Nose extrusion must be visible in the **unlit side silhouette** (not just as a black shadow on the front). Avoid disconnected overlapping shells and fake black nostril spheres.
5. Ear: independent authored outer helix, antihelix, concha, tragus and lobule, connected naturally at the skull root, tested from front/back/side. Do not copy any source ear vertices.
6. Eyes: rim loops + recessed eyeball and actual upper/lower lids, with neither floating thin rectangles nor exaggerated circular orbital rims.
7. Neck: smooth nape-to-neck and jaw-to-throat; prefer conservative original posterior preservation only as an interim constraint, not an anatomy source.

## Mandatory images and acceptance
Render in pinned Blender 5.3 / ClamAV environment to transparent PNG and GLB/Blend: front, 45° front oblique, true left/right profile, back, back oblique, 45° up/down, plus neutral **unlit clay**/normal-debug side and front views. Use matched orthographic camera and fixed scale for baseline and variant. Record source commit, manifest SHA256, reference URLs, copyright status and NOT_APPROVED.

**Non-negotiable reject conditions:** nose appears as relief on a flat oval, sharp dark pit under nose, horizontal bands across face/jaw, detached ears, eye areas floating over skin, pointy cap rear skull, neck cut, irregular topology with apparent shading seams. QA of structure/antivirus is not art approval.

## Measurement worksheet (fill ONLY after inspecting real 3D views)
| Metric | Front | Side | 45° | Back | Status |
|---|---|---|---|---|---|
| skull width / height | TBD | TBD | TBD | TBD | not measured |
| eye-center separation / skull width | TBD | — | TBD | — | not measured |
| nose projection / head depth | — | TBD | TBD | — | not measured |
| nose base width / eye separation | TBD | — | TBD | — | not measured |
| mouth width / skull width | TBD | — | TBD | — | not measured |
| chin projection and mandibular angle | TBD | TBD | TBD | — | not measured |
| ear position and attachment | TBD | TBD | TBD | TBD | not measured |
| nape curvature | — | TBD | TBD | TBD | not measured |

## Workflow next steps
- Verify full Pinterest pin images and rotate the actual reference models in viewer or Blender if license permits; note any missing view explicitly.
- Record observation and **independently selected** dimension ratios in this worksheet without copying mesh data.
- Make fresh Blender construction script in separate feature branch, independent topology and control points; present initial multiview model to user.
- Repeat actual rendering and compare against desired proportions; only approved original candidates enter development gameplay.
