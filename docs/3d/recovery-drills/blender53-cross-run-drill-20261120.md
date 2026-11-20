# Blender 5.3 cross-run recovery drill — 2026-11-20

One-time test marker for the `development` stage-boundary checkpoint workflow.

Expected sequence:
1. Stage-one generates a real Blender 5.3 watergate checkpoint, validates it and uploads an unapproved artifact.
2. Stage-two fails deliberately only when the squash merge commit message includes `[blender53-recovery-drill]`.
3. External recovery worker should validate the failed run, source commit and artifact, then resume Blender and produce unapproved QA outputs.

No production assets are changed. Intentional red workflow conclusion is expected; success of cross-run recovery must be verified separately.

## Final automatic monitor drill

A new post-activation development run intentionally fails stage two after uploading its checkpoint. The external scheduled monitor is expected to detect it and dispatch the trusted Blender 5.3 recovery worker without manual worker dispatch. All outputs remain NOT_APPROVED. This section is a trigger record, not a claim of completed verification.
