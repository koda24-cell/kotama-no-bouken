# Blender 5.3: deliberate mid-render process kill and checkpoint recovery

## Goal
Validate the failure boundary that PR #707 could not test: what happens when the **Blender process itself** dies during an in-progress render. Do not damage or replace any production scene.

## Isolated protocol
1. Job `checkpoint` builds the B2 watergate scene with pinned Blender 5.3, performs render QA and ClamAV, generates a hash-verified `NOT_APPROVED` checkpoint and uploads an immutable Artifact.
2. Job `kill-probe` starts fresh, downloads and verifies stage 1, scans files before Blender import, then starts a **separate Blender child process** with `kill_during_render_probe.py`.
3. The Blender `render_pre` handler writes a sentinel and sends `SIGKILL` **only to its own PID**. The parent shell checks that the sentinel exists and the process exited with code 137, then *deliberately fails the job* to test GitHub failure routing.
4. Job `recovery-after-failure` is guarded by `always() && needs.checkpoint.result == 'success' && needs.kill-probe.result == 'failure'`. It launches in a clean container, downloads the previously uploaded stage-1 Artifact (not transient or unverified files from the failed job), validates source commit and SHA256 manifest, scans it, opens Blender, rerenders, scans and uploads the recovered stage 2.
5. The overall workflow run is **expected to show failure**, because the kill-probe job intentionally fails. A successful experiment therefore requires the specific expected failure with code 137 and sentinel, successful recovery job, and two distinct unexpired Artifacts. Do not interpret overall red status as a failed recovery by itself.

## Limits
- The test intentionally kills Blender immediately after its render-pre event, not halfway through a long path-tracing computation. The distinction must be reported.
- It demonstrates **rollback to the last already uploaded checkpoint**, not reconstruction of data that had not been saved or uploaded.
- It does not terminate the GitHub runner, cancel the workflow or simulate a host power loss; those are separate failure modes.
- The recovered Blender scene is a QA model, not any approved production asset; original geometry and game assets are untouched. No automatic approval or promotion.
- All Artifacts expire in 14 days. Retain Draft until actual logs prove sentinel, kill exit code, conditional recovery job and saved recovered output.
