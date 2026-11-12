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

## 追加改善（2026-11-12）
- **ワークフローの `paths` フィルタをPush/PR両方から撤去**。ブランチ更新に文書変更しか含まれない場合など、イベントが静かにスキップされる可能性を除去した。PRイベントはdevelopment向けのみ、Pushイベントは専用ブランチのみ。
- `permissions: contents: read` を明示して、レンダリングジョブが不要な書き込み権限を持たないようにした。
- Blender起動前に `python3 -m py_compile tools/floor6/broken_gravestone.py` を実行し、Python構文エラーを切り分けられるようにした。
- **重要な限界**: これらは実行の確実性と診断性の改善であり、GitHub連携に「Push実行一覧の取得」機能を追加するものではない。GitHub側でActionsが無効化されている、ワークフローがGitHubに登録されていない、あるいは権限・ブランチ保護により実行されない場合は、別途その設定を調べる必要がある。
- 画像が取得できない場合は、`未レンダリング` と断定せず `実行結果未取得` と報告する。

## 実行結果の取得経路を追加（2026-11-12）
- Actionsワークフローの最後に `actions/github-script@v7` を追加し、`if: always()` でレンダリングの成功・失敗に関係なくPRへ結果コメントを投稿する設計とした。
- コメントにはコミットSHA、実行URL（Run IDを含む）、Artifact名、`verification.md` の内容を掲載する。
- GitHub連携の `fetch_pr_comments` でPR #302のコメントを取得できるため、Push起動の実行一覧APIがなくてもRun IDを追跡する代替経路となる。Run IDを得たら `fetch_workflow_run_jobs` と `fetch_workflow_run_artifacts` に進む。
- PRコメント投稿に必要な `issues: write`、`pull-requests: write` を当該ワークフローに限定して明示。リポジトリ設定で書き込みトークンが制限されている場合はコメント投稿が失敗するため、実際の成功確認が必要。
- PRコメントに実行結果がない場合、GitHub Actions自体が起動していない・ワークフロー登録に問題がある・コメント権限がない、などを切り分ける。コメントがないことだけでBlender実行失敗と断定しない。
- この変更は「GitHub連携で実行結果を追跡できるようにする」ための改善であり、まだ成功したレンダリング画像を取得した証拠ではない。

## 実ログで確定した原因と修正（2026-11-12）
- PRコメント経由でRun IDを取得できた。例: `43192549484`、Job ID `131095254285`。GitHub連携の `fetch_workflow_run_jobs` と `fetch_workflow_job_logs` が動作した。
- 実ログ: `tools/floor6/broken_gravestone.py` の `bpy.ops.export_scene.gltf(...)` 呼び出し時、Blender 5.0.1のglTFエクスポータが `import numpy as np` で `ModuleNotFoundError: No module named 'numpy'` を発生。
- このためGLBのエクスポート時点で処理が止まり、3方向レンダリングにも進めず、検証が全FAILとなっていた。
- 対応: Runnerのaptインストールに `python3-numpy` を追加し、Blender自身のPythonから `import numpy` できるか事前検査する。
- この修正はコミット済み。ただし**修正後の成功は別途Actionsの実ログ・Artifactsで検証する必要がある**。

## NumPy問題の解決確認・次回引き継ぎ（2026-11-12）
- **解決確認済み**: 修正コミット `1ccb9fc6ab59081446a2332bf19f1cd6c00f5884` のActions実行 `43194369018` で、GLBと正面・側面・斜めPNGの4ファイルすべてが `PASS`。
- 成果物: `broken_gravestone_v1.glb` 77,240 bytes、`broken_gravestone_v1_front.png` 448,778 bytes、`broken_gravestone_v1_side.png` 388,507 bytes、`broken_gravestone_v1_angle.png` 396,007 bytes。
- 成功したArtifact ID: `13932057998`、名前 `floor6-broken-gravestone-v1`、保存期限は2026-11-26。実行URL: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43194369018
- GitHub連携でPRコメント→Run ID→Artifacts一覧→ZIPダウンロードの経路を実証した。今後はPush実行一覧が空でもPRコメントからRun IDを追跡できる。
- NumPyはBlenderのglTFエクスポータが必要とするPython数値計算ライブラリ。導入で書き出しエラーが解消したが、導入だけでレンダリング速度やゲーム実行速度が向上するわけではない。
- **品質課題**: 初回レンダリングでは石材が白く飛んで見える、苔や細かな傷が見えにくい、側面の破損凹凸が弱いとの評価。次はマテリアルのノード設定、照明・露出、正面破断形状、側面の凹凸を改善し、必ず3方向を再レンダリングして比較する。
- **未完了**: V1造形品質の承認、正式素材フォルダへの昇格、developmentへのマージ。成功したActions Artifactsは一時保存であり、正式素材としては扱わない。

## V2構文エラーの原因と修正（2026-11-12）
- Run `43195180922` はBlender実行前の `python3 -m py_compile tools/floor6/broken_gravestone.py` で失敗した。
- エラーは120行目の `SyntaxError: unexpected character after line continuation character`。レンダリング設定に改行コードではなく文字列 `\\n` が混入していた。
- 修正コミット `05928d2326a7516221299344012b96c943bdb4b6` で実際の改行に直し、不要な式を除去した。
- **再発防止**: コード生成・置換時はPython構文検査を実施し、文字列内の `\\n` と実際の改行を混同しない。GitHub Actionsの構文検査は今回、Blender起動前の失敗検出に成功した。
- 修正後のGLB・PNG成功は別のActions実行で確認すること。過去V1の成功をV2成功として報告しない。
