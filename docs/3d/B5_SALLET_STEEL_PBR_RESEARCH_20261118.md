# B5 朽ちた騎士像・サレット兜金属質感研究（2026-11-18）
Status: RESEARCH / V5 Action rendering, NOT_APPROVED.

## 一次資料
- The Metropolitan Museum of Art German visored sallet: https://www.metmuseum.org/art/collection/search/34275 。前後に連続する曲面、狭い眼孔、頬防護と後頭部に向かう尾部。
- Nuremberg sallet: https://www.metmuseum.org/art/collection/search/25388 。鋼鉄の大面積は面の滑らかな転換を中心とし、僅かな傷や腐食にとどめる。
- Met Spanish sallet: https://www.metmuseum.org/art/collection/search/25394 。錆・腐食があっても原形の丸い鉢形を保持。

## 商用利用可能な参考素材
- Poly Haven Rusty Iron: https://polyhaven.com/a/rusty_iron (公式ページの CC0 License 表記を確認)。鉄の凹凸・酸化・粗さの多様性。
- Poly Haven Metal Plate 02: https://polyhaven.com/a/metal_plate_02 (CC0)。擦り傷と部分的な酸化。
- ambientCG Metal056A: https://ambientcg.com/view?id=Metal056A (CC0)。損傷・傷・錆のスケール感。
- ライセンスの公表情報のみ確認。素材ZIPの実ダウンロード、各マップのGLB転用、テクスチャ貼りの成功は未検証。ゲーム用の写真素材コピーは現時点でなし。

## 今回の実装
V4: 黒い大開口、直線的/浮遊する顔パーツ、均一な灰色石質。実レンダリング成功 run 44127785782。
V5: 独立Blender造形 `tools/b5-knights/build_sallet_v5.py`。面を円弧状に巻いたバイザー、凹凸の異なる外殻・薄眼孔、金属係数/粗さの数値調整、独自生成の256px鋼鉄色画像をGLBへパックする設計。制作時の数値は形状が許容されてから調整する。
既存V1–V4のソース、GLBとゲーム本体の形状は保持する。未承認を `assets/` に昇格しない。

## 品質評価と次工程
- Blender Cycles正面/側面/斜め/真上の実PNG、GLB/Blend/hash/manifest確認。実レンダ成功と見た目の合格は別。
- 画像からバイザーが浮く・顔面が空洞・反射が強すぎる場合、V5を上書きせず独立V6を制作。
- 遠景LODは静的形状として元GLBを残し共通GLB Performance Audit対象。最適化でゲーム画面を変化させない。
- Pinterest画像の記録/共有: https://github.com/koda24-cell/pinterest-reference-library/blob/main/handoff/b5-sallet-metal-20261118.md
