# 3D共通最適化 Actions 運用・検証記録（2026-11-17）

**原則**：3D素材の近景シルエット・材質・既存形状は維持し、遠景・不可視部と大量の描画単位を最適化する。すべての階層／すべてのアセット制作で、素材に適合した方法を優先する。正確なBotWの非公開シェーダをコピーするのではなく、任天堂のCEDEC説明・Cemuの公開解析・NVIDIA GPU Gemsに基づく独自ワークフローである。**Actionsの検証成功はゲーム中のFPS改善実証や美術承認ではない。**

## 共通実装（PR #488、開発統合前）

| Workflow | 対象と入力 | 出力と安全境界 | 実行結果 |
|---|---|---|---|
| `shared-3d-performance-audit.yml` | GLBのglob（既存モデル／後続Workflowから`workflow_call`）。変更コミット内のGLBも自動監査対象とする | GLB内の可達メッシュ、推定primitive回数、三角形、透明材質、テクスチャ数のJSON。元ファイル変更なし | [run 44058467063](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44058467063) success：第1層48 GLB、227 primitive instances、339,474 triangles |
| `f6-tree-foliage-batch-review.yml` | 第6層成木V14の原本Actions checkpoint（run ID入力可） | 葉を材質別に同一メッシュへ統合した未承認GLB＋4方向PNG、GLB監査、画像差・SHA検査。元Blendは変更しない | [run 44059729505](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44059729505) success：元9,108→145 mesh nodes、42,930 trianglesは同じ、6,487,708→1,593,516 bytes、ピクセル差0.0 |
| `shared-rigid-lod-review.yml` | 不透明でスキンなしの静的岩・建築GLB（別の`source_glb`を指定可） | 原本を毎回再インポートし、LOD0/1/2のGLBと12方向別PNG、SHA＋構造監査。透過・骨格GLBは拒否 | [run 44061002394](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44061002394) success：第1層の苔岩で3,806→2,093→951 triangle equivalents（当初版） |
| `f6-multiview-impostor-review.yml` | 第6層成木V14の原本Blend checkpoint | 8方向の透過PNGとRGBAアトラス（4×2）、アルファ被覆率・SHA検証。Three.jsの向き選択や遠景置き換えは別実装 | [run 44061467370](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44061467370) success：8枚の512px PNGと2080×1040のアトラス |
| `tools/3d-performance/lod_policy.mjs` | 画面上の見かけのpx数、前LOD、重要度、プレイヤーの2D座標 | LODヒステリシスと可視・先読みセルを返す純粋関数。ゲーム内処理は未変更 | [run 44059738282](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44059738282) Nodeテストsuccess |

**更新：PR #488は2026-11-17に`development`へ統合確認済み。** 試験実績とゲーム内自動LOD適用は別。ユーザー美術承認前に未承認GLBを`assets/models`へ昇格／`main`へマージしない。

## 制作開始・完了時の標準手順（GPT・Claude共通）

1. `AGENTS.md`、本書、`GLOBAL_3D_LOD_PERFORMANCE_POLICY.md`、Blender/素材承認ルールを先に読む。Githubの`development`／作業PRを確認し、既存形状を保存する。
2. GLBを出力したら共通監査Actionを実行。素材の種類に応じて適切な非破壊最適化を選択（樹木・草／不透明岩・建築／VFX）。透過植物を汎用decimateに通さない。
3. 近景モデルを元のGLBとして保持し、最適化候補ごとに別GLB・manifestを作る。4方向レンダーで同位置・同照明から比較。
4. 遠景ImpostorとLODは3D描画版のテスト候補とし、風、リアルタイム影、近接衝突、マップ、視界、セーブデータを維持したまま実機テストする。VFXと水面／溶岩には専用方針が必要。
5. 構造計測（ファイル容量、メッシュ数、triangles）とランタイム計測（draw calls、frame time、FPS）を区別し、`window.KotamaField3D.stats()`、ブラウザのPerformanceプロファイラー等で比較。元データと同じハード・画質で測る。
6. 原本と比べて見た目を損なう場合は最適化を採用せず、元GLBを維持。成功後もユーザー承認まで未承認のPR/Actions Artifactsで管理する。

## まだ未実装／未検証の研究項目

- BotW内部の正確な葉材質／ポリゴン数／四分木とLOD閾値の模倣は、公式ソースがないため未実証。
- Three.jsへ全階層共通の視界連動セルロード、LOD管理、遠景Impostorのカメラyaw切替を組み込む処理は未接続。
- 透過葉の`alphaMode: MASK`と`alphaTest`、MSAA有効時の`alphaToCoverage`、LOD間フェードはWebGL端末別・画質別の独立検証が必要。
- ゲーム本番のdraw calls・FPS・メモリ削減効果、モバイル実機、4層溶岩・5層瘴気の時間アニメと遮蔽の影響は未計測。
- Cemuコミュニティコードは根拠の一つだが、Nintendo公式コードではない。外部ゲームのアセットやコードをゲーム内へ転載しない。

## 出典と引継ぎ

- 研究資料：[F6_TREE_BOTW_PERFORMANCE_RESEARCH_20261117.md](F6_TREE_BOTW_PERFORMANCE_RESEARCH_20261117.md)
- 共通方針：[GLOBAL_3D_LOD_PERFORMANCE_POLICY.md](GLOBAL_3D_LOD_PERFORMANCE_POLICY.md)
- 実装ブランチ/PR： https://github.com/koda24-cell/kotama-no-bouken/pull/488
- 第6層成木元モデル/PR： https://github.com/koda24-cell/kotama-no-bouken/pull/452
- GitHub ActionsのArtifactsは14日で失効し得るため、本番素材には永久保存と別途承認が必要。


## 全階層への自動適用（追加）
- [ALL_FLOOR_AUTO_OPTIMIZATION_HANDOFF.md](ALL_FLOOR_AUTO_OPTIMIZATION_HANDOFF.md) に制作指示・GLB生成後の標準工程・未承認素材の扱いを記載。
- [Auto Review New 3D Assets Across Floors](../../.github/workflows/auto-review-new-3d-assets.yml) はGLBコミットのPR／development pushで全階層のGLBを監査し、新しい静的不透明GLBだけ独立したLOD0/1/2候補を生成。ゲーム本体には未統合。
