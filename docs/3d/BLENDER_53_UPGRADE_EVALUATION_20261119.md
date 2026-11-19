# Blender 5.3.0 adoption evaluation — 2026-11-19

**Status: official release confirmed; Docker build and real model render are NOT YET verified.** This document is shared information, not authorization to change the default runtime or approve assets.

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
