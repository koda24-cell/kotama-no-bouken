# F6 岩3種：レンダリング起動問題と改善メモ（2026-11-14）

## 事実と未確認事項
- PR #364 の岩3種（小・中・大）にはBlender生成スクリプトとActionsワークフローがある。
- 以前のコミットに対するGitHub連携の `fetch_commit_workflow_runs` は空配列を返した。ただし、このAPIはPR起動のrunに絞られるため、**push起動のrunが存在しない証拠ではない**。以前の「起動していない」との断定は撤回する。
- この環境にはBlender実行バイナリがなく、外部DNSも利用できない。ここでは実レンダリング・PNGの目視確認はまだできていない。

## 今回の修正
1. `.github/workflows/f6-nature-rocks-render.yml` に `pull_request` → `development` を追加。PR #364 の更新時に実行されれば、PR起動runを確認できる。
2. Blenderインストール後に `blender --version` を出力し、実行環境を特定しやすくした。
3. `upload-artifact` に `if-no-files-found: error` を設定。PNG/GLBがないのに成果物アップロード成功と見なさない。
4. スクリプトのmanifest末尾を正しい改行エスケープ `'\\n'` に統一。
5. Blender 4.2以降では `BLENDER_EEVEE_NEXT`、旧版では `BLENDER_EEVEE` を選択するようにした。

## 次の検証（必須）
1. PR #364 の Checks / Actions で `F6 Nature Rocks Render` の実行有無・結果を確認。無ければリポジトリのActions設定、workflowファイル登録、PRの起動条件を確認。
2. `Check Python script`、`Install Blender`、`Export GLB and render four angles`、`Validate GLB PNG and manifest` の各ステップを確認し、失敗ログから原因を特定。
3. `f6-nature-rocks-v1-review` Artifactの3 GLB、12 PNG、3 manifestを取得し、画像を実際に開いて正面・側面・斜め・上面を確認する。
4. 苔が岩表面から浮いていないか、岩の底が地面に接しているか、3種類の差異が見えるか、1マス内に収まるかを評価。
5. 修正後は再レンダリング。ユーザーの画像承認までは正式素材フォルダへ昇格しない。

## 今後の再発防止
- Actionsの起動状態を単一のPR限定APIの空結果だけで判断しない。
- Blender/Pythonの構文チェック、実行ログ、成果物の存在、実画像の確認をそれぞれ別の検証段階として報告。
- Claudeへは完成GLB/PNG/manifestのみ渡す。ClaudeにBlenderを操作させない。

## 実ログによる原因確定（run #43607486089）
- GitHub Actions runnerにBlender **5.0.1** が正常インストールされた。
- `Export GLB and render four angles` で `TypeError: enum "BLENDER_EEVEE_NEXT" not found in ('BLENDER_EEVEE', 'BLENDER_WORKBENCH', 'CYCLES')` が発生。
- 原因はバージョン番号だけでEEVEE_NEXTを選んだこと。Blender 5.0.1では `BLENDER_EEVEE` が有効。
- `tools/floor6/nature_rocks_v1.py` の描画エンジンを `BLENDER_EEVEE` に変更した。修正後の成功・PNG出力はまだ未検証。
- 再発防止: バージョン番号から列挙値を推測せず、実行環境の利用可能な列挙値か実ログを根拠に設定する。
