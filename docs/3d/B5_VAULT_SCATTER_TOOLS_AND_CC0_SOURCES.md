# Stage 5 / Gothic vault scatter — reusable modeling tools and CC0 sourcing

## Start here (GPT and Claude)
Read `AGENTS.md`, `docs/3d/BLENDER_DOCKER_HANDOFF.md`, `docs/3d/ASSET_PROMOTION_POLICY.md`, then this file **before** making the six vault-adjacent scatter objects. Do not edit the five approved vault models.

## Installed in Git
- `tools/b5-vault-scatter-render/gothic_modeling_helpers.py`: self-contained Blender/bmesh modeling utility; no external add-on required.
  - `chipped_stone`: beveled angular stone, for fallen rib, arch, carved block, vault panel.
  - `chipped_rock_cluster`: larger rubble + small debris, for rubble and panel.
  - `stone_arch`: pointed Gothic voussoir arch for arch fragment and ribs.
  - `carved_quatrefoil`: curve-based relief for carved block.
  - `chain`: actual linked torus chain for hanging iron.
  - `apply_modifiers`: bake bevel/normal modifiers before export.
- `field/assets/b5-vault-scatter-props.js`: V1 original Three.js model.
- `field/assets/b5-vault-scatter-details-v2.js` and `-v3.js`: additive modeling passes.
- `tools/b5-vault-scatter-render/export.mjs`: GLB export.
- `tools/b5-vault-scatter-render/render.py`: Blender front/back/oblique review.
- `.github/workflows/b5-vault-scatter-render.yml`: automated 6-model render.

### Example Blender usage
```python
import sys
sys.path.append('tools/b5-vault-scatter-render')
from gothic_modeling_helpers import chipped_stone, stone_arch, carved_quatrefoil, chain
stone_arch(name='test_arch',span=2.0,rise=1.6,blocks=9)
chipped_stone('fallen_block',(0,0,.3),(1,.5,.6),seed=42)
carved_quatrefoil(center=(0,-.27,.35))
chain(links=7)
```

## Source / license ledger — candidate sources, NOT yet downloaded
| Source | Content to consider | License evidence | Usage |
|---|---|---|---|
| Poly Haven | worn stone, rough rock, masonry materials, rock meshes | https://polyhaven.com/license (CC0) | rocks / stone surface |
| ambientCG | stone, concrete, rock, damaged wall PBR textures | https://ambientcg.com/ (CC0) | stone material |
| Kenney | prototype game props, low-poly rocks | https://kenney.nl/support (CC0 policy; confirm per pack) | base meshes only if matching art direction |
| Blender built-ins | Bevel, Weighted Normal, Remesh, Decimate, Curve, Geometry Nodes | bundled in Blender; no asset download | modeling and optimization |

**Do not import Zelda/BotW game models**: Nintendo content is not CC0. An inspiration target is not a reuse license.

### Acquisition status
As of this revision, **the procedural Blender helpers have been saved in Git**; **no Poly Haven, ambientCG or Kenney model/texture binary has been downloaded or committed**. The current runtime's external download attempt to `api.polyhaven.com` failed at DNS resolution. A URL/manifest alone is not an imported CC0 asset. Once an exact file is downloaded and inspected, record its asset URL, author, license page, checksum, file size and source timestamp in this ledger before using it. Keep external downloads in `tools/third_party_cc0/` or a dedicated staging directory, not in approved `assets/models/floor5/`.

## Required quality gate
1. Generate the six GLBs and actual Blender front/back/oblique PNGs.
2. Check geometry overlap, silhouette, structural joints and broken edges.
3. Present screenshots to user; do not call complete before visual review.
4. On approval, save GLB/PNG permanently in Git via the promotion policy. Do not merge unapproved assets into `development`.

## Separation
The standing columns and rubble around the Gothic gate are being worked on separately; this file applies only to scatter objects around the vaulted ceiling.
