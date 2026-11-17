# 第3層「遺跡都市」二段折り返し階段 — 実レンダー反復・引き継ぎ
更新: 2026-11-17 JST
状態: **NOT_APPROVED / Draft PR #449**。元ユーザー参考画像は本チャット添付（黒背景の苔むした屋外折返しコンクリート階段）。参照画像自体をゲーム素材として転載しない。

## スコープと制約
- ユーザーが希望する画像の構造を独立した大型アセットとして再構築。承認済み2m規格の「stairs V8」とは別素材。
- 逆方向2フライト（各14段）、中段踊り場、上段張出し床、脚柱4本、連続する支持桁、錆びた鋼製手すり、苔・雨筋・錆。
- PR #439でマージ済みの既存階段V8、PR #440のスロープV7、旧PR #376の未承認素材を一切破壊しない。
- ユーザー合格前にdevelopment/mainへマージ・正式素材保存・ゲーム配置しない。
- 現段階の寸法（約8m×3m×5m）の当たり判定、通路接合、既存ダンジョンへの表示は未検証。
- チーム作業の分担は制作工程の担当であり、複数の独立AIが同時稼働しているとは主張しない。

## 実際の成功runとレビュー
| 版 | GitHub Actions実行 | 成果 | 主な目視評価 |
| --- | --- | --- | --- |
| V1 | https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43985583033 | **success**、GLB/Blend/3方向PNG | 2段折り返し・柱・手すり成立、全体の質感と構造厚みが弱い |
| V2 | https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43986145671 | Blender描画自体success、検査失敗（node名の誤ったV2置換）、PNG実取得済み | 四角い苔パッチが貼付物に見える |
| V3 | https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43986744498 | **success**、GLB/Blend/3方向PNG | 苔輪郭の自然さ改善、依然均一で明るい |
| V4 | https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43987238673 | **success**、GLB/Blend/3方向PNG | 支持桁の太さと暗さが改善 |
| V5 | https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43988036966 | **success**、GLB/Blend/3方向PNG、写真PBR正常取得・ロード | 画像PBRで汚れを表現、黄色い色かぶりが強い |
| V6 | https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43988795627 | **success**、GLB/Blend/3方向PNG | 写真PBRの緑灰色補正が改善、支柱・縁・手すりの実感不足 |
| V7 | tools/floor3/switchback/build_v7.py と floor3-switchback-v7.yml | **実行結果は別途確認** | 太い柱、切れた角、鉄筋接合補強の候補 |

各版の成果物はGitHub Actions Artifacts内（14日で期限切れ）。原本は制作ブランチのPython生成コードで再現可能。現段階でGLB・PNG正式Git登録未実施。

## 実証したCC0写真PBR素材
- Poly Haven Concrete Moss (by Rob Tuytel), CC0 1.0。 https://polyhaven.com/a/concrete_moss
- 公式API `https://api.polyhaven.com/files/concrete_moss` でマップURL・種類を取得。取得コード: `tools/floor3/switchback/fetch_cc0_pbr.py`
- 確認実行: V5 https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43988036966
- 1K JPEG Diffuse: https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/concrete_moss/concrete_moss_diff_1k.jpg  SHA-256 `7a3f88bcdf20c2b6b1851549594611c0c24677d4f42c669a21d4367b8f5aeacc`
- 1K JPEG Normal OpenGL: https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/concrete_moss/concrete_moss_nor_gl_1k.jpg  SHA-256 `ead99715fadfd3b1b037b6219a9ed97342701732bffee5b05084da4c99b7467b`
- 1K JPEG Roughness: https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/concrete_moss/concrete_moss_rough_1k.jpg  SHA-256 `ca41216de508cf2afd619e2e617bbb620082b22f20e75dd80c6c415ce1e6d95c`
- V5 Blender logに `V5_PHOTOGRAPHIC_CC0_*_LOADED` 全3マップが両コンクリート素材に対して記録。GLBにもマテリアル画像が埋込（V5 ZIP内）。
- 参考のPinterestピンやユーザー提供画像をテクスチャとして使用していない。

## 技術上の注意と次の一手
1. 写真PBRの色空間と実レンダーの視覚は別。V5黄色過多→V6オリーブ灰色補正。
2. V2の自動検査失敗は生成物不具合ではなく、期待ノード名をV1→V2へ誤置換したため。以降のworkflowではV1のmesh名を検査。
3. V5最初の公式画像取得エラーはrunner側の `/work` 書込パス誤り。相対 `out/source_textures` に変更して実証成功。
4. 過去版を全PR更新で再レンダしていたため、V1〜V6のPR発火トリガーを除去。必要時のみ対応版コード/Workflowのpush、または手動dispatch。V7は別Workflow。
5. 次の品質基準: 参考画像のコンクリート厚・支柱接合、フライトの下部支持、雨垂れ、苔分布、錆びた手すりの不規則さ、三方向、ゲーム内寸法確認。
6. **美術合格は未達**。Actions成功はユーザーの完成承認ではない。描画結果を必ず見てユーザーへ提示。
