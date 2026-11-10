# B3 実ゲームの描画・操作テスト

ゲーム本体をHTTPで配信し、隔離したChromiumプロファイルで確認する。ユーザーのlocalStorageは参照せず、テスト内の自動セーブも無効にする。製品へテスト用状態・UIは追加しない。

必要な開発用ツール：Node.js、Playwright、Chromium、three **0.180.0**。ゲームへ新しい実行時依存は追加しない。`PLAYWRIGHT` はPlaywrightパッケージのパス、`THREE_DIR` はthreeパッケージのルート、`CHROME` はChromiumの実行パス。

```sh
PLAYWRIGHT=/path/to/playwright THREE_DIR=/path/to/three CHROME=/usr/bin/chromium OUT=/tmp/b3-pc node tools/b3-3d/game-test.cjs
PLAYWRIGHT=/path/to/playwright THREE_DIR=/path/to/three CHROME=/usr/bin/chromium OUT=/tmp/b3-mobile node tools/b3-3d/game-test.cjs --mobile
```

ポート8773を使うためPC・スマホテストは順番に実行する。CDNのthree.jsだけ同じバージョンのローカルパッケージへ置換する。テスト中に限りレンダラの内部参照を配信時に追加し、シーン本体の描画回数・三角形数を採取する（bloomの最終画面合成の数値と混同しない）。FPSは実際の3Dシーン描画間隔から計算し、画面更新数の上限は設けない。

確認内容：B3全3フロアの実描画とスクリーンショット、各大型装飾の外形と全通行マスの非交差、前進・旋回・壁衝突・FOEターン、宝箱開封・採集、壁スイッチと3灯の順番パズル・門の開放、スマホのタップ、B1/B3往復でのルート重複・光源・遠距離・GPUジオメトリ数、セーブ往復読込、階段移動。失敗はJSONに残し終了コードを1にする。

この環境のSwiftShaderはソフトウェア描画である。縦画面・タッチエミュレーションは実スマホGPUやSafariの性能を証明しない。外部Google Fontsの証明書エラーは別途記録し、ゲームのJSエラーと区別する。
