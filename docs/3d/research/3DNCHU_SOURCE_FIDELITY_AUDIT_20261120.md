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
