# Shared 3D Production Library (portable workspace)

This is a **project-independent staging area** inside the Kotama repository until a standalone repository is created. Do not import this folder into the game runtime. The structure is designed for copying unchanged to a new Git repository.

## Index
- addons/ADDON_CATALOG.md — Blender addons and installation/compatibility
- textures/TEXTURE_CATALOG.md — PBR texture providers, licenses
- animation/ANIMATION_CATALOG.md — animation/retargeting sources
- characters/CHARACTER_CATALOG.md — heads, bodies, hair, clothes
- workflows/USAGE.md — asset provenance, tests and reuse

Status distinctions: **catalogued** = URL/license recorded; **downloaded** = actual bytes archived; **verified** = imported and rendered/tested. Never describe a catalog entry as installed.

## Transfer to dedicated repository
Copy this directory to the new repo root, preserving paths and license manifests. Later add upstream source archives only when redistribution rights and hashes have been checked. Keep binary models/textures in LFS or releases when necessary. The separate repository has NOT yet been created.

## Collaboration
GPT and Claude should read this index before 3D modelling, hair, materials, or 3D animation work. Track source URL, version, license, original archive SHA256, file count, Blender version, tests and preview PNGs. No automatic promotion to game assets.
