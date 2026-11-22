# Remaining 3D Actions / security inventory — 2026-11-19

This is a `development` snapshot, **not** a claim that every feature-branch workflow has migrated. Preserve all existing geometry, approvals and runtime behavior.

## Verified and merged

- B2 frozen altar/pillars/shoreline/bridge: [PR #566](https://github.com/koda24-cell/kotama-no-bouken/pull/566), six real render successes.
- B2 waterwheel Node+Blender: [PR #569](https://github.com/koda24-cell/kotama-no-bouken/pull/569), [run #44456675883](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44456675883), npm 1141 files scanned before execution; GLB/3 PNGs.
- F2 waterfall: [PR #575](https://github.com/koda24-cell/kotama-no-bouken/pull/575), [run #44457029320](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44457029320), Python wheels scanned before offline install; GLB/3 PNGs.
- B4 procedural basalt PBR: [PR #582](https://github.com/koda24-cell/kotama-no-bouken/pull/582), [run #44459946932](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44459946932), 3 real 256×256 PNGs, source 1/output 4 ClamAV scanned and 0 infected; only original review branch can auto-commit after scanning.
- B4 cart/furnace/mine-rig `b4-docker-batch-render.yml` already references shared Blender4; its latest render success must be checked separately.

## Migration execution history (verified unless explicitly noted)

- [PR #581](https://github.com/koda24-cell/kotama-no-bouken/pull/581): B4 magma banks. P1–P3 modules [run #44459858339](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44459858339) success (3 GLB/3 Blend/12 PNG, all scans clean); P3 V5 [run #44459865014](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44459865014) success (538 meshes, 9 images, GLB/Blend/4 PNG, all scans clean). V16-derived run #44459870613 **failed** Blender4 Cycles BVH segfault (exit 139), not a virus detection; switching only this job to the verified Blender5 digest resolved it. [Actual successful run #44460403769](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44460403769): P1/P2/P3 each GLB/Blend/4 PNG, manifest and source SHA checks passed; source 5+1, texture 14+4, output 22 scanned, all infected 0. **PR #581 merged to development after all three actual runs passed.**
- [PR #586](https://github.com/koda24-cell/kotama-no-bouken/pull/586): B5 fog browser preview. This is **Playwright/Chromium, not Blender**. Host ClamAV scans npm, source, binary Pillow wheel before install, downloaded ambientCG ZIP **immediately before archive parsing**, extracted emission image **before Pillow decoding**, and rendered textures/PNGs. Size/ratio limits and fail-closed scanner errors. First run #44460321738 failed freshclam log permissions; corrected and [actual successful run #44460460622](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44460460622) **verified and merged to development**: 3 ZIP + 3 extracted emission maps individually scanned before parsing/decoding, npm 511 before execution, Pillow wheel 1 before install, source 3, final output 8; all infected 0. Actual browser fog animation and three-view PNG QA passed. External Microsoft Playwright image is not ClamAV scanned; pulled image digest logged.
- Other active feature branches may have standalone Blender workflows not present in `development`. Inspect each before claiming universal completion.

## Different security category: approval / archive

B2/B4 approval and archive workflows (including `b4-promote-approved-asset.yml`) are **not Blender render jobs**. Some download GitHub Actions artifacts and hold write permissions. Audit archive/download scanning and explicit approval gates separately; never auto-run these to test a container migration. Do not change `USER_APPROVED` records or promote candidate assets without user approval.

## Invariants

Update signatures on each run; scan source before execution, downloaded files immediately before unpack/install/decode, extracted data before model/image import, and generated files before artifact publishing or Git commits. Keep real GLB/PNG/Blend signatures, hashes and QA logs. `NOT_APPROVED` remains `NOT_APPROVED`; ClamAV zero detections are not a guarantee of safety or visual approval.

## Final `development` workflow-code audit (2026-11-19)

After merging PR #581/#582/#586, re-read the current `development` workflow definitions. Of the Blender-related render/review workflows checked (B2 bridge props/variants, frozen altar/pillars/watergate/waterwheel/shoreline/bridge tiles, water tiles/aqueduct/stone ruins; B4 cart batch/magma banks; F2 waterfall; F3 bridge; F6 foliage/impostor; shared rigid LOD), **each has `clamav_scan_gate.sh` references and none retains `apt-get install blender`**. The two shared Blender image publisher workflows also include ClamAV smoke logic. The B5 fog job is Playwright, not Blender, and now has separate host ClamAV download-before-decode gates.

This is a **workflow source-code audit**, not an assertion that every historical/feature-branch run succeeded or that every model is malware-free. Promotion/approved archive workflows, the non-Blender performance-audit selector and other diagnostics have separate trust boundaries; they are not silently converted to Blender. Additional feature-branch-only workflows may still require migration.

Evidence: [PR #581](https://github.com/koda24-cell/kotama-no-bouken/pull/581), [PR #582](https://github.com/koda24-cell/kotama-no-bouken/pull/582), [PR #586](https://github.com/koda24-cell/kotama-no-bouken/pull/586), and [B4 V16-derived Blender5 run #44460403769](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44460403769).
