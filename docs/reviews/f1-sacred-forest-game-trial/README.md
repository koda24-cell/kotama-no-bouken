# 一層3F・試験ゲーム組込みの検証

対象は本物の `index.html?f1sacred=1`。通常URLと新しいブラウザcontextを分け、1F・2Fとopt-out 3Fの既存表示、opt-in 3Fだけの静的アート差替えを確認する。

```sh
node tools/f1-sacred-forest/verify-game-trial.cjs
```

予定する確認:

- 従来1F、opt-inでも変わらない1F、opt-out 3F、opt-in 3F。
- live map、固定7対象のidentity・実モデル・操作anchor、水11マス、FOE sprite/texture。
- 既存public inputで一回ずつ移動・旋回・横移動・壁衝突をstate確認。
- 胸箱の80G報酬1回、flagとclosed→openモデル交換、NPC/看板会話、灯の回復/checkpoint。
- 実階段プロンプトによる3F→2F→3F、環境/far/fogの復元、実戦闘開始からの帰還。
- manifest応答のSHAだけを書き換える独立negative contextで、素材不一致→既存3Fへfallback→1Fも維持。

元ゲームは第1〜5階層で3D固定・切替ボタン非表示のため、その挙動を保持したことを確認する。2Dへの切替成功とは記載しない。

新規context内の保存キー書込みと `persistAutoSave` はテストfixtureで抑止する。既存ユーザーの保存データを使わず、セーブ/ロードの永続化を合格にしない。Software rendererのカウンタは端末FPS承認ではない。

現在はスクリプト作成段階。`game-trial-verification.json` が実行成功した場合だけ成功記録とする。失敗は別の `game-trial-failure.json` に保存し、途中の画像やsource commitだけで成功扱いにしない。
