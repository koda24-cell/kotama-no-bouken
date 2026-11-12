# コタマのぼうけん｜3D素材ライブラリ案内

最終確認: 2026-11-12 / 参照元: GitHub PRとActions

このページは**今まで制作した3D素材を探すための入口**です。素材の実体を勝手に移動・上書きしません。PR・作業ブランチのものは `development` に統合済みとは限りません。

## 保存先のルール

- **正式採用GLB**: `assets/models/floor2/`, `floor3/`, `floor4/`, `floor5/`
- **レビュー画像**: `assets/models/floorN/reviews/<asset-name>/{front,side,angle}.png`
- **造形ソース**: `tools/` または対応する素材フォルダの `.blend` / Python
- **未採用の試作**: 個別のfeatureブランチとDraft PR
- **Actions Artifacts**: 期限付きの一時保存。長期保管とはみなさない

正式保存は `docs/3d/ASSET_PROMOTION_POLICY.md` に従い、実レンダリング・承認後に行う。

## 第2階層｜氷と水源

| 素材 | 探す場所 | 状態 |
| --- | --- | --- |
| 凍結した巨大滝・開放洞窟（V5試作） | [PR #282](https://github.com/koda24-cell/kotama-no-bouken/pull/282) / [Blenderレンダー #43152347095](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43152347095) / `tools/floor2/waterfall/build.py`・`render.py` | 最新レンダー成功。品質未承認、GLB/PNGはActions一時保管、正式Git保存・ゲーム統合は未実施 |
| 氷河の水辺セット v0.4 | [PR #286](https://github.com/koda24-cell/kotama-no-bouken/pull/286) / [レンダー #43151778906](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43151778906) | ユーザー完成承認、GLB/PNGはActions一時保管。正式Git保存未確認 |
| 氷結した古代祭壇 | [PR #285](https://github.com/koda24-cell/kotama-no-bouken/pull/285) | 制作PR、採用・正式保存は別途確認 |
| 氷結した古代石柱3種 | [PR #284](https://github.com/koda24-cell/kotama-no-bouken/pull/284) | 制作PR、採用・正式保存は別途確認 |
| 氷結水車の中庭 | [PR #283](https://github.com/koda24-cell/kotama-no-bouken/pull/283) | 制作PR、採用・正式保存は別途確認 |
| 古代の氷橋 | [PR #278](https://github.com/koda24-cell/kotama-no-bouken/pull/278) | 承認版の保存PR。マージ状態を確認 |
| 凍結した古代水路橋と滝 | [PR #268](https://github.com/koda24-cell/kotama-no-bouken/pull/268) | 制作PR |
| 氷結した古代水門 | [PR #258](https://github.com/koda24-cell/kotama-no-bouken/pull/258) | 制作PR |

### 凍結した巨大滝の制作履歴

- V1〜V4：同じ[PR #282](https://github.com/koda24-cell/kotama-no-bouken/pull/282)のコミット履歴に残る試作。岩の単純さ、滝の横倒し表示、人工的な滝壺などの問題を確認。
- V5：GLB→Blender読み込み時のY-up/Z-up変換を検証・修正。最新[Actions #43152347095](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43152347095)は成功。ただし画像の品質評価・ユーザー承認は別途必要。
- 生成元：`tools/floor2/waterfall/build.py`、`tools/floor2/waterfall/render.py`、`.github/workflows/floor2-waterfall-render.yml`。設計メモ：`docs/3d/FLOOR2_OPEN_CAVERN_WATERFALL_PLAN.md`。
- GLB/PNGはActions Artifactsに期限付きで保存。**正式素材フォルダへの保存済みとは扱わない**。

## 第3階層｜遺跡都市

| 素材 | 探す場所 |
| --- | --- |
| 鉄骨クレーン | [PR #270](https://github.com/koda24-cell/kotama-no-bouken/pull/270) |
| 遺跡都市素材の統合 | [PR #204](https://github.com/koda24-cell/kotama-no-bouken/pull/204) |
| 遺跡都市の配置 | [PR #207](https://github.com/koda24-cell/kotama-no-bouken/pull/207) |
| 遺跡都市の視覚改善 | [PR #214](https://github.com/koda24-cell/kotama-no-bouken/pull/214) |

## 第4階層｜溶岩洞窟・廃坑

| 素材 | 探す場所 |
| --- | --- |
| 溶岩岩壁 v3 | [PR #280](https://github.com/koda24-cell/kotama-no-bouken/pull/280) |
| 溶岩岩壁 初期案 | [PR #271](https://github.com/koda24-cell/kotama-no-bouken/pull/271) |
| 廃坑巻上機 | [PR #265](https://github.com/koda24-cell/kotama-no-bouken/pull/265) |
| 廃坑レール・補強 | [PR #257](https://github.com/koda24-cell/kotama-no-bouken/pull/257) / [PR #262](https://github.com/koda24-cell/kotama-no-bouken/pull/262) |
| トロッコ・炉・採掘設備のBlender環境 | [PR #253](https://github.com/koda24-cell/kotama-no-bouken/pull/253) |
| 廃坑小物 | [PR #199](https://github.com/koda24-cell/kotama-no-bouken/pull/199) |
| ゲームへの配置 | [PR #205](https://github.com/koda24-cell/kotama-no-bouken/pull/205) |

## 第5階層｜魔王城・ゴシック遺跡

| 素材 | 探す場所 |
| --- | --- |
| ゴシック天井5種・承認保存 | [PR #279](https://github.com/koda24-cell/kotama-no-bouken/pull/279) |
| ゴシック門・承認保存 | [PR #277](https://github.com/koda24-cell/kotama-no-bouken/pull/277) |
| ゴシック門形状の修正 | [PR #281](https://github.com/koda24-cell/kotama-no-bouken/pull/281) |
| 崩壊したシャンデリア | [PR #275](https://github.com/koda24-cell/kotama-no-bouken/pull/275) |
| 交差リブ天井 | [PR #272](https://github.com/koda24-cell/kotama-no-bouken/pull/272) |
| ゴシック天井5種・制作 | [PR #255](https://github.com/koda24-cell/kotama-no-bouken/pull/255) |
| ゴシック門・制作 | [PR #254](https://github.com/koda24-cell/kotama-no-bouken/pull/254) |
| 魔王の間の建築・装飾 | [PR #201](https://github.com/koda24-cell/kotama-no-bouken/pull/201) / [PR #200](https://github.com/koda24-cell/kotama-no-bouken/pull/200) |
| 戦争遺跡の装飾 | [PR #196](https://github.com/koda24-cell/kotama-no-bouken/pull/196) |
| ゲームへの配置 | [PR #206](https://github.com/koda24-cell/kotama-no-bouken/pull/206) |

## 探し方・取り出し方

1. この表のPRを開き、**Files changed** で実ファイルを確認する。
2. `assets/models/floorN/` にGLBがあれば、正式保存された実体を使用する。
3. GLBが無い場合はPRのブランチにある造形ソースと、リンク先ActionsのArtifactsを確認する。
4. Actionsにしかない成果物は期限切れになるため、承認済み素材から優先してGitへ恒久保存する。
5. 既存のゲーム用素材は移動・削除しない。重複整理や名称変更は参照元を調査してから別PRで行う。

**注意:** この索引は制作履歴への案内です。掲載＝完成・マージ済み・恒久保存済み、ではありません。
