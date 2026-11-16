# 第6層 花園・自然岩 V15 完成（Claude受け渡し）

状態: **ユーザー承認済み / GLB・4方向PNG正式保存 / ゲーム未統合**

- 承認日: 2026-11-16 JST
- 制作元: PR #364 / commit `5a6bba6bc60f3febb19ca2e59c0e9a2c906486f0`
- Blender実レンダリング: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43814108717
- Artifact ID: `14201817785`（一時保管。正式ファイルはGitを参照）
- 造形再現コード: `tools/floor6/nature_rocks_v1.py`（V15の内容。名前は歴史的にv1のまま）
- 対象: `rock_small`, `rock_medium`, `rock_large`
- GLB: `assets/models/floor6/nature/<asset_id>.glb`
- 正面・側面・斜め・真上PNGとmanifest: `assets/models/floor6/nature/reviews/<asset_id>/`
- 形式: glTF 2.0 binary (GLB)、PNG、JSON
- 各manifestの `files` にハッシュ（SHA-256）・バイト数・パスを記録。
- GLBは形状・マテリアル・埋込テクスチャを含む。個別にGLTFLoaderからロードする。
- 草原床との接地、ワールドスケール、UV/Normal Map、ゲーム内Three.js表示とパフォーマンスは**統合時に再検証**。見た目の承認≠ゲーム統合の検証。
- ClaudeはBlenderを開かず、保存済みGLBとPNG/manifestを参照する。
- ロック表現はV1～V15で改修。V10のUV連続化で三角面の色模様を改善し、V15は表面ノイズを調整。ユーザーがV15を最終承認。
- 次の制作系統は砂利: `gravel_sparse`, `gravel_dense`, `gravel_path` （自然岩とは別PRで制作）。
