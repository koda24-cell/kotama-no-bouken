# B4 Volcanic Stele V8 — research/design/QA

Status: UNAPPROVED / pending actual Blender render review.

## Source research and licensing
- Zhongli Stone Stele is a visual/technical reference only; no Genshin model, shader code or textures imported: https://www.hoyolab.com/article/35746428
- Poly Haven volcanic rock tiles (CC0): https://polyhaven.com/a/volcanic_rock_tiles ; candidate for pitted surface, normal and roughness; not downloaded or integrated in V8.
- ambientCG Rock030 (CC0): https://ambientcg.com/view?id=Rock030 ; alternative cliff surface; not downloaded or integrated in V8.
- ambientCG Rock060 (CC0): https://ambientcg.com/view?id=Rock060 ; alternate rough stone; not downloaded or integrated in V8.
- Kenney Particle Pack CC0: https://kenney.nl/assets/particle-pack ; candidate embers, not integrated.
- Kenney Smoke Particles CC0: https://kenney.nl/assets/smoke-particles ; candidate volcanic vent smoke, not integrated.

## Geometry and shading design
1. Preserve V7 mesh approach and asset separately; do not modify the game runtime.
2. Obsidian-black monolith with broad asymmetrical face and fractured upper crown.
3. Independent narrow grooves displaced inward on the actual front shell (no destructive Boolean).
4. Layered shader noise/bump for porous basalt, dark ash roughness and subdued molten side light.
5. Jagged footing and sparse weathered chips; no copyrighted geometry imported.
6. VFX: restrained local ember lighting now; sprite embers and smoke deferred until tested with actual source files.

## QA gates
- Blender must exit 0, create front/side/angle/top PNG, Blend, GLB and manifest.
- Inspect images for black stone, actual inset runes, coherent base, silhouette and absence of floating elements.
- Check GLB/PNG sizes and manifest hashes, then performance audit. Artistic acceptance is separate from technical QA.
- Final asset promotion requires user approval; V8 is not a finished production asset.
