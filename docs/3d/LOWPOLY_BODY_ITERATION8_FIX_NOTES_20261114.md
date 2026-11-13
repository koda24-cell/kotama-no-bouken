# Low-poly body iteration 8 — topology repair

- Reference: Pinterest pin 878835314813441339; front/side silhouettes at equal height.
- Iteration 7 diagnostics: GitHub Actions run 43454968361 succeeded as a workflow but QuadriFlow returned `{'CANCELLED'}`. The model remained 652 vertices, 1251 faces, only 49 quads; silhouette errors 16.67px front and 11.57px side.
- Root cause not proven. Working hypothesis: invoking QuadriFlow after aggressive decimation leaves an unsuitable low-density mesh; the operator may also fail for other reasons.
- Iteration 8: invoke QuadriFlow on the dense voxel-unified mesh **before decimation**, with symmetry disabled. Require `FINISHED` and at least 60% quads.
- If QuadriFlow fails, decimate as before and attempt conservative triangle-to-quad pairing (40-degree face/shape thresholds). This fallback improves polygon grouping but does **not** constitute proper anatomical edge-loop retopology.
- Keep original body proportions, preserve existing geometry when possible, rerender Eevee four angles, measure overlays, record quad count.
- Do not mark approved, merge, or promote assets until render and silhouette checks pass.
