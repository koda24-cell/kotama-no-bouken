# 3F 遺跡都市 — 次チャット引き継ぎ（2026-11-16）

## 運用
最初に development の AGENTS.md、docs/3d/BLENDER_DOCKER_HANDOFF.md、docs/3d/ASSET_PROMOTION_POLICY.md を読み、PRとActionsの最新状態を再確認する。統合先は development。未承認GLBを正式素材に昇格させない。ClaudeにはGLB+正面/側面/斜めPNG+manifestで渡す。Actions Artifactsは一時保存。

## 完了扱いの制作コード
高架橋4タイル straight/end/collapse/support V3：PR #353 を 2026-11-16 に development へ squash merge、commit 40a27fa0121dbd749277d11e5f50db52b6c0de1e。
V3 Blender成功run #43608333583。ユーザーは次工程へ進むことを承認。
注意：PR #353 にあるのは生成スクリプト・workflowであり、GLB/PNGは正式素材ディレクトリには未昇格。正式保存・manifest・ゲーム内統合は別途必要。

## 未完成 — PR #376
https://github.com/koda24-cell/kotama-no-bouken/pull/376
branch feature/floor3-ruined-stair-connector-20261115
階段・スロープ・踊り場 2m x 2m の3種。
V1: 基本造形。V2: 階段を不規則多角形に。V3: 破損の大小差、連続スロープ、床亀裂、折れた手すり。V4: 小さな粒状瓦礫・苔・骨材を削除。V5: コンクリートのノイズ/バンプ/粗さ/色むらを強化。
V5 成功 run #43727085752、artifact floor3-irregular-stair-v5、GLB 3・PNG 9。
生成: tools/floor3/ruined_connector/build_irregular_v5.py
workflow: .github/workflows/floor3-irregular-stair-v5-render.yml
V5はまだユーザーの完成承認なし。PR #376はdraftのまま、マージ禁止。

## 次に直すべき点
1. 支柱/手すりが空中に浮いている。各タイルの実際の床面高さと接合点を計算して再配置。
2. 踊り場の亀裂が表面に載せた細い棒に見える。実際のメッシュの割れ/溝に変更。
3. 階段の段間隔と破損が規則的。大小差と崩壊位置のばらつきを強化。
4. V5のプロシージャルBump/NoiseはGLBにそのまま完全反映されない。ゲーム向けNormal/Roughness/BaseColorをベイクしGLBの実表示を確認。
5. 小さな粒・点状の苔・虫のような破片を復活させない。
6. 毎回 Blender で正面/側面/斜めレンダリングし、実画像を目視で確認・提示。

## 参照
PR #353 https://github.com/koda24-cell/kotama-no-bouken/pull/353
PR #376 https://github.com/koda24-cell/kotama-no-bouken/pull/376
V5 run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43727085752
V3 bridge run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43608333583

## 承認と保存
高架橋の生成コードはdevelopmentへ統合済み。高架橋GLB/PNGの正式保存は未実施。
階段V5は未完成・未承認・未統合。ゲーム本体への適用も未実施。
