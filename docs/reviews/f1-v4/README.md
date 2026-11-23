# 第一層V4・改修証跡

レビュー用の別素材と試験フラグによる統合。美術の正式承認/実機FPS合格/main公開ではない。

- [設計](../../3d/F1_LAYER_V4_DESIGN.md) / [受渡・限界](../../3d/F1_LAYER_V4_REVIEW_HANDOFF.md)
- `map-qa.json`: 実nativeデータ/BFS/FOE閉路。1F/2Fの元データと固定7物を保持。
- `geometry-clearance.json`: 実GLBの硬い757配置×106移動帯、衝突0。
- `roof-ray-coverage.json`: 954点中945屋根hit、意図した歩行路開口9点、全3開口中心は開放。
- `save-fallback.json`: 旧位置182点の壁内位置拒否と進行フラグ保持。
- `arch-format.json`, `arch-performance.json`: 最新GLBの形式/構造監査。
- `../f1-v4-game/verification.json`: 最終石材でfresh3条件の実ゲーム検査。生成時の転記scopeラベルだけ明示修正、観測値/入力SHAは不変。
- `../f1-v4-game/supplementary-verification.json`: 実階段/会話/回復/戦闘帰還と修正カメラ。
- `../f1-v4-water/water-verification.json`: 反射1target、水の時間変化、2回dispose、資源/影設定復元。

見た目は `../f1-v4-game/07-v4-2f-progression.png`, `08-v4-1f-progression.png`, `09-v4-water-corrected-view.png`, `10-v4-arch-front-corrected-view.png`。祠と採光・裏面は `initial-pass/02-v4-shrine-dead-end.png`, `04-v4-water-shaft.png`, `06-v4-arch-back.png`。初回03/05は対象の撮影位置が不適切だったため美術証明から除外。

旧成果・誤判定・初版の重複面画像を保持。Pinterest画像のtexture転用や新規保存/投稿はしていない。
