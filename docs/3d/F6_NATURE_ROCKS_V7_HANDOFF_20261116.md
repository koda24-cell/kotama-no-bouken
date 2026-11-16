# 第6層「花園」自然岩 V7 引き継ぎ（2026-11-16）

## 目的と現状
小岩・中岩・大岩のGLB 3点をBlenderで生成し、各正面・側面・斜め・真上PNGの合計12枚で品質評価する。V1～V6は実行済み、最新V7は**コード変更のみ、未レンダリング・未承認**。

## 正式な開発先
- Repo: https://github.com/koda24-cell/kotama-no-bouken
- 統合先 development。mainは変更禁止。
- 作業PR #364: https://github.com/koda24-cell/kotama-no-bouken/pull/364
- 作業ブランチ: feature/f6-nature-props-20261114
- 生成コード: tools/floor6/nature_rocks_v1.py（ファイル名はv1のまま）
- Actions: .github/workflows/f6-nature-rocks-render.yml
- 改善記録: docs/3d/F6_NATURE_ROCKS_RENDER_LESSONS.md
- 計画: docs/3d/F6_NATURE_PROPS_PLAN.md

## バージョン履歴と証拠
- V1: 生成成功。Blender 5.0.1でEEVEE名称とlibEGL不足を修正。
- V2: 角張った突出・薄い苔パッチ追加。実レンダリング済み。
- V3: 輪郭の不規則化、溝、128px画像Albedo。構文/インデント不具合修正後、Run 43720623112成功。
- V4: Icosphere subdivisions 3→4、岩本体の頂点642→2562（約4倍）、スムーズ陰影。Run 43721768176成功。面単位の三角色模様が残存。
- V5: 面ごとのランダムmaterial_indexを廃止、岩メッシュ単位の連続画像テクスチャへ。Run 43723653101成功。三角色模様はほぼ消えたが表面がつるつる。
- V6: 128px生成Normal Mapを追加。Run 43726817444成功。実PNGで陰影が強すぎ、小中岩が黒くつぶれた。
- V7: Normal Map strength .85→.28、法線生成微分係数 .85→.22、周期関数でテクスチャ端の不連続を抑制、岩Albedoを明るくした。コミット 47061f6acdbd464a8a629c34d51032c022f66310。**実行結果未確認**。

## 次チャット最優先
1. developmentのAGENTS.md、docs/3d/BLENDER_DOCKER_HANDOFF.md、docs/3d/ASSET_PROMOTION_POLICY.md、docs/3d/TOOLING_AUTO_SHARE_POLICY.md、docs/3d/SHARED_TOOLING_CATALOG.mdを読み、最新PRとブランチを確認。
2. V7の最新GitHub Actions runを確認。失敗ならログ→原因修正→再実行。
3. 成功ならArtifactsからGLB3点・PNG12枚・manifest3点を取得し、3×4の比較画像を作成してユーザーへ表示。V6と明るさ・ざらつき・三角模様・苔・突出部を比較する。
4. V7をユーザーが承認するまでは正式素材フォルダに昇格しない。Actions Artifactsは一時保存。
5. 必要ならNormal Mapの強度・UV・アルベド・ライティングを再調整。現状は実形状の亀裂・苔の密着にも改善余地あり。

## 引き継ぎ上の注意
- ClaudeはBlender操作を担当せず、承認済GLB/PNG/manifestを使ったゲーム統合・ブラウザ確認を担当。
- このチャットでのGitHubへの成果はコード・ワークフロー・計画・改善記録。V1～V6のGLB/PNGはGitHub Actions Artifacts上の一時保存であり、正式素材フォルダへの保存済みとは言わない。
- V7をレンダリング前にチャット移行するのはユーザーの明示的な希望。
- 旧生成物を欠損させず、PRとdevelopmentの状態を確認して引き継ぐ。
