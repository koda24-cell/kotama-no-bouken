# Blender QA 自動反復・途中保存プロトタイプ（2026-11-16）

## 状態
**コード・ワークフローを追加した試作。Actions実行、GLB読み込み、3方向PNGの目視、停止後再開の実動作は未検証。** 画像QAの自動合格は造形の美観・ライセンス・ゲーム性能・ユーザー承認を意味しない。

## 実行経路
- GitHub Actions: `.github/workflows/blender-qa-loop.yml`。
- QA本体: `tools/blender-qa/qa_loop.py`。テスト入力作成: `tools/blender-qa/make_demo.py`。
- ワークフローの最初のpushテストは、既存ゲーム素材とは無関係なダミーの球体で実施する設計。
- 手動実行できる状態になったら `source_blend` に**リポジトリ内の既存.blend**の相対パスを指定する。未指定ならテスト用ダミー。外部URLや任意コードを入力しない。
- 出力: `qa-output/iteration_XX/{front,side,angle}.png`、`checkpoint.blend`、`candidate_unapproved.glb`、`progress.json`。manifest用SHA-256はprogressに記録。
- 途中再開: 手動実行時に同リポジトリの以前のworkflowの `resume_run_id` を渡し、`download-artifact`で前の `blender-qa-checkpoint` を復元。反復数は**通算**。再開時の入力の整合性も運用側で必ず確認する。
- Artifactsは14日で失効する。正式保存は承認後の既存昇格ポリシーに従い、独立PRで行う。

## 終了判定
- 全方向の非透明ピクセル占有率 2.5–95%、被写体の平均輝度 0.10–0.85、白飛び割合15%以下を満たすと `awaiting_user_approval`。
- 暗すぎる／明るすぎるときのみexposureを±0.6ずつ調整（最大±3）。**原本メッシュは一切変更しない**。
- 画面外・浮き・穴・形状破壊など明るさで直せない問題は `needs_manual_fix` で停止し、AIが無根拠にメッシュを削除しない。
- 回数上限 `iteration_limit`、ソフト時間上限 `time_limit`、例外 `error` を記録。ジョブ強制終了やランナー障害では、直前にアップロードされていないcheckpointの保全を保証しない。
- 合格後も `approval=NOT_APPROVED` のまま。ゲームの `assets/models/` に書き込まない。承認・正式保存は `docs/3d/ASSET_PROMOTION_POLICY.md` に従う。

## 次段階で必要な検証／拡張
1. 実際にpush起動したrunの終了コード・PNG/GLB・JSON・Blendを検査する。Blenderバージョン差とGPU不在の互換性も検証する。
2. 途中強制中断・再開runを再現し、SHA、通算反復数、画像を照合する。
3. glTF Validator、頂点・接続性・メッシュ保存率などの**構造QA**を追加する。
4. 基準画像との差分、学習モデルによる視覚評価は別レイヤーにし、判定根拠とスクリーンショットを保存する。
5. **造形を自動修正する仕組みは未実装**。安全な候補変更を独立スクリプト化し、元メッシュと差分を守り、各改善案をユーザーへ提示してから採用する。
6. GitHub Actionsの手動起動UIはデフォルトブランチへの登録が必要な場合がある。許可なしにmainに入れない。

## Claude受け渡し
Claudeは Blender 操作不要。ユーザー承認後に正式保存されたGLB/PNG/manifestを Three.js で確認する。未承認候補をゲームへ読み込まない。
