# 第2層凍結水車・単体輪縁：V04–V06 Blender実レンダーQA（2026-11-18）

**全て NOT_APPROVED / 作業ブランチのみ / 既存水車未変更 / 正式素材保存なし。**

## 続行結果
| 版 | 実際のBlender Actions成功run | 一時Artifact | 変更点 | 目視美術判断 |
|---|---|---|---|---|
| V04 | https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44239068076 | 14398742668 | V03元メッシュを非表示保管し、Booleanで木栓用の2個の実穴を作り木栓を配置、木口に2枚の裂け面を試作 | **不合格**：木栓が穴の奥に沈み、真っ黒な穴に見える。木口破片が尖って浮く |
| **V05** | https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44239495486 | **14398339668** | V04の木栓2個を実表面へ+0.014m移し、浮いた破片を除去、写真PBRと輪縁形状を保持 | **3版中の最良候補（未承認）**：木栓が見えるが近景として木材の繊維構造/腐食造形が不足 |
| V06 | https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44239976398 | 14398564599 | V05から木口角3か所を実Booleanで欠き、年輪画像のコントラストを減らす | **不採用候補**：上端に不自然な尖った突起ができ、V05よりシルエット悪化 |

## 技術確認
- 全3 runで**本物のBlender 5.3**をDocker Actionsから起動、元`.blend`チェックポイントSHA256を一致確認。
- 各V04/V05/V06で編集用`.blend`、`.glb`、正面/側面/斜め/裏4PNG、manifestを生成。実Artifactをダウンロードして**各6ファイルのSHA256とバイト数一致**。
- 木材はV03から継承した[Poly Haven Fine Grained Wood](https://polyhaven.com/a/fine_grained_wood) CC0の写真Diffuse/OpenGL Normal/Roughnessを利用。木口の年輪画像は自作。既存の第2層水車本体やV16羽根板には触れていない。
- V05`.blend` SHA256: `55ebe59e0ceb4d4875ff85daa48ff3f14e8e507fe76a60f20cd629ac97af96c4`。この版を次の安全な作業起点にすること。V06は評価比較用に保全し、継続ベースにしない。
- V06の木材ポリゴン数は428。これはBlenderの木材単体の値であり、GLB全体の三角形数やゲーム実機FPSではない。
- GLBの共有Performance Audit/rigid LOD・Three.js実機描画は未実行。独立したArtifact内にある段階であり、完成許可の根拠にはならない。
- 外観の最優先改善は、傷を等間隔にせず木目方向に沿わせて三次元の繊維破断を控えめに造ること、木栓の断面色と木口の明度を調和させること、水車として継ぎ目位置/方向を実組立時に検査すること。
- 追加の木材形状を作る前に、まずV05の正面・側面・斜め・背面を基準にする。自然な腐朽の追加は実物木組み・古木接写を参照し**短い欠けだけを検査しながら**進める。
- **元V03木材はV04以降のBlender作業ファイル内部で非表示バックアップ**として保持、GLBから除外する設計。元V03ファイルはArtifactとして独立保存。
- **PR #503 はDraftのまま**。ユーザー承認前にdevelopment/mainへマージや正式素材フォルダ昇格をしない。
