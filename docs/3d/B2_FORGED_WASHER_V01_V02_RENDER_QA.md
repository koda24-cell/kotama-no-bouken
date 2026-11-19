# B2 hand-forged washer V01/V02 actual Blender QA (2026-11-19)

One independent iron washer. Design: docs/3d/B2_HAND_FORGED_WASHER_V01_DESIGN.md. No change to bolt V04, hex nut V02, wood supports, game or development/main.

V01: [run 44517152392](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44517152392). Blender 5.3 Cycles, GLB, Blend, original PBR image and 4 PNG all generated, structural and SHA checks success; artifact 14526526501 physically downloaded and inspected, 7 manifest checks success. Front oxidation and irregular silhouette okay, side overexposed, back too dark. ClamAV step failed: no signature database under /var/lib/clamav. NOT a malware-negative scan.

V02: [run 44517944270](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44517944270). Reworked lighter roughness, softer rust coverage and lighting of underside, 4 actual Cycles PNG and GLB/Blend verified, artifact 14527055607 physically downloaded; all 7 manifest SHA/size checks passed. Mesh 1536 faces, GLB 1 mesh + 1 embedded original PBR image. Images show darker, more subdued metal and clearly visible rear, but side still white from high light exposure and manufacturing dents not yet detailed. Artistic status NOT_APPROVED. ClamAV bootstrap failed again because freshclam DB directory not writable for its own UID, rather than infected files.

Separate scan-only job [44518375382](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44518375382) is configured to use writable signature directory and re-check exact V02 artifact. Actual result: run 44518375382 completed/success. ClamAV 1.5.4, daily/main/bytecode databases freshly downloaded and tested; 3,628,279 signatures, eight V02 artifact files scanned, 0 infected. This is a successful scan, not a guarantee of absolute safety.

Pinterest candidates and GPT/Claude handoff: https://github.com/koda24-cell/pinterest-reference-library/pull/33. Full-size images uninspected, none used as PBR or saved.

Unverified: physical mating to bolt/nut, washer clash, actual game FPS, cross-floor shared GLB audit, final asset promotion. Artifacts temporary until approximately 2026-12-03. PR #625 remains draft and no assets formally saved.
