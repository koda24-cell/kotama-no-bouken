# Blender / GitHub Actions 実行結果の取得と障害対応メモ

更新: 2026-11-12
対象: 第6層「崩壊した墓石」V1 / PR #302
ブランチ: `feature/f6-broken-gravestone-20261112`
ワークフロー: `.github/workflows/f6-gravestone-render.yml`
生成スクリプト: `tools/floor6/broken_gravestone.py`
Actions: https://github.com/koda24-cell/kotama-no-bouken/actions/workflows/f6-gravestone-render.yml

## 確認できた事実
- 専用ブランチにBlender生成スクリプトとGitHub Actions YAMLがコミットされている。
- PR #302はdevelopment向けDraftで、まだマージしていない。
- GitHub連携の `fetch_commit_workflow_runs` は **pull_request イベントに絞って取得**する仕様。Push起動のワークフローが0件と返っても未実行とは断定できない。
- 実際のBlender実行成功、GLB、正面・側面・斜めPNGの生成、レンダリング品質はまだ未確認。成功したとは報告しない。

## 原因分析
1. 最初のワークフローはPush起動のみで、利用可能なGitHub連携のPR起動実行検索と一致していなかった。
2. Run IDが分からないと、連携の `fetch_workflow_run_jobs`、`fetch_workflow_run_artifacts`、`download_workflow_artifact` を呼べない。
3. GitHub Actions Artifactsは一時保管であり、リポジトリ内のGLB/PNGとは別。コミットやPRの存在だけで完成とは判断できない。
4. Blender自体のエラーの有無は実行ログ取得前には判定できない。原因をモデルの失敗と決めつけない。

## 実施した改善
- Push起動に加え、development向けPRの `pull_request` イベントでもワークフローを起動する設定を追加。PR起動の実行結果をGitHub連携で追える経路を用意。
- Runnerのイベント、SHA、Run URL、Blenderバージョンを記録。
- Blender標準出力を `render-output/floor6/blender.log` に保存。
- GLBと3枚のPNGの存在、最低サイズ、マジックバイトを検証。
- `verification.md` とGitHub Step Summaryに結果を残す。
- 成功/失敗にかかわらずArtifactsをアップロードする。ただし、Artifactsがない場合は別途実行ログを確認。

## 次の確認手順（他チャット共通）
1. 最新PRと対象コミットSHAをGitHub連携で取得。
2. `fetch_commit_workflow_runs` でPRイベントの実行を確認。0件なら「PR起動実行が取得できない」と記載し、Push実行の有無は断定しない。
3. Run IDが判明したら `fetch_workflow_run_jobs` と `fetch_workflow_run_artifacts` を取得。失敗時はJob IDから `fetch_workflow_job_logs` を取得して修正。
4. 成功したRunのArtifactsをダウンロードし、GLBと3方向PNGを実際に検査する。
5. 画像をチャットで提示し、ユーザーの品質承認を受けるまでは正式素材に昇格しない。
6. GitHub連携でRun IDを取得できない場合は、権限・連携機能の制限として明示。ユーザーに毎回確認を要求する運用にはしない。

## 注意
- PRイベントでワークフローが実際に検出されるか、GitHub側の権限やActions設定による。今回の修正の効果は実行結果取得後に判定する。
- 第4層専用の素材昇格ワークフローを第6層に流用しない。
- 本修正はゲーム本体やdevelopment/mainの変更を含まない。
