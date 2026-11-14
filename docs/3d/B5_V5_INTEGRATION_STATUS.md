# B5 V5 fog integration

B5 V5 approved visual direction by user on 2026-11-15. The feature branch integrates the fog plane behind the map's physical walls with camera-facing placement, updates in the B5 tick, and cleans up on floor changes. The source emission PNG remains an Actions artifact until promoted into `field/assets/b5-distant/`; a procedural fallback is used if absent. Do not claim final visual parity until PNG is committed and gameplay screenshots confirm occlusion, camera turns, and FPS. VFX candidates: sparse purple sparks, short purple flashes, floor-level drifting smoke, and localized red-violet glow. All should be visual-only and low-cost. Existing game assets, save data, collision and map visibility must remain unchanged.

Reference run: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43608894126
