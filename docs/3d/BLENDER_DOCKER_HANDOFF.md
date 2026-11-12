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

## 3D制作の事前確認事項・再発防止台帳（2026-11-12以降、全階層共通）
**運用ルール:** 新たな構文エラー、Blender APIの不一致、環境依存、出力失敗を発見したら、実ログ・原因・修正・事前検査方法をこの節（またはリンク先のトラブルシュート資料）へ追記する。次の3D生成作業では過去の失敗をチェックリストとして先に確認する。未検証の項目は「未検証」と明記する。

### 既知の失敗と必須の予防検査
1. **Python改行エスケープ混入**: ソースに文字列 `\\n` を改行として挿入し `SyntaxError: unexpected character after line continuation character`。**予防:** コミット前に `python3 -m py_compile <script.py>` または `ast.parse` を実行。置換後の該当行を再確認。
2. **Blender glTFエクスポータのNumPy不足**: `ModuleNotFoundError: No module named 'numpy'`。**予防:** Blender本体のPythonから `import numpy` を事前実行し、ランナーに `python3-numpy` が入っていることを検証。OS側のPythonだけで確認して終わらない。
3. **Blender 5.0.1の色管理enum不一致**: `scene.view_settings.look='Medium High Contrast'` は `TypeError`。対応する値は `AgX - Medium High Contrast`。**予防:** 実行するBlenderバージョンのAPI enumを確認し、Blender本体で設定を代入するスモークテストを実施。構文検査だけでは検出できない。
4. **レンダリング失敗時の成果物誤認**: 検証レポートやZIPだけ存在してもGLB/PNGが0 bytesの可能性。**予防:** ファイル存在、サイズ、GLB/PNGヘッダ、実レンダリング画像の取得・目視を確認。成功した過去runと新runを混同しない。

### 各作業の必須ゲート
- **コミット前:** 構文・エスケープ・インデント・依存関係の静的検査。
- **Blender起動後:** API設定値のスモークテスト、生成メッシュの頂点数・面数・寸法・配置を検証。
- **出力後:** GLB形式と再読込可能性、PNG3方向の正常出力、造形と材質の目視評価。
- **報告前:** 実行run ID、コミットSHA、検証済み成果物を対応付ける。未成功なら「未完了」と報告。
- 新しい失敗が出たら**原因を台帳に追記してから**次回の生成へ進む。個別の墓石実ログは `docs/3d/F6_GRAVESTONE_ACTIONS_TROUBLESHOOTING.md` を参照。
