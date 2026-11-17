# AI collaboration instructions — コタマのぼうけん

This file is an entry point for ChatGPT, Claude and other AI development sessions.

## Start here
1. Read `docs/3d/BLENDER_DOCKER_HANDOFF.md` for 3D asset creation, Blender Docker render, workflow URLs, verification and troubleshooting.
2. Inspect the latest GitHub `development` branch, related feature branches and PRs before editing. Do not assume a previous chat's state is current.
3. Preserve all existing game functionality, assets, combat logic, save data and stage presentation. Avoid editing shared runtime files for standalone asset experiments.
4. Work in isolated feature branches; prepare PRs against `development`. Never merge into `main` without explicit user authorization.
5. Treat rendered screenshots and GLBs as evidence only after actual successful workflow/artifact verification; do not claim a render succeeded from code commits alone.

## 3D visual-quality-first performance policy (all stages)
For all new and revised 3D models, prioritize distance- and screen-size-based LOD, only loading and rendering visible/needed data, material/geometry batching, and draw-call reduction **without sacrificing near-view quality or changing gameplay/collisions**. See `docs/3d/GLOBAL_3D_LOD_PERFORMANCE_POLICY.md`. This is a design requirement, **not** a claim that every feature is currently implemented. Test with actual PNG/GLB and game frame statistics before promotion.

### Shared GitHub Actions as the default optimization validation path
When building or revising a 3D asset, run the available reusable `Shared 3D GLB Performance Audit` on its actual GLB (or record why it cannot be run). For heavy vegetation, prefer the non-destructive material-group foliage batching review; for opaque rigid static props, use the separate rigid LOD review; for tree far distance, use the multi-view impostor-bake review. Always compare original vs optimized multi-view PNG/GLB and manifest. Full setup and verified runs: `docs/3d/SHARED_3D_ACTIONS_OPTIMIZATION_PLAYBOOK.md`. Do not insert any unapproved candidate into gameplay. Separate measured performance from source-file/structural statistics, and do not claim that Actions automatically optimize every asset without selecting a supported category.

## Default auto-optimization workflow for every floor
After generating a GLB, run the available cross-floor auditing/LOD review Actions and capture the output, following `docs/3d/ALL_FLOOR_AUTO_OPTIMIZATION_HANDOFF.md`. Keep high-quality originals and all approval requirements; automatic processing means report and **unapproved candidates**, never silently replace gameplay models. For foliage, transparent water/magma/VFX, characters or collision-critical models, use specialized optimization rather than automatic decimation. The user's normal modeling instructions do not need to mention optimization separately.

## Stage 4 3D asset policy
Volcanic cave, magma, abandoned mine, mining carts, pickaxes, ore, rocky obstacles, ruined equipment. Improve silhouettes and geometry by ADDING detail to existing models, not replacing/removing original geometry. Render actual models before and after modifications, preferably front/side/angle views. Use screenshots to guide subsequent improvements.

## Other stages
Stage 2: ice/water source. Stage 3: overgrown ruined city. Stage 5: abyssal ruined castle/temple. Keep each stage's identity distinct.

## Handoff
When continuing from a different chat, explicitly inspect `docs/3d/BLENDER_DOCKER_HANDOFF.md`, PR #252 and PR #253, plus current GitHub Actions runs. Do not assume automation or workflow is operational until checked.

## 3D handoff: Claude cannot operate Blender (mandatory for every session)
- Claude's role is **GLB/PNG consumer and game integration**, not Blender modeling/rendering. Do not instruct Claude to open .blend files, run Blender, edit Blender scenes, or visually inspect a 3D asset in Blender.
- GPT/Blender-capable workflows produce the approved `.glb` plus actual `front/side/angle` (and `top` where available) PNG renders and a machine-readable `manifest.json` with file hashes, source commit, workflow run, and approval status.
- Claude must first check the asset manifest and PNG previews, load the GLB directly in the browser via Three.js/GLTFLoader, and check size/origin/materials/tile seams/performance. If modeling or new renders are needed, hand the request back to GPT/Blender workflow rather than claiming to perform Blender work.
- Do not rely on expiring Actions Artifacts as permanent storage. Check that approved GLB/PNG are committed to the repository; if missing, report that they are not yet permanently saved.
- For floor 6 meadow V7, read `docs/3d/F6_MEADOW_V7_CLAUDE_HANDOFF.md` and `docs/3d/F6_COMPLETED_ASSETS.md`.

## B5 gloom 3D tooling and lessons (required for B5 corruption-rock work)
Before modifying B5 gloom/corruption rock or reusing its Blender tools, read `docs/3d/B5_GLOOM_TOOLS_AND_LESSONS.md`. It records CC0 scan sources, Blender/Actions workflows, verified versus unverified resources, V4–V10 failures, and Claude handoff. Preserve existing meshes; do not promote unfinished prototype assets.

## Shared tool/addon information: immediate registration (mandatory)
- Before any 3D, 2D, animation, music, texture or AI tool work, read `docs/3d/TOOLING_AUTO_SHARE_POLICY.md` and `docs/3d/SHARED_TOOLING_CATALOG.md` (and the applicable domain docs).
- When discovering or introducing a new tool, add-on, texture source, helper or technique, **record and share it immediately during the current task**; do not wait for model completion or visual approval. Information-only changes should be promptly merged to `development` through a reviewable PR if safe. Do not auto-merge unverified executable code, assets or game changes.
- After actual installation, execution, Blender render, licensing check or failure, append verification details, evidence URLs and status to the same catalog entry. Never claim unverified integration.
- This is an in-session workflow rule, not a claim that cross-chat background monitoring is already installed.

## Shared VFX reference and reuse
- Before implementing smoke, mist, fog, miasma or battle particles for any floor, read `docs/3d/VFX_TOOL_CATALOG.md` and `docs/3d/VFX_CC0_ASSET_LIBRARY_20261115.md`. Distinguish user-supplied visual references from redistributable CC0 assets. Reuse the shared VFX preset design rather than duplicating effects per floor.

## Shared Blender execution entrypoint (all ChatGPT / Work / Claude sessions)
- Before continuing any Blender automation or rendering across chats, read `docs/3d/BLENDER_SHARED_EXECUTION_ENTRYPOINT.md` and follow its links to the **latest** applicable branch/PR and run.
- GitHub Actions Blender rendering and job-to-job checkpoint resume have verified examples. Dedicated Blender MCP is **not automatically available** in every ChatGPT session; API-driven vision aesthetic revision is **not yet verified/connected**.
- Use draft/unapproved assets only for review, never promote them without explicit user approval; preserve base meshes and distinguish technical QA from artistic acceptance.

## Interruption-safe incremental 3D saves (mandatory)
Do not attempt to handle the ChatGPT stop button after it is pressed; a stopped response cannot trigger a final save. Instead commit small source changes, save each verified Blender iteration and manifest/checkpoint before starting the next, and keep GitHub Actions jobs independently resumable where implemented. Do **not** enforce early session termination solely to anticipate GPT timeout. See `docs/3d/BLENDER_SHARED_EXECUTION_ENTRYPOINT.md` section 「中断耐性と先行チェックポイント保存」. Keep all unapproved assets outside production promotion.
