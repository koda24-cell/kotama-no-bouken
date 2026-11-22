# Blender 5.3 — View-level durable checkpoint + side-render failure recovery

## Purpose
Reduce wasted computation for long multiview rendering when one camera crashes. Previously a whole 3-view Blender render was the atomic unit. This isolated workflow saves the **front camera as its own verified Artifact** before attempting the side camera.

## Real test
1. `original` job creates and validates a full original B2 watergate checkpoint (base Blender 5.3, ClamAV, QA and immutable Artifact).
2. `front-checkpoint` loads only a verified and scanned original .blend, renders **front only**, validates its complete PNG header and IEND marker, copies .blend/.glb unchanged, packs source SHA and file hashes, scans and **uploads a front-only checkpoint** before attempting side.
3. `kill-side` downloads and verifies that front checkpoint, then runs side render with a `render_pre` callback that SIGKILLs only the Blender child. It requires exit=137 and sentinel `KILL_DURING_SIDE_RENDER_PRE`, then deliberately exits 1.
4. `continue-other-views` runs in a fresh job on the expected failure, verifies and scans the already uploaded front checkpoint, **copies front PNG byte-for-byte** and explicitly proves the two SHA256 hashes match, then separately renders **side and angle**, runs full 3-view QA and packs/scans/uploads a completed NOT_APPROVED Artifact.

## Passing criteria
- Original and front jobs successful; front Artifact exists **before** the crash.
- Kill-side job fails **intentionally**, accompanied by side sentinel and Blender exit code 137. Overall workflow run will normally be **failure**; this is expected.
- Recovery job finishes successfully, prints `FRONT_VIEW_REUSED_WITHOUT_RENDER=true`, completes technical QA and produces new Artifact.
- All three distinct `NOT_APPROVED` Artifacts exist and are within the retention period.
- No production asset folders or `main` modified. Merge the tooling PR only after logs prove these outcomes.

## Nonclaims
- Kill occurs at the start of the side render (render-pre), **not** while Cycles has already computed 50% of samples.
- Only **completed** camera outputs can be resumed; no partial pixel buffers or unsaved samples are reconstructed.
- Per-view checkpoint boundaries add GitHub job start, ClamAV and Artifact overhead. For short renders, this may be slower than a single job; use for long/fragile jobs, not every camera by default.
- This experiment isolates a fixed QA scene and three cameras. A generic workflow for arbitrary user models is not yet tested.
