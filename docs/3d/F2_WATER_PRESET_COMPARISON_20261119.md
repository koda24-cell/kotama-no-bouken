# F2 clear / genshin / tropical preset comparison — 2026-11-19

Official upstream: https://github.com/xuchaozou/three-stylized-water
Upstream reference file: `src/water/presets.json` (main, read on 2026-11-19).
License: MIT (repo LICENSE), original Unity port attribution preserved. This note records configuration only; no upstream code or texture copied. No installation, antivirus execution, rendering, runtime FPS or visual approval occurred.

| Parameter | clear | genshin | tropical |
| --- | ---: | ---: | ---: |
| Enable shoreline `_ENABLESHORELINE` | 0 | 1 | 1 |
| Enable intersection `_Enable_Intersection` | 0 | 0 | 1 |
| Enable caustics | 1 | 1 | 1 |
| Enable refraction | 1 | 1 | 1 |
| Enable wave geometry | 0 | 0 | 0 |
| Caustics strength | 3 | 0.5 | 1.33 |
| Normal strength | 0.49 | 0.7 | 1.4 |
| Normal scale | 5 | 3 | 15 |
| Refraction strength | 0.2 | 0.5 | 0.5 |
| Reflection strength | 1 | 0.813 | 0.875 |
| Shore fade smoothness | 0.353 | 0.167 | 0.488 |
| Color shallow (raw RGB) | 0.227, 0.823, 0.451 | 0, 0.695, 0.367 | 0.024, 0.823, 0.988 |
| Color deep (raw RGB) | 0, 0.254, 0.451 | 0, 0.527, 0.652 | 0, 0.246, 0.539 |

These are upstream raw parameters, not measured physically meaningful values. In particular, `_ENABLEWAVE=0` for all three means no geometry displacement even where the two wave parameter sets are populated. Color interpretation depends on upstream shader space; alpha differs. Avoid interpreting numeric presets as actual screenshot quality.

## Proposed separate Kotama prototype, never production merge without approval
- Start from clear for a stable, low-normal-strength water surface and strong bottom-light cue.
- Add genshin-style `_ENABLESHORELINE` (with softened threshold) only for suitable shore tiles; build as a separate parameterized feature, do not overwrite whole clear preset.
- Add tropical-style `_Enable_Intersection` only at rock/water contact zones, avoid uniformly repeated white edges.
- Keep underwater stones/sand geometry with legally confirmed CC0 PBR, and bake only what glTF/Three.js can represent; do not expect Blender shader graph to survive GLB unchanged.
- Test two-pass refraction/depth buffer implementation and its WebGL compatibility before gameplay integration. Verify camera positions, visible bottom, tone mapping, ice shadows, seams, and mobile frame time.
- Compare 3 view angles across 3 scenes: shallow rock bed, still water, flowing channel. Record image and SHA per rendered variant; distinguish actual renders from illustrations.
- Security: static source review, dependency license/security audit, SHA256, malware scan on downloaded files, isolated rendering. Do not execute unscanned Python add-ons.
- Demo URLs: https://norio.github.io/three-stylized-water/?preset=clear ; https://norio.github.io/three-stylized-water/?preset=genshin ; https://norio.github.io/three-stylized-water/?preset=tropical .
- Need inspect game's actual Three.js import/version and shaders before implementation. Root package.json unavailable on development (404); not grounds to assume a version.

## Current status
Preset source read: yes. License file read: yes (MIT). Executable downloaded: no. Antivirus scan: no. Browser preview personally inspected: no. Blender render: no. In-game merge: no.
