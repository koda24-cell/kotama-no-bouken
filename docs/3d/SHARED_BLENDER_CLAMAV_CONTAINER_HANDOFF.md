# Shared Blender + ClamAV container (GitHub Actions)

Status: **verified GHCR publish, digest pull, freshclam, ClamAV source/output scans, EICAR detection and real Blender PNG/GLB smoke** (2026-11-19).
Branch: `feature/shared-blender-clamav-container-20261119`.
Base: `development`. This is infrastructure only: no game assets, geometry or gameplay changed.

## Why

Ephemeral GitHub-hosted runners reinstall Blender and ClamAV on each run. Instead, build a
single Ubuntu 24.04 image with Blender, ClamAV and Python, publish it to GitHub Container
Registry (GHCR), and reuse it in all six floors. A new runner **still pulls** the image;
the package-install step is removed, not all startup/download time.

Image: `ghcr.io/koda24-cell/kotama-blender-clamav:ubuntu24.04-v1`.
The publisher also pushes immutable-by-convention `sha-<full-commit-sha>` tags and
reports the **registry digest**. For production, pin consumers to the tested
`@sha256:<digest>` rather than a mutable tag. First complete end-to-end successful run: [44446614148](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44446614148).
Tested image digest:
`sha256:6f9e660501dcf7a6e0cb8dc94ca3103568f673948812a12a344021b877e7c310`.

Evidence from the completed smoke job: Ubuntu 24.04, Blender 4.0.2, ClamAV 1.5.4;
daily/main/bytecode signature updates succeeded with no freshclam ERROR;
source scan **1 scanned, 0 infected**; EICAR self-test **FOUND**;
headless Blender Workbench actually rendered a 128×128 PNG and exported a GLB;
PNG and GLB headers passed; output scan **2 scanned, 0 infected**.
The image was pulled by digest from GHCR in a separate job, **without apt**.
QA artifact: [14493991682](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44446614148/artifacts/14493991682).
This is a runtime smoke test, not artistic approval or malware certification of any other asset.

Known optional limitation: Blender's glTF exporter prints a Draco-compression-library
availability ERROR while still exporting a valid **uncompressed** GLB. Draco compression
is not enabled or verified. The earlier missing EGL and NumPy dependencies were fixed
before the successful run. Keep these limitations explicit.

Source: `.github/docker/blender-clamav/Dockerfile`
Publisher: `.github/workflows/build-shared-blender-clamav-image.yml`
Security gate: `tools/security/clamav_scan_gate.sh`

## Publish / test sequence

1. Push this branch and inspect the publish workflow job, logs, GHCR digest, and result.
2. The workflow builds locally, checks `blender --version`, `clamscan --version`,
   `freshclam --version` and Python, then logs into GHCR with `GITHUB_TOKEN` and pushes.
3. A second job pulls the **exact digest**, performs a real freshclam definition
   update, ClamAV source scan and EICAR detection, then uses headless Blender to
   render a tiny PNG and export a GLB, verifies both headers and scans the outputs.
   The test writes logs and uploads a 14-day QA artifact even on failure.
4. Only after a successful end-to-end run should floor-specific workflows be switched
   one at a time, on separate branches/PRs. Keep the old workflows until verified.
5. If package publishing or pulling fails due to permissions, report the error and
   do not claim the shared image is usable.

## Consumer pattern (after successful publishing)

```yaml
jobs:
  asset:
    runs-on: ubuntu-24.04
    container:
      image: ghcr.io/koda24-cell/kotama-blender-clamav@sha256:REPLACE_WITH_VERIFIED_DIGEST
      credentials:
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    permissions:
      contents: read
      packages: read
    steps:
      - uses: actions/checkout@v4
      - name: Refresh ClamAV definitions (required every job)
        run: bash tools/security/clamav_scan_gate.sh update qa/security
      - name: Scan source before running scripts
        run: bash tools/security/clamav_scan_gate.sh scan tools/asset-builder qa/security/source.log
      # After any external asset download, scan the downloaded file immediately,
      # BEFORE unpacking, parsing, Blender import or executing it.
      # Run Blender, verify GLB/PNG/Blend hashes and image metadata.
      - name: Scan candidate outputs
        run: bash tools/security/clamav_scan_gate.sh scan render-output qa/security/output.log
```

**Security invariants:** freshclam success and real signatures are mandatory per job;
actual source/download/output scans must have nonzero scanned files, zero infections
and zero errors. Failures block QA, promotion and claims of safety. ClamAV is only one
layer: retain archive structure checks, SHA256 provenance, license review, sandboxed
processing and manual artistic approval. Never silently skip an unavailable scan.
Image installation does **not** imply signature currency or a clean artifact.

The image uses official Ubuntu package repositories and inherits their licenses
(Blender GPL; ClamAV GPL); verify installed versions and image digest in CI.
No external 3D models, textures, add-ons or user data are baked into the image.
The source script and downloaded inputs are not automatically safe merely because
the container is trusted.

## Boundaries

- No automatic change to existing workflows until the shared image is verified.
- No merging unverified executable infrastructure or unapproved assets into `development`.
- No image/artifact promotion or game integration without explicit approval.
- Keep logs and manifest hashes as evidence; Actions artifacts expire.
- Update this page with actual run IDs, digest and scan evidence after verification.

## Actual consumer migration evidence (2026-11-19)

- B5 organic miasma: [run #44447869498](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44447869498), actual 3-view PNG/GLB and ClamAV 3 source / 10 generated files, 0 infected. Modeling PR #528 remains draft and unapproved.
- General candidate safety audit: [run #44448178510](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44448178510), ClamAV scanned 1,219 files, 0 infected. PR #539 merged to `development`.
- B2 bridge props: [run #44448963669](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44448963669), 4 GLBs/12 PNGs, ClamAV source 1/output 18 files, 0 infected.
- B2 stone ruins V4: [run #44448970296](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44448970296), 4 GLBs/12 PNGs, ClamAV source script 1/source bridge GLB 1/output 18 files, 0 infected.
- B2 migration PR #542 merged to `development`. The other floor workflows remain on their previous implementations until migrated and verified individually.
- These are **technical and security QA results only**, not visual artistic approval of PNGs, and no GLB/PNG was promoted to the game.
