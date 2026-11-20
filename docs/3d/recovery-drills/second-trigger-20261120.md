# Second recovery drill trigger

The prior squash merge subject omitted the expected marker, so the run completed normally. This PR uses a commit subject containing the exact `[blender53-recovery-drill]` gate string, and changes only this marker file. The source workflow listens for this path only when amended below; this file must be included in its path filter before merge.
