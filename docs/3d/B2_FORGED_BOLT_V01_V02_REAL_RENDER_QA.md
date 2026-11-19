# B2 single forged bearing bolt V01→V02 actual Blender QA

2026-11-19 JST; **NOT_APPROVED**; Draft PR #596.

## Verified facts
- One independent square-headed bolt along local Z axis; approximately 0.07m shank diameter, 0.125m head flats (nominal), with 8 modeled turns of a coarse distal helix. Built in Blender 5.3 Docker in GitHub Actions.
- V01 [run 44463818676](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44463818676) completed/success; downloaded Artifact **14501227757**, ZIP containing 4 real Cycles PNG, GLB, Blend, original generated 512px rust PNG and manifest. All 7 manifest sizes and SHA256 independently validated. 898 model polygons, one GLB mesh.
- V02 [run 44464346259](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44464346259) completed/success; downloaded Artifact **14500763840**, same seven outputs all manifest sizes/hashes validated. Mesh 950 faces, one GLB mesh. Adjusted forged head bevel, darker iron and reduced local oxide coverage.
- V01 actual rendered four-view: head is squarish and coarse helicoid threads clear; oxide too strong and elongates as straight rusty vertical bands, head too near-perfect/pristine.
- V02 actual rendered four-view: **more convincing dark iron** and rounded head; however still relatively smooth with localized vertical oxide stripes due to UV orientation, and fine forging dents/dings are not yet prominent. No photography of reference pin originals applied as textures.
- It is an individual asset only. No physical attachment holes in lower/upper wooden bearing modeled, no 3D fit test or torque simulation; shaft/bolt positioning and intersection with 0.322m U-channel are unverified.
- Cross-floor GLB performance audit and real game FPS not run. One GLB mesh with 1 embedded original procedural image is structurally verified; not a performance measurement.
- Blender GLB/Blend/PNGs retained in **temporary Action Artifacts expiring around 2026-12-03**; NOT promoted into permanent game assets or development/main.

## Next part and art gate
V02 is the current preferred working **candidate, not final approval**. For close-up, add asymmetrically hammered rough head edges, discrete chipped corner and more isotropic corrosion. Compare V02 to real hand-forged square bolts and ensure aesthetic match. For actual bearing assembly later, first design one washer and one nut independently and check diameter and hole location, with user approval for each formal promotion.
