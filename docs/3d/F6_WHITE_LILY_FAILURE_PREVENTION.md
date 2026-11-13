# F6 白百合 V10 — Blender 実行失敗の原因と再発防止

更新日: 2026-11-13
対象: PR #306 / `feature/f6-white-flower-ground-20261112`

## 障害
- GitHub Actions #44 (run 43369863098) は失敗。
- `Render single white lily (1000 control coordinates)` で Python `SyntaxError: unexpected character after line continuation character`（`tools/floor6/white_lily_single.py` の `head_anchor` 行）。
- コード編集時に本来の改行ではなく、文字列 `\\n` をソースへ挿入したことが直接原因。Blenderの造形や描画処理の問題ではない。
- 当時の `Preflight Python syntax` は `white_flower_ground.py` だけを検査しており、単体白百合の構文エラーを事前検出できなかった。
- 後段が `if: always()` で実行されるため、単体白百合の出力がないまま検証まで進み `FileNotFoundError` も発生した（二次的なエラー）。

## 修正
1. `white_lily_single.py` の誤ったリテラル `\\n` を実際の改行に修正（commit `e10b7ebd885a254a9a10da5f2e559c55bd90a454`）。
2. 同コミットの Actions #46 (run 43371290320) が **success** で終了。これは自動実行・出力検証の成功であり、外観の承認ではない。
3. ワークフローの事前構文チェック対象を `white_flower_ground.py` と `white_lily_single.py` の両方に拡張。
4. 単体白百合の生成・検証ステップから `if: always()` を外し、先行失敗時の無意味な検証と誤解を防止。失敗時のログ・既存素材 Artifacts のアップロードは維持。

## 次回からの確認手順
- Pythonファイル更新後は、まず `python3 -m py_compile tools/floor6/white_flower_ground.py tools/floor6/white_lily_single.py`。
- Actions の成功だけで完了とはしない。GLB、正面・側面・斜め・上面PNGを実際に確認する。
- 特に茎先端と花の付け根の接続、花びらと雌しべ・雄しべの中心軸、葉の形状をチェック。
- V4で承認された花びらの形状は維持し、未承認素材は正式アセットへ昇格させない。

## 参照
- 失敗: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43369863098
- 修正後成功: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43371290320
- 管理PR: https://github.com/koda24-cell/kotama-no-bouken/pull/306
