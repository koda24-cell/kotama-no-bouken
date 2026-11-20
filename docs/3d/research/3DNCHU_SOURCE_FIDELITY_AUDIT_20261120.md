# 3dnchu 原資料との再現性監査 — 2026-11-20

## R01 Stylized Materials
出典: https://3dnchu.com/archives/how-i-make-stylized-materials-b3d-lassyla/

3dnchu本文を再確認。紹介される技術はEeveeプロシージャルシェーダーで、Noise Texture・Voronoi Texture・Fresnelを組み合わせ、手描きテクスチャ不要とする。

現行試作 `tools/tech-research/tech01_stylized_materials.py` はNoise→ColorRamp→Base Color、別Noise→Bump→Normalであり、VoronoiとFresnelを欠く。Cyclesを使用。**再現性: 部分一致**。現行ノード値はコタマ独自設定であり原作者の値ではない。動画本編と配布ノードデータは未照合。

実行: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44667189999 （Blender 5.3、変更前後各4方向PNG計8枚、Blend、ClamAV成功）。GLBベイクとThree.js未検証。美術未承認。

次: A=現行Noise、B=Noise+Voronoi、C=Noise+Voronoi+Fresnelの独立比較。EeveeとCycles差、およびglTFでの再現可否を分離して検証する。

## R02 Don't use height maps
出典: https://3dnchu.com/archives/dont-use-height-maps-default-cube/

3dnchu本文を再確認。Z方向のみの変位と法線方向の変位を比較するGeometry Nodes手法。**再現性: 未実装**。まず同じメッシュ・同じ高さ場・同じ変位量で方向だけを比較。複合ノイズ・破断造形はコタマ独自応用として別評価する。元動画のノード値は未照合。

## 判定ルール
元記事確認 / 元動画・配布データ確認 / 記事手法再現 / 独自改善 / Blender 5.3実レンダー / GLB・Three.js / 美術承認を別ステータスに記録する。未承認の本番素材は変更しない。

## R01 — 作者の意図と完成例の照合（追加）

**作者の目的**: 3Dシーンを手描きのイラストに見せる、手描きテクスチャ不要のプロシージャルEeveeシェーダー。ローポリ形状に対し色彩とノイズによる絵画調の情報量を付加する。リアルな岩の再現や形状改善は記事の主目的ではない。

**一次資料**:
- 作者の解説動画: https://www.youtube.com/watch?v=mNlL77U0IL8
- 作者のシェーダー・デモシーン配布: https://ko-fi.com/s/7429f18949
- 3dnchu紹介: https://3dnchu.com/archives/how-i-make-stylized-materials-b3d-lassyla/
- 補助説明: https://80.lv/articles/tutorial-procedural-blender-shader-with-hand-painted-look
- 補助説明: https://www.creativebloq.com/3d/see-how-this-3d-artist-uses-blender-to-make-scenes-that-look-hand-painted

**原本入手状況**: 配布ページの存在とBlender File形式は確認。実際の配布Blendファイルは未取得、内部ノード・デモシーンの照合は未実施。作者の設定値や見た目の完全再現を主張しない。

**前回のA/B/C試験**: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44671999168 でBlender 5.3・12枚PNG・Blend・ClamAV検査成功。Noise単独 / Noise+Voronoi / Noise+Voronoi+Fresnelの**独自ノード試験**であり、作者のノードグラフの再現ではない。岩のリアルさで評価した以前の美術判定は、この資料の目的とずれていた。

**次の制作の判定軸**:
1. 原本Blend取得後、デモシーン・ノードのスクリーンショットとシェーダー入出力を記録する（未取得なら「原本未照合」）。
2. 作者デモと同じ被写体・画角・照明・Eeveeで、色面のまとまり、手描き風の陰影、輪郭、ノイズの粒度を比較する。見た目の数値評価は原本画像の比較が可能になってから。
3. 原本再現とコタマ向け応用（岩、樹木、建築）を別のレンダーとして保存する。
4. GLB/Three.jsではEevee独自シェーダーがそのまま移植できるとは限らないため、ベイクまたはThree.jsカスタムシェーダーを別途検証する。
5. 作者の配布条件・再配布可否を確認するまでは、配布Blendや作者の素材をGitHubにコミットしない。制作物はNOT_APPROVEDを維持。
