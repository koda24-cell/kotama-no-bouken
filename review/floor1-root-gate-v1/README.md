# Floor 1 ancient root gate — V1 review candidate

Unapproved standalone asset. No game runtime changes. Concept reference: https://github.com/koda24-cell/pinterest-reference-library/pull/6

- Base development: 5921dc21ef19f114a1d9ba4a434152ed69e76eef
- Source: tools/floor1/root_gate/build.py; deterministic seed 81.
- Reproduce: `blender -b -t 8 --python tools/floor1/root_gate/build.py -- review/floor1-root-gate-v1`
- Coordinates in Blender: Z up, front -Y; GLB exporter converts to glTF Y up. Meters, ground at zero.
- Jamb inner width approximately 2.2m; 4m grid landmark, canopy and roots extend outside one tile. Requires a widened landmark area and separate collision bounds. Not a drop-in corridor tile.
- Materials use generated colors and geometry. Blender noise/bump is preview only and is not baked into GLB. GLB appearance must be checked in browser before approval.
- Local Blender 4.3.2 Cycles CPU used instead of legacy floor4 Docker promotion (which only accepts cart/furnace/mine-rig). No Actions run claimed.
- First render failed because this build lacks OpenImageDenoise. Disabled denoising and reran.
- Claude consumes GLB, PNGs and manifest only. Approval and formal asset promotion remain pending; do not integrate this candidate automatically.

## Visual review
- Three actual Cycles views produced. Rounded branches and root paths revised after first render.
- Remaining: crown roots still look too regular; bark and stone wear need more physical detail; foliage clusters need a less flat silhouette. This is a V1 blockout, not finished quality.
- GLB header, length, mesh count and Blender reimport verified (13 meshes). Browser integration is untested.
