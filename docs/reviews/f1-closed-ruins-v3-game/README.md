# 閉鎖神域V3・実ゲーム最終検証

`tools/f1-closed-ruins-v3/verify-game-v3.cjs` をChromium / SwiftShader / Three r180で実行。**3 sessions / 18 checks / 実ゲーム画像16枚でPASS**。通常表示、opt-in、意図的SHA不一致を独立contextへ分離した。

通常1F/2Fのモデルと環境、live map/固定7対象/FOE、移動・壁衝突、宝箱80G一回とclosed→openモデル交換、NPC/看板/灯、階段3F→2F→3F、戦闘→復帰、素材不一致時の従来3Fへの復旧と1Fの維持を確認。水shaderが実コンパイルされ、通常frame経由で時間が進むことも確認した。page/console errors0、各sessionのWebGL upload警告0。通常preload警告や外部font接続問題、期待したSHA不一致warnはJSONへ保持し、全警告0とは呼ばない。

最終入力は25GLB・新旧layout・runtime・水shader/texture・map/操作コード等のSHAで固定。実行開始/終了時の一致をassert。初回の250ms固定待ちはソフトウェアGPUで次frame前に判定して失敗したが、撮影state内の水時間は265秒→477秒と進んでいた。`history-water-frame-wait-failure.json` に保存し、actual clockの更新を待つ方式へ修正した。

最終機能は全てfresh contextから再実行した。重複する静的画像9枚は初回の実撮影を、**全入力SHAとPNG SHAの一致をassert**したうえで再利用。7枚を追加撮影し計16枚とした。`visual-checkpoint-before-timing-fix.json` と最終reportの各 `reusedVisualFrom` が履歴。失敗前の画像を最終機能PASSへ読み替えたものではない。

再実行例（必要なChromium/Playwright/Threeを用意）:

```sh
node tools/f1-closed-ruins-v3/verify-game-v3.cjs
```

既存の同一入力の画像を厳密照合して再利用する場合:

```sh
V3_VISUAL_CHECKPOINT=docs/reviews/f1-closed-ruins-v3-game/visual-checkpoint-before-timing-fix.json node tools/f1-closed-ruins-v3/verify-game-v3.cjs
```

## 実画面

- 04:天井とアーチのある参道、05:社の南外壁（ここから社を透かして見せない）、06:水際東側。
- 14:北を向いた地下水、15:鳥居と社の同軸、16:根とvaultで覆われた入口側。
- 07/08:宝箱の閉/開、09:ボス門、10:元の2F、11/12:戦闘/3F復帰、13:SHA不一致による旧表示。

数値上の2760配置/504天井/1265 batches/7560 mesh instances/7202912 trianglesは割当量の観測であり、同時描画量やFPS合格ではない。通常の保存を使わずfixture内で永続書込みを抑止したため、永続セーブの全機能合格とも扱わない。実機FPS、全GPU、長期進行、最終美術承認は未完了。通常main公開と既定表示の昇格は含まない。
