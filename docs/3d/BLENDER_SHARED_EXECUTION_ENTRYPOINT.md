# 共有Blender実行入口 — GPT / Claude / Work / 通常チャット

更新: 2026-11-16。対象: ブラウザRPG『コタマのぼうけん』。**このページは利用手順・状態の入口であり、各チャットへのMCPツール自動接続を意味しない。**

## まず読む
- `AGENTS.md`
- `docs/3d/BLENDER_DOCKER_HANDOFF.md`
- `docs/3d/ASSET_PROMOTION_POLICY.md`
- `docs/3d/TOOLING_AUTO_SHARE_POLICY.md`
- `docs/3d/SHARED_TOOLING_CATALOG.md`
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

## GPT応答タイムアウト前の安全停止・引き継ぎ（全3D制作で必須）

**原則：新しい造形・レンダリングの追加より、すでに進んだ作業の保全を優先する。** GPT / Claude / Workなどの対話セッションには実行・応答制限があり、残り時間を正確に取得できるとは限らない。安全停止は「残り時間を自動検知する」と断言せず、**実行開始時から明示的な時間予算と余裕を決める**方式で実装する。

1. **開始時に上限と終了条件を設定**：セッションの予想実行可能時間やActionsの `timeout-minutes` より短い作業上限を設定し、保存・成果物確認・ユーザー報告の余裕を確保する。残り時間が不確実なら小さな工程に区切る。
2. **各反復で保存**：可能な環境で `.blend`（編集元）、GLB（書き出し成功時）、実生成された正面・側面・斜めPNG（生成できた方向のみ）、使用したコード・パラメータ・ソースcommit、品質評価、修正点を確定する。画像・GLBの存在や読み取り可否を確認する。
3. **中断・再開用の記録**：`progress.json` / `manifest.json` / 引き継ぎMarkdownに、ステップ名、完了/未完了の区別、run ID、Artifacts、ソースハッシュ、出力パスとハッシュ、次の操作、承認状態 `NOT_APPROVED` を記録する。別ジョブのcheckpoint再開は同一ソース・ハッシュ照合に成功した場合のみ。
4. **終了前の動作**：新しい重いレンダーや無制限の改善反復を始めない。途中結果のアップロードとログの保存を優先し、復旧可能な段階で一度終了してユーザーに進捗を返す。失敗や不足を隠さない。
5. **Actionsの安全設計**：本当に自動中断・途中保存が必要ならワークフローと子プロセス側で期限前に正常停止するコードを用意し、チェックポイントの保存・Artifactアップロードが間に合うことを実行テストで確認する。`if: always()` のArtifactアップロードだけで強制終了時の完全保存を保証しない。上限到達の無限リトライは禁止。
6. **保存場所・承認の区別**：未承認の候補は作業ブランチと一時Artifactsに置く。正式な `assets/` への昇格とゲーム統合はユーザーの明示的承認後。Artifactsが期限切れになる前に、必要なら候補の復元手段や再生成コードをGitHubへ記録する。
7. **報告**：ユーザーには、実際に確認できたレンダー・ファイル・保存先・未完了点・再開用のリンクを示す。レンダーを行っていない場合は「実レンダー完了」と書かない。

この文書は**運用方針**であり、GPT自身による正確なタイムアウト検知や、すべてのワークフローへの自動実装・動作検証を意味しない。個別のBlender Actionsに適用するときは実際の保存と再開を検証する。

