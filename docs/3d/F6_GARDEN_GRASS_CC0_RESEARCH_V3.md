# 第6層 花園草 V3 — CC0素材研究と利用方針

## 確認済み公開素材（2026-11-14）
- Poly Haven Grass Medium 01: https://polyhaven.com/a/grass_medium_01 （CC0、約200万三角形）。葉の密集・根元と外側の倒れ方の形状参考。
- Poly Haven Grass Medium 02: https://polyhaven.com/a/grass_medium_02 （CC0、約100万三角形）。不均一な葉高と色調の参考。
- Poly Haven Grass Bermuda 01: https://polyhaven.com/a/grass_bermuda_01 （CC0、約22.4万三角形）。短い草の密集形状の参考。
- Poly Haven Sparse Grass: https://polyhaven.com/a/sparse_grass （CC0）。土と草の隙間の見え方の参考。
- Poly Haven license: https://polyhaven.com/license （CC0、商用利用・改変・再配布可、帰属不要）。

## V3への反映
- 既存の草生成コードを保持し、4種類の草株に低草・標準・長草・不揃いの高さ分布を追加。
- 葉の曲がり、先細り、外側への広がりを維持。
- 白百合V13の形状は一切変更しない。
- BlenderレンダリングとGLBの品質確認前なので未承認・ゲーム本体には未統合。

## 外部データの扱い
- 上記CC0素材のライセンスは確認済みだが、**3Dモデル本体はまだダウンロード・リポジトリへ組み込みしていない**。
- 数十MB・数十万〜数百万ポリゴンの高密度原本をそのままゲームに入れず、必要なら取得後に実形状確認・軽量化・ライセンス由来を記録する。
- Nintendoのゲーム抽出モデル・テクスチャは取り込まない。BOTWは造形・画面表現の方向性のみ参考。
- 現状は独自生成のBlenderメッシュ。完成GLBの正式保存はユーザーのレンダリング確認と承認後。
