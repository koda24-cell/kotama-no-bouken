# Blender 5.3.0 adoption evaluation — 2026-11-19

**Status: official 5.3.0 Docker build, ClamAV smoke and actual B4 P1 render VERIFIED; B2 water compatibility VERIFIED; F6 foliage and per-workflow migration still being evaluated.** This is not blanket approval of all Blender workflows or any 3D asset.

## Verified image and evidence (2026-11-19)

- [PR #603](https://github.com/koda24-cell/kotama-no-bouken/pull/603) merged to `development` after [full successful Actions run #44466267564](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44466267564).
- Immutable GHCR image: `ghcr.io/koda24-cell/kotama-blender53-clamav@sha256:5ce601f79b1ab09405b3ebc36b1a596be76cb8b105b1524fcbafcb186ebf7e99`. This is **official Blender 5.3.0**, not the older distro Blender5 image.
- Official SHA256 and independently pinned SHA256 matched. The initial naive ClamAV xz archive scan failed because the decompressor hit its 500 MiB cap; the corrected build verifies SHA first, scans archive bytes before extraction and **5,597 extracted files before running Blender**. Both scans infected 0. This avoids claiming a truncated decompression scan was complete.
- Actual runtime checks: exact `Blender 5.3.0`, freshclam update, EICAR detected, smoke GLB+PNG signatures and output scans, B4 magma P1 GLB/Blend/four PNGs with manifest SHA256. Runtime source scans 1+5 scripts, imported PBR textures 14, smoke outputs 2, B4 outputs 7: all infected 0. [Temporary QA artifact](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44466267564/artifacts/14502612250).
- [PR #606](https://github.com/koda24-cell/kotama-no-bouken/pull/606) verified Blender5.3 compatibility for existing B2 water: [run #44467090675](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44467090675) produced **16 GLBs and 3 PNGs**, all signatures and hashes passed; source 1/output 21 scanned with 0 infected. It is a **separate QA job**, not evidence that every production B2 workflow was switched.
- F6 V14 foliage [PR #607](https://github.com/koda24-cell/kotama-no-bouken/pull/607) and original B2/B4 workflow image-switch PRs #608/#609 are separate; **do not call them verified until their Actions succeed**.

## Official sources
- Blender 5.3.0 stable released November 10, 2026: https://www.blender.org/releases/5-3/
- Official Linux x64 archive: https://download.blender.org/release/Blender5.3/blender-5.3.0-linux-x64.tar.xz
- Official SHA256 checksums: https://download.blender.org/release/Blender5.3/blender-5.3.0.sha256
- Release notes: https://www.blender.org/download/releases/5-3/

## Why a separate image

Existing `ghcr.io/koda24-cell/kotama-blender5-clamav` is built from `ubuntu:26.04` and installs the distro's `blender` package. Its verified version is not guaranteed to be 5.3.0. Preserve that existing image, its digest-pinned users, and Blender4 compatibility jobs while evaluating a new `kotama-blender53-clamav` image.

New image plan: fetch official 5.3.0 Linux x64 tarball and official SHA256 manifest over HTTPS; verify archive SHA256 before extraction; refresh ClamAV signatures and scan the downloaded archive before extraction; install prebuilt official Blender under `/opt` without overwriting distro Blender; expose `blender` through `/usr/local/bin`. Build and smoke test in GitHub Actions with exact `Blender 5.3.0` version assertion, EICAR detection, real 128x128 PNG + GLB export and file signatures, ClamAV input/output scans, and actual B4 magma P1 four-view render. No new downloaded Python packages.

## Acceptance gates

1. GitHub Actions build succeeds and publishes a **new image digest**, with an actual exact-version check. Do not guess the digest.
2. Real freshclam update, EICAR self-test, source scan, PNG/GLB smoke and ClamAV generated-file scan pass.
3. Render at least one existing B4 representative without changing geometry, with manifest SHA256, GLB/Blend/4 PNG and ClamAV verification. Additional F2 water/F6 foliage comparisons should follow before any broad switch.
4. Keep original images and scripts available. Migrate only individual workflows through separate feature PRs after verified QA. Never mass-replace old digest references on the first successful build.
5. All render artifacts are temporary and `NOT_APPROVED`. No production GLB/PNG promotion or `main` edits.

Potential compatibility risks: EEVEE enum names, Blender 5.3 material node APIs, Cycles denoiser behavior, glTF export, and CPU-only Vulkan/EGL behavior. These are **risks to test**, not verified regressions.

**License:** Blender is GPL-licensed; distribution of a Docker image containing Blender requires honoring GPL license notices/source availability obligations. The Blender official archive is not a third-party game asset. Do not bundle Blender into the game itself.
