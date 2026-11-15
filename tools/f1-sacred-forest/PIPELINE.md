# F1 individual asset pipeline

This helper exports **one authored asset per invocation**. It does not generate
the dungeon or integrate candidates into the game. Existing B1 files are never
opened for writing.

In an individual Blender Python script:

```python
from common import reset_scene, material, cube, mesh, tube, uv_world, finish
reset_scene()
# Author the asset's geometry here, in metres / Z-up / front -Y.
# Use image MR materials, physical chips and a readable silhouette.
finish('individual_asset_id', 'props', '日本語の説明と原点仕様')
```

## API

- `material(name, color=(r,g,b[,a]), roughness=.82, texture_set=None)` creates
  image-based Principled PBR. Texture keys: `basecolor`, `normal` (+Y/OpenGL),
  `orm` (R occlusion, G roughness, B metal), or `roughness`. Pass texture paths
  explicitly for downloaded CC0 textures and record source/license separately.
- Without explicit textures, files in `F1_TEXTURES` or
  `tools/f1-sacred-forest/textures/<name>_{basecolor,normal,orm}.jpg` are used.
  If unavailable, original 256px material-finish maps are produced. These maps
  are a procedural fallback, **not photogrammetry or scanned texture assets**.
- `cube(name,loc,size,mat,bevel=.03)` applies scale and a two-segment bevel,
  then assigns metre-consistent dominant-face UVs.
- `mesh(name,verts,faces,mat)` creates custom polygonal geometry. Supply a
  custom UV layer for leaf atlases or inscriptions. Missing UVs receive
  world/metre planar mapping before material grouping.
- `tube(name,points,radii,mat,sides=8)` makes an explicit polygonal sweep with
  circumference / path-distance UVs. Radii can be one number or one per point.
- `uv_world(obj,scale=1.0)` sets one texture repeat per `scale` metres.
- `finish(id,category='props',description='',render=True)` applies modifiers,
  groups surfaces by material, removes vertex colors, packs source images,
  writes a `.blend`, exports standard GLB, validates glTF structure and records
  actual bounds, triangle/primitive counts, embedded images and SHA-256.
  It then deletes the source scene and **reimports that GLB** for front / side /
  angle / top PNG evidence. No successful render is claimed from code alone.

Outputs live in `assets/3d/dungeons/b1_sacred_forest_candidates/`. All candidates
remain `pending_visual_review`. The parent manifest and approval process must
record actual image review separately from successful file export.

## Rendering controls

CPU Cycles, AgX, neutral floor and three area lights. Defaults:
`F1_RENDER_RES=640`, `F1_RENDER_SAMPLES=24`, `F1_RENDER_THREADS=4`.
Only invoke assets sequentially to avoid competing CPU render jobs. A failure
leaves the GLB and a metrics file with `renderError` for honest diagnosis.

## Verification status

- Python syntax compiled.
- Blender 5.3.0 exporter options inspected: vertex color export is
  `export_vertex_color='NONE'`, rather than legacy `export_colors=False`.
- Blender image-file writing checked with a small neutral pixel test; image
  values are preserved. No third-party image was used for this test.
- Asset GLB export and render verification must be recorded from actual asset
  invocations; this helper's creation alone does not prove those operations.
