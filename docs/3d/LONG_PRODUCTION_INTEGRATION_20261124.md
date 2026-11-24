# 長時間制作統合仕様 (2026-11-24)
Status: integration design, not deployed. Initial total wall-clock budget 360 minutes; future 1440 via configuration and multiple jobs. GitHub hosted job hard limit 360 minutes; reserve at least 15 minutes for QA/upload, adjust from measured duration. No paid runners/API. Do not start a render that cannot reasonably fit remaining hard budget; use compatible tiles/frames or defer. 80/90 minutes are soft routing hints, never kill healthy renders solely for these thresholds. Overall budget and per-job budget are separate; queue delays count toward total elapsed time.

## Reuse map
- #666 shared-blender53-recovery.yml and checkpoint verification: existing merged gateway.
- #671 durable stage upload; #673 conditional same-run recovery; #708 deliberate process-kill drill.
- #704/#706 reusable-stage-worker and 12-stage caller: merged watergate-specific QA, 90-minute hard timeout and simulated routing, NOT generic production. Adapt rather than overwrite existing test.
- #710 render_half_frame.py / stitch_half_frame.py: verified watergate tile recovery; #711 seam_qa.py fixed 1000x760 thresholds; calibrate per scene before enabling tiling. Preserve camera, seed, samples, color management, source hashes and tile geometry. Full-frame reference gate during validation, not mandatory rerender for every recovered tile.
- #724 artifact-only recovery is open draft; integrate only after actual caller QA, do not merge blindly.
- #667 bounded retry selector: reuse provenance and retry rules; distinguish failure, cancellation, timeout, missing artifacts and explicit stop.

## State and routing contract
Plan -> build -> durable scene checkpoint -> render (whole view or compatible tiles) -> durable upload per view/tile -> technical QA -> artistic review -> next iteration or finish. Save source SHA, scene hash, render settings hash, job/run ID, view/tile coordinates, file hashes, iteration, absolute deadline, retry count, NOT_APPROVED. Only verified uploaded artifacts count as durable. On restart verify identity and scan before import. Skip valid completed units; retry missing units only. QA-only failure uses saved-render recovery where verified. Never publish unapproved assets. A healthy active render ignores soft handoff, but platform hard limits cannot be bypassed. No new work beyond budget; checkpoint and report incomplete if necessary. Explicit user cancellation must not auto-restart.

## Acceptance gates
1. Audit actual current workflow paths, logs and artifacts; preserve existing assets and callers.
2. Add independent policy tests for 80/90 minute active render, deadline, insufficient remaining budget, retry cap, future 24h configuration, invalid state.
3. Connect generic worker adapter to existing checkpoint and recovery workflows; verify real Blender 5.3/ClamAV, per-view durable uploads and recovery with injected failure. Validate tile seam for each supported scene class.
4. Test actual elapsed time separately from simulated clock; no claim of 6h endurance before actual run.
5. AI aesthetic review remains manual unless a permitted no-extra-cost execution path is demonstrated. Technical QA is not aesthetic approval.
6. Review PR into development only after evidence; main untouched. Artifacts temporary, 14 days.
