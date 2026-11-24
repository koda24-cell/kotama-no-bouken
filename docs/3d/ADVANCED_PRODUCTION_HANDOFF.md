# Advanced production handoff — 2026-11-24

Status: prototype source only, NOT_APPROVED, no new execution evidence.
Verified predecessor: PR #761 and #772. Keep their entrypoints unchanged.

- advanced_material_policy.py: material hints, candidate plan, reference metrics.
- advanced_surface.py: isolated static mesh surface nodes, roughness, additive chips/ornament. Procedural bump is Blend-only until baking and GLB reimport verification. Natural cracks not implemented.
- advanced_recovery.py: bounded CPU fallback for memory/device errors, delegates syntax repair to existing gate. Unknown errors require review.
- advanced_session.py: atomic per-candidate checkpoints with source/reference/output hashes; caller must enforce deadline, ClamAV and isolated output. Not yet connected to Blender worker.
- GPT: run approved Blender Actions gateway, compare actual multi-angle PNG and GLB, record run IDs and hashes.
- Claude: consume GLB/PNG/manifest and inspect browser integration; request GPT rendering when needed. Do not claim Blender execution.
- No external paid API, automatic asset promotion or main merge.
- Next: connect worker, implement crack geometry and baking, run fixture and real assets, verify resume and fallback, register actual evidence.

## Added prototype gateway
Caller: .github/workflows/advanced-production-gateway.yml, shared Blender 5.3 gateway. Fixture uses planar branching crack overlay (not carved fracture), UV tangent normal baking and GLB normalTexture assertion. Imported helper directory is scanned before import. Real asset generalization, GLB reimport visual comparison and execution evidence remain pending. Earlier statements about missing cracks/baking refer to the prior revision.

## Real asset integration prototype
advanced_real_session.py invokes advanced_real_worker.py with isolated candidates, CPU render fallback, per-candidate hash checkpoints, ClamAV and four-view GLB roundtrip. Workflow advanced-real-production.yml runs pillar and iron gate in parallel and checks resume. Baseline similarity is not artistic improvement; external reference images, cross-job resume and forced real failure are not yet integrated. No automatic selection or promotion. Execution pending.
