# 第4層 3D制作 — 2026-11-16 次チャット引き継ぎ

## 最初に確認すること
- リポジトリ: https://github.com/koda24-cell/kotama-no-bouken
- 開発統合先: `development`。完成候補だけ `main`。
- 作業前に `AGENTS.md`、`docs/3d/BLENDER_DOCKER_HANDOFF.md`、`docs/3d/ASSET_PROMOTION_POLICY.md`、`docs/3d/TOOLING_AUTO_SHARE_POLICY.md`、`docs/3d/SHARED_TOOLING_CATALOG.md` を現在のブランチで読む。
- GitHubの最新ブランチ・PR・Actionsを必ず再確認する。未検証を完了と報告しない。

## 直前に完成した素材：第4層マグマ岩壁 V33
- ユーザー承認済み（「良いです。次に行きましょう」）。**再制作不要**。
- 形状: 3本の溶岩流。左から2番目を削除し、右側2本を近づけた。下に行くほど幅が太くなる。BVHで岩壁表面に沿わせている。
- 既知課題（承認時点）: 下部岩塊の浮き、背面格子模様、火の粉の下方偏り。承認済みV33は勝手に変更しない。
- 制作PR: https://github.com/koda24-cell/kotama-no-bouken/pull/379
- 実レンダ成功: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43723072680
- 正式保存成功: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43726941389
- 正式保存PR: https://github.com/koda24-cell/kotama-no-bouken/pull/381 （2026-11-16確認時点 open・未マージ）
- 保存ブランチ: `assets/b4-v33-approved-20261115`
- GLB: `assets/models/floor4/b4-v33-magma-rockwall.glb`
- PNG: `assets/models/floor4/reviews/b4-v33-magma-rockwall/b4-v33-*.png` （5方向）
- manifest: `assets/models/floor4/reviews/b4-v33-magma-rockwall/manifest.json` （SHA-256、出典run、承認情報）
- 詳細な完成メモ・Claude引き継ぎ: `docs/3d/B4_V33_MAGMA_ROCKWALL_COMPLETED_HANDOFF.md`
- ClaudeはBlenderを操作しない。GLB・PNG・manifestを使いThree.js/GLTFLoaderで組込検証する。ゲームへの実装完了は未確認。
- **注意**: Actions Artifactは一時保存。GitHub上の保存ブランチにGLB/PNG/manifestが存在することは確認済み。PR #381のdevelopmentマージは別作業。

## 次に着手する素材：第4層トロッコ・レール周辺
- ユーザーの希望: 1素材ずつ、具体的な品質改善、実レンダリングを毎回見せる。
- 現時点では**トロッコ・レールの新しい造形・レンダリングは未着手**。次チャットで最新モデルを調べてから開始する。
- `development`で存在確認済み: `field/b4-abandoned-mine.js`, `field/b4-cart-detail-additions.js`, `field/b4-mine-rig-props.js`。
- `tools/b4-render/` と関連する既存PR/Actionsを調べ、既存のトロッコ/レールモデルを先にレンダリングして現在形状を把握する。
- 改善候補: 車輪・車軸・台車の厚み、車体の金属疲労と錆、枕木の破損と不規則性、レールの曲がり・破断・岩盤への埋没、岩との接地。形状・部品を勝手に削除せず追加造形で改善。
- 正面・側面・斜め（可能なら背面）をBlenderで実レンダし、GLBとPNGを出す。ユーザーが画像で確認・承認するまで完成扱いにしない。
- 独立ブランチとdevelopment向けPRを使用。V33の保存PR #381に次の未完成素材を混ぜない。

## 作業上の注意
- 保存済みV33のGLBは静的モデルで、ゲーム内マグマアニメーション実装は未確認。
- 素材の出典・ライセンスを記録する。
- 既存ゲーム機能（戦闘、セーブ、迷宮、既存3D）を壊さない。
- 完成後にGLB・PNG・manifestのGitHub恒久保存、完成メモ、Claudeへのデータ変換・統合引き継ぎを行う。
- ユーザーは長い説明より、実際のレンダリング画像と具体的な改善を優先する。

## 次チャットの開始指示
「GitHubの `docs/3d/B4_20261116_NEXT_CHAT_HANDOFF.md` を読んで、第4層のトロッコ・レール制作を引き継いでください。まずdevelopmentの最新モデルと関連PRを確認し、既存形状をBlenderで実レンダリングして見せてください。V33マグマ岩壁は完成承認済み、PR #381は未マージなので混ぜないでください。」
