# 第2階層｜氷と水源

[← 素材ライブラリ総合索引](../ASSET_LIBRARY_INDEX.md)

> 制作履歴・素材の保存先を階層ごとに整理したページです。PR掲載はdevelopment統合を意味しません。

### 自然地形・水辺・滝

| 素材 | 探す場所 | 状態 |
| --- | --- | --- |
| 凍結した巨大滝・開放洞窟（V5試作） | [PR #282](https://github.com/koda24-cell/kotama-no-bouken/pull/282) / [Blenderレンダー #43152347095](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43152347095) / `tools/floor2/waterfall/build.py`・`render.py` | 最新レンダー成功。品質未承認、GLB/PNGはActions一時保管、正式Git保存・ゲーム統合は未実施 |
| 氷河の水辺セット v0.4 | [PR #286](https://github.com/koda24-cell/kotama-no-bouken/pull/286) / [レンダー #43151778906](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43151778906) | ユーザー完成承認、GLB/PNGはActions一時保管。正式Git保存未確認 |

### 古代建築・石造物

| 素材 | 探す場所 | 状態 |
| --- | --- | --- |
| 氷結した古代祭壇（V4・完成承認） | [制作PR #285](https://github.com/koda24-cell/kotama-no-bouken/pull/285) / [正式保存PR #298](https://github.com/koda24-cell/kotama-no-bouken/pull/298) / [Blender実レンダー #43152745995](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43152745995) | **ユーザー完成承認済み**。GLB＋3方向PNGを第2階層の専用保存PR #298でアーカイブ。development未統合 |
| 氷結した古代石柱3種（通常・崩壊・氷結）V3 | [制作PR #289](https://github.com/koda24-cell/kotama-no-bouken/pull/289) / [完成素材保存PR #292](https://github.com/koda24-cell/kotama-no-bouken/pull/292) / [Blender実レンダー #43151444460](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43151444460) | **完成承認・Git保存済み**（保存用PR #292のブランチ）。GLB 3点＋レビューPNG 9枚を実ファイル確認済み。**development未統合** |
| 古代の氷橋 | [PR #278](https://github.com/koda24-cell/kotama-no-bouken/pull/278) | 承認版の保存PR。マージ状態を確認 |
| 凍結した古代水路橋と滝 | [PR #268](https://github.com/koda24-cell/kotama-no-bouken/pull/268) | 制作PR |
| 氷結した古代水門 | [PR #258](https://github.com/koda24-cell/kotama-no-bouken/pull/258) | 制作PR |

### 水車・設備

| 素材 | 探す場所 | 状態 |
| --- | --- | --- |
| 氷結水車の中庭 | [PR #283](https://github.com/koda24-cell/kotama-no-bouken/pull/283) | 制作PR、採用・正式保存は別途確認 |

### 氷結した古代祭壇（完成承認：V4）

- **採用バージョン**：V4。アーチの浮き修正（支持柱と柱頭追加）後のユーザー完成承認。
- **造形元**：[PR #285](https://github.com/koda24-cell/kotama-no-bouken/pull/285)、造形コード `tools/b2-altar/build-and-render.py`。
- **実レンダー**：[Actions #43152745995](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43152745995)（成功）、Artifact ID `13914164378`。正面・側面・斜め上PNGを確認。
- **正式素材保存**：[PR #298](https://github.com/koda24-cell/kotama-no-bouken/pull/298) の専用ブランチ `feature/b2-frozen-altar-approved-archive-20261112`。GLB: `assets/models/floor2/b2-frozen-ancient-altar.glb`、画像: `assets/models/floor2/reviews/b2-frozen-ancient-altar/{front,side,angle}.png`。
- **備考**：既存の古代氷橋とは別素材。保存・承認はゲーム内設置を意味せず、`development` へのマージは別作業。

### 古代遺跡の石柱セット（完成承認：V3、3種類）

- **通常の石柱**：石材ドラム、彫刻・浮き彫り・石材の風化。品質評価V3時点5/10だがユーザー判断により完成。
- **崩壊した石柱**：一体メッシュの斜め破断面、倒壊した上部・瓦礫。V3時点6/10、ユーザー完成承認。
- **氷結した石柱**：氷の層・長短の異なる氷垂れ・発光結晶。V3時点6/10、ユーザー完成承認。
- **制作バージョン**： [V1 PR #284](https://github.com/koda24-cell/kotama-no-bouken/pull/284) → [V2 PR #287](https://github.com/koda24-cell/kotama-no-bouken/pull/287) → [完成V3 PR #289](https://github.com/koda24-cell/kotama-no-bouken/pull/289)。従来版は履歴として保持。
- **実レンダリング**：[GitHub Actions #43151444460](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43151444460)（成功）、Artifact `13914630076`（3 GLB・9 PNG）。Actionsのみの保存は一時的。
- **Gitへの保存**：[PR #292](https://github.com/koda24-cell/kotama-no-bouken/pull/292)のブランチにGLB 3点・PNG 9枚が存在することを確認（保存Actions [#43153006434](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43153006434) 成功）。**未マージでゲーム配置も未実施**。
- **保存済みGLB**：[通常](https://github.com/koda24-cell/kotama-no-bouken/blob/feature/b2-frozen-pillars-v3-approved-archive-20261112/assets/models/floor2/b2-ancient-pillar-v3.glb) / [崩壊](https://github.com/koda24-cell/kotama-no-bouken/blob/feature/b2-frozen-pillars-v3-approved-archive-20261112/assets/models/floor2/b2-ruined-pillar-v3.glb) / [氷結](https://github.com/koda24-cell/kotama-no-bouken/blob/feature/b2-frozen-pillars-v3-approved-archive-20261112/assets/models/floor2/b2-glaciated-pillar-v3.glb)。
- **保存済み確認用PNG**：[通常3方向](https://github.com/koda24-cell/kotama-no-bouken/blob/feature/b2-frozen-pillars-v3-approved-archive-20261112/assets/models/floor2/reviews/b2-ancient-pillar-v3) / [崩壊3方向](https://github.com/koda24-cell/kotama-no-bouken/blob/feature/b2-frozen-pillars-v3-approved-archive-20261112/assets/models/floor2/reviews/b2-ruined-pillar-v3) / [氷結3方向](https://github.com/koda24-cell/kotama-no-bouken/blob/feature/b2-frozen-pillars-v3-approved-archive-20261112/assets/models/floor2/reviews/b2-glaciated-pillar-v3)。各`front.png`・`side.png`・`angle.png` を確認。
- **Blender造形コード**：`tools/b2-3d/create-frozen-pillars-v3.py`（V2とV1のコードも別ファイルに保持）。

### 凍結した巨大滝の制作履歴

- V1〜V4：同じ[PR #282](https://github.com/koda24-cell/kotama-no-bouken/pull/282)のコミット履歴に残る試作。岩の単純さ、滝の横倒し表示、人工的な滝壺などの問題を確認。
- V5：GLB→Blender読み込み時のY-up/Z-up変換を検証・修正。最新[Actions #43152347095](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43152347095)は成功。ただし画像の品質評価・ユーザー承認は別途必要。
- 生成元：`tools/floor2/waterfall/build.py`、`tools/floor2/waterfall/render.py`、`.github/workflows/floor2-waterfall-render.yml`。設計メモ：`docs/3d/FLOOR2_OPEN_CAVERN_WATERFALL_PLAN.md`。
- GLB/PNGはActions Artifactsに期限付きで保存。**正式素材フォルダへの保存済みとは扱わない**。
