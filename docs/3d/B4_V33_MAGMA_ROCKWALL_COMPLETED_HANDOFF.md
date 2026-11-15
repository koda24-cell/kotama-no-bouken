# 第4層・溶岩岩壁 V33 — 完成判定・Claude引き継ぎ

- ユーザー承認: 2026-11-15「良いです。次に行きましょう。保存、完成メモ、クロードにデータ変換引継ぎ」
- 元レンダリング: [GitHub Actions run 43723072680](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43723072680) / success
- 元制作: [PR #379](https://github.com/koda24-cell/kotama-no-bouken/pull/379), `feature/b4-v33-three-magma-streams-20261115`
- 正式候補: `assets/models/floor4/b4-v33-magma-rockwall.glb`
- 確認画像: `assets/models/floor4/reviews/b4-v33-magma-rockwall/` の front-lit, front-level, side-lit, angle-lit, back-lit PNG
- 機械可読情報: 同フォルダ `manifest.json`。各ファイルSHA-256、出典run、承認状態、GLBパスを記録。
- 素材由来: 既存V13の岩壁 + Poly Haven Rock Face 02（CC0）参照モデル。マグマはBlender生成メッシュ。素材ライセンスを確認して利用。
- 仕様: 3本のマグマ（左1本・右2本）。左から2番目を削除し、右2本の間隔を縮小。下方ほど流路が太くなる。岩表面へBVH投影。
- 既知課題（承認時に残存）: 下部岩塊の浮き、背面格子状パターン、火の粉の下方集中。**承認は現行V33を対象**。別途改善可能。
- 注意: `flow_speed` 等のメタ情報はゲーム内の自動アニメーションを保証しない。GLBは静的なマグマ造形。Three.js側のアニメーションは未実装。

## Claude向け作業

1. `manifest.json` の `approval_status`、出典runとSHA-256を確認し、PNG5枚を見て形状を把握する。
2. Blenderや.blendファイルを使わず、`GLTFLoader` でGLBを読み込む。
3. GLBの実測バウンディングボックス、座標系、原点、スケール、マテリアル、発光表示、描画負荷をゲーム側で確認する。**座標やサイズを推測で固定しない**。
4. 既存の第4層マップ・衝突・セーブ・戦闘を保持。独立ブランチで組込・テストし、development向けPRを作成する。
5. 実装後にブラウザ上で前面・側面・接続部分・FPSを検証する。追加造形や再レンダリングが必要ならGPT側へ差し戻す。
6. GitHub Actionsの一時Artifactだけに依存せず、Git上のGLB/PNG/manifestの存在を確認する。

## 次の制作候補

第4層の別の未完成素材（トロッコ・レール・廃坑設備など）を1点選び、既存モデルの最新状態を確認してから開始。現時点で新素材の作業開始・レンダリング完了は未報告。
