# AI collaboration instructions — コタマのぼうけん

This file is an entry point for ChatGPT, Claude and other AI development sessions.

## Start here
1. Read `docs/3d/BLENDER_DOCKER_HANDOFF.md` for 3D asset creation, Blender Docker render, workflow URLs, verification and troubleshooting.
2. Inspect the latest GitHub `development` branch, related feature branches and PRs before editing. Do not assume a previous chat's state is current.
3. Preserve all existing game functionality, assets, combat logic, save data and stage presentation. Avoid editing shared runtime files for standalone asset experiments.
4. Work in isolated feature branches; prepare PRs against `development`. Never merge into `main` without explicit user authorization.
5. Treat rendered screenshots and GLBs as evidence only after actual successful workflow/artifact verification; do not claim a render succeeded from code commits alone.

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
