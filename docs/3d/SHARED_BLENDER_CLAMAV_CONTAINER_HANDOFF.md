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

## Additional cross-floor verification (2026-11-19)

- B2 watergate: [run #44451951536](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44451951536), success, source 1/output 6 scanned, 0 infected.
- B2 ruined aqueduct: [run #44451951540](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44451951540), success, source 1/output 6 scanned, 0 infected.
- B2 modular water tiles: [run #44451951597](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44451951597), success, source 1/output 20 scanned, 0 infected. Blender4 alpha material compatibility and unavailable OIDN handled in candidate scripts.
- F3 elevated bridge V2/V3: [run #44451841426](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44451841426), success, source 5/downloaded texture 1/output 48 scanned, 0 infected. Concrete CC0 map acquired; rust texture unavailable and procedural fallback used. Follow-up PR #550 adds immediate per-download fail-closed ClamAV scan, which must be verified separately.
- Cross-floor rigid LOD: [run #44451540647](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44451540647), success, source scripts 15/input GLB 1/output 16 scanned, 0 infected; LOD triangles 3806/2431/1459.
- B4 Node + Blender batch: [run #44452748334](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44452748334), success, scripts 6/npm third-party files 955/input GLBs 6/output 25 scanned, 0 infected; 6 GLBs and 18 three-view PNGs generated. [PR #554](https://github.com/koda24-cell/kotama-no-bouken/pull/554) merged into development. Npm dependency scripts disabled before malware scan.
- New **Blender 5.0.1 + ClamAV** separate Ubuntu26.04 GHCR image: [build+smoke run #44452374577](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44452374577) success. Exact verified digest: `ghcr.io/koda24-cell/kotama-blender5-clamav@sha256:05f93bdd5c2c0dc541c34b6f30e488f0c21a53c403c50311f26fd43357ce8047`. Real PNG/GLB, freshclam, EICAR, 1 source/2 output files ClamAV infected 0. [PR #555](https://github.com/koda24-cell/kotama-no-bouken/pull/555) merged. This image is required for Blender5-written F6 V14 checkpoint; Blender4.0.2 cannot open it.
- F6 V14 foliage batching on Blender5: [run #44452794170](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44452794170), success, source scripts 15/input checkpoint 7/output 7 files scanned, infected 0; 9108 original mesh nodes -> 145 batched candidate. Impostor migration remains under verification in PR #550.
- All candidate assets are NOT_APPROVED and temporary. Malware scan is not a safety guarantee; rendering/technical success is not artistic approval. Other legacy workflows still need individual migration and QA.

## Four legacy B2 renders migrated and verified (2026-11-19)
PR [#557](https://github.com/koda24-cell/kotama-no-bouken/pull/557) merged into `development`. Existing Blender4 image reused, no repeated apt/Docker installation; freshclam + actual source/import/output ClamAV scans (all infected 0):
- Bridge variants [run #44453043062](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44453043062): source script 1, source bridge GLB 1, output 14 files.
- Stone ruins V2 [run #44453048148](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44453048148): source script 1, output 18 files.
- Stone ruins V3 [run #44453053265](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44453053265): source script 1, source bridge GLB 1, output 18 files.
- Ice bridge side [run #44453070117](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44453070117): source script 1, output 33 files. OIDN unsupported by Blender4 and disabled in review-only renderer.
No geometry/gameplay modifications; artifacts and renders remain unapproved.

### Remaining migration groups (not all complete)
- B2 legacy: frozen ancient altar, frozen pillars V1/V2/V3, frozen waterwheel, glacial shoreline, ice bridge adjacent, floor2 waterfall.
- B4: magma bank modules P1–P3, P3 V5, approved V16 derived candidate workflow. Their current Blender installations are not yet replaced by shared images.
- B5 fog preview uses **Playwright/Chromium**, not Blender; do not blindly replace its browser image with a Blender image. Third-party texture download and npm scan need a separate safety integration.
- Remaining archive/promotion and generated-texture workflows must be assessed by operation type; do not migrate a job that has no Blender to a Blender container merely for uniformity.
- Each migration requires its own real Actions pass and scan evidence. F6 Blender5 foliage/impostor candidates remain unapproved; PR #550 is separate.

## Seven-workflow cross-floor migration finalized (2026-11-19)
[PR #550](https://github.com/koda24-cell/kotama-no-bouken/pull/550) merged to `development` after actual success on all seven workflows:
- B2 watergate [#44451951536](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44451951536), aqueduct [#44451951540](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44451951540), modular water tiles [#44451951597](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44451951597): success and real ClamAV scans 0 infected.
- F3 elevated bridge with **immediate scan of downloaded CC0 texture before saving/import** [#44452606244](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44452606244): success, concrete texture fetched/scanned, rust procedural fallback, V2/V3 renders; source 5/download 1/output 48 files scanned, 0 infected.
- Shared rigid LOD [#44451540647](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44451540647): success.
- F6 Blender5 V14 foliage batching [#44453183636](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44453183636): success on **final smoke-verified Blender5 digest**, 15 scripts/7 checkpoint/7 output files scanned, 0 infected; 9108→145 mesh nodes.
- F6 Blender5 V14 8-view impostor [#44453189534](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44453189534): success on **final smoke-verified Blender5 digest**, 8 actual transparent views and 2080×1040 atlas QA; 15 scripts/7 checkpoint/10 output files scanned, 0 infected.
- Temporary migration test branch push triggers were removed before merging; original triggers preserved.
- This is environment/technical QA only. **No candidate GLB/PNG artistic approval or game asset promotion.** Other workflows in remaining-migration list still need separate tests.

## Continued B2 migration batch (2026-11-19, in progress)

- [PR #566](https://github.com/koda24-cell/kotama-no-bouken/pull/566) — **all six workflows actually verified and merged into development**: altar [#44455931677](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44455931677) 1 GLB/3 PNG, source 1/output 5 scanned; pillars V1 [#44455938198](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44455938198), V2 [#44455945386](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44455945386), V3 [#44455955207](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44455955207), each 3 GLB/9 PNG, source 1/output 13 scanned; glacial shoreline [#44457814718](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44457814718) 1 GLB/3 PNG, source 1/output 7 scanned; ice bridge adjacent [#44457630141](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44457630141) 3 GLB/3 PNG, source 1/imported bridge GLB 1/output 8 scanned. **All infected 0**. Blender4 OIDN/alpha and Blender5 EEVEE compatibility failures corrected and rerun. Original feature-branch triggers preserved; temporary test triggers removed.
- [PR #569](https://github.com/koda24-cell/kotama-no-bouken/pull/569) — frozen waterwheel Node/Three.js export and Blender rendering migrated and **merged into development after full real QA**: [run #44456675883](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44456675883), 1 GLB + 3 PNG (front/back/top-oblique). ClamAV scans: renderer/exporter 2 files, imported scene JS 1, npm downloaded dependencies 1141 **before Node execution** (`npm --ignore-scripts`), exported GLB 1 **before Blender import**, outputs 4; all infected 0. Original branch triggers preserved; no asset promotion.
- [PR #575](https://github.com/koda24-cell/kotama-no-bouken/pull/575) — frozen waterfall **actually verified and merged**: [run #44457029320](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44457029320), source scripts 2, Python binary wheels 2 scanned **before offline pip installation**, generated GLB 1 scanned before Blender, generated outputs 5 scanned, **all infected 0**. Actual 130 trimesh geometries, 1 GLB/3 PNG and signatures/SHA256 passed. Setup-python used without re-installing Blender/ClamAV.
- Remaining B2 old jobs and B4 magma-bank review workflows are still to be migrated. Browser-based Playwright jobs are not interchangeable with Blender containers.
- All candidates remain **NOT_APPROVED** and no production assets or game runtime changed. An uninfected ClamAV result does not prove absolute safety; technical QA is not visual approval.

## Stage 4 migration completed on development (2026-11-19)

- [PR #582](https://github.com/koda24-cell/kotama-no-bouken/pull/582) — procedural basalt PBR generation: [run #44459946932](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44459946932), three actual 256×256 PNGs and SHA256 manifest, source 1/output 4 files scanned with ClamAV, infected 0; generated maps only committed on original review branch after scan.
- [PR #581](https://github.com/koda24-cell/kotama-no-bouken/pull/581) — three magma bank review workflows, all real render QA successful and merged. P1–P3 modules [run #44459858339](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44459858339): 3 GLB/3 Blend/12 PNG, source 5/texture 14/output 21 scanned, infected 0. P3 V5 [run #44459865014](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44459865014): 1 GLB/1 Blend/4 PNG, 538 meshes/9 images, source 5+1/texture 14+4/output 7 scanned, infected 0. V16-derived P1–P3 [run #44460403769](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44460403769): 3 GLB/3 Blend/12 PNG, source 5+1/texture 14+4/output 22 scanned, infected 0.
- V16-derived Blender4 first run #44459870613 failed a Cycles BVH segmentation fault (exit 139); switching **only this review workflow** to the separately verified Blender5+ClamAV image digest `sha256:05f93bdd5c2c0dc541c34b6f30e488f0c21a53c403c50311f26fd43357ce8047` resolved the issue. This is an execution compatibility fix, **not a claim that the original V16 model was corrupt or infected**.
- [PR #586](https://github.com/koda24-cell/kotama-no-bouken/pull/586) — B5 fog is browser/Playwright, not Blender: [run #44460460622](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44460460622) verified CC0 ZIPs 3 immediately scanned before parsing, extracted images 3 before Pillow decode, npm 511 and Pillow wheel 1 before execution/install, browser animation and three-view PNG QA passed; all ClamAV scans infected 0. Microsoft Playwright container digest logged, but image itself not ClamAV scanned.
- These are technical QA successes only. All generated candidates retain `NOT_APPROVED` status; no artistic approval or production asset promotion was performed.
