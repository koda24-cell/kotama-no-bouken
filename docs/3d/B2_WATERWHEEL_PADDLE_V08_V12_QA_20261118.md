# B2 waterwheel single paddle — Blender V08–V12 iteration QA (2026-11-18)

**STATE: ART NOT APPROVED / NOT READY TO PROMOTE / no changes to live game.** Only the single waterwheel bucket board is in scope. Prior V07 BLEND, all intermediate checkpoints, full original waterwheel and Claude setpiece are preserved.

## Blender Actions & artifacts (all actual Blender 5.3, four-direction PNG)
| Candidate | Run | Artifact ID | Technical outcome | Aesthetic verdict |
|---|---|---|---|---|
| V08 | [44194599955](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44194599955) | 14378846099 | success, 4PNG/GLB/Blend/hash | **FAIL**: washer/bolt accessories floating outside timber |
| V09 | [44195302317](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44195302317) | 14379445506 | success | **FAIL**: metal floating corrected, primitive icicle shapes remain |
| V10 | [44196329875](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44196329875) | 14378563938 | success on second run attempt (first Docker registry connection reset; retry-run pointer needed git fast-forward fix) | **FAIL**: square white ice attachment roots and superficial frost |
| V11 | [44196983349](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44196983349) | 14379287434 | success | **FAIL**: white square roots removed; upper frost pieces floating in side view |
| V12 | [44197671550](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44197671550) | 14379403116 | success, 6 assets (GLB/Blend/4PNG) and SHA256 matched | **IMPROVED BUT NOT ART APPROVED**: rim frost attached, still uniform grain/seams, ice too toy-like |

Every new Blender run restores the exact preceding **.blend** from the last successful artifact; prior source checksum is hardcoded in the script and verified in Actions before edits. No V07 timber core deleted/replaced. V08 and subsequent additive decorations are trial-only and selectively replaced in later candidate versions; earlier versions remain accessible as immutable artifacts. No user-approved version yet.

## V12 evidence and structural QA
- `tools/b2-waterwheel-paddle/build_paddle_v12_resume.py`
- `.github/workflows/b2-waterwheel-v12-review.yml`
- V12 source V11 BLEND SHA256: `a18c95540a9ac6f73d2e7ebb96303e581e16626dc02c862b629608f213bed75c`.
- V12 generated actual GLB + editable BLEND + front/side/angle/back PNG + manifest; all 6 manifest SHA256 values compared against downloaded ZIP actual bytes and matched.
- V12: 43 mesh primitives, **15,652 triangles**, approx **2.29 MiB GLB**, 3 glTF-embedded images, primarily [Poly Haven Wood Planks](https://polyhaven.com/a/wood_planks) color, OpenGL normal and metallic-roughness encoded from CC0 photo material. This count is **GLB structural static inspection**, not measured GPU draw calls or performance.
- The global Shared 3D Performance Audit **was not run on V12**: V12 currently exists only in an expiring Actions artifact and not in a Git repository asset glob. This must be included in pre-promotion QA, along with original-vs-LOD three-view comparisons.
- **Blender photographic PBR applied and GLB embedded**; no unlicensed Pinterest image files were copied into the model. Full PBR photographic suitability still needs close-up artistic review.

## Unresolved visible defects / next sculpt pass
1. Primary timber appears like a uniform curved slab printed with flat horizontal plank seams. Convert only the seams/end-grain into visibly separated warped wood laminae or carved recessed gaps **without eliminating the original core**; verify side and back.
2. Produce more realistic irregular gouges and splinters with very sparse larger chips, instead of repetitive zigzag lines.
3. Snow/ice roots and icicles should show physical adhesion, partial translucence/roughness variation and less evenly spaced spikes; inspect under cold neutral and dungeon lighting.
4. Iron straps still look generic smooth rectangles; add hammered dents, oxide breakup, reliable mating surfaces and real fastening logic, do not reintroduce detached bolts.
5. Keep the existing photo maps and material licenses, then run Blender multi-view render check, glTF validation, shared performance audit, Three.js GLTFLoader and frame measurements.
6. **Request user approval only after art review**. Do not promote anything from these test files to `assets/`, `development` or `main` automatically.

## Workflow boundary
- PR #498 is still **Draft**. Existing `field/assets/b2-frozen-waterwheel-scene.js` and Claude's Stage-2 placement scripts were never touched.
- GitHub Actions Artifacts are temporary (14 days) and are NOT formal promotion.
- Dedicated Blender MCP is not guaranteed in this chat; all documented models were rendered by GitHub Actions and verified from downloaded artifacts.
