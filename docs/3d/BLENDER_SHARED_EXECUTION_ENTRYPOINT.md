# 共有Blender実行入口 — GPT / Claude / Work / 通常チャット

更新: 2026-11-16。対象: ブラウザRPG『コタマのぼうけん』。**このページは利用手順・状態の入口であり、各チャットへのMCPツール自動接続を意味しない。**

## Blender 5.3.0 正式版の新しい制作入口（2026-11-19）

- **新規3D制作はBlender 5.3.0を第一候補**にする。ただし互換性未確認の既存ジョブは、実レンダリングとClamAV検査に合格するまで元のBlender4/5のdigestを保持し、勝手に一括置換しない。
- [Blender5.3評価・実証ログ](BLENDER_53_UPGRADE_EVALUATION_20261119.md)、[成功Actions run #44466267564](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44466267564)、[PR #603](https://github.com/koda24-cell/kotama-no-bouken/pull/603)。
- **digest固定の公式5.3環境**：`ghcr.io/koda24-cell/kotama-blender53-clamav@sha256:5ce601f79b1ab09405b3ebc36b1a596be76cb8b105b1524fcbafcb186ebf7e99`。正確なバージョン、EICAR検出、ClamAV検査、実GLB/PNG、B4マグマP1の4方向PNGを確認済み。
- **既存の5ワークフローを実レンダリングで検証後、5.3へ移行済み**：B2水面（PR #608）、B4マグマ岸P1〜P3（PR #609）、F6樹木葉群バッチ（PR #611）、B4 P3V5とV16派生（PR #612）。各成功runと生成ファイル数・ClamAV件数は[5.3評価・実証ログ](BLENDER_53_UPGRADE_EVALUATION_20261119.md)を参照。未検証の他ジョブは引き続き旧環境を保持。
- **ClamAVで検出0は安全保証ではない**。外部ダウンロードは取得直後・解凍前、展開後・Blender取込前に検査し、出力GLB/Blend/PNGも再検査。素材の正式保存は美術品質の承認後のみ。
- PCのBlender MCPへの自動切替はしない。通常チャットはGitHub Actionsを標準とし、PC実行はユーザーが明示した場合に限る。

## まず読む
- `AGENTS.md`
- `docs/3d/BLENDER_DOCKER_HANDOFF.md`
- `docs/3d/ASSET_PROMOTION_POLICY.md`
- `docs/3d/TOOLING_AUTO_SHARE_POLICY.md`
- `docs/3d/SHARED_TOOLING_CATALOG.md`
- `docs/3d/GLOBAL_3D_OPTIMIZATION_ACTIONS_HANDOFF.md`（実動作成功済み共通GLB監査・葉バッチ化・剛体LOD・ImpostorのAction入口。ゲームへのLOD/カリング統合は未実施）
- `docs/3d/GLOBAL_3D_LOD_PERFORMANCE_POLICY.md`（全階層の3Dアセット制作・軽量化の優先方針）
- 個別素材の最新引き継ぎ文書と、未マージPRの最新差分

## いま利用可能な範囲（実行環境別）
| 機能 | 通常チャット（GitHub連携あり） | Work/Blender CLI/Actions | 備考 |
| --- | --- | --- | --- |
| GitHubコード確認・変更、PRレビュー | 可（ツールの許可次第） | 可 | 作業ブランチで安全に編集 |
| 既存モデル生成・正面/側面/斜めレンダー | Actions実行結果を取得・評価可能。新規ジョブ直接起動はツール次第 | Blender/Actionsで実行可能 | 実PNGが確認できるまではレンダー成功と呼ばない |
| 露出・画面占有率・白飛びQAとパラメータ候補反復 | ログ/PNG確認可能 | 実証済み | 美術的な品質判断ではない |
| checkpoint保存・別ジョブで復元して次反復 | ログ確認可能 | 2026-11-16実証済み | run 43794461689、関連回帰 run 43794997803 |
| 実視覚AIによる美観判断と造形フィードバック | 未接続 | **コードあり、実通信未検証** | `VISION_*`未設定。opt-inのみ |
| Blender MCPでこのチャットから直接編集 | 利用可能なMCP接続があるときだけ | 環境依存 | 公式ラボで別環境の接続実績があっても現在チャットのMCP登録は保証しない |
| 原本GLB/PNGの正式保存とゲーム実装 | 承認後に別PR | 承認後に別PR | 未承認を勝手にassets/へ昇格しない |

## 最も新しい玉座用作業入口

- **現在の試験実装**: PR #404 — https://github.com/koda24-cell/kotama-no-bouken/pull/404 
- 試験ブランチ: `feature/gpt-b5-throne-work-setup-20261116`
- 設定とCLI説明: `docs/3d/B5_THRONE_WORK_SETUP_20261116.md`（**上記試験ブランチ側**、未マージのためdevelopmentではファイルが見えない場合がある）
- 前段: PR #397 (再開・視覚AI接続プロトタイプ)、PR #395 (玉座V2)、PR #383 (玉座V1)
- ワークフロー: `.github/workflows/b5-throne-auto-loop.yml`（試験ブランチ側）
- 自動QA成功: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43799781528
- ジョブ間checkpoint復旧成功: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43794461689
- 原本は保持、候補は `NOT_APPROVED`、最終ユーザー承認前にdevelopment/mainやゲーム内へ正式素材として統合しない。

## 他チャットから何をお願いすればよいか
依頼例:

> コタマの3D制作をGitHub Actionsで再開してください。最初に `AGENTS.md` と `docs/3d/BLENDER_SHARED_EXECUTION_ENTRYPOINT.md` を読み、最新のPR #404・ブランチ `feature/gpt-b5-throne-work-setup-20261116` と実行runを確認してください。玉座V2の現行モデルを保持し、3方向レンダー、GLB・Blend・PNG・manifest、QAと次の安全な改善を行ってください。結果は実ファイルを確認して表示し、完成候補は承認待ちのまま残してください。

### 通常チャットでの実行方法
1. GitHub連携が有効ならリポジトリと関連PRを確認する。未マージの作業コードが `development` にない場合は、上記試験ブランチを明示して読む。
2. 新しい形状改善は独立ブランチ・Draft PRに保存する。必要に応じて対象ブランチの `tools/b5-throne/**` を更新すると、登録済みpushワークフローが起動する設定。GitHub Actionsの許可・実行結果は毎回検証する。
3. URL: https://github.com/koda24-cell/kotama-no-bouken/actions/workflows/b5-throne-auto-loop.yml 。手動 `workflow_dispatch` UIはデフォルトブランチに未登録だと使えない場合がある。使えない場合は、既存ブランチに適用されるpushトリガーか、利用可能な正規の実行環境を使う。**mainに勝手に登録しない。**
4. ArtifactからPNG（正面/側面/斜め）、GLB、Blend、`progress.json`、`summary.json`、`manifest.json`等の実体とハッシュを確認。Artifactsは一時保存。モデルの美観を目視評価し問題点を記録する。
5. checkpointからの再開は、同一ソースハッシュと旧run IDを検証。強制終了によるArtifacts欠損や無限リトライは想定外。何が実行・未実行かを正確に報告。

### CLIが使える環境
```sh
python3 tools/b5-throne/vision_review.py --check-config
python3 tools/b5-throne/auto_loop.py --iterations 4 --minutes 35
```
対象: 試験ブランチ `feature/gpt-b5-throne-work-setup-20261116` のリポジトリルート。Blender/Python3/Pillowが必要。実行前に `docs/3d/B5_THRONE_WORK_SETUP_20261116.md` を読む。

## 画像理解AIの使用境界
- 現時点でOpenAI互換画像認識AIの**実API接続は未設定・実通信未検証**。モックテストと実AIによる画像審美評価を混同しない。
- 既定 `ENABLE_VISION=false`。外部送信/料金が発生する可能性がある `enable_vision=true` は接続先・利用料・取り扱いをユーザーが了承し、`VISION_API_URL`・`VISION_API_KEY`（Secrets）と`VISION_MODEL`（Variable）が設定されてからのみ実行。
- Blender子プロセスへAPI鍵を継承させない。AIの返答は信頼せず、許可された小さな補正値に正規化。原本ジオメトリ削除・ゲーム保存・完成承認はできない。
- 視覚AIを使えないチャットでも、実PNGを読み込んだGPTが修正点を判断し、変更コードをPRに保存する**人間監督付きの段階的作業**は可能。ただし時間外の自動継続やチャット間の生ツール共有は保証しない。

## 汎用化の範囲
ここで実証されたコードは **B5玉座専用**。他の階層の岩・橋・遺跡などにも考え方やQAを再利用できるが、パラメータ・対象ファイル・出力名・カメラは素材ごとに調整が必要。全モデル対応の汎用AI自動造形は未完成。

## Claudeへの引き継ぎ
ClaudeはBlenderを操作する想定にしない。GPT/Blenderで出力された**承認済みGLB＋3方向PNG＋manifest**を受け取り、Three.js実装・レビューを担当。未承認はゲームへ正式反映しない。

## 運用保全
- 基準 `development`、`main` は完成候補のみ。既存モデルやゲーム機能を保持。
- 未検証の実行コードやモデル本体の自動マージは禁止。情報・引き継ぎ文書のみ別PRで共有可。
- 毎回、最新のPR/branch/runを確認する。このファイルにある番号を最新だと決めつけない。

## 中断耐性と先行チェックポイント保存（全3D制作で必須）

**設計方針：GPTの応答タイムアウト前に作業を強制的に終えるのではなく、通常の制作を継続しながら各工程の成果を先に保存する。** これにより、ユーザーがChatGPT画面の青い停止ボタン（■）を押したり応答が中断されたりしても、最後の正常保存地点から再開しやすくする。

**重要な限界：ChatGPTの停止ボタンが押された後に、GPTがその操作を検知し、追加の保存や引き継ぎ処理を実行することはできない。** また、ブラウザの停止ボタンとGitHub Actionsのジョブ停止は同じものではない。保存できるのは停止前に確定した内容だけであり、未保存部分の完全保護は保証しない。

1. **保存してから次の工程へ**：コード・設計・パラメータ変更は小さい単位で独立ブランチへコミットし、必要に応じDraft PRを更新する。1反復が完了したら検証済み成果物と進捗記録を保存してから次の反復に進む。
2. **Blenderの逐次チェックポイント**：生成環境で可能なら各モデル・反復ごとに `.blend`、GLB、撮影できた方向のPNGを出力し、`progress.json`・`manifest.json` に元commit、出力ファイル名とSHA-256、run ID、反復番号、エラー、次の改善点、`NOT_APPROVED`を記録する。存在・ハッシュ・正常なファイル形式を確認する。途中生成物を完成と報告しない。
3. **長時間処理は独立ジョブ**：GitHub Actions等では、終了時だけでなく反復単位または短いジョブ単位でArtifactsへ保存する。保存済みジョブの外部実行はチャット停止と独立して進行する場合があるが、全ての実行方式で継続する保証はない。
4. **再開方法**：次の作業時にdevelopment・作業PR・最新成功run・manifestを確認し、ソースSHAとチェックポイントのハッシュを検証してから続きへ進む。失われたステップは再生成し、作業済みと偽らない。
5. **終了・停止時**：ユーザーから明示的に「中断して保存」と伝えられ、応答がまだ継続できる場合は保存を優先する。ただし停止ボタン押下後の後処理は不可能。未着手のモデルや未承認素材を自動マージ・正式昇格しない。
6. **実装と検証の区別**：この文書は作業運用ルール。各Actionsに途中Artifactアップロード・再開機能を実装・実証するまでは、「停止後も必ず保存される」とは主張しない。強制killや実行上限時の保存動作は別途試験する。

**ユーザーの希望**：作業をタイムアウト前に一度区切ることを目的とせず、できる限り反復制作を進めながら、途中停止しても作業が失われにくい状態を維持する。


## GitHub Actions実行一覧を自動確認する共通手順（2026-11-19追記）

GitHub Actionsの **push起動 run** は、GitHub連携の `fetch_commit_workflow_runs` だけでは見落とす（同関数はpull_request起動に限定）。ワークフロー画面のURLが直接fetch不可でも、**GitHub RESTの実行一覧エンドポイント**をGitHub連携 `fetch` で問い合わせること。

1. ユーザー提示の `https://github.com/OWNER/REPO/actions/workflows/NAME.yml` から OWNER/REPO・ワークフロー名を特定（`utm_source`などの追跡パラメータは無視）。
2. 対象ブランチが分かる場合は、まず次のAPI URLをGitHub連携 `fetch` で取得（ブランチ名をURLエンコード）。`https://api.github.com/repos/OWNER/REPO/actions/runs?branch=ENCODED_BRANCH&per_page=10`。返却JSONの `workflow_runs` から `path` と `head_sha` で対象を厳密に絞り込み、最新の `id`, `status`, `conclusion`, `html_url` を確認。
3. `fetch_workflow_run_jobs({repo_full_name,run_id})` と `fetch_workflow_run_artifacts({repo_full_name,run_id})` でジョブ成功・Verify・Artifactsの存在と期限を検証。ArtifactのPNG/GLBを**実際に開くまで**目視評価済みとは言わない。
4. `/actions/workflows/NAME.yml/runs` 型APIやブラウザー画面URLは接続によって拒否されることがある。拒否は「実行が無い」ことの証明ではない。ブランチ指定実行一覧に切り替える。
5. 実行リンクを報告し、未承認モデルはNOT_APPROVEDのまま保持。runが存在しない場合はコミットSHA/branch/pathを再検証し、何を確認できなかったか明示する。

### 検証例：アサシン頭部（2026-11-19）
- Workflow: `.github/workflows/assassin-bare-head.yml`、PR #513、branch `feature/assassin-head-geometry-review-20261119`
- Actions run [#44434198539](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44434198539): **completed/success**、pushイベント、SHA `6393f8c3d508637349d5d7590a02f2fb14521cc8`
- Job `render` 成功。Blender Eevee / Verify / upload-artifact各ステップ成功。Artifact `assassin-bare-head-eevee` ID `14488925390`、2026-12-03 01:09 UTC満了予定。**PNG目視は未検証**。
