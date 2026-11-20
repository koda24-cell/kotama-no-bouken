# Assassin original head V3–V7 iterative Blender comparison, 2026-11-19

**Status: Five visual candidates compared, V7 current best structural iteration, aesthetic quality NOT_APPROVED.** V1/V2 archives remain available. No Shibu or Vita geometry was imported into V4–V7, nor were any source vertices copied. Their imported 3D models are only visual/anatomical references, **not production geometry**.

| Version | Actual GitHub Actions render | Diagnosis against prior and source silhouette | Approval |
|---|---|---|---|
| V3 | [44460807596](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44460807596) | Severe horizontal stripes/step shading all around face and occiput caused by zero-derivative `smoothstep` transitions between cranial sections. | REJECT |
| V4 | [44463777904](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44463777904), artifact **14501566641** | C1 continuous PCHIP cranial sections eliminated major horizontal bands; face/chin/back silhouette over-tapered into a reversed triangle; detached cylinder neck. 6241 main head vertices / 6144 quads. | REJECT |
| V5 | [44465277086](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44465277086) | First one-piece head-to-neck surface (instead of separately intersected cylinder); 8161 head vertices / 8064 quads; still overly long-looking neck, thin jaw and lower occiput. Initial run 44464571984 created real outputs but failed validator due to wrong expected vertex count; validator fixed in rerun. | REJECT |
| V6 | [44465433639](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44465433639), artifact **14502251291** | Shortened neck/adjusted skull and chin; smooth surface, no stripe; face appears triangular/too elongated, rear occiput still over-tapers below ears. 8545 vertices / 8448 quads. | REJECT |
| V7 | [44466355335](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44466355335), artifact **14502237421** | Increased lower jaw width, reduced nose bump, moved placeholder ears closer to skull. Seven real 720x720 images, Blend, GLB, QA and manifest validated. Overall face, eyes, pinna and rear lower contour still simplified, not near final quality. | **NOT_APPROVED** |

## Validated build criteria
- Every source-free variant V4–V7 generated real front / both sides / front oblique / rear / rear oblique / rear upper images via Blender Actions, not image generation.
- V7 output `main_head_vertices=8545`, `main_head_quads=8448`, `main_head_triangles=96`, `head_lower_open_edges=96`, no main head edge with incidence > 2, `C1_PCHIP_HERMITE` and derivative jump < 0.01. Geometry is an **original blockout**, not finished expression/rig topology.
- V4–V7 source import boolean false and copied vertices zero. Source license of Shibu remains unverified; no source mesh was delivered as original.
- All GLB/Blend remain inside GitHub Actions artifact storage, **not promoted**. No game runtime edits and `main` unchanged.

## Next quality gates (not achieved)
1. More realistic face/cranial proportion versus real Shibu 3D source, reviewed by front, lateral, rear views with a consistent normalization of camera/scale; current front face is still a placeholder, so comparing rendered photos is visual, not metrically equivalent.
2. No apparent long tapered jaw/neck, no extreme triangular lower occiput; retain head-to-neck continuity.
3. True topology for eye socket, nostril/nose bridge, ears/helix, jaw angle, mouth line, rather than suspended sphere and curve markers. Their placeholder geometry should be systematically replaced after skull silhouette passes.
4. Side/back angular difference vs reference and forward facial landmark consistency. Keep full-head 7-view evidence **every iteration**, never approve posterior-only cap.
5. Repeat design→real render→inspect loop, stop/pause with explicit NOT_APPROVED status instead of asserting automated artistic success. Full unsupervised visual AI quality loop is not verified in current Actions.

**No automated indefinite background process has been configured by this PR.** Another actual run requires explicit new commit/workflow trigger; static QA success does not certify aesthetic quality.
