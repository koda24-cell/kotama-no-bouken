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


## 2026-11-13 追記：B4 V4 の Docker レジストリ制限と回避策

- 対象: [PR #301](https://github.com/koda24-cell/kotama-no-bouken/pull/301)、[失敗したActions run #43187606098](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43187606098)。
- **確認済みの事実**: Node.js の `tools/b4-render/export-rockwall-v4.mjs` は正常終了し、V3・V4通常岩壁・V4マグマ岩壁の3つのGLBをエクスポートした。失敗したのは次の `docker pull lscr.io/linuxserver/blender:latest`。ログ末尾は `error from registry: retry-after: 1.151084ms, allowed: 44000/minute`、exit code 1。したがって**今回の失敗を造形・GLB生成の失敗と混同しない**。
- **対処**: V4専用ワークフロー `.github/workflows/b4-lava-rockwall-v4-render.yml` の Docker pull/run を `sudo apt-get update -qq`、`sudo apt-get install -y blender`、ホスト上の `blender -b -t 2 --python tools/b4-render/render-rockwall-color.py -- "$glb" render-output` に変更。修正コミット `d8fc55f2dffe20cecc2a637de7121e2fdd42c493`。
- **検証状態**: 修正コミットは作成済み。ただし、このメモ記録時点で**修正後のActions成功・PNGの実在・レンダリング品質は未確認**。成功を宣言しない。
- **次回の確認**: PR #301 の最新Actions実行を確認し、3モデルの正面・側面・斜めのPNGとGLBを照合する。UbuntuパッケージのBlenderはDocker版とバージョンが異なる可能性があるため、スクリプト互換性・材質・カメラ・レンダリング結果を検証する。
- **再発防止**: レジストリ制限時に同じ `docker pull` を繰り返す前に、ホストBlenderまたは固定バージョンの代替導入方法を検討する。既存の他ワークフローは勝手に変更しない。

### 2026-11-13 追加：Blender直接実行の見かけ上の成功に注意
- run #43336789602 はActions全体がsuccessでも、ArtifactにはGLB 3点のみでPNGが0点。ログには `ModuleNotFoundError: No module named 'numpy'` があり、Blender 5.0.1のglTF importerが失敗した。**Actions成功をレンダリング成功と判断しないこと**。
- 対策: `python3-numpy` をインストールし、Blender側からnumpy importを事前検証。`blender --python-exit-code 1` を付けてPython例外をジョブ失敗として伝播させる。実レンダリングの成功とPNG存在は修正後に別途確認する。

## 2026-11-13 V6 Blender 5 AgX設定名の修正（第4階層・溶岩岩壁）
- 対象: [PR #308](https://github.com/koda24-cell/kotama-no-bouken/pull/308)、[失敗run #43346775600](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43346775600)。Node/Three.jsでV6 GLBは生成成功したが、Blenderレンダリングで `TypeError: ... enum "Medium High Contrast" not found` が発生しPNG未生成。
- 原因: Blender 5.0.1の `scene.view_settings.look` は `Medium High Contrast` ではなく `AgX - Medium High Contrast` を要求する。造形エラーではない。
- 対処: `tools/b4-render/render-rockwall-v6-bright.py` の設定を `scene.view_settings.look='AgX - Medium High Contrast'` に変更。露出 `+1.1` と追加照明を維持。修正コミット `c485681d6eae381f66787d7f8690de3fe0f06d0e`。
- 検証: [修正後run #43352949692](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43352949692) はActions成功。実PNGとGLBの目視・構成確認は別途必要。
- 再発防止: Blenderのバージョン依存のenumは実際の `scene.view_settings.bl_rna.properties['look'].enum_items` 等で確認し、`--python-exit-code 1` とPNG枚数チェックを必ず維持する。
