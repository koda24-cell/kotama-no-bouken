# 第3階層 鉄骨クレーン V4 — Claude向け引き継ぎ

## 承認・出典
- ユーザーは2026-11-13にV4モデルを完成として承認。
- レンダリング成功: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43346955760
- Artifact ID: 14001992253 (`floor3-industrial-crane-blender`、一時保存)
- PR: https://github.com/koda24-cell/kotama-no-bouken/pull/270
- 現在のGLBはGitHub Actions Artifactにある。**正式なGit保存とdevelopmentマージは未実施**。期限切れ前に正式保存すること。

## Blender不要の利用手順
1. 承認済みGLBを `assets/models/floor3/` に恒久保存した後、Three.jsの `GLTFLoader` で読み込む。
2. `industrial_truss_crane_tapered.glb`（先細り版）と `industrial_truss_crane.glb`（通常版）を別素材として扱う。
3. `tools/floor3/crane/asset-manifest.json` を参照して用途・保存先・接続方針を確認。
4. Blender、Pythonスクリプトの実行は**配置作業には不要**。制作・再レンダリングはGPT担当。
5. 現状はゲーム内未配置。既存ランタイムを勝手に書き換えず、別ブランチで統合作業する。

## 追加素材との組み合わせ
- クレーン本体は固定し、フック・滑車・ケーブル・瓦礫・蔓・配管等を独立GLBにする。
- 1マス単位の配置、回転、接続を想定。**接続点の実座標は未測定のため、仮の数値を使わないこと**。
- 実寸・基準点・ゲーム内スケールは配置検証後にマニフェストへ追記。
- 参考PNGはレビュー用。実際の描画はGLBを使用。

## 確認済み成果物
- 通常版GLB / 先細り版GLB
- 各正面・斜めPNG（計4枚）
- Python制作コード: `tools/floor3/crane/build.py`, `taper_build.py`, `render.py`

## 次の必須作業
- 成果物をGitHub正式保存候補ブランチへ移し、サイズとGLBヘッダを検証。
- 完成PNGを同梱し、Claudeが閲覧できるようにする。
- development向けPRで保存・配置をレビュー。mainは触らない。
