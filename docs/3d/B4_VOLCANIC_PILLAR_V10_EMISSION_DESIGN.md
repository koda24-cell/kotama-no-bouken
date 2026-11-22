# 第4層 火山四角柱 V10 — 発光マスク実装仕様

参考: https://github.com/SilentNightSound/GI-Model-Importer/blob/main/Guides/EffectModdingTutorial.md

## 確認できたこと
コミュニティによる鍾離の石柱のシェーダー解析では、Diffuseテクスチャのalphaに発光領域に関係する情報があり、サンプリング箇所と出力を追跡して発光色のみを変更したと記載されている。原神公式の開発仕様を示す資料ではない。

## コタマ独自の実装
- 原神のモデル・画像・抽出したshaderは利用しない。
- 自作のグレースケールEmission Maskを、石のBase Colorや不透明度と分離する。
- PBRの石本体は不透明のまま維持し、マスクでPrincipled BSDFのEmission Strengthのみを制御。
- 色は低彩度の赤橙。常時全面発光はしない。明滅はThree.js統合時に別途実装・検証。
- マスク画像はNon-Colorとして読み込む。発光閾値をColorRampで調整。
- 検証用Blenderノード作成関数: tools/floor4/volcanic_stele/emission_mask_v10.py

## 実装・検証状態
- Blenderノード構築関数: GitHubに追加済み。実行・レンダリング・GLB書出しは**未検証**。
- V10四角柱本体: 未制作。V9までの原本は保持。
- Emission Mask画像: 未制作・未接続。現行V9に自動適用されない。
- 外部PBR・火の粉VFX: 未導入。
- 次: 3.6m×0.85m×0.85m四角柱の原型→独自UVマスク作成→ノード接続→4方向実レンダリング→GLBと性能検査。
- ゲーム本体への正式統合は承認後。
