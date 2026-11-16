"""共通ヘルパーの動作確認用（本番アセットではない）"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C  # noqa: E402

C.reset()
petal_m = C.mat_petal("smoke_petal", (0.95, 0.97, 1.0))
leaf_m = C.mat_leaf("smoke_leaf", (0.25, 0.45, 0.35))
ice_m = C.mat_ice("smoke_ice")
core_m = C.mat_emissive("smoke_core", (0.5, 0.9, 1.0), 4.0)

parts = []
stem = C.tube_along("stem", C.curve_points((0, 0, 0), (0, 0, 0.12), (0.02, 0, 0.2), n=12), 0.0025,
                    radius_fn=lambda t: 1.2 - 0.4 * t)
C.assign(stem, leaf_m)
for i in range(6):
    p = C.petal_surface(f"petal{i}", 0.04, 0.018, cup=0.3, curl=-0.1, pointed=0.5, thickness=0.0005)
    C.assign(p, petal_m)
    C.xform(p, (0.02, 0, 0.2), (70, 0, i * 60))
    parts.append(p)
core = C.spike("core", 0.01, 0.005)
C.assign(core, core_m)
C.xform(core, (0.02, 0, 0.2))
leaf = C.strap_leaf("leaf", 0.15, 0.012)
C.assign(leaf, leaf_m)
C.xform(leaf, (0, 0, 0), (75, 0, 20))
C.bake_transforms()
frost = C.frost_scatter(parts[0], 40, 0.002, ice_m)
C.finish("smoke_test", notes="harness smoke test", studio=False)
