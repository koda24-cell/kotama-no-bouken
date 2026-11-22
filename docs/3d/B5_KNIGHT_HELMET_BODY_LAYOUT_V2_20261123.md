# B5 Knight Metal Helmet + Torso V2 correction
2026-11-23; **NOT_APPROVED**.
The V1 actual render exposed a bad helmet facing direction (visor appeared in rear) and exploded full-body sentinel reference because local-only scaling did not scale object/world translations.

V2 changes only presentation transforms: helmet Z rotation **0°** relative to imported GLB (previous 180°), vertical offset **+1.49 m** vs +1.525 m; metal source geometry untouched. Sentinel V14 reference applies uniform global scale 0.48 using frozen world matrices, after detaching mesh parents; reference remains separate and excluded from armored metal GLB.

Maintain all existing metal GLBs and V2/V3 torso connectors. End-to-end Blender 5.3, ClamAV, 8 PNGs, original source SHA/GLB checks required; user must inspect images for visual approval.
