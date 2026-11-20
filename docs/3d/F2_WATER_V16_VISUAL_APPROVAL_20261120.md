# Water V16 — visual approval and reassignment to Floor 6

## Latest user decision (2026-11-20)
- **Floor 2: REJECTED FOR F2 USE**. User determined V16's appearance does not suit Floor 2. Do not promote or integrate the V16 water into the Floor 2 environment.
- **Floor 6: DESIGN SELECTED / F6 CANDIDATE**. User explicitly redirected the V16 water appearance to Floor 6 (sealed garden / flower field). Preserve the existing look as a Floor 6 candidate, not an F2-approved game asset.
- Earlier response 「まあokとします」 indicated acceptance of the V16 visual direction; the newer explicit floor reassignment **supersedes its F2 deployment meaning**.
- No new F6 scene or water placement has been rendered/verified yet. The user has not approved a specific F6 placement, scale, integration, or runtime result.

## Verifiable source
- V16 3-view Blender render: [Actions #44642462947](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44642462947), `success`; source commit `c6d4111d3f8780e3adb1464a7aa19f93f5c7e63b`.
- Temporary GitHub Actions artifact: `f2-water-scan-render-candidate`, ID `14589827915`. Contains `f2-water-v16.blend`, front/side/angle PNG, texture PNGs and manifests; **no GLB**.
- Previous working branch `feature/f2-safe-water-render-20261119`, Draft PR #517. Source filenames retain F2 names as historical provenance only; the new intended stage is F6.
- GitHub Actions Artifacts are temporary, not permanent approved assets.

## Next work
1. **Preserve the original V16**: no in-place destructive changes. Keep V16 blend, scans, image hashes and 3-view evidence intact.
2. Create an **independent Floor 6 staging/promotion branch** based on current `development`. Use the original verified V16 source as input and label it Floor 6.
3. Export/test GLB if runtime water representation allows it; Blender node-based water transparency/reflections will **not necessarily reproduce in Three.js GLB**. An appropriate Three.js runtime water material and actual F6 environment test are separate tasks.
4. Review dimensions, shoreline placement, tile integration, collision and performance. Re-render in actual F6 context before declaring final.
5. Commit source/PNG/manifest and any valid F6 candidate export through a reviewable Draft PR to `development`, following asset-promotion rules. Do not merge without evidence and approval.

**Status: F6 VISUAL CANDIDATE, F2 NOT ADOPTED, F6 RUNTIME NOT VERIFIED, NO FINAL PROMOTION.**
