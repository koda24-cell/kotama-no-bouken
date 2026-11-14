# Floor3 elevated bridge modular kit

4 tiles: straight, end, collapse, support. Each occupies nominal 2m x 2m, bridge axis Y, deck top z=0.485m. Connector conventions: N=(Y +1), S=(Y -1). End terminates at north; collapse is intentionally non-walkable; support is visually lower than floor plane, so adjust world support height as needed. The scene is Z-up in Blender, exported GLB through Blender's standard exporter; test Three.js orientation before game integration.

Run `blender -b -t 2 --python tools/floor3/elevated_bridge/build.py` in a checkout mounted to /work. Generates 4 GLB + 12 PNG into /work/out. Render viewpoints: front/side/angle.

Status: prototype awaiting actual Blender Actions verification, visual review and user approval. No game runtime integration. Preserve V1 models; revise via additive details. Standard Blender only, no external models or copyrighted game assets.

Technical reference: `docs/3d/STYLIZED_GAME_TECH_LIBRARY.md` in research PR #343; asset policy: `docs/3d/ASSET_PROMOTION_POLICY.md`.
