# 第5階層・3D完成素材リスト

> 2026-11-14 更新。ユーザー承認済みの素材と、GitHubで実ファイルを確認できた状態を分けて記録する。統合先は `development`、`main` は完成候補のみ。

| 素材 | 判定 | 形式・場所 | 確認 |
| --- | --- | --- | --- |
| 黒い瘴気・床パッチ V6 | **完成・ユーザー承認済** | [GLB](../../assets/models/floor5/gloom-v6.glb)、[レビュー画像](../../assets/models/floor5/reviews/gloom-v6/)、[Claude引継ぎ](../../docs/3d/floor5-gloom/CLAUDE_HANDOFF.md) | Blender 3方向成功: [run 43555983186](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43555983186)、正式保存: [run 43599450313](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43599450313) |

## 状態の区別
- **完成**：ユーザーが見た目を承認し、実GLB・PNGがGitHub作業ブランチに保存済み。
- **未統合**：ゲーム本体のマップ配置・アニメーションへの組込みは別工程。PR #331から `development` へのマージも別工程。
- 5Fの他素材（門・柱・燭台など）は別PR・別ブランチのため、ここでは実体未確認の完成認定を追加しない。既存の完成記録は保持する。

## 次の候補
5Fの瘴気をランダム迷宮に敷くため、1マス単位の接続バリエーション（中央・端・角・細い侵食路）を設計する。**現時点では未着手**。
