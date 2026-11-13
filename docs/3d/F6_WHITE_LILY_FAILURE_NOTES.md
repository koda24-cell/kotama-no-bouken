# 第6層 白百合1輪 — 失敗原因・再発防止メモ (2026-11-13)

## 確認済みの事実
- PR #306 最新 head `b660d6d4606cafed853aaef4136bfa40f971edc9` に、`tools/floor6/white_lily_single.py` と `.github/workflows/f6-white-lily-render.yml` が存在する。
- この head について GitHub connector の `fetch_commit_workflow_runs` で確認できたのは **F6 White Flower Ground Render** の成功 run #43316258069 だけ。**白百合専用ワークフローの成功・成果物は未確認**。
- このコネクタの run 取得範囲には制約があり、白百合 workflow が絶対に起動していないとまでは断定できない。
- 以前の白花V4では Blender 本体がレンダリングを完了していても、出力PNGが v2 名で検証が v4 名だったため run #43233480142 の検証に失敗した。ファイル名修正後、run #43233836352 は成功した。

## 今回ダメだった原因
1. **直接原因（確認済み）**：白百合の Blender 実行ログ、GLB、4方向PNGの成功確認・画像提示まで進めていない。コードとワークフローを GitHub に保存しただけで作業を終えた。
2. **ワークフロー上の検証不備（コードから確認）**：`blender ... | tee ...` に `set -o pipefail` がなく、Blender が異常終了してもパイプの終了コードだけでは検知できない。終了マーカーの grep はあるが、明示的なプロセス失敗検知が必要。
3. **起動・発見性の問題（未確定）**：白百合専用 workflow は feature ブランチで新規追加された。GitHub Actions の workflow_dispatch はデフォルトブランチ未登録では UI に現れない場合がある。push トリガーと専用 run を実際に検証すること。
4. **品質上の未確認点**：白百合の花弁の輪郭、雄しべ・葯の見え方、6枚の反り返りは、Blenderレンダリングを目視して初めて判断可能。150制御点を用意した事実だけで高品質とは言えない。

## 次回の必須手順
1. 専用 workflow の run ID、job logs、artifact を特定する。見つからなければ実行トリガーを修正する。
2. Blender 実行シェルに `set -euo pipefail` を加える。
3. GLB、4方向PNG、150行の制御点CSV、Blender完了ログを実物で検証する。
4. PNGを会話に**画像として直接表示**し、参考の白百合写真と正面・斜め・側面・上面を比較する。
5. 花びらの大きさ・反り・重なり・先端形状・雄しべ・色・茎を辛口評価し、改善→再レンダリングする。
6. 承認まで正式素材フォルダへ昇格せず、既存の白花V4素材も削除しない。

## 関連
- PR: https://github.com/koda24-cell/kotama-no-bouken/pull/306
- 旧白花 V4 成功 run: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43233836352
- 白百合生成コード: `tools/floor6/white_lily_single.py`
- 白百合 workflow: `.github/workflows/f6-white-lily-render.yml`
