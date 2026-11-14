# 第4層 岩壁制作：導入ツール・資料・検証情報（2026-11-14）

> **情報のみの統合記録**。モデル、GLB、PNG、ワークフロー、ゲーム本体、正式素材には変更を加えない。GPT / Claude共通の引き継ぎ用。

## 使用・検証した制作ツール
- **Three.js 0.160.1**：既存V13岩壁を `tools/b4-render/export-rockwall-v13.mjs` でGLBに変換。NodeのFileReader互換処理を利用。
- **Blender（Ubuntuのapt版）**：GitHub Actionsで直接導入し、Cyclesによる正面・斜め・側面・背面のPNGとGLBを出力。Docker版の成功を意味しない。
- **Blender mathutils.noise**：V22で広域ノイズ、V23で岩面の細かな変化、V25で頂点への微細な凹凸を実装。V22/V23/V24のレンダリングは成功済み。V25は実行失敗、効果未確認。
- **Blender標準ノード**：Noise Texture、ColorRamp、Bump、Principled BSDFで岩の色むら・粗さ・細かな凹凸を構成（V25試作）。**Blender固有の手続き型Bump/色はGLBへ自動で完全移植されない**。採用前にUV展開とBase Color/Normal/Roughnessのベイクおよびブラウザ側検証が必要。
- **不規則な平面分割（Voronoi風）**：V23で大きな岩面と細い割れ目を試作。側面・背面の板状/格子状の課題が残る。
- **Poly Haven Rock Face 02（CC0）**：スキャン岩の参照素材。V17〜V23で母岩に配置したが突出・浮きが残り、V24以降の岩単体プレビューでは除外。スキャン岩の利用・再配布条件は元ライセンス記録を参照。

## 参考資料・Pinterest
- 参考画像の管理ルール：`https://github.com/koda24-cell/pinterest-reference-library/blob/main/AGENTS.md`（ブランチの最新状態を再確認）。
- 第4層の引き継ぎ：`handoff/kotama-floor4-volcanic-rock-20261113.md`、関連Draft PR #4。
- Tailwind経由で「マテリアル」ボード向けにBotW風の岩の候補ピンを取得したが、**画像本体のダウンロード・目視検証は未完了**。候補は確定採用ではない。
- 目標：『ゼルダの伝説 ブレス オブ ザ ワイルド』を参考にした大きく角張った岩面。細かい波状ノイズ、浮いたスキャン岩、平坦な側面/背面は避ける。

## バージョンと実行記録
| 試作 | GitHub PR | Actions run | 確認状況 |
| --- | --- | --- | --- |
| V21 母岩の彫刻 | #349 | 43555738453 | 成功、レンダ成果物あり |
| V22 標準ノイズ | #351 | 43600106198 | 成功、GLB・PNG |
| V23 岩面分割 | #352 | 43601189229 | 成功、GLB・PNG |
| V24 溶岩なし・岩のみ | #355 | 43602387922 | 成功、GLB・5方向PNG |
| V25 玄武岩の微細凹凸とマテリアル | #356 | 43603168104 | **失敗**（Render eight views and export GLB）。生成・品質確認未完了 |

## 次に行う検証
1. V25のActionsログを調べてエラーを修正し、再実行後に実際のPNGを確認。
2. 岩の実形状とBlenderの見た目だけのBumpを区別。GLBのゲーム内再現にはPBRテクスチャのベイクと検証が必要。
3. ユーザーの品質承認前に正式素材フォルダへ昇格しない。Actions Artifactsは一時保存（14日）。
4. ClaudeはBlenderを操作せず、承認済みGLB・PNG・manifestをブラウザで検証する担当。造形やレンダリングはGPT/Blender側に戻す。

参照：`AGENTS.md`、`docs/3d/BLENDER_DOCKER_HANDOFF.md`、`docs/3d/ASSET_PROMOTION_POLICY.md`。
