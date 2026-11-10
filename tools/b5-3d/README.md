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

B5 opaque walls / material quality verification:

```sh
THREE_DIR=/path/to/three SKIP_B1=1 node tools/b5-3d/wall-quality-test.cjs /tmp/b5-walls
THREE_DIR=/path/to/three node tools/b5-3d/bake-materials.cjs
```

The wall test casts rays against every wall face at several heights and lateral offsets, then places a magenta plane behind an opaque blind bay and checks render-target pixels. Hiding the architecture is the positive control. It also checks geometry/material/texture disposal and records desktop/mobile corridor and niche images. `SKIP_B1=1` skips the costly software-GPU B1 reference capture; the B1 reference images in its asset folder remain available. The bake command regenerates only the fifteen B5 texture PNGs with B5-specific seeds; it does not modify B1 assets.

B5 quality uses full albedo/normal/ORM maps. Full opaque backing always renders; only fine detail beyond the nearby chunks is culled. Low quality uses two nearest practical lights; high quality uses six and adds a low-intensity reflection environment. B1–B4 retain their original light pool sizes, and the B5 environment is released/restored on exit.

High-quality bloom/reflection and stratum restoration smoke test:

```sh
THREE_DIR=/path/to/three node tools/b5-3d/high-quality-test.cjs /tmp/b5-high
```

This uses a 640×480 software-GPU viewport, visits B5/B1/B4, and asserts the reflection environment is removed and the original light pools are restored outside B5. It is a functional high-quality smoke check, not a physical-GPU benchmark.

The short final interaction/material smoke test is:

```sh
THREE_DIR=/path/to/three node tools/b5-3d/release-smoke.cjs /tmp/b5-release
```

It activates a knight statue using Enter/choice input, completes the puzzle and side event through their real handlers with dialogue auto-replies, round-trips field save data, and checks all three fabric maps return HTTP 200.
