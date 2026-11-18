# V18事前調査：後頭部形状とトポロジー（2026-11-18）

## 検証済みの現状
- V16/V17はBlender ActionsによるGLBと6方向PNGの出力に成功したが、背面の渦巻き状陰影、側面の尖り、下部の突起、接合境界が残るため品質不合格。
- 元Shibu Faceのcomponent 5は36頂点の閉路だが、これを同心縮小して一点へ収束させることは**解剖学的に自然な頭蓋曲面を保証しない**。
- V17のメッシュ検査通過は形状・法線・見た目の合格を意味しない。

## 一次資料・専門資料
1. Blender Studio, Generic Retopology: https://studio.blender.org/training/realistic-human-research/retopology/
   - 最初に基本トポロジーを固め、対称形状を起点にし、部位境界に沿ってループを配置する。
2. Blender Studio, Stylized Character Workflow / Clean Retopology: https://studio.blender.org/training/stylized-character-workflow/chapter/5d384edea5b8f5c2c32c8507/
   - 顔、頭部、髪を分けて設計し、エッジフローとポールの位置を検討する。
3. Blender Studio, Live Retopology at BCON22: https://studio.blender.org/blog/live-retopology-at-bcon22/
   - 顔の主要な皺・可動部位とエッジフローの関係を説明。
4. VRoid公式・旧ベータ版との違い: https://vroid.pixiv.help/hc/ja/articles/4405597671193-%E6%AD%A3%E5%BC%8F%E7%89%88%E3%81%A7%E3%81%AE%E6%96%B0%E6%A9%9F%E8%83%BD-%E6%97%A7%E3%83%99%E3%83%BC%E3%82%BF%E7%89%88%E3%81%A8%E3%81%AE%E9%81%95%E3%81%84
   - 正式版は素体の再モデリングと形状変形の耐性改善。今回の旧ベータ版サンプルと同じ構造と仮定しない。
5. mmCGチャンネル頭部リトポロジー: https://www.youtube.com/watch?v=8ahGDBb48s0
   - 44:28後頭部、52:16首、31:53耳。**動画の各フレームは未精査**。制作手順の追加確認候補。
6. VRM頭部移植の実践記事: https://note.com/melvina/n/n9540605adf51
   - Face/Body/Hairの境界と首の隙間に注意。第三者実践例であり公式仕様ではない。

## V18制作前の必須調査
1. Faceのcomponent 5の36頂点の各XYZ・法線・連続するエッジ長・曲率・接続する面の法線をJSON化。
2. 前面/背面/左右/斜めの**ワイヤーフレームと通常シェーディング**を同条件で撮影し、耳・顎・こめかみ・頭頂・うなじの位置を識別。
3. Vita/他のサンプルを髪非表示で観察し、後頭部・首の自然なプロポーションを計測。単純な奥行き比だけで決めない。
4. 36頂点の外周に対して、頭頂・側頭・後頭・後頸を別パッチで設計する。後端を一点へ集約しない。クアッド主体で法線連続性を確保。
5. 接合部の頂点距離、法線角、非多様体辺、自己交差、重複面、最小面積を機械検査。単一の「36境界辺」だけでは未接合のままなので、実接合は別の合格ゲート。
6. 6方向PNGと接合部拡大を確認し、V17より悪化する場合は戻す。ユーザー承認まではゲーム本体に反映しない。

## 未確認・制限
- Pinterestの画像候補はこの文書では取得・画像確認していない。公式Blender/VRoid記事は文面を参照したが画像の細部は未評価。
- この文書は設計調査。V18の造形・レンダリングを完了した意味ではない。
