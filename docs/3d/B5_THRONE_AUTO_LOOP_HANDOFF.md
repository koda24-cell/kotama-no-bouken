# 第5層玉座 V2: GitHub Actions 自動反復 QA 引き継ぎ

更新: 2026-11-16。**コード保存済み、GitHub Actions実際の成功・PNG画像の目視・再開テストは未検証。**

## 導入済みコード
- ワークフロー: `.github/workflows/b5-throne-auto-loop.yml`。作業ブランチのpushで起動する設定。手動workflow_dispatchはdefault branch登録後に使える場合がある（mainへ未導入）。
- 制御: `tools/b5-throne/auto_loop.py`（システムPython3/Pillow）。造形とレンダリングは `tools/b5-throne/build_v2.py` をBlender CLIで別プロセスとして実行する。
- `THRONE_VARIANT` 0..7: 背もたれと崩れた石の追加装飾量と配置乱数を調整。オリジナル `build_v1.py` の幾何モデルは再使用・変更しない。
- `THRONE_EXPOSURE`: 前回PNGの平均輝度から次の曝光量を±1.8の範囲で調整。無制限に露出を変えない。
- 原則最大4回/35分、設定可能上限8回/45分、ジョブ全体48分。すべての反復は分離したフォルダへ保存。
- `render-output/b5-throne-auto/iteration_XX/`: 3 PNG、GLB、.blend、geometry.json、blender.log。全反復のprogress.jsonとsummary.json。
- 全3方向PNGをデコード確認し、占有率・平均輝度・白飛びを計測。GLBのヘッダ/宣言サイズを検査。V1の名前付き原形状が残っていることも検査。技術指標の点数は**美術的品質点ではない**。
- 有効候補が2点できたら `awaiting_user_approval`。修正可能な不合格なら次の変種へ。エラーなら `needs_manual_fix`。時間/反復上限に達したら停止。すべて `approval: NOT_APPROVED`。

## 途中保存と再開
- ワークフローの最終ステップは `if: always()` で、部分出力も含む `b5-throne-auto-checkpoint` を14日のArtifactとしてアップロードする。
- workflow_dispatchで同リポジトリの以前のrun IDを `resume_run_id` に入力するとcheckpoint一式を取得して次の反復を開始。
- ただしジョブランナー自体が強制終了/容量超過/ネットワーク障害などの場合、Artifactの保管を**保証できない**。再開時は造形コード2ファイルのSHA-256を照合して異なる入力で再開しない。
- GitHub Actions側の反復は一ジョブ内の複数Blender起動。GitHub MCPにworkflow_dispatch実行機能が無い場合、チャットから起動済みと報告しない。

## 未実装・制約
- PNGの静的指標だけでは、石材が安っぽい、装飾がきれい、浮きが見える等の美術判断はできない。自動合格後はユーザーが実画像をレビュー。
- 改善は複数の事前定義した形状候補と露出のフィードバック。AIの画像理解を直接組み込んで新しい造形コードを毎回生成する完全自動エージェントはまだ未実装。
- 物理衝突、マテリアルPBR品質、glTF Validator、ゲーム内FPS、実行成功/PNG可視化は未検証。
- 開発PRをDraftで保持。既存の承認・正式保存規則 `docs/3d/ASSET_PROMOTION_POLICY.md` を守り、user approval無しにgame/mainへ反映しない。

## 次に実施する確認
1. GitHub Actionsのpush起動runを取得し、Blender環境の依存関係とPythonエラーを確認。
2. 3方向画像をユーザーに提示し、V1/V2、各variantを目視比較。
3. 2回目のrunで `resume_run_id` を指定し、通算回数と出力ハッシュを確認。
4. 修正が必要なら別コミットで小さく修正し、再実行。
