# 第3層 ガラス破片01 V10 — 生成画像汚れ貼り付けQA（2026-11-20）

ユーザー指示: 「それも表面を汚す用のテクスチャを用意してください。画像生成で良いです」→「ガラスに張ってください」。

## 適用
- V9の**ガラス破片1枚だけ**の形状・厚さを保持。中央大穴ガラスや窓全体を新規生成していない。
- チャット内画像生成のオリジナルPNG `汚れた風合いの古びたガラス質感.png` (1254×1254, SHA-256 `c8937570b1be8541811a62cc0213584c085dc2276afbe5efa850f1c2d0babbd6`) を入力素材として使用。
- 元画像をグレースケール128×128、16段階の階調へ縮小し、圧縮した実画素データを `tools/floor3/broken_glass01/build_detached_shard_dirt_v10.py` に埋め込み。Actionsで追加ダウンロードせず確実に再現できる。
- Blender `F3_GENERATED_GLASS_DIRT_V10.png` として生成し、ガラスのBase ColorとRoughnessへ画像テクスチャノードを接続。Transmission Weight .96、IOR 1.47を保持。旧V9に変更なし。
- 新専用Actions: `.github/workflows/f3-glass-detached-shard-dirt-v10.yml`。

## 実行検証
- [Actions run #44644156219](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44644156219): **success**。
- Artifact ID `14587893097`、`f3-glass-detached-shard-dirt-v10`。実ファイルのGLB、Blend、正面・側面・斜め・破片拡大PNG4枚、汚れPNG、旧Roughness PNGの計8ファイルをmanifestに照合し、SHA256全件一致。
- `F3_GENERATED_GLASS_DIRT_V10.png`: **128×128 PNG / ノンカラー**。SHA256 `c215878a23c6bfae3b96a77301c1599addd0566424bf544994cc082af716f185`。元画像の微細ディテールは軽量化で低減。
- 実GLB **1 mesh / 56 triangles / 16356 bytes**。GLB内画像 `F3_GENERATED_GLASS_DIRT_V10` がカラー/metallicRoughness両テクスチャとして埋め込まれていることを検証。KHR_materials_transmission と KHR_materials_ior あり。
- 実Blender4方向を目視: 汚れの斑点/曇りが確認できる。**曇りはやや強め**で、透明感と可読性のバランスに改善余地あり。美術は承認待ち。
- Blender制作物は正式Gitアセットフォルダ/ゲーム本体へ未保存。Artifactは一時的な保管。V10専用ジョブのClamAV実スキャンとThree.js表示確認は未実施。外部配布アセットは使用していない。

## 次の確認
- 視認可能な汚れを残しつつ全体の曇りを20–40%抑える比較候補を制作できる。
- ユーザーが現V10の表現を認めるまで正式素材への昇格は行わない。
