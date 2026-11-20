# Second recovery drill trigger

The prior squash merge subject omitted the expected marker, so the run completed normally. This PR uses a commit subject containing the exact `[blender53-recovery-drill]` gate string, and changes only this marker file. The source workflow listens for this path only when amended below; this file must be included in its path filter before merge.


## 2026-11-21 sender end-to-end drill

Intentionally trigger stage-two failure only after stage-one checkpoint upload, to validate notify-recovery job and receiver handling. No approved asset promotion. The merge commit subject must contain `[blender53-recovery-drill]`; this is an explicit recovery-system test.
