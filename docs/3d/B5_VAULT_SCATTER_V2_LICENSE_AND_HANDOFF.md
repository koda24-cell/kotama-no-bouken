# B5 Gothic Vault Scatter — V2 reference and license audit

## Artistic target
Stylized, readable stone silhouettes and worn ancient masonry, with a broad visual quality target comparable to *The Legend of Zelda: Breath of the Wild*. This is **not** a reproduction of Nintendo meshes, textures, maps or character designs.

## License audit (2026-11-14)
- Poly Haven: site confirms its downloadable 3D assets, textures and HDRIs are CC0. https://polyhaven.com/license
- ambientCG: site confirms assets are CC0. https://ambientcg.com/
- Kenney: site confirms game asset pages are CC0, individual package license should be retained. https://kenney.nl/support
- Nintendo/Breath of the Wild: **not CC0**; do not copy/extract game assets.
- Current V2: **all geometry is original procedural Three.js code; no external meshes or textures imported**. Thus no third-party asset attribution is needed for the code's meshes. CC0 sources above are vetted potential future material sources, not assets used yet.
- Pinterest: no Pinterest image downloaded or reused in this revision. Visual-reference handoff should be recorded separately if images are later selected.

## V2 changes
- Retain all V1 meshes; add large irregular stone shapes with bevel-like shoulders and chipped broad facets.
- Fallen rib: larger curved blocks and endpoint rubble.
- Pointed arch: segmented upward rising fragments.
- Carved block: raised four-lobed decoration and cornice damage.
- Broken panel: uneven overlapping stone plates, peripheral rubble.
- Iron: secondary bent connectors and stone anchors.
- Rubble: large angular chunks among smaller debris.

## Verification and promotion
- Exporter uses `addB5VaultScatterDetails` from `field/assets/b5-vault-scatter-details-v2.js`.
- GitHub Actions: `.github/workflows/b5-vault-scatter-render.yml`; 6 GLBs and 18 Blender PNGs.
- Do not call V2 complete before the new run succeeds and its renders are inspected.
- Do not promote to `assets/models/floor5/` until user approves.
