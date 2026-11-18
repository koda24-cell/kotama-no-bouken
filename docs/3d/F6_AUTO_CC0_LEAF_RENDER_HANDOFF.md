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
