# Blender 5.3: durable half-frame checkpoint and selective recovery QA

## Hypothesis
For sufficiently expensive Cycles still renders, divide one camera image into independently rendered and durably saved **left/right halves**. After loss of the unfinished right-half render, resume only that half and stitch a final 1000×760 PNG. The previously completed left half should remain byte-for-byte unchanged.

## Experimental run
- Isolated branch `feature/blender53-half-frame-recovery-20261122`, workflow `.github/workflows/blender53-half-frame-recovery.yml`
- `original`: actual Blender 5.3 watergate QA render; full three-view QA; SHA/ClamAV-verified NOT_APPROVED checkpoint Artifact
- `left-half`: verify original and sources, render front with Blender Cycles 1000×760, render border x=0..0.5, crop-to-border; strict PNG RGBA8 parsing checks 500×760; upload left-half checkpoint **before** right starts
- `kill-right`: verify/uploaded left checkpoint, start Blender right-half render and intentionally SIGKILL only Blender at render_pre; require exit code 137 and sentinel `KILL_DURING_RIGHT_RENDER_PRE` then deliberately fail the job
- `resume-right`: conditional on expected failure, fetch saved left Artifact, verify original source hash+commit and scan with ClamAV, copy left PNG byte-for-byte and confirm SHA equality, render **right half only** in fresh job; stitch using a strict stdlib PNG decoder/encoder supporting PNG scanline filters 0–4 and CRC; verify final front 1000×760 plus original side/angle with full three-view QA, pack and scan then upload final checkpoint

## Acceptance
1. Original and left-half successful; left Artifact exists.
2. Kill-right is an **intentional failure**, with recorded sentinel and actual exit 137. Overall workflow is therefore expected **red**.
3. Recovery-after-crash succeeds, shows `LEFT_HALF_REUSED_WITHOUT_RENDER=true` and `HALF_FRAME_STITCH_COMPLETE=1000x760`.
4. All three NOT_APPROVED Artifacts are present; technical full-view QA passed.
5. Quality compare to full-frame single-pass image is not assumed identical (Cycles random samples/denoising may create subtle seams); visual QA is separate.

## Limits
- This uses two full-height, half-width tiles and is **not resumable Cycles sample accumulation** within a tile.
- Intentional failure occurs at render_pre, not after half the right image's sample computation.
- Tile save after every camera portion adds job/ClamAV/Artifact overhead and may be counterproductive for small renders.
- Fixed QA watergate model; no production geometry, `main` changes or approval.
