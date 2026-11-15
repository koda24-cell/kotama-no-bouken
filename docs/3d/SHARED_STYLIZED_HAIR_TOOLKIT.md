# Shared 3D hair creation helpers (Blender)

## Purpose
Reusable **character-independent** hair geometry for other characters, scenes and future projects. The reusable module is `tools/3d-shared/stylized_hair.py`. It does not import the Assassin or game-stage code.

## Current implementation
- `tapered_strand(name, points, widths, material=None, sides=12, depth_ratio=0.3, collection=None)`: creates a separate smooth-shaded closed mesh with an elliptical cross-section along 3D guide points.
- `create_hair_material(name, rgba)`: simple reusable material.
- Supports overlapping clumps for anime bangs, side locks, ponytails and tufts.
- No destructive edits to the source head. Compatible with Blender Python scripts that have `bpy` and `mathutils`.

## Example
```python
import sys
sys.path.insert(0, "/path/to/repo/tools/3d-shared")
from stylized_hair import tapered_strand, create_hair_material
mat = create_hair_material()
tapered_strand("front_lock", [(0,0,1),(.1,.1,.8),(.15,.1,.6)],
               [.15,.13,.008], material=mat)
```

## Recommended workflow
1. Preserve original head and hairstyle meshes.
2. Build several thick guide clumps; place them around face/eyes and inspect from front, side and three-quarter.
3. Add medium and small clumps; tune widths, depths, tip positions and intersections.
4. Optionally add Blender Geometry Nodes modifiers for procedural variants.
5. Render and visually verify before GLB export or asset promotion.

## HairMesh addon
HairMesh is an **optional external candidate**, not bundled or installed by this commit. Verify its license, Blender version and API before use. Do not claim HairMesh or Geometry Nodes are active merely because this module exists. The current Assassin branch uses its own in-script strand generator; migrating it to this module is a separate follow-up.

## Sharing and limits
Other ChatGPT/Claude sessions should read this file and import `tools/3d-shared/stylized_hair.py` when appropriate. For use in a separate repository, copy or package this module with attribution to this project's original implementation. This branch is a PR candidate; do not treat it as available in `development` until merged. Actual Blender execution of the shared module remains to be tested.
