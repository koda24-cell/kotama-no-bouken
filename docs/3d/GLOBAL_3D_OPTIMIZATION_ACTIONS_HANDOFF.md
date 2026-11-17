# 3D描画軽量化 Actions 共有入口 — 2026-11-17

## 目的
すべての階層で「近景品質を維持し、遠方・不可視・小さなディテールの描画負荷を抑える」を優先する。
基本方針: [GLOBAL_3D_LOD_PERFORMANCE_POLICY.md](GLOBAL_3D_LOD_PERFORMANCE_POLICY.md)。
調査根拠: [F6_TREE_BOTW_PERFORMANCE_RESEARCH_20261117.md](F6_TREE_BOTW_PERFORMANCE_RESEARCH_20261117.md)。
BotW本体のシェーダーや非公開ソースをコピーするのではなく、公開技術を独自実装。

## PR #488 の機能と確度

1. **GLB Performance Audit** `.github/workflows/shared-3d-performance-audit.yml`
   - `workflow_call`／手動／検証ブランチへのpushに対応。GLBファイルglobを受け取る。
   - `tools/3d-performance/audit_glb.py` がglTF2.0 JSON chunkを解釈してシーン可到達ノード、mesh、primitive instances、triangles、MASK/BLEND材質、テクスチャ個数を記録。外部Pythonライブラリ不要。
   - **実動作確認済み**: GitHub Actions #44058467063 で第1層の実GLB48個、計227 primitive instances・339474三角形を測定。ファイルの構造的推定でありWebGL実測draw callではない。
   - `tools/3d-performance/test_audit_glb.py` でsynthetic GLB・無効GLB・重複インスタンスのケースを確認。
2. **F6 Tree Foliage Batching Review** `.github/workflows/f6-tree-foliage-batch-review.yml`
   - 未承認PR #452の原本V14を成功済みActions run #44053620503から取得し、SHA256一致とV14であることを検証。
   - `batch_blend_foliage.py` が元のBlendをディスク上で保全し、メモリ上で同一材質の葉を結合して新規GLBを生成。元のGLB・PNGも変えない。
   - 同じ4方向カメラとライトで改変後を実レンダリング。`compare_renders.py` でソースPNGとの差を比較。GLB構造監査・manifestを出力する。
   - **予備実行で実体成功・ワークフロー結合判定を修正中**: Actions #44058975228のArtifactで元GLB9108 mesh nodes → 145 mesh nodes、両者42930 triangles、約6.49MB→約1.59MB。4方向PNGのRGB平均差は0.0001/255程度。試験の最終ステップがYAML inline Pythonの改行誤りで失敗したため、後続の修正版Workflow成功までActionsの完全成功とは扱わない。
   - 原本GLBとBlender作業ファイルの正式素材保存・ゲーム実装は**未承認・未実施**。
3. **LOD / Tile Prefetch Trial** `tools/3d-performance/lod_policy.mjs`
   - コタマの視点・画面内の見かけサイズを想定したLOD0/1/2のしきい値＋ヒステリシス、重要オブジェクトの画質保護、平面グリッドの可視・先読みセル判定。
   - `node --test tools/3d-performance/lod_policy.test.mjs` を共通監査Actionに組み込む。
   - **未統合の試験**。Three.jsランタイムの可視性・ロード制御・FPS改善が実装済みとは言わない。

## 実際の使用

- 全般のGLB構造監査は上記workflowの`asset_glob`へ `assets/**/*.glb` のようなパターンを入力。ファイルが多すぎる場合は層単位のglobに分割する。
- Blender実験Actionは必ずユーザー未承認の元checkpointを読み取り専用として扱い、生成ファイルも`NOT_APPROVED`のみ。
- 一度のRender/GLB成功と、フレームレート改善／画質承認は別の検証段階。
- 一般物体（岩・建築・燭台）向けの自動decimation・Impostor焼き込み・MASKカード変換は候補段階。破壊的な一括変換を絶対に実施しない。
- ゲームへ接続する際には`field/field-3d-view.js`のstatsと第1層`field/field-3d-b1-sacred-trial.js`のInstancedMeshを再利用候補として検討し、独立PRと実機比較で安全確認する。

## ソース・成果物
- 実装PR: https://github.com/koda24-cell/kotama-no-bouken/pull/488
- 第6層成木原本PR: https://github.com/koda24-cell/kotama-no-bouken/pull/452
- 検査ArtifactはGitHub Actionsの短期保存物（最大14日）、永続保存ではない。
