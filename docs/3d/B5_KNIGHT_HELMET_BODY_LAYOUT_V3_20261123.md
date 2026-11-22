# B5 metal helmet correction V3 — global glTF transform
Review-only NOT_APPROVED. V1 and V2 image reviews proved only the sentinel V14 reference geometry was repaired by applying uniform global transforms. Helmet visor orientation remained wrong in V2, because Euler rotations on imported mesh nodes were not equivalent to a transform on the entire glTF group.

V3 imports the original Sallet V22 GLB, freezes mesh world matrices, detaches parents (the original meshes are unchanged) and uniformly applies **one explicit 180-degree world Z rotation plus translation (0,-0.018,1.49 m)**. The output is a preview-only metal assembly, not accepted as complete armor. Stone statue V14 remains separately visible in two overview renders and excluded from GLB. Arms and legs have no separately approved metal armor GLB yet.

Verify six close-up helmet/torso Blender5.3 views + two whole-body comparison images, and inspect visor direction in FRONT vs BACK. Keep original SHA256 hashes, GLB/Blend and ClamAV results. No merge/promotion without user approval.
