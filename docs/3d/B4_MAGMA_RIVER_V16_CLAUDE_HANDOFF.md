# Claude向け — 第4層マグマ河川 V16 完成素材

## 役割
- **GPT/Blender**: 形状・GLB生成・PNGレビュー・PBR素材修正。
- **Claude**: 承認済みGLBとPNG、manifestを確認し、Three.js/GLTFLoaderで実際のゲームへ安全に組み込む。Blender操作を前提としない。
- この引継ぎは**素材承認と保存**であり、ゲーム実装の完了報告ではない。

## 正式素材
- GLB: `assets/models/floor4/b4-magma-river-v16.glb`
- レビュー: `assets/models/floor4/reviews/b4-magma-river-v16/`（front, side, angle, top, source.blend, manifest.json, source-manifest.json）
- 生成コード: `tools/floor4/magma_river/build_magma_river.py`
- 承認記録: `docs/3d/B4_MAGMA_RIVER_V16_COMPLETED_20261117.md`
- 機械可読データ: `docs/3d/B4_MAGMA_RIVER_V16_CLAUDE_HANDOFF.json`
- 検証済みBlender run: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44027612542
- 元Artifact ID: 14303622918、GLB SHA256: `359fb4a68960e624ab955abe57d6afd9c3a1dbe44b7e7b37c8067b8567834918`
- GLBサイズ: 12,865,484 bytes、約390 meshes / embedded images 9（前回の技術検査）。
- 元の`source-manifest.json`は制作時点の`NOT_APPROVED`を保持。**正式な承認状態は`manifest.json`とこの記録を優先**する。

## 実装前に確認すること
1. GitHub `development` 上にGLB、4方向PNG、manifestが存在することを確認。Actions Artifactだけを根拠にしない。
2. `manifest.json`のSHA256とGLB/PNG実ファイルを照合。形式はglTF 2.0 binary。
3. `GLTFLoader`で読み込み、`Box3`で実寸・原点・向き・中心位置を取得。**1マスの寸法を推測しない**。
4. このモデルは河川・岩盤・滝・岸の**複合セット**。単体溶岩C V3とは別ID。既存マップを置換せず、テスト環境で仮配置して接続条件を確認。
5. 色空間、エミッシブ、トーンマッピング、埋め込みPBR画像、法線の向き、透過、岩と溶岩の接触を実画面で確認。
6. 実端末の描画負荷、メモリ、カリング、GLB読込時間、複数配置時のFPSを測定。必要なら軽量化をGPTへ差し戻す。
7. マップ・戦闘・セーブ・既存第4層トロッコV32・単体溶岩溜まりC V3を保持。
8. ゲームへの統合は**独立PR→development**で実施。ユーザー承認なしにmainへは統合しない。

## 次の素材候補
まず「岩の隙間を流れる支流」と「崩れた玄武岩の岸」の2種を独立モジュールとして制作すると、V16を壊さず変化を付けやすい。ユーザーは派生パターン制作も許容しているが、まだ次の完成素材は未承認。

## 検証済みと未検証の境界
- 検証済み: Blender Actions成功、V16 4方向PNGとGLB/Blend/manifest生成、ユーザーのV16美術承認。
- 未検証: Three.jsの実装、タイルシーム、動的溶岩、モバイルFPS、ゲーム内の見え方。
