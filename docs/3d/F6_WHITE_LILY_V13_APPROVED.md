# 白百合1輪 V13 — 採用承認記録

- 承認日: 2026-11-13
- 承認対象: **白百合1輪 V13**（花びら6枚・葉3枚・曲がった茎・接続メッシュ）
- ユーザー判断: 「花は採用です。」
- 元ソース: `tools/floor6/white_lily_single.py`
- 承認済みレンダリング: GitHub Actions run [#58](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43444822193)（成功）
- 成果物名: `f6-white-lily-single-study` / artifact ID `14048091645`
- 出力ファイル: `white_lily_single.glb`, `white_lily_angle.png`, `white_lily_front.png`, `white_lily_side.png`, `white_lily_top.png`, `control_points_1000.csv`
- 検証: 60個の花びら根元頂点の座標検査を通過。実レンダリングを斜め・側面から確認し、ユーザーが採用。
- 管理PR: [#306](https://github.com/koda24-cell/kotama-no-bouken/pull/306) → `development`

## 保持・昇格ルール

1. V13の形状を承認済み基準とし、無断で変更しない。
2. Actions artifact は期限付き一時保管。**GitHub正式素材フォルダへのGLB/PNG恒久保存は、この承認記録だけでは完了しない**。保存後に実ファイルを検証する。
3. 既存の白花地面タイルV4は別素材であり、今回の承認対象ではない。
4. 第6層素材として扱い、既存ゲームへ勝手に組み込まない。恒久保存後、PRレビューを経て `development` に統合する。
