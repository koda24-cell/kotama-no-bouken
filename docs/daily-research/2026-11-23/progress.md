# コタマ制作定点観測 — 2026-11-23

取得日時 2026-11-23T08:14:53+09:00。対象development fb8a776。期間は11/22 08:00〜11/23 08:00 JST。

| 指標 | 観測値 | 集計の範囲 |
| --- | --- | --- |
| development到達可能コミット | 11 | committer dateで期間抽出、merge commit込み |
| PR作成 | 15 | リポジトリ全base、期間内created |
| PRマージ | 6 | リポジトリ全base、期間内merged |
| 未マージのopen PR | 345 | 取得時点のrepo全体。期間末の歴史値ではない |
| 3D共有INDEX行 | 726 | textures461/models227/packs26/hdris12。実体/分類/品質の再認証ではない |

前回同方式snapshotを特定できず今回を比較基準として保存。最古コミットは今回確定できず、構想開始日・本格GitHub開始日・制作日数は未確定。initial検索0件を開始日の証拠にしない。全階層実装数、承認済み数、正式保存済み数、全反復回数は未集計。

## 確認できた進捗と限界
[PR465](https://github.com/koda24-cell/kotama-no-bouken/pull/465)が11/23 02:55 JSTにdevelopmentへ統合。一層3Fの閉鎖神域opt-in改修。既存17GLB保持・新5素材・fresh3条件18checks PASSという記録をREADME/PRで照合し、ゲーム実画面16PNGと最新development再確認2PNGの永続パスをAPIで確認した。今回は画素を開いておらず実画像確認済みとはしない。
参照: [最新development互換記録](https://github.com/koda24-cell/kotama-no-bouken/tree/development/docs/reviews/f1-closed-v3-current-development) / [実ゲーム画像一覧](https://github.com/koda24-cell/kotama-no-bouken/tree/development/docs/reviews/f1-closed-ruins-v3-game)。
18項目を今回再実行したわけではない。実機FPS・全GPU・長期進行・最終美術承認は未完了。新規20レンダーと既存20PNGの再アーカイブを混同しない。

[PR714](https://github.com/koda24-cell/kotama-no-bouken/pull/714)の透明材分割描画run44965880886は3jobs成功。right-and-qa実ログでBlender5.3.0、ClamAV定義更新・各検査0件/SCAN_PASS、1000×760・fullMAE0.2085・境界比1.6326・PASSを確認。reference/tiled Artifactの存在と未失効も確認。今回は画像本体未取得、美術QAはNOT_TESTEDのまま。

最新developmentの[一般Auto Review run45052125830](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/45052125830)はstartup_failureでjobs0件。自動LODや全体安全監査成功と報告しない。F1専用shared監査run45051036648が成功したという記録とは別に残す。

## 週報・節目
本日は月曜日なので週次を重複作成しない。一層3Fの統合は節目候補として記録するが、ユーザー美術承認や既定表示/公開の完成とはしない。節目記事は「閉じた遺跡に見せるには何が必要だったか」を将来候補とし、今は3試作の不足画像を優先。

## 発信と保存
[3D調査PR43](https://github.com/koda24-cell/3d-asset-studio/pull/43) と[音声調査PR14](https://github.com/koda24-cell/music-ai-studio/pull/14)を参照。記事候補の発表順・見出し・失敗・再現手順・画像配置・X2案はeditorial.md。画像状態はimage-register.json。すべて非公開・公開承認待ち、記事用画像の新規生成/取得/加工/保存は0件。
