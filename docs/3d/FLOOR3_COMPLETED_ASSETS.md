# 第3層「遺跡都市」完成素材台帳

## 承認済み

| 素材 | 版 | 承認 | 正式GLB | 確認用画像 | manifest | 開発反映 |
| --- | --- | --- | --- | --- | --- | --- |
| 崩壊階段 | V8 | 2026-11-16 ユーザー承認 | [stairs_v8.glb](../../assets/models/floor3/ruined_connector/stairs_v8.glb) | [front](../../assets/models/floor3/ruined_connector/reviews/stairs_v8/front.png) / [side](../../assets/models/floor3/ruined_connector/reviews/stairs_v8/side.png) / [angle](../../assets/models/floor3/ruined_connector/reviews/stairs_v8/angle.png) | [JSON](../../assets/models/floor3/ruined_connector/stairs_v8.manifest.json) | 正式素材として保存、ゲーム実装は別PR |
| 二段折り返し屋外階段 | V10 | 2026-11-17 ユーザー承認 | [stairs_v10.glb](../../assets/models/floor3/double_flight/stairs_v10.glb) | [front](../../assets/models/floor3/double_flight/reviews/stairs_v10/front.png) / [side](../../assets/models/floor3/double_flight/reviews/stairs_v10/side.png) / [angle](../../assets/models/floor3/double_flight/reviews/stairs_v10/angle.png) / [detail](../../assets/models/floor3/double_flight/reviews/stairs_v10/detail.png) | [JSON](../../assets/models/floor3/double_flight/stairs_v10.manifest.json) | 正式素材Git保存、ゲーム実装は別PR |

- 補助資料: [Claude引き継ぎ](FLOOR3_STAIRS_V8_CLAUDE_HANDOFF.md)、[完成記録](FLOOR3_STAIRS_V8_COMPLETED_20261116.md)。
- レンダリング: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43858942490
- アセット保存はGit原本の恒久保存。14日で消えるActions Artifactsは正式ストレージではない。

- 二段折り返し階段V10: [完成記録](FLOOR3_DOUBLE_FLIGHT_STAIRS_V10_COMPLETED_20261117.md) / [Claude引き継ぎ](FLOOR3_DOUBLE_FLIGHT_STAIRS_V10_CLAUDE_HANDOFF.md) / [CC0テクスチャ原本](../../assets/models/floor3/double_flight/textures/sources.json)。モデル本体と4方向PNG・Blend・6種PBR画像をGitへ恒久保存。

## 未承認・制作途中（完成素材に含めない）
- スロープ (ramp): V6候補、PR #376。別途個別制作対象（PR #440）。
- 踊り場 (landing): V6候補、PR #376。
- 元のPR #376全体を一括マージしない。未承認部分と完成階段は分離管理する。
