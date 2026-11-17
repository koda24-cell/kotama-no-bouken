# 一層3F・試験ゲーム組込みの検証

対象は本物の `index.html?f1sacred=1`。通常URLと新しいブラウザcontextを分け、1F・2Fとopt-out 3Fの既存表示、opt-in 3Fだけの静的アート差替えを確認する。

```sh
node tools/f1-sacred-forest/verify-game-trial.cjs
```

実行済みの確認（`game-trial-verification.json`、3 context / 16 checks / 13 images）:

- 従来1F、opt-inでも変わらない1F、opt-out 3F、opt-in 3F。
- live map、固定7対象のidentity・実モデル・操作anchor、水11マス、FOE sprite/texture。
- 既存public inputで一回ずつ移動・旋回・横移動・壁衝突をstate確認。
- 胸箱の80G報酬1回、flagとclosed→openモデル交換、NPC/看板会話、灯の回復/checkpoint。
- 実階段プロンプトによる3F→2F→3F、環境/far/fogの復元、実戦闘開始からの帰還。
- manifest応答のSHAだけを書き換える独立negative contextで、素材不一致→既存3Fへfallback→1Fも維持。

元ゲームは第1〜5階層で3D固定・切替ボタン非表示のため、その挙動を保持したことを確認する。2Dへの切替成功とは記載しない。

新規context内の保存キー書込みと `persistAutoSave` はテストfixtureで抑止する。既存ユーザーの保存データを使わず、セーブ/ロードの永続化を合格にしない。Software rendererのカウンタは端末FPS承認ではない。

実ゲームで775配置（床274=石187/土surface87、装飾地面177、壁178、小物129、天井17）、18 GLBのSHA一致、652 batches / 2092 instances / 3,911,334 trianglesを観測。実行前後のmap、候補、17個別資産、旧天井、runtimeの入力hashは一致した。記録のsource commitは実行開始時点で、以降のQAハーネスだけのcommitは実ゲームの入力を変えていない。

修正前の機能suiteはpassしたが、SwiftShaderで `texSubImage2D: bad image data` と `Texture is immutable` が各1回出た。その履歴は `history-pre-svg-raster-fix.json` に保持。原因は既存FOE SVGの直接uploadと独立再現で判明し、初回描画前のcanvas化で修正した。別の実ゲーム8段階GPU診断は820 uploads / GLerror0 / GPU警告0（隣接の `../f1-sacred-forest-gpu-upload/` 参照）。通常のmonster preload警告、外部Google fontのTLS失敗、遷移時の先読み中断は別に記録し、意図したSHA不一致警告はnegative contextに分離する。

画像05は歩行セル(13,4)・目高1.6mから見た祠。既存の低い崩落壁越しに屋根・扉を確認でき、高い壁の撤去は行っていない。画像04の参道は従来の細長い迷路構造を保持している。画像06は水際の東向きのため水面が画角外で、追加の水面向け画像は次で再現する。

```sh
node tools/f1-sacred-forest/verify-game-trial.cjs --water-review
```

追加画像14は歩行セル(14,11)・上向き・目高1.6m。機能suiteとは別の `water-review-verification.json` に記録する。

初回の失敗はテストfixtureが既存gatherの表示名追加をidentity改変と誤判定したもの。`fixture-initial-failure.json` に保存し、source側の比較を修正後、上記suiteを最初から実行して成功した。途中画像だけで成功扱いにしていない。全ゲーム回帰、実機FPS、永続セーブ、長時間進行の承認は含まない。
