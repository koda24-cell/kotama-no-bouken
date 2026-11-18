# Waterwheel single timber paddle — V13/V14 actual Blender QA 2026-11-18

**Status: NOT_APPROVED / no game integration / no formal asset promotion.**
Only one wooden bucket paddle has been modified. The complete preexisting waterwheel and Claude setpiece placement are unchanged.

## V13 carved timber joints
- Source: verified V12 editable .blend SHA256 `f0003d2ba199dd20c744bbf4046b8adcbbf5ae258cd40143b8d3d170d1596bac`.
- Blender Actions initial run [44216073307](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44216073307) **failed** before export because Blender5.3's glTF exporter no longer accepts `export_selected`. Fixed by unlinking source backup only during export then relinking.
- Corrected run [44216344361](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44216344361) **success**, artifact `14388512691` `b2-waterwheel-v13-carved-seams`. Actual Blender .blend/.glb and front/side/angle/back PNG with SHA checks match downloaded files. V13 original timber mesh preserved inside separate backup collection within editable .blend.
- Visible **art failure**: two black very long recessed slots (carved using boolean), read as artificial straight saw cuts rather than timber joints or naturally fractured endgrain. Preserve V13 only as experimental evidence, DO NOT APPROVE.

## V14 controlled correction
- Source: verified V13 editable .blend SHA256 `31183d4bddfd2a785c4cda6c187e65971b33c077cb42a6a6cffa44ae2d577fb4`.
- Blender V14 restores untouched source timber backup and carves only **four shorter, shallower irregular gouges**, along with 2 local endgrain tears, without replacing the waterwheel scene. Protected backup stays inside .blend; export excludes backup. Existing three embedded **Poly Haven Wood Planks CC0** photo maps (Diffuse/Normal/Roughness) are retained.
- Successful actual Blender Action: [44216971718](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44216971718), artifact `14388342739` `b2-waterwheel-v14-shallow-wood`. Actual .blend/.glb and front/side/angle/back PNG + manifest downloaded and all SHA256 checked successfully.
- V14 GLB ~2,360,220 bytes; Blender file 2,227,166 bytes; original source timber backed up in editable .blend. Actual Blender render at 820×820 pixels, 4 views, Cycles. No imaginary/AI illustration.
- **Aesthetic comparison**: V14 reads more naturally than V13 because the two long black cuts are gone; however four short marks still look somewhat like knife scratches. Photo material is still flat at close view and frost/icicles need better translucent buildup and stronger root-to-wood attachment. **NOT_APPROVED**.
- The shared cross-floor GLB Performance Audit and actual in-game Three.js performance / GLTFLoader testing **have not run**. Structural PNG/GLB hash verification is not equivalent to on-device performance.
- Next work should be a **single incremental part**: material and geometry based organic tearout + subtle uneven iron oxidation, not an all-at-once wheel remake. Preserve V14 and all prior candidate versions.
- `development`, `main`, formal `assets/` folders were not changed. Current PR #498 stays draft. Artifacts remain expiring review-only storage.
