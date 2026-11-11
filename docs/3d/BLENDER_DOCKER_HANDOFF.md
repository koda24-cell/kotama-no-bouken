# Blender Docker 一括レンダリング — 他チャット引き継ぎ

最終更新: 2026-11-12

## 目的
ブラウザRPG『コタマのぼうけん』の3D小物を、既存Three.js造形を保持しながら追加造形で高品質化する。実モデルをGLBとして出力し、Blenderで複数方向からPNG撮影する。GitHub Actions + Blender入りDockerを使い、ユーザーのPCにBlenderの操作を要求しない。

## リンク
- Repo: https://github.com/koda24-cell/kotama-no-bouken
- 開発統合先: `development` （`main` は完成候補）
- 元のプレビューPR: https://github.com/koda24-cell/kotama-no-bouken/pull/252
- Docker準備PR: https://github.com/koda24-cell/kotama-no-bouken/pull/253
- Docker準備ブランチ: `feature/b4-docker-batch-render-20261112`
- Actions: https://github.com/koda24-cell/kotama-no-bouken/actions/workflows/b4-docker-batch-render.yml
- 旧Actions: `.github/workflows/b4-blender-cart-render.yml`

## ファイル
- `field/b4-mine-rig-props.js`: 既存Three.jsの廃坑小物群
- `field/b4-cart-detail-additions.js`: トロッコ追加造形
- `field/b4-furnace-detail-additions.js`: 製錬炉追加造形
- `tools/b4-render/export-batch.mjs`: Three.js → 修正前後GLB（トロッコ、製錬炉、廃坑設備セット）
- `tools/b4-render/render-batch.py`: Blenderから正面・側面・斜めPNGを生成
- `.github/workflows/b4-docker-batch-render.yml`: Docker版の自動実行。テストブランチへのpush、手動workflow_dispatchに対応
- `tools/floor4-shape-preview.html`、`preview/b4-cart-shape-compare.html`: 参考プレビュー

## 現在の到達点（実行結果は都度再確認）
- Docker版のコードをPR #253に保存した。
- Dockerワークフロー #1 が実行中のGitHub画面をユーザーが確認したが、**成功・失敗・成果物の存在はまだ確認できていない**。
- Blenderコンテナは `lscr.io/linuxserver/blender:latest` を指定。Dockerの実動作、コンテナ内Blender実行パス、GLBエクスポート互換性、描画品質は未検証。
- Dockerの成果物は `b4-blender-docker-batch` Artifacts（PNG/GLB）、保存期間14日。
- PR #253はDraftであり、`development` へのマージは未承認。PR #252を土台に作成したため依存変更を含む。

## 他チャットで最初にすること
1. GitHub ActionsでDocker版の最新runの結果、失敗ステップ・ログ・Artifactsを調べる。ユーザーが実行URLを渡したらそのrun IDを使う。
2. 失敗ならブランチ内のワークフロー/Node/Blenderスクリプトを修正し、再実行する。特にDocker imageのBlenderパス、NodeのFileReader互換性、Blender側のカメラ/座標、成果物の権限を確認。
3. 成功ならPNGを取得して正面・側面・斜めの造形を評価する。改善前後のGLBが両方あることを確認する。
4. 次の対象はユーザー希望に合わせて選び、既存形状は削除せず追加造形。小物の名前を `field/b4-mine-rig-props.js` で確認してから追加。
5. 変更は独立ブランチとPRで管理。既存の作業と競合する場合は先に差分を調べる。

## GitHub Actionsでの実行方法
Actions → B4 Docker Batch Render → Run workflow → ブランチ `feature/b4-docker-batch-render-20261112` → Run workflow。
pushトリガーでも自動実行される。実行ページ下のArtifactsから出力を取得する。手動起動ボタンの表示可否はGitHubのデフォルトブランチ上のワークフロー登録状態にも左右されるため、表示されなければテストブランチへのpushによる起動を使う。

## 制作上の制約
- 元のメッシュを消さない・置き換えない。追加造形は独立したモジュールにし、二重適用を防ぐ。
- 画面用プレビューとゲーム内統合は別作業。GLBを出力しただけではゲームへ反映されない。
- 既存機能保持。戦闘、セーブ、階層進行を壊さない。
- PNGはレンダリング実行が成功した場合に限り「実際のスクショ」と呼ぶ。
- Dockerの利用料とGitHub Actionsの実行料金は別。公開リポジトリの標準ランナーを優先し、有料サービスは勝手に導入しない。
- 旧ワークフローは初回の成否確認前に削除しない。

## 新しいチャットへの依頼文（コピー用）
「GitHub `koda24-cell/kotama-no-bouken` の `AGENTS.md` と `docs/3d/BLENDER_DOCKER_HANDOFF.md` を読み、PR #253のDocker一括レンダリングの最新実行結果を確認して、4層の3D小物品質改善を引き継いでください。既存形状は保持し、追加造形・GLB・3方向PNG比較を行い、development向けPRで管理してください。」
