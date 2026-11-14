# Blender addon catalog

| Tool | Source | License | Use | Status |
|---|---|---|---|---|
| HairMesh v1.0.0 | https://github.com/riel-gab/hairmesh ; https://booth.pm/ja/items/9094549 | GPL-3.0-or-later (addon) | Anime hair quad meshes from curves, roots and clumps | upstream fetched; Blender 5.0.1 import/register/unregister smoke test succeeded; actual hair-generation operation NOT tested |
| Blender Geometry Nodes / Hair Curves | https://docs.blender.org/manual/en/latest/modeling/geometry_nodes/hair/generation/interpolate_hair_curves.html | Bundled Blender functionality | Interpolate hair from scalp guide curves | available in Blender generally; integration not tested |
| Rokoko Blender Retargeting | https://github.com/Rokoko/rokoko-studio-live-blender | check repository before redistribution | Retarget motion to humanoid rigs | catalogued; not installed |

| GBH Tool | https://github.com/GixoXYZ/BlenderGBHTool | verify upstream license before redistribution | Geometry Nodes-based hair tools | source downloaded; import succeeded, direct register failed with KeyError 'gbh_tool' in run #43600753519; enable via Blender addon manager and retest |

**Compatibility:** upstream declares Blender 5.1+; source registration smoke test nevertheless passed on Blender 5.0.1 (GitHub Actions run #43600753519). This does NOT establish that its operators work correctly on 5.0.1. Upgrade and exercise actual hair creation in isolated tests before production use.

**License note:** GPL covers the HairMesh addon source; the author's distribution page says the hair meshes made with it belong to the creator. Do not copy third-party addon source into this repository before license notices and provenance are recorded.


## Verified workflow evidence (2026-11-14)
- Addon registration probe: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43600753519
- Assassin V8 four-view Blender render: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43602563759 — uses Blender-native procedural geometry, **not** HairMesh/GBH operators.
- Assassin V9 clean hair rebuild: https://github.com/koda24-cell/kotama-no-bouken/commit/35b30d3d09db9e628376e0796d77810e39bb4b91 — original hair hidden, source preserved; render status must be checked separately.
