# Blender 5.3 分割レンダリング・復旧 QA 引き継ぎ — 2026-11-22

## 次のチャットで最初に行うこと
1. 最新の `development` と `AGENTS.md`, `docs/3d/BLENDER_DOCKER_HANDOFF.md`, `docs/3d/ASSET_PROMOTION_POLICY.md`, `docs/3d/BLENDER_SHARED_EXECUTION_ENTRYPOINT.md`, `docs/3d/TOOLING_AUTO_SHARE_POLICY.md` を読む。
2. この文書と以下のPR・Actionsの実際の結果を確認し、作業対象と課題を特定する。過去の会話だけを根拠に成功や画像を断定しない。
3. 未承認素材は正式素材フォルダや `main` に入れない。検証コードは独立ブランチ→PR→実動作確認→`development`。
4. **ユーザー最重要要望：Blenderの本物のレンダリングPNGをチャット内で必ず表示してから見た目を判断する。** 参考画像・画像生成を実レンダリングの代わりに見せない。GitHub Actions Artifacts ZIPを取得して `front.png` 等の実ファイルを開き、通常版と結合版を左右に並べ、可能なら中央 x=500 を拡大して示す。実ファイルが取得不能なら、その旨を明言する。ログの数値だけではユーザーが合否判定できない。

## これまでの確定済み開発統合
- **PR #710** https://github.com/koda24-cell/kotama-no-bouken/pull/710 — **merged** `fef38ffe5e6d30d8cb72247479d9eaba51a0650f`。1000×760正面画像を左右500×760に分割。左を検査・Artifact保存→右を意図的にSIGKILL（exit 137）→次ジョブで左のSHA同一性を確認し再利用、右だけ再レンダリング。厳密なPNGデコード/CRC付き結合。Blender Pythonエラーを `--python-exit-code 1` で即失敗判定に変更。実行 https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44940325596 : original success / left success / intentional kill-right failure / resume-right success。全体の赤表示は意図的失敗であり復旧は成功。実PNGの限定的な目視比較あり。
- **PR #711** https://github.com/koda24-cell/kotama-no-bouken/pull/711 — **merged** `0ee034908bf1eee7c44c0b84090bf58967aee8a3`。`tools/3d_checkpoint/seam_qa.py` による自動ピクセル継ぎ目検査。合格基準は (1) x=500の隣接RGB平均差/周辺中央値 ≤2.5 (2) オリジナル同位置の境界との差 ≤8/255 (3) 全画像のRGB平均絶対差 ≤12/255。人工的な+45の色差を入れたNG画像は単体テストで検出。実行 https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44941571085 は復旧・品質検査成功、右側の強制終了により全体は意図的に赤。数値: ratio 0.9119, full MAE 2.9047。
- **PR #712** https://github.com/koda24-cell/kotama-no-bouken/pull/712 — **merged** `a8af9d403835c3da10b7c8f6686913d4302e05e4`。既存4層玄武岩 `assets/models/floor4/props/b4p_basalt_columns.glb` を無変更のまま実シーンに読み込み、参照1枚レンダリングと左右分割を比較。実行 https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44964487709 は全3ジョブsuccess、ratio 1.9067 / MAE 0.2608。実PNG比較は大まかな継ぎ目なし。ただし被写体が比較的小さく、実素材の美術的合格ではない。
- **PR #714** https://github.com/koda24-cell/kotama-no-bouken/pull/714 — **merged** `931135686497518179fc7fd009dc3b0d4e97f6d2`。Blender Cyclesで屈折ガラス transmission 0.9、半透明 alpha 0.32、青い発光 strength 5、不透明柱の**検証専用シーン**を生成し、左右分割と通常版を比較。実行 https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44965880886 は baseline/left/right-and-qa すべてsuccess。ratio **1.6326**, full MAE **0.2085/255**, seam excess 0.4768。実画像取得・左右比較で大きな段差なし。今回は意図的な強制終了テストは実施せず、分割保存と継ぎ目品質の検査。

## Blender実行環境と安全境界
- Blender **5.3.0** + ClamAV 固定Docker: `ghcr.io/koda24-cell/kotama-blender53-clamav@sha256:5ce601f79b1ab09405b3ebc36b1a596be76cb8b105b1524fcbafcb186ebf7e99`
- `tools/3d_checkpoint/render_one_view.py`: 通常正面画像のBlender Cyclesレンダリング。
- `tools/3d_checkpoint/render_half_frame.py`: frontの左右タイルだけをレンダリング。各500×760、24 samples、元モデルは保持。
- `tools/3d_checkpoint/stitch_half_frame.py`: PNG CRC/行フィルタを検査し左右を1000×760に結合。
- `tools/3d_checkpoint/seam_qa.py`: 通常画像と結合画像の定量比較・JSONレポート出力、FAIL時は次工程へ進めない。
- `tools/3d_checkpoint/checkpoint.py`: SHAと出力manifestの検証。各保存前後にClamAV。
- `.github/workflows/blender53-half-frame-recovery.yml`, `blender53-seam-qa-gate.yml`, `blender53-basalt-tile-qa.yml`, `blender53-transparency-tile-qa.yml` は検証用。
- Artifactsは14日で期限切れになり得る。画像そのものの正式素材保存はユーザー承認が必要。画像のチャット表示は一時Artifactから行う。

## PR #714 本物の画像の取得場所
- Run 44965880886 / Artifact `transparent-reference-NOT-APPROVED-44965880886` (ID **14731268719**), 中の `front.png` が通常描画。
- Run 44965880886 / Artifact `transparent-tiled-PASS-NOT-APPROVED-44965880886` (ID **14730953574**), 中の `front.png` が左右結合。
- 前のチャットではこれらを実際にダウンロードして side-by-side 画像を表示した。ただしその一時的な `/mnt/data` パスはチャット/環境を跨いで存在する保証がない。次のチャットでパスを推測・使い回しせず、再ダウンロード・実在確認すること。
- 不要な参考画像（検索画像・画像生成）を実データの代わりに掲載しないこと。

## 次の優先タスク
1. **実PNGをユーザーへ見せる**。以後すべての実レンダリングは正面/側面/斜めまたは比較画像をチャット内で提示。見た目の承認を勝手に代行しない。
2. 次の独立PRで **Cycles Volume / 瘴気や霧の3Dボリューム** をテストし、通常描画と分割描画で密度・発光・ノイズや継ぎ目が出ないか比較する。さらに高サンプル数の別条件を検査する。失敗時は原因を解析し、閾値だけを緩めて隠さない。
3. 将来の汎用化時はタイル境界の複数位置、シーンの不透明・屈折・alpha・ボリューム、ランダムサンプル・denoise境界、別カメラ、4分割以上、復旧の途中経過保存コストも検証。
4. 合格後も正式素材の承認・ゲームへの配置は独立の手順。検証用GLB/PNGはすべて `NOT_APPROVED` とする。

## 注意
- 「1枚の途中保存」とは **完成したタイル単位** の途中保存。1タイル内のCyclesサンプル計算をチェックポイント化しているわけではない。
- PR #710/#711 での intentionally killed job の赤表示は設計上のテスト条件で、復旧ジョブの結果を別に確認する。
- このドキュメントは次回チャットへの引き継ぎであり、次のVolumeテストを実行済みだと意味しない。
