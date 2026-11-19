# B5 朽ちた騎士像・サレット兜金属質感研究（2026-11-18）
Status: V5 rendered and QA PASSED technically; aesthetic NOT_APPROVED. V6 independently pending.

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

## V5実レンダリング・検証追記
- GitHub Actions run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44194851712 完了 success。Artifact 14378761645, `b5-sallet-v5-NOT-APPROVED`。
- Blender実PNG(front/side/angle/top)各900×900、編集用Blend、GLB、manifestの6 SHA256を取得ZIP内容から再計算しすべて一致。
- 目視結果: V4の一様な灰色石材から鈍い金属反射へ改善。しかし人工的な格子状ノイズが広い面に浮き、額/眼孔/頬の装甲が分離して見える。金属の写実性と機械的接合は未達。
- V6ではテクスチャの周期模様を弱め、頭部側への頬ブリッジを追加。実装ソースをV5と別保存し、旧版を維持。V6品質は成功証拠確認後に記録する。
- 技術QAの合格は造形の承認と独立。ゲーム統合・正式昇格・マージ禁止。
