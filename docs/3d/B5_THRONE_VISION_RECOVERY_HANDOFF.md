# 玉座V2 自動復旧・視覚AI評価の実装状況（2026-11-16）

## 作業範囲
- ベース: 玉座V1 PR #383、玉座V2 PR #395。
- 新規ブランチ: `feature/gpt-b5-throne-recovery-vision-20261116`。元ブランチの保守に影響しないよう独立PRで管理。
- Blenderコード: `tools/b5-throne/build_v2.py` をパラメータ化。既存V1のメッシュは削除せず、背面の追加厚み、曲線状アーチを分割して追加、瓦礫量/装飾量を変える。
- ローカルPython制御: `tools/b5-throne/auto_loop.py` はPNG画像から基本的な露出・占有率・白飛びを測り、次の反復の露出を変える。今回 `tools/b5-throne/vision_review.py` を追加し、明示的許可・接続設定がある時に限り3方向PNGを視覚モデルへ渡す。
- **視覚モデルは自動インストールも初期有効化もしない。** `ENABLE_VISION=true`、GitHub Actions repository secret `VISION_API_URL` (HTTPS推論APIの完全なchat/completions URL)、`VISION_API_KEY`、repository variable `VISION_MODEL` が揃ったときだけ評価リクエストを行う。API提供元によって課金・利用規約・送信データ保持が異なる。ユーザーの明示的承認なしにAPI契約や料金を発生させない。
- 視覚モデルの回答は JSON として安全な許容幅に限定する: 瓦礫・装飾数各 ±3、背面厚み ±0.15、アーチ曲率 ±0.2、露出 ±0.5。元メッシュ削除や「承認済み」変更はできない。評価文言・スコアは客観的な完成判断ではない。
- GitHub Models推論APIは2026年7月30日で**終了**したため使用しない。公式: https://docs.github.com/en/github-models

## 自動再開の実証
- `.github/workflows/b5-throne-resume-test.yml` を追加。pushで同一workflow内の1ジョブ目を **1反復上限で停止** させ、`actions/upload-artifact` でcheckpointを保存。別の2ジョブ目が `actions/download-artifact` でデータを取り出して再開、反復番号1と2を照合、双方のPNG・未承認フラグを照合。
- これで成功すれば「ジョブ間の再開」の実動作を証明できる。ただし強制終了時のチェックポイント転送保証とは異なる。
- 元の `b5-throne-auto-loop.yml` には `resume_run_id` 入力があり、以前の実行Artifactを手動で復元可能。**別runを失敗時に自動的に起動して無期限ループさせる機能はまだありません。**
- 自動保存は各候補のGLB・Blend・PNG・JSONと最終Artifact。突発的なrunner障害では最終アップロードが実行されない可能性があり、復旧保証はない。

## 安全な確認
1. 対象workflowの GitHub Actions のログで失敗/成功と中断後の反復番号を実際に見る。
2. Artifactを取得し、2回のPNG、GLB、Blend、progress.jsonを照合する。
3. 別runを明示的に復元できるか検証する。
4. 視覚AIのAPIなし状態で no-call の動作を確認した上で、ユーザーが契約/課金を了承した推論先、または無料のローカル推論サービスを用意した場合だけ画像意味判定を実試験する。
5. 品質が良くなっていてもユーザー承認まで正式素材に昇格しない。ClaudeはGLB/PNG/manifestだけを受領する。

## 状態
**コード実装済み。新規checkpoint再開テストと視覚AI通信/評価結果は未検証**（実証後追記）。V2旧版の実レンダ成功とは切り分ける。


## 実際に確認できた結果（2026-11-16 JST）
- **成功:** run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43794461689 で異なるGitHub Actionsジョブ間の Artifact 移送を確認。first-passで1反復、resume-passで反復2まで実行。ログに `Checkpoint resume independently verified: awaiting_user_approval 2` を確認。
- 実Artifact `b5-throne-resume-test-output` ID **14194266215** をダウンロード、ZIP内に `iteration_01/` と `iteration_02/` の各3方向PNG・GLB・Blend・geometry.json・blender.log、およびprogress.json、summary.jsonを確認。
- JSON記録: 最初の技術評価4.5753、再開後4.8036。V1構成要素38種類が名前で残り、mesh数149→156、反復番号1→2、status `awaiting_user_approval`、approval `NOT_APPROVED`。
- **成功:** no-network安全テスト run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43794997803 の first-pass で `Ran 4 tests ... OK`。視覚APIが初期OFF時に呼び出されないこと、未設定時の非呼び出し、架空レスポンスの修正幅制限、平文HTTP拒否を確認。これは**実視覚AIの画像評価成功ではない**。
- 未確認: 強制終了時の自動再投入/データ保証、外部推論サービスへの実通信、視覚AIが美術的に適切な修正を提案できるか、最終品質。追加runの最新ジョブ全体の成否は随時確認する。
