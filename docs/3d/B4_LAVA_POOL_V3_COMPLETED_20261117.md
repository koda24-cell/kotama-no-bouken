# B4 溶岩溜まり C / V3 — 完成承認・Claude向け引き継ぎ

- 2026-11-17: ユーザーが5種類から青丸の C（溶岩溜まり）のみ採用。A蛇行流・B合流・D滝・E冷却地帯は不採用。ゲームへ組み込まない。
- Blender実レンダー: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43998531627 (success), Artifact 14290673461。
- 正式GLB: assets/models/floor4/b4-lava-pool-v3.glb
- 正面/側面/斜め/俯瞰PNG、Blend、SHA256 manifest: assets/models/floor4/reviews/b4-lava-pool-v3/
- 既存マグマ河川PR #450と溶岩5種PR #454は別の未完成作業。採用済みCのみこのPRへ含める。
- Claude: Blenderを実行せずGLB/PNG/manifestを確認。Three.js/GLTFLoaderで実表示、サイズ/原点/法線/UV/発光/接続/パフォーマンスを検証後、別PRでゲームへ統合。既存マップ/セーブを壊さない。
- 未実施: ゲーム統合、動的流体/VFX、FPS・接続タイル検証。静止GLBの美術承認と実装完了は別。
