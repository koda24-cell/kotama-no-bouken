# B5 integration browser checks

Requires Node, Playwright, `/usr/bin/chromium`, and a local Three.js **0.180.0** package. These are test tools; the game still uses its existing import map and has no new dependencies.

```sh
THREE_DIR=/path/to/three node tools/b5-3d/game-test.cjs /tmp/b5-shots
```

The runner serves the real game on localhost:8775 in a fresh browser context, routes the existing Three.js CDN requests to the supplied package, and fetches the existing Google font with curl's inherited CA trust. It disables autosave and random encounters in that context; no user saves are opened or modified. It exercises all three B5 floors, keyboard movement/turning, the four-knight puzzle and door, a side event, field save serialization, desktop/mobile screenshots, and rAF/render counters. Pure scene checks verify deterministic placement, bounding boxes against every walkable cell, unchanged map data, and idempotent disposal of every attached geometry/material.

`TEST_ROOT=/path/to/baseline BASELINE=1` selects a separate baseline checkout and skips the new scene-module assertions. For render counters only, expose `renderInfo()` in that checkout with the same read-only implementation used by this branch. No visual code needs changing.

SwiftShader is software rendering. The short FPS samples describe this executor and are not hardware-GPU performance claims. The low quality path is used for repeatability; high-quality bloom and physical mobile GPUs need separate device testing.

Repeated floor/stratum switches and rapid changes during async assembly:

```sh
THREE_DIR=/path/to/three node tools/b5-3d/lifecycle-test.cjs /tmp/b5-lifecycle
```

This also visits B1 and B4, returns to B5, records renderer memory counters, and captures a mobile view along the cathedral approach.
