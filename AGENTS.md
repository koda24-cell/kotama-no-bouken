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

## Shared stylized 3D research (GPT + Claude, all stages)
Before generating or improving any 3D asset, read [docs/3d/STYLIZED_GAME_TECH_LIBRARY.md](docs/3d/STYLIZED_GAME_TECH_LIBRARY.md). Select only techniques relevant to the asset, record what was actually applied, and distinguish tested tools from reference-only links. This includes character, hair, architecture, nature, rocks, industrial props and effects; the library is optional per technique, mandatory as a reference checkpoint.
For Pinterest image references, follow [koda24-cell/pinterest-reference-library](https://github.com/koda24-cell/pinterest-reference-library) AGENTS.md and handoff instructions. Never assume external game assets can be copied or redistributed.
