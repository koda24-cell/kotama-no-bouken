# 第2層・水V7 再利用画像素材セット（候補・未承認）

更新: 2026-11-19

## 保存済みのGit画像

- [水面カラー＋アルファ画像](../../tools/f2-water/textures/v7_water_surface_color_alpha.svg) — 1024×1024相当の透明SVG。淡い青緑と白い連続曲線、透明背景。川底を隠さず水面の色模様を載せる。**Gitのテキスト画像素材として恒久保存（ただしPRは未マージ）**。
- [岸際の泡・アルファ画像](../../tools/f2-water/textures/v7_shore_foam_alpha.svg) — 透明SVG。不規則で断続的な泡筋。水面カラーとは別に調整・UV適用する。
- [V7テクスチャ変換処理](../../tools/f2-water/rasterize_v7_textures.py) — Git管理のSVGを1024pxのRGBA PNGに変換し、SHA-256をmanifestへ記録する。
- [V7 Blender水面シェーダー](../../tools/f2-water/render_water.py) — 上記カラーPNGのRGBとAlphaを別々のノードで読み、Transparent/Glossy/Fresnel/微弱Emissionと合成。既存の川底・岩・形状は保持する。

## 生成・採用状態

- ユーザー依頼を基にAIで淡い水面の画像案を生成。**生成された高解像度PNG案そのものはこのGit PRにバイナリ保存していない**。現在Gitで管理している水面画像は、その方向性を踏まえたオリジナルの透明SVG実装であり、生成PNGと同一ファイルではない。
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
