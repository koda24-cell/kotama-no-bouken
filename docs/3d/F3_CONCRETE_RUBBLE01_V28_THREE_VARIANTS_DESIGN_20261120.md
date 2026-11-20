# Floor 3 ruined-city concrete rubble — three variant set V28

Status **NOT_APPROVED**. The objective is to generate individual small, medium and large rubble models from V23's visually preferred cast concrete, without discarding any existing assets.

## Numeric specification
- Medium: V23 mesh and material output unchanged other than file identifiers, nominal 450×310×120mm. Reference shape.
- Small: x scale 0.67; y scale 0.61; z scale 0.67, plus asymmetric ±9–20mm XY chipping. Both front-right and rear-left corners deformed differently.
- Large: x scale 1.34, y 1.23, z 1.20 plus distinct rear/left-edge collapse 23mm and broad rear lip variation; nonuniform perimeter noise. No basin.
- Source topology, PBR maps, fine embedded aggregate and material indices retained from V23, no new floating white pebbles.
- Per variant assert transformed dimensions, output one GLB and Blend, 4 PBR texture PNGs, 5 real 840px Cycles PNGs from front/side/angle/top/detail.
- Artifacts must preserve filenames with variant suffixes, collect all 3 in one workflow artifact with checksummed manifest.
- Per variant GLB single mesh, two PBR material primitives; 3 models are not one scaled GLB shared at runtime.
- Visual review includes a multi-item overview montage and separate angled views to make silhouettes comparable. Any failing candidate not promoted.
- Avoid rerunning all old historical jobs in the new workflow via path-scoped push triggers.
- GitHub Actions archive is temporary; approved source and GLB promotion is a separate operation after explicit user consent; PR #642 remains Draft to development.
