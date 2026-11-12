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

## 階層別の素材一覧

| 階層 | 専用ページ |
| --- | --- |
| 第2階層｜氷と水源 | [第2階層の素材一覧](assets/FLOOR2_ASSETS.md) |
| 第3階層｜遺跡都市 | [第3階層の素材一覧](assets/FLOOR3_ASSETS.md) |
| 第4階層｜溶岩洞窟・廃坑 | [第4階層の素材一覧](assets/FLOOR4_ASSETS.md) |
| 第5階層｜魔王城・ゴシック遺跡 | [第5階層の素材一覧](assets/FLOOR5_ASSETS.md) |

各階層の素材一覧には、モデル名・制作PR・GLB・確認用PNG・承認状況を記録します。完成素材は階層別の `assets/models/floorN/` に保存し、他階層の素材と混在させません。

## 探し方・取り出し方

1. この表のPRを開き、**Files changed** で実ファイルを確認する。
2. `assets/models/floorN/` にGLBがあれば、正式保存された実体を使用する。
3. GLBが無い場合はPRのブランチにある造形ソースと、リンク先ActionsのArtifactsを確認する。
4. Actionsにしかない成果物は期限切れになるため、承認済み素材から優先してGitへ恒久保存する。
5. 既存のゲーム用素材は移動・削除しない。重複整理や名称変更は参照元を調査してから別PRで行う。

**注意:** この索引は制作履歴への案内です。掲載＝完成・マージ済み・恒久保存済み、ではありません。
