# Floor 3 wall 01 — actual Blender 3-pass render review

Status: **NOT_APPROVED** (no gameplay integration or official asset promotion).

- Working branch: `feature/gpt-b3-concrete-wall-piece-20261118`; Draft PR #504 targeting `development`.
- Scope: ONE freestanding concrete wall slab only (nominal 3.6m × 2.8m × 0.30m). Windows, metal, brick, vines, rubble and architecture assemblies intentionally excluded.
- Source: `tools/floor3/wall01/build_wall.py`, workflow: `.github/workflows/floor3-wall01-render.yml`.
- Successful Blender Actions run: [#44239558565](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44239558565).
- Artifact: `floor3-wall01-three-iterations`, ID `14398279791`. V1/V2/V3 each contain GLB, Blend, front/side/angle PNG (15 model and render files total), plus manifest and Blender log. Verified every manifest SHA-256 against downloaded bytes.
- First attempted run #44239332635 failed before rendering due to duplicated Blender executable in Docker entrypoint. Fixed and rerun succeeded.
- Visible comparisons: V1 too pristine, V2 marginally stronger microrelief, V3 modest irregular silhouette. All three remain too evenly colored and overly smooth, with insufficient actual chipped concrete and coarse aggregate. No final visual approval is claimed.
- Next revision MUST remain wall-only: work on one localized spalled edge, larger physically plausible fracture silhouette and PBR concrete roughness before expanding to rebar/windows/debris/plants. Never change original building/approved game assets.
- Shared 3D Performance Audit, if triggered on the PR, analyzes committed assets, not these unapproved generated wall GLBs. Do not claim runtime FPS has been tested.
- Resumability: per-version .blend checkpoints are written to the artifact and can be manually retrieved/verified; an automatic cross-job continuation state machine is not demonstrated for wall01.
