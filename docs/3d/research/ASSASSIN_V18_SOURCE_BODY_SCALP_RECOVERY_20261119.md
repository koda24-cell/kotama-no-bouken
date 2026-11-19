# V18 source recovery: Shibu Body already contains posterior head (2026-11-19)

## Verified geometry + Blender images
- Prior V18 A/B/C and D/E/F generated posterior meshes without first checking whether Shibu's original Body held the back of the scalp. This caused repeated wedge, box, and cone failures. **All candidates remain NOT_APPROVED and are not source references.**
- The real source VRM `Sendagaya_Shibu.vrm` (madjin/vrm-samples vroid/beta; source hash anchored in V18 QA) contains meshes: `Face` (2339 vertices), `Body` (7796 vertices), `Hair001` (15206 vertices).
- New source audit [run 44446328687](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44446328687) **success**. Artifact `v18-source-body-scalp-audit`, ID 14493735809. It renders source Body only (back, left, right, back-upper) and source Face+Body (left/back) without Hair. Render visual confirms **Body includes the intact, smoothly curved rear cranium and connected nape**, and the source Face+Body side silhouette looks substantially more natural than generated V18 A–F.
- Exact regional filter (for *audit only*, not mesh extraction): world Z in 1.38–1.60m, |X|<0.14m, Y<-0.03m. Candidate vertex counts: Face 50, **Body 203**, Hair001 4718. These are raw position-filter hits, **not** a validated separated 203-vertex scalp submesh.
- **Critical changed design decision:** Stop replacing the rear cranium with a procedural surface. Preserve/reuse original Body scalp/head geometry; investigate the exact 36 Face-boundary-to-Body position and face topology correspondence. Source Face and Body have not been proven welded. Only after actual seam distance and multi-angle evidence decide whether any attachment geometry is needed.
- Additional verification step [run 444...](https://github.com/koda24-cell/kotama-no-bouken/actions/workflows/assassin-v18-body-scalp-audit.yml) extends source audit with per-rim nearest Body vertex distances; success/values not asserted here until the artifact is read.

## Required integration path
1. Make versioned source records with original Shibu VRM SHA and imported mesh vertex IDs.
2. Audit all 36 Face rim vertices against Body *vertex positions* and, independently, triangle-surface distance/normals (nearest vertex alone is not a weld test). Record nearest matches as JSON and separate triangle alignment.
3. Preserve Face and Body original shape, UVs, materials, shape keys, and bone skinning; do not overwrite/rebuild source geometry. Test side/back close-up under smooth clay and original material.
4. If a visible seam remains, fix only localized connection with explicitly mapped IDs, without scaling/decimating the existing rear skull. Maintain 3D hair as separate later task.
5. Review local source licensing: CC0 status of Shibu/Vita is not confirmed. Never promote derivative GLB or include externally sourced data in production until redistributability proven.
6. A/B/C/D/E/F are retained as failed experiments for diagnosis, not model inputs. PR #529 stays Draft/NOT_APPROVED; no game files modified.

## QA evidence
- Source Body-only and Face+Body photos from successful real Blender run #44446328687.
- F run [44444925974](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44444925974) successful technical checks but visually fails: exposed triangular posterior flap; upper boundary-only skin graft still cannot recreate anatomically natural skull.
- E [44443514559](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44443514559) technically passed and visually failed: long pointed rear cranial cone and unnaturally hanging neck collar.
- Blender Studio head retopo: https://studio.blender.org/training/stylized-character-workflow/8-retopo-head/ ; Blender Artists topology: https://blenderartists.org/t/human-retopology-advice-welcome/1248218.
