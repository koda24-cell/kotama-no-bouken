# 3D制作ツール・機能 統合カタログ（検証状態付き）
更新: 2026-11-14 / 統合先候補: development / この文書はツールのインストールを行わない

## 使い方
GPT・Claudeは3D制作前に `AGENTS.md`、`docs/3d/BLENDER_DOCKER_HANDOFF.md`、`docs/3d/ASSET_PROMOTION_POLICY.md` と本書を読む。**導入済み・実行確認済み・候補のみ**を混同しない。最新状態は関連PRとActionsで再検証する。

## 実際にコード／ワークフローを確認した機能
| 分類 | ツール・機能 | 保存場所 | 確認範囲 | 制約 |
|---|---|---|---|---|
| 3D造形 | Blender Python API、メッシュ生成、マテリアルノード | `tools/b2-ice-bridge-side/build_and_render.py`（PR #340 作業ブランチ） | コードを確認、V9 Actions成功 | developmentには未統合 |
| レンダリング | GitHub Actions、Ubuntu apt Blender、Cycles | `.github/workflows/b2-ice-bridge-side-preview.yml`（PR #340 作業ブランチ） | V9 run 43603006558 成功、GLB/PNG Artifact生成 | Artifactは14日間の一時保管 |
| 氷質感比較 | Principled BSDF Transmission、IOR 1.31、Roughness、Volume Absorption | 同上のV9スクリプト | 透明氷・青い深層氷・白濁氷の3種類をBlenderで実レンダリング | GLB/Three.jsの見た目は未検証 |
| GLB書き出し | Blender glTF exporter | 同上 | GLB出力をActionsで確認 | BlenderのNoise/Bump/VolumeがGLBへ同等に移るとは限らない |
| 4F既存ツール | Three.js→GLB、Blenderレンダ、昇格スクリプト | `tools/b4-render/`、`docs/3d/BLENDER_DOCKER_HANDOFF.md` | development上にコード／手順あり | Docker版の実行成否は文書上未確認、現在の実行状況を別途確認 |
| 正式素材昇格 | 承認→GLB/PNGの正式保存候補PR | `docs/3d/ASSET_PROMOTION_POLICY.md` | 手順文書あり | B4向け。実行未検証、他階層へ自動適用不可 |

## 追加調査・導入候補（未導入／未検証）
| 分類 | 候補 | 目的 | 導入状況 |
|---|---|---|---|
| 氷結 | Freezing Effect Generator（外部アドオン） | 霜・凍結表現 | 導入・互換性・実レンダ未検証 |
| Blender標準 | Geometry Nodes、Voxel Remesh、Sculpt、Displace | 破損・侵食・表面変形 | 本タスクでの導入・実適用は未検証 |
| PBR素材 | Poly Haven CC0 の岩・氷・雪系テクスチャ | Base Color／Roughness／Normal | 個別の取得・ライセンス・モデルへの適用未検証 |
| glTF拡張 | KHR_materials_transmission／KHR_materials_volume | ゲーム内の透過・厚み表現 | 実機表示未検証 |
| 3Dアニメーション | Quaternius、Rokoko、Mixamo、DeepMotion | 歩行・戦闘・リターゲット | 別作業の保存状況・ライセンスを未再確認。導入済みと断定しない |

## 氷岸V9の実績と不採用
- PR #340: https://github.com/koda24-cell/kotama-no-bouken/pull/340
- Actions run: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43603006558 （成功）
- 透明氷（Transmission .82 / Roughness .10）、青い深層氷（.66 / .16、Volume Absorption）、白濁氷（.35 / .30）を同一氷岸形状で比較。
- **長方形の新しい橋本体はユーザーが不採用**。その生成コードはPR #340の作業ブランチから削除済み。再導入しない。
- 氷岸V7〜V9は未承認の試作。正式素材として昇格しない。

## 外部資料と担当分担
- Pinterest資料・参考画像確認状況: https://github.com/koda24-cell/pinterest-reference-library/blob/main/handoff/b2-ice-bridge-realism-20261114.md （画像URLのみで実物未確認）
- GPT／Blender Actions: 造形、GLB生成、実レンダリング、PNG／manifest／ハッシュ作成。
- Claude: Blender操作は行わず、承認済みGLBとPNGの確認、Three.js/GLTFLoaderでの統合と検証。
- 他チャットで「導入済み」と報告する前に、該当ブランチ・PR・実行ログ・成果物を確認する。

## 今後の統合条件
1. 各ツールの配布元・ライセンス・対応Blender版・導入方法を記録。
2. インストールだけでなく、最小テスト→実レンダ→GLB→ブラウザ表示まで検証。
3. 有用なものだけ独立したツール基盤に取り込み、ゲーム本体へ無断で混ぜない。
4. 既存の未承認PRを勝手にdevelopment/mainへマージしない。
