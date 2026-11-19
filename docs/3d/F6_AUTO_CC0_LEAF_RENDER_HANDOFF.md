# 第6層・成木 V20 CC0葉素材 自動取得・Blender実レンダリング
更新 2026-11-18。状態: **検証中 / NOT_APPROVED / ゲーム未統合**。

## 実行入口
- 対象: `feature/gpt-f6-auto-cc0-leaf-render-20261118` (既存 PR #452 の V19 を安全に分岐)。
- Action: `.github/workflows/f6-cc0-leaf-auto-render.yml`
- 変更コードのpushで自動実行（外部連携の設定不要）。workflow_dispatchも宣言（表示はデフォルトブランチ側の登録状況による）。
- `tools/floor6/fetch_cc0_leaf.py`: ambientCG公式からCC0 `Leaf001_1K-PNG.zip` を取得。PNG / zipサイズ / SHA256を検査。公式URL: https://ambientcg.com/view?id=Leaf001、ライセンス: https://docs.ambientcg.com/license/
- `tools/floor6/tree_mature_v1.py`: V19原本をBlenderで出力。幹・根・枝・葉を全て維持。GLB/Blend/4 PNGとSHA manifest。
- `tools/floor6/apply_cc0_leaf_photo.py`: 原本の作業用Blendを開き、4種の葉材質へCC0のColor、存在すればNormal/Roughnessの画像マップを追加。既存樹形は変更せず、V20候補を別ディレクトリに出力。
- Actions: 4視点のPNG、GLB/Blend実体、SHA manifest、原本とのレンダー差異をチェック。ソフトウェアレンダリングの技術検証であり、ゲームFPS・美観評価とは区別する。
- Artifacts: `f6-v19-v20-cc0-leaf-comparison-NOT-APPROVED` （14日間、一時保存）。

## 制約 / 注意
- Leaf001はambientCG配布ページの表記ではTechnique: Approximation。**厳密な意味で実物写真ではない**。CC0による実素材の直接使用の試験であり、実写フォトグラメトリはLeafSet023等の別途検証が必要。
- 単葉UVは現行の5頂点マッピングを使う。PBRテクスチャとの整合、葉の背景色、ブレンド、Normal方向を4方向PNGで確認する。Opacityは公式アーカイブに存在する場合でも現段階では自動透明化しない（葉のメッシュ既存シルエットを優先）。
- CDN取得失敗・ファイル形式不正時は、未検証の代替画像を勝手に採用せず失敗として記録する。
- 未承認 GLB/PNG は正式素材フォルダやゲーム本体へ自動マージしない。development/mainを変更しない。
- 今後の拡張: 複数CC0素材の候補別比較、スクリーンショット審美評価、葉統合LODのパフォーマンス監査、写真ベースLeafSet023のUVアトラス対応。

## 引き継ぎ
Claudeは出力されたGLB/PNG/manifestを受け取り、Blender操作は担当しない。元V19と候補V20の両方を確認してユーザー承認を待つ。

## 2026-11-18 V21 soft-leaf review
- V19 original: source tree GLB/Blend/4-view PNG remains unchanged.
- V20 CC0 PBR download/apply/4-view job succeeded: run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44220114498 , actual artifact contained color, normal, opacity, roughness with sha256 and both tree versions. V20 photo map appeared **too pale and yellow-green** in front/angle render; not accepted.
- V21 change on the same independent review PR: retain CC0 source and original V19 checkpoint, apply lower saturation and a subdued woodland tint in the review material, blunt needle-like tips by rebuilding leaf outline in review-only Blender scene and retain curvature/leaf count. Preserve all V19 wood/root geometry. Candidate V21 in `tree_mature_photo_v21` and 4 PNGs.
- V21 visual QA: do not claim success without matching successful run, actual PNG file hashes and review of color/silhouette. Double-sided leaf faces now use more triangles; do not present as optimized LOD. Texture mask/alpha is not used pending test. Full game FPS still unmeasured.
- As with prior versions, **NOT_APPROVED**. No material promotion; no production merge.

## 2026-11-19 V22 quality-first iteration
- User judged V21 **NOT ACCEPTED**: washed-out pale sage color, confetti-like foliage and obsolete low-quality single leaf presentation particularly in side/angle view.
- V22 review-only changes: saturation 0.87 vs 0.62, value 0.88 vs 0.83, warmer/deeper forest-tint palette with per-material differences; Normal intensity 0.72; rounded leaf mesh preserved but deterministic groups of seven are packed/stratified to form overlapping 3D sprigs. Performance reduction **deferred until artistic approval**.
- Source `tools/floor6/apply_cc0_leaf_photo.py`, workflow `.github/workflows/f6-cc0-leaf-auto-render.yml`, run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44439253251 . The run was queued at edit time, **not yet a successful verified render**. Do not assert objective quality or approval before inspecting actual four camera PNGs.
- Preserve V19 source and original Blender file; no game integration and no automatic asset promotion. Subsequent iteration must compare **front / side / angle / top** actual PNGs and avoid false “automatic aesthetic certification.”

## 2026-11-19 V22→V23→V24 actual render validation
- **V22** successfully rendered and hashed (https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44439923529 ; artifact 14491057100). Result: still pale, sparse/confetti-like in side and angle, NOT APPROVED.
- **V23** successfully rendered and hashed (https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44440715441 ; artifact 14491430946). Deeper green on front/top and leaf-group compression improved. Side/angle retained chalky white light, NOT APPROVED.
- **V24** successfully rendered and hashed (https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44441728229 ; artifact 14492210246). Real four camera PNGs, GLB, Blend and source manifest verified; 10,036 rounded/clustered leaf meshes, 10,267 selected meshes. Raised minimum leaf roughness 0.86, reduced specular and normal-map highlights, 62% group compression, widened rounded outlines. **Observed V24 side/angle no longer bleached white and natural deep green is restored**; source tree trunk/branches preserved. Quality still NOT APPROVED pending owner review.
- Remaining deficits: silhouette still has many hard, isolated small leaf triangles; outer crown has unnatural gaps. Next work should improve true twig-attached leaf sprays, curvature and real leaf form at near distance rather than increasing generic polygon count; actual 4-view artistic inspection mandatory.
- Workflow optimizations verified: older V19 Blender checkpoint restored from SHA-verified artifact; fallback rerenders original when artifact expired. `cancel-in-progress: true` limits parallel obsolete rendering. This is job execution optimization, **not** geometric LOD/compression (deferred until artistic approval).
- No merge of this modeling PR to development/main; no gameplay integration; no promotion of GLB/PNG without explicit user approval.
