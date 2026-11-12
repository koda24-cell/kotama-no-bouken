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

## Claude・ブラウザゲームで扱う形式

ClaudeはBlenderを使用する必要はありません。このライブラリの**GLB（glTF 2.0バイナリ）**はThree.jsの `GLTFLoader` で直接読み込めます。PNGは外観確認・レビュー用画像です。

- **GLBあり**：表示・配置に使用可能。Blender不要。ただし保存ブランチから取得する必要があります。
- **PNGのみ**：3Dモデルではなく参考画像。3Dオブジェクトとして配置できません。
- **造形コードのみ / Actions Artifactsのみ**：GLBが恒久保存されていない場合、Claudeがそのままモデルを配置することはできません。正式保存が必要です。
- **別のPRや作業ブランチに保存**：`development` に存在するとは限りません。各素材一覧にある保存元ブランチを確認します。
- **GLBの座標**：glTFはY-up。Three.jsのGLTFLoaderで読めば追加のBlender座標変換は不要です。配置前に `Box3` で幅・高さ・奥行きを測り、床面・当たり判定・表示負荷を確認します。
- **保存と実装は別**：3D素材をGLBとしてGitに保存しても、ゲーム内で自動表示されるわけではありません。読み込み・配置は別PRで行い、既存の3D階層やセーブデータを維持します。

利用方法は [**Claude向け3D素材利用ガイド**](CLAUDE_ASSET_USAGE.md) にまとめています。
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
