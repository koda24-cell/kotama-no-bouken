# 第2層・水V7 再利用画像素材セット（候補・未承認）

更新: 2026-11-19

**AI生成の水面PNG（96×96、透過パレットの軽量プレビュー）も、Git Blobとして実ファイル保存済み。** 原寸の1254px生成画像はGit未保存であり、制作候補PNGは小サイズの試験用。

## 保存済みのGit画像

- [AI生成水面カラー＋アルファ PNG（96px）](../../tools/f2-water/textures/v7_ai_generated_water_surface_96.png) — 画像生成で作成した透明波紋画像を軽量化した実PNG。透明成分あり。小さな試作・色見本用（96pxのため本番テクスチャの解像度には不足）。
- [水面カラー＋アルファ画像](../../tools/f2-water/textures/v7_water_surface_color_alpha.svg) — 1024×1024相当の透明SVG。淡い青緑と白い連続曲線、透明背景。川底を隠さず水面の色模様を載せる。**Gitのテキスト画像素材として恒久保存（ただしPRは未マージ）**。
- [岸際の泡・アルファ画像](../../tools/f2-water/textures/v7_shore_foam_alpha.svg) — 透明SVG。不規則で断続的な泡筋。水面カラーとは別に調整・UV適用する。
- [V7テクスチャ変換処理](../../tools/f2-water/rasterize_v7_textures.py) — Git管理のSVGを1024pxのRGBA PNGに変換し、SHA-256をmanifestへ記録する。
- [V7 Blender水面シェーダー](../../tools/f2-water/render_water.py) — 上記カラーPNGのRGBとAlphaを別々のノードで読み、Transparent/Glossy/Fresnel/微弱Emissionと合成。既存の川底・岩・形状は保持する。

## 生成・採用状態

- 依頼を基にAIで淡い水面のPNG画像を生成し、透明成分付き96px縮小版をGit Blobで保存済み。**原寸1254px生成PNGはGitに未保存**。高解像度運用の本命は1024px相当の透明SVG画像をBlenderでPNG化する方式。両画像は同一ではない。
- SVGは自作、外部の写真や他社の配布アセットではない。SVG→PNG変換では `python3-cairosvg` を使用。外部URL参照、SVG image/script/foreignObjectを拒否してから処理する。
- Poly Havenの川底写真は既存のClamAV隔離取得フローで検査する。**水面SVGの自動生成は外部ファイル取得ではない**。
- GitHub Actions [V7 Run #44452990228](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44452990228) は起動済み。現時点で実スキャン・PNG変換・3方向レンダリング完了・実画像の美観は**未検証**。
- 水面に色が付いて見えるかは実PNGで判定。泡画像は**準備済みであり、まだBlender水面へ貼付していない**。法線画像は既存コードが256pxの周期ハイトマップを生成しているが、別素材としての正式保存は未実施。
- 候補画像は本PRでのみ保持。**美観承認と正式素材フォルダへの昇格は未実施**、`development` へは未マージ。

## 引き継ぎ・用途
- 水面カラーは薄く、アルファを使って透明背景部分に川底を見せる。濃い青緑の不透明ボリュームに戻さない。
- 泡は岸との接触域のUV/ジオメトリに限定し、一面に均等に貼らない。
- マスクは水底法線ではなく水面の屈折・微反射にも利用し、3方向PNG・近距離を比較する。
- 今後の採用時にGit管理のSVGは継続利用できる。PNGはActionsで再生成してもよい。


## AI生成PNGのBlender貼付（追加反映）
- [実PNG（96px）](../../tools/f2-water/textures/v7_ai_generated_water_surface_96.png) のGit Blob SHAは `cb0d7870324d673c93a8d5d54e31f7150499d3eb`（Git APIで実ファイル確認）。
- `rasterize_v7_textures.py` は元PNGをRGBAで1024pxへ拡大・平滑化して `out/f2-water/v7_ai_water_surface_color_alpha_1024.png` に出力。
- `render_water.py` はこの実AI画像のRGBを水面カラー、Alphaを透過率マスクとして読み込み、先行SVG透明オーバーレイに合成。画像生成した画像を水面に実際に貼る仕組みになった。
- [最新の試験run #44453825512](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44453825512) は起動が確認されたが、2026-11-19現在の実描画・質感は未確認。SVG変換とAI画像変換の両方を通した証拠が必要。


## V8 非均一水面の修正（2026-11-19）
- V7レンダは成功したが、白波模様の反復が均一、手前の強い白反射、水面の平板さが美観上の問題。**V7は採用せず候補として保持**。
- V8は既存のカラー・アルファの素材を残し、Noise→VectorMathで水面画像UVを緩やかに変形する。別の低周波Noise→MapRangeで場所ごとに透明波模様の可視割合を変え、均一な繰り返しを抑える。
- Fresnelの最低反射・反射倍率、発光ハイライト、ライト強度を下げ、Glossy Roughnessを上げて白い反射の塊を抑える。水底と水面の透過構成は保持。新しい外部素材は取得しない。
- [V8試験ワークフロー](https://github.com/koda24-cell/kotama-no-bouken/actions/workflows/f2-safe-water-render.yml) / [V8の起動が確認されたrun #44456123359](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44456123359)。**記録時点はqueued、ClamAV・PNG・Blenderファイルの実成功未確認**。
- V8は `out/f2-water/f2-water-v8.blend` を出力予定。3方向PNGを目視で検査し、正式素材への採用はユーザー承認後。


## V9 実屈折を使う反復修正（2026-11-19）
- V8正面・斜めPNGは確認済み。既存は透明Shader＋薄い光沢＋カラーアルファの合成で、川底の屈折が実質無い。そのため模様を強くすると白いフィルム、弱くすると濡れた床に見える。
- V9で `ShaderNodeBsdfRefraction`（IOR 1.333、浅い水色）を透明Shaderへ40%混ぜ、川底の視認性を維持しつつ屈折を付加。独立したFresnel/Glossy/波高画像/カラーアルファは保持。水面メッシュのうねりを少し増やす。
- 実験的な候補で美観は未判定。ClamAVゲートを保持。[Actions試験 #44460015874](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44460015874)、[Draft PR #517](https://github.com/koda24-cell/kotama-no-bouken/pull/517)。美術未承認のため正式保存・developmentマージをしない。


## V9→V10 実反復・2026-11-19
- [V9実行 #44461004945](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44461004945): **success**。ClamAV再検査、Blender3方向レンダ、PNG/ハッシュ検証、Artifact ID `14499769163` (6,953,136 bytes)をGitHub上で確認してZIPを実取得。scan_manifest: `SCANNED_OK_NOT_APPROVED` / exit code 0 / `river_small_rocks_diff_1k.jpg: OK`; execution_report: `safety_check=CONFIRMED_OK`。
- **V9目視評価：美術不合格**。V8より水面領域・岸の境界は認識できるが、物理屈折の強さとBumpが強すぎて透明な水より曇りガラス風のざらつきになる。特に正面・斜めで細かい粒状ノイズと岩の不自然な水越しの歪み。描画は比較用85%解像度、24 samples。
- V10では同じ既存河床と水面画像を保持し、屈折混合率40%→23%、屈折Roughness .075→.008、Bump強度 .24→.13、Distance .028→.012、サンプル数24→38。波の面積はなるべく残し、川底の鮮明さを戻す。正式採用は未承認。
- V10 Actions [#44461754859](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44461754859)。実行起動確認、2026-11-19のこの記載段階では結果未確認。
