# B5 V4 素材・ツール取り込み台帳

## 実際にリポジトリへ追加済み
- `tools/b5-gloom/procedural_materials.py` — Blender標準ノードだけで動く独立した黒紫の瘴気マテリアルと風化岩マテリアル。Noiseの微細凹凸、Voronoiの発光亀裂、Bump、Roughness。依存アドオンなし。
- これは**生成用コード**。外部PBRテクスチャの画像ファイルやスキャン岩GLBはまだ取り込んでいない。
- 既存のV3スクリプトは維持。V4素材をゲームへ直接導入しない。

## 外部取得候補（未ダウンロード・未検証）
- Poly Haven: https://polyhaven.com/ — CC0スキャン岩・PBR地面素材
- ambientCG: https://ambientcg.com/ — CC0の岩石Normal/Roughness/Displacement
- Blender標準: Geometry Nodes、Voxel Remesh、Bake（追加インストール不要）

## 取得ブロッカー
- 実行環境から ambientcg.com のDNS名前解決に失敗。外部テクスチャ・スキャン岩のファイルを取得できなかった。ダウンロード済みと報告しない。
- URLごとのライセンス・ファイル実体・容量・SHA256を検証してから取り込む。
- Blender専用ノードはGLB/Three.jsで直接再現できないため、BaseColor・Normal・ORM・Emissionへベイクして比較する。
- ユーザーの承認前に正式素材フォルダへ移動しない。

## 次の工程
1. 公開CC0スキャン岩を入手できる実行環境でダウンロード・ハッシュ検証。
2. 岩モデルと独立した侵食膜・根・発光亀裂を組み合わせる。
3. V4で正面・側面・斜めの実レンダリングとGLB出力、GLBをThree.jsで表示検証。
4. レビュー後にのみ昇格。
