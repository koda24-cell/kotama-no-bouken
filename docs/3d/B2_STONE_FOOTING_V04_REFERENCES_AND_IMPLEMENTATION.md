# B2 水車基礎石 V04 : 石材実参考・技術設計（2026-11-20）
状態: **試作 NOT_APPROVED** / 基準: [V03検証](B2_WATERWHEEL_STONE_FOOTING_V01_V03_RENDER_QA_20261120.md) / Draft PR #650

## 検証済みの参考ソース（素材実体のダウンロード・貼付はまだしていない）
- Poly Haven [Rock Surface](https://polyhaven.com/a/rock_surface): CC0の風化した粗い石肌。Diffuse・Normal・Roughness・Displacementを確認。粒度、くすみ、侵食した色面の参考。
- Poly Haven [Rock Face 03](https://polyhaven.com/a/rock_face_03): 荒い割れ目と欠けを持つ岩壁テクスチャ。破断部の変色と大域的な地形感の参考。
- ambientCG [Rock 063](https://ambientcg.com/view?id=Rock063): フォトグラメトリの灰緑色、ひび・層・苔。1K〜8Kの画像群がCC0。第2層の湿った石の候補。
- tevy [Granite Boulder](https://tevy.dev/models/granite-boulder): CC0 GLB、8500tris/3 LOD、開いた割れと剥離角。穴でなく欠けをモデル化するための形状資料。
- tevy [Stone Dais](https://tevy.dev/models/stone-dais): CC0 GLB、1674tris/3 LOD。台座としての水平面と側面の構造比率参考。

## V04で実装した内容
- V03の本体基礎石と座面を維持し、反対角へ不均一な楔状切削2箇所を追加。
- 側面をSimple細分割し、局所的なレリーフと約3〜4 mm級の層状風化を追加。
- 512²のアルベド、ラフネス、ハイトマップを生成してBlender PBRに接続。3枚ともGLB画像埋込の自動assertを設定。
- 既存支柱V03、車軸、金具には非破壊。部品単体で正面/側面/斜め/上面の4方向レンダリングとGLB QA。
- **実在CC0ソース画像は今版に直接貼っていない**。上記資料は寸法・色と破断の分析参考。未検証の外部ファイルを安全確認なしに取り込まないため、画像はオリジナル手続き生成。
- 初回Actions: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44668014284（結果はログで再確認）。
