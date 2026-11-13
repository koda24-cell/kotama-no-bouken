# 第4階層・溶岩岩盤制作 一時停止 / 再開手順（2026-11-12）
状態: **PAUSED — 第2階層を優先**。新規造形・レンダリング・マージ・正式昇格を再開指示まで行わない。

## 最終確認
- V1: PR #271, run #43119767432 成功。
- V2: PR #274, run #43124940569 成功（V1/V2比較）。品質評価4.5/10、完成承認は未取得。
- V2 Git保存: PR #276, run #43125845943 成功。GLB `assets/models/floor4/lava-rockwall-v2.glb` とレビュー用 `assets/models/floor4/reviews/lava-rockwall-v2/{front,side,angle}.png` は **feature/b4-lava-rockwall-v2-archive-20261112 ブランチ**に保存。developmentへのマージは未実施。
- V3: PR #280, branch `feature/b4-lava-rockwall-v3-20261112`; run #43127499151 成功（2026-11-12確認）。カラーでV2/V3比較するGLB・PNGをActions artifactに出力。**V3画像の目視品質レビュー・正式Git保存は未実施**。
- 参考画像: このチャットで生成した第4階層巨大溶岩岩盤コンセプト。大きな玄武岩の母岩、赤熱した亀裂、崩落、洞窟開口、ドラゴン爪痕を目標とする。
- 第4階層関連の定期タスクは確認時すべて無効。第2階層のタスクも無効（勝手に有効化しない）。

## 再開時
1. `development` と `AGENTS.md`, `docs/3d/BLENDER_DOCKER_HANDOFF.md`, `docs/3d/ASSET_PROMOTION_POLICY.md` を再読。
2. PR #280 / run #43127499151 の成果物（V2/V3 GLB、カラー正面・側面・斜めPNG）をダウンロードし実画像で比較。Artifactsは期限付き。
3. V3の自然な大きな岩盤形状・赤熱亀裂・崩落表現・ポリゴン効率を辛口評価。改善前後と具体的な欠点を提示。
4. 必要なら独立したV4ブランチを作成。既存V1〜V3形状・素材・ゲーム本体を保持。
5. 品質承認後のみ正式素材としてdevelopment統合。mainは触らない。

## リンク
- V2 Git保存 PR: https://github.com/koda24-cell/kotama-no-bouken/pull/276
- V3 Draft PR: https://github.com/koda24-cell/kotama-no-bouken/pull/280
- V3 successful render: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43127499151

## 注意
このドキュメントは制作再開用の記録。制作停止を示すもので、V3の品質承認や正式保存の完了を意味しない。
