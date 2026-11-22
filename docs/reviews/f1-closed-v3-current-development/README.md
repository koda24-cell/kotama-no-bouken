# 最新developmentとの互換性・共通監査

既存改修の実ゲーム18項目/16画像を保存した後、upstream `2572845b98a34a5b4e7d1d4353e8e7dfb82668a9` を比較・マージ。一層3Fのmap/固定identityは同一で、他層のランダム迷宮や4層改修等を保持した。マージ後の `847874edc30e5e6ec6b22a689047d1d15ea7a93a` で**fresh 3 sessions / 18 checksを再実行しPASS**。水際と鳥居祠の2画像だけ追加撮影し、他のカメラもstate/機能を確認した。16画像の旧ベースの記録とは混同しない。

再実行:

```sh
GAME_TRIAL_OUT=docs/reviews/f1-closed-v3-current-development V3_CAPTURE_ONLY=14-v3-water-facing-north,15-v3-torii-shrine-axis node tools/f1-closed-ruins-v3/verify-game-v3.cjs
```

入力SHA不変、map/固定7/FOE、水の実時間更新、1F/2F比較、移動/宝箱/NPC/灯/階段/戦闘復帰/SHA不一致fallbackを再確認。page/console errors0、WebGL upload警告0。通常のpreload警告や外部font接続問題はJSONへ保持。実機FPS・長期進行・全GPU・最終美術承認は別。

## 既存素材の共通Actions再監査

[run45051036648](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/45051036648) はshared Blender5.3.0+ClamAV gatewayと構造監査の両jobがsuccess。入力素材のscan→既存GLB再import/5Blend packed画像decode→原本/従来20PNGのhash不変archive→出力scanを実行した。**新しい20枚をレンダリングしたrunではない**。モデルは再生成・自動LOD置換せず保持。構造監査のローカル同実装では5GLB/6694tri/14primitive instancesで、全てfoliage-or-transparency reviewへ分類し汎用Decimateを採用しない。

`shared-actions-audit.json` はGitHubAPIのrun/job/全step結果とartifact metadataを恒久記録したもの。raw job-logのredirect downloadが環境からHTTP403であり、artifactの内容を取得したとは主張しない。元GLB/Blend/20PNGとローカル形式検証はGitに恒久保存済み。汎用Auto Review run45051033409はstartup_failureで、そこからのLOD生成成功は主張しない。専用の共有監査/security runは成功している。
