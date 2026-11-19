# 第3層 — 窓ガラス V8「右上の1かけ欠け」実レンダリングレビュー

更新: 2026-11-19。ユーザー最新指示「真ん中に穴が開くのではなく、ひとかけらのみ」「レンダリングへどうぞ」。

## 変更対象
- 以前のA型V5–V7は**保存したまま**。V8として独立再設計。
- `tools/floor3/broken_glass01/build_single_chip_v8.py`
- `.github/workflows/f3-glass-single-chip-v8.yml`
- 一枚のほぼ長方形のガラス、**右上の1か所にのみ欠損**。中央の穴、穴を横切るひび、大量の破片は含まない。
- 6mmのSolidify板厚、角の微小ベベル、256px自作Roughnessマップ。外部ダウンロード素材は使用していない。

## 実行・検証結果
- [GitHub Actions #44512392576](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44512392576): **success**。
- Artifact `f3-glass-single-chip-v8`、ID `14522259390`。GLB、Blend、4方向PNG（正面・側面・斜め・欠け拡大）、自作Roughness PNGの7ファイルを実ダウンロードしてmanifest SHA256全一致を確認。
- GLBの構造: **1メッシュ**。ノード名 `F3_GLASS_SINGLE_CHIP_V8` のみ、レンダー用背景やBlender初期Cubeなし。glTF拡張 `KHR_materials_transmission` および `KHR_materials_ior` の存在を実確認。
- 実Blenderの正面・側面・斜め・右上角拡大を目視確認済み。右上角の1か所のみ欠け、中央に穴なし。側面は薄い板に見える。
- 美術品質: **ユーザー承認待ち**。端面の欠けは滑らかめで、実ガラスの荒い破断としては改善余地あり。透過感は背景と環境光に依存。Three.js画面、FPS・ClamAV実スキャンは未検証。

## 保存方針
- Artifactは一時保存。ゲーム組込・正式アセットフォルダへの昇格はまだ実施しない。
- 既存の壁・鉄筋・縦材・横材・接合金具の資産/コードに変更なし。
