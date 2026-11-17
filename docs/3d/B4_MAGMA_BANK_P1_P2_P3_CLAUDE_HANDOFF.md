# 第4層 マグマ河川派生 P1 V4 / P2 V4 / P3 V5 — 完成記録
- ユーザー完成承認: 2026-11-17（本チャット）
- 元モデル: V16（390 meshes / 7 materials / 9 images、既存の正式保存は変更しない）
- P1 V4: 細い支流・岩岸、456 meshes / 7 materials / 9 images。実レンダー run [44034610503](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44034610503)
- P2 V4: 玄武岩中央島・分岐、447 meshes / 7 materials / 9 images。同run。
- P3 V5: 玄武岩段差と第二溶岩滝・着地点、538 meshes / 7 materials / 9 images。実レンダー run [44035779505](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44035779505)
- P1/P2 V4 Artifact ID 14306048875、P3 V5 Artifact ID 14307625547。Blender GLB、Blend、4方向PNG、manifestを検証済み。
- 正式素材（Archive workflow成功・development統合後に有効）:
  - `assets/models/floor4/b4-magma-river-p1-v4.glb`
  - `assets/models/floor4/b4-magma-river-p2-v4.glb`
  - `assets/models/floor4/b4-magma-river-p3-v5.glb`
  - `assets/models/floor4/reviews/b4-magma-river-p1-v4/` 等に source.blend、front/side/angle/top.png、source-manifest.json、manifest.json、SHA256SUMS.txt。
- 制作コード: `tools/floor4/magma_banks/build_from_approved_v16.py`、`variant_additions.py`、`build_p3_v5.py`、`p3_v5_additions.py`。
- 実ゲーム統合: **未実施**。元V16や既存マップ、セーブ、Three.jsは変更しない。
- P1/P2/P3 V1/V2/V3/V4等の不採用試作は正式保存対象外。今回の承認はP1 V4、P2 V4、P3 V5に限る。
- ClaudeはGLB・PNG・manifestを読み、Three.js GLTFLoaderで寸法/原点/継ぎ目/パフォーマンスを確認。Blender操作はGPT/Actions担当。

## Claudeへの実装注意
- 完成したこととゲーム実装済みは別。GLBの読み込みと床1マス接続・負荷・マテリアルの検証を経てゲームへ統合する。
- P3の滝・溶岩は静的なメッシュ。流体アニメーションの実装済みを意味しない。
- 承認後のアセットハッシュは各review/manifest.jsonに記録。
