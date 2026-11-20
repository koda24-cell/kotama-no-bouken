# Claude entry point — コタマのぼうけん

Read `AGENTS.md` first. For all tooling, add-ons, animation, textures, Blender, 2D and music tasks, **before starting**, read:
- `docs/3d/TOOLING_AUTO_SHARE_POLICY.md`
- `docs/3d/SHARED_TOOLING_CATALOG.md`
- `docs/3d/STYLIZED_GAME_TECH_LIBRARY.md` for stylized/3D work
- `docs/3d/BLENDER_DOCKER_HANDOFF.md` and `docs/3d/ASSET_PROMOTION_POLICY.md` for 3D assets

When you discover a new useful tool/technique, register it **immediately in the shared catalog** through a docs-only PR to development; update that entry with real validation, logs, licensing, environment and result after testing. Do not silently treat unverified tools as installed or approved. GPT and Claude share the same catalog. Claude should use GLB/PNG/manifest to review Blender output and request Blender rendering from a capable workflow; do not claim direct Blender operation if unavailable.

For Pinterest reference collection, first read `https://github.com/koda24-cell/pinterest-reference-library` AGENTS.md and follow that repo's handoff procedures.

## Claude: verified shared Blender 5.3 execution (2026-11-20)

For all new 3D work, **use the same GitHub Actions Blender 5.3.0 + ClamAV environment as GPT**. This is a repository workflow, not a Claude-specific MCP or local PC connection.

1. Before changing any asset, read `AGENTS.md`, `docs/3d/BLENDER_SHARED_EXECUTION_ENTRYPOINT.md`, `docs/3d/SHARED_BLENDER53_ALL_BRANCHES_ROLLOUT.md`, `docs/3d/BLENDER_DOCKER_HANDOFF.md`, and `docs/3d/ASSET_PROMOTION_POLICY.md`. Inspect the latest `development` and the actual Claude asset branch / open PR. Do not assume the older `development` model is Claude's latest.
2. For a **new single-script Blender render**, create a task-specific push-triggered caller in its feature branch, referencing `koda24-cell/kotama-no-bouken/.github/workflows/shared-blender53-render.yml@development` with `script: tools/.../render.py` and `output_dir: render-output/...`. The script must write to `os.environ['OUTPUT_DIR']`. Set `permissions: contents: read, packages: read`. Follow the tested caller example in the rollout guide.
3. The reusable workflow was successfully invoked from another branch in [Actions run #44660839692](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44660839692): Blender 5.3, input/output ClamAV, PNG/Blend/JSON QA, and Artifact upload succeeded. **GLB output via this particular gateway and image quality were not proven by that smoke test.** Check each real asset separately.
4. Existing Claude workflows with Node/Three.js export, downloaded textures, multiple scripts, or custom output paths **must retain their working pipeline** until an equivalent adapter is implemented and validated. Do not bulk replace workflows, overwrite Claude's completed B2 models, or change `main`.
5. Inspect the real run ID, logs, front/side/angle PNG, GLB and scan reports. Keep outputs `NOT_APPROVED` until user approval. If Claude cannot invoke GitHub Actions with its available tools, commit the caller on a branch and report the actual trigger/permission limitation; never claim a run started without evidence.

