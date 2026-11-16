# B4 Cart Quality V12/V13/V14 — Blender review / 2026-11-16

Status: **NOT_APPROVED**. Production promotion and game integration prohibited until user approval.

## Verified evidence
- Iteration run #1: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43805840434 — success, baseline (level 0) and additive variants (levels 1, 2), 9 Blender PNG, 3 GLB, 3 .blend checkpoints.
- Iteration run #2: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43806200730 — success, baseline + levels 1/2 + new alternative level 3, 12 Blender PNG, 4 GLB, 4 .blend checkpoints and manifest. Artifact 14198267251, expires 2026-11-30 (UTC).
- Source commit: `04c25b19b398437f94c8fb1fee39da820b88e048`.
- Original meshes and ore retained. Refined geometry is isolated in `field/b4-cart-v12-additions.js` and `field/b4-cart-v14-additions.js`.
- Review renders preserve glTF material values and use neutral brighter studio light. **No PBR texture images were added**; colored Three.js materials are not a texture baking result.
- The GLB and .blend are review-only output in Actions Artifacts; no formal asset promotion.

## Visual review
1. Baseline: original ore cart has readable sideboards and wheels, but large blocky ore occludes the tub.
2. V12 level 1: stronger wheel/rim silhouette and support straps, but several rust-colored outer hoops visually float off the existing wheels; color contrast too saturated.
3. V13 level 2: additional chassis braces and wear strips, yet the duplicated outer rings remain. Not recommended for approval.
4. V14 level 3: removes the *newly tested* floating-ring idea by building a separate alternative directly on untouched base/V9 geometry. Instead adds restrained axle bearing, corner posts, localized wood patches, handgrip and sparse top braces. Existing wheels and ore remain untouched. The review appearance is more coherent but largely blocky; source ore geometry still dominates. Not yet production quality.
5. 3 directions visually checked from downloaded actual PNGs, not generated synthetic examples.

## Next iteration suggestions
- Preserve original ore and cart meshes; to reduce ore dominance without deleting them, use fitted restraint rigging and sidewall/ore-support framing; evaluate any apparent extra clutter with the same cameras.
- For realistic wear, add actual baked color/normal/roughness image textures and validate glTF import; unbaked procedural-only Blender details are not enough.
- Track dimensions, wheel-to-rail gauge and image QA before game integration. No automated image VLM connected, and numeric QA alone is not artistic acceptance.

## Claude handoff after approval only
Deliver approved GLB, PNG3, sha256 manifest, source commit, workflow run, origin/scale/bbox and material notes. Claude uses GLTFLoader to check wheel clearance, rail connection, runtime performance, collision/tiles, and data persistence; Claude must not operate Blender.


## 逆台形修正 V15–V17（2026-11-16 続編）
- 参照：前会話で選んだ、上が広く底が狭い古い鉱山トロッコの形状。外部画像自体の再配布・テクスチャ転用はしていない。
- V14原本と各追加部品は保持。`field/b4-cart-taper-v15-additions.js` に独立した逆台形の側板・長い荷台・四隅の補強を追加。
- V15: 緩やかに上広がり。V16: 上端拡幅。V17: 中間幅＋側板を3段に分割し、従来の細かな補強部品が見えるよう修正。
- 実レンダーrun V15/V16: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43809232301 （成功、Artifact 14199936486、18 PNG、6 GLB/Blend checkpoint）
- 実レンダーrun V17比較: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43809835096 （成功、Artifact 14200366416、12 PNG、4 GLB/Blend checkpoint）。画像を実取得し目視比較した。
- 目視結果: V15/V16とも箱型から逆台形への改善が顕著。V16は大型の一枚板で部品が隠れる。V17はV16の傾斜感とV14/V15のパーツ視認性を両立し、現時点の次の制作基準に最適。ただし鉱石の大きさ、接合部のめり込み、木材と金属の本格的な画像PBRテクスチャは未解決。
- **NOT_APPROVED**: 保存はActions Artifact限定、assets/models/floor4正式フォルダへの追加・マージ・ゲーム統合なし。Claudeへの引き渡しはユーザー承認後。
