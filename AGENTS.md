# AI collaboration instructions — コタマのぼうけん

This file is an entry point for ChatGPT, Claude and other AI development sessions.

## Shared Blender 5.3 default for all current and future 3D work (2026-11-20)

- **Default**: Use the proven GitHub Actions Blender **5.3.0 + ClamAV** pinned Docker environment for all new 3D model/render tasks, regardless of ChatGPT normal/Work or AI assistant. Do not claim any particular chat has Blender MCP or direct workflow dispatch permissions.
- **Start of each task**: inspect `development`, this `AGENTS.md`, `docs/3d/BLENDER_DOCKER_HANDOFF.md`, `docs/3d/ASSET_PROMOTION_POLICY.md`, and `docs/3d/BLENDER_SHARED_EXECUTION_ENTRYPOINT.md`; locate the actual current asset branch/PR and workflow. Preserve all prior assets and functionality.
- **Reusable gateway**: after it is reviewed, merged into `development`, and successfully tested, use `.github/workflows/shared-blender53-render.yml` as the common `workflow_call` entry. Follow `docs/3d/SHARED_BLENDER53_ALL_BRANCHES_ROLLOUT.md`. Do **not** describe this gateway as deployed or verified before that happens.
- **New branches**: branch from `development` and add a task-specific push-triggered caller for the actual Blender script. Trigger on relevant script/workflow paths, **not every repository push**. If the gateway is not yet integrated, continue using a proven branch-local workflow.
- **Existing branches**: migrate their workflows only after comparing their current script, output paths, container compatibility and existing successful runs. Never bulk overwrite branch contents, switch all legacy Blender versions without QA, or auto-merge.
- **Verification**: inspect actual GitHub Actions run ID, job status/logs, Blender version, ClamAV input/output scan results, generated multi-angle PNG and GLB/Blend, hashes and Artifacts. A committed workflow or successful step alone is not evidence of visual quality.
- **Security and approval**: scan external downloads immediately before extraction, extracted contents before Blender import, and outputs before use. Keep new GLB/PNG as `NOT_APPROVED` until the user has reviewed images; never automatically promote into game assets or `main`.
- **Execution limitations**: GitHub Actions is not an always-running PC. A reusable workflow must be called from an eligible workflow; adding this rule to AGENTS does not itself install or trigger a workflow on every existing branch. `workflow_dispatch` may require default-branch registration; do not alter `main` merely to expose it.
- **Cross-chat handoff**: use the latest source files, PR and run evidence in GitHub, not a previous assistant's unsupported success claim. When push runs are missing from PR-only queries, inspect GitHub Actions REST run collections.

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

## Assassin head continuation: prevent legacy-source regression (2026-11-19)
For new Assassin character head modeling/renders, **never use the standalone old Assassin head prototypes** in PR #309, #310, #313, or #513, including `tools/assassin-bare-head/` and `tools/assassin-rebuild/`, as the source mesh, shape reference, or the alleged latest render. Retain those files only as historical archives; do not delete or merge them as current geometry.
Current source of truth: `feature/gpt-character-mesh-reference-study-20261116` and `docs/3d/research/ASSASSIN_HEAD_V18_REFERENCE_STUDY_20261118.md`, based on original Shibu Face component 5 (36-vertex rim). V16/V17 review models may be examined **only to document known defects and regressions**, not copied as final geometry. V18 is not yet built; first validate actual Shibu 36-point rim JSON, gather anatomy references, design anatomically sound patches, then render at six angles. Always label renders by model version and exact source branch/commit/run. Pinterest handoff: `koda24-cell/pinterest-reference-library/handoff/assassin-head-v18-anatomy.md`.

## Assassin V18 native Body source recovery (2026-11-19) — overrides procedural posterior study
**Before starting any new Assassin posterior-head modeling, read** `docs/3d/research/ASSASSIN_V18_NATIVE_BODY_SCALP_SOURCE_20261119.md`. Actual source VRM Shibu `Body` already contains the intact round back of the head and nape. Do **not** synthesize a full rear skull from the `Face` 36-rim, and do not copy V18 A-F procedural failures. Successful Blender source audit runs #44446328687, #44446953188, #44447509958 show 34/36 Face rim points within 1mm of Body triangles, with exactly two mirrored outliers ~8.22mm near ears. Preserve native Face+Body shape, inspect local seam and normals, and only patch isolated mismatches after verifying real closeups. No mesh/texture/model public promotion before Shibu-specific licensing and explicit user approval.

## Assassin original modeling end goal (2026-11-19, USER-CORRECTED; supersedes the 'retain native Shibu Body as final mesh' interpretation)
The user’s **actual final goal is an independently modeled original Assassin head, created from scratch**. Shibu/Vita `Body` and `Face` are **temporary anatomical measurement and visual references only**; they must **not** be the final production head or be copied directly as output geometry. The previous Shibu Body recovery is a valuable *reference audit*, not a permanent geometry directive.
Build a separately versioned original rear cranium first, then own temporal/ear/face/jaw/neck pieces, review front/side/back/oblique actual Blender renders and QA each stage, and progressively replace any reference-only components as original parts pass visual quality. Avoid rejected V18 A-F cap topology and full jaw-to-back caps. Preserve existing game models, previous research and all unrelated features; use isolated branch/Draft PR, and do not promote incomplete parts or merge to main without explicit approval. Current original experiment: `feature/gpt-assassin-original-occiput-v1-20261119`, PR #570. Shibu-specific material licenses remain unverified.

## Browser verification URLs for all AI chats (2026-11-24)

- When presenting a playable browser verification link for this repository, **prefer a fixed commit-SHA raw.githack.com URL** rather than a moving branch URL, GitHub blob URL, or GitHub Pages URL:
  `https://raw.githack.com/koda24-cell/kotama-no-bouken/<full-commit-SHA>/<path-to-HTML>`
- For the full game use `index.html`; for a task-specific preview use the relevant existing `preview/*.html` entry point. Preserve supported query parameters (for example `?floor=0`) if needed.
- Before submitting a link, verify that the commit exists and the target HTML is present at that exact commit; verify referenced assets where practical. Use the merged `development` commit SHA after integration, or clearly label a feature-branch commit as a pre-merge preview.
- Give a directly clickable URL and identify what it opens. Do not claim that the browser, audio, or rendering was tested unless it was actually tested. A file-existence check alone does not establish runtime behavior.
- This is a shared convention for **ChatGPT, Claude, Codex, and future sessions**. Follow it for all game and HTML preview handoffs.
