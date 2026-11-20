# Blender 5.3 automated recovery status (2026-11-20)

The two-job checkpoint pipeline is proven in run 44671823410, PR #671. Stage-one uploads a durable artifact before stage-two begins. This prevents loss of all prior stages when stage-two fails, but does not save in-memory work on sudden runner death.

`tools/3d_checkpoint/auto_recovery_decision.py` is a fail-closed **decision-only** component. It requires a failed/timed-out completed `development` run, allowlisted workflow, source SHA, and exactly one non-expired matching stage-one artifact. Retry limit is 2. It does not call GitHub APIs or dispatch anything.

**Automatic dispatch is NOT enabled.** GitHub `workflow_run` and `workflow_dispatch` triggers require their workflow to exist on the repository default branch. This project deliberately reserves `main` for approved changes; do not silently put the recovery dispatcher there. A future implementation needs a reviewed trusted dispatcher on the default branch, or an external trusted orchestrator, with minimal permissions, run provenance checks, idempotency, retry accounting and an end-to-end forced-failure test.

The generic recovery gateway in `.github/workflows/shared-blender53-recovery.yml` is not yet validated with a second unrelated asset. Do not claim universal compatibility or automatic recovery.
