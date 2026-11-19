# 第2層の浅瀬・透明水面の光学表現（V9/V10の不合格原因）

2026-11-19 / 制作PR #517。共同開発共有研究。**実装結果と技術研究は別判定**。

## 実PNGからの症状と原因仮説
- V9（Actions #44461004945）：Cycles実3方向成功、ウイルス検査成功、画面が曇りガラス状。水の屈折率1.333自体は妥当だが、強い微細Bumpと屈折混合40%・Roughness .075、低sampleで散乱状に見える。
- V10（Actions #44461754859）：実3方向成功、屈折混合23%、Roughness .008、Bump強度.13/距離.012に減らすと、曇りガラス感は減ったが、水面が濡れた床と区別しにくい。
- これまでの「波紋カラー画像＋独立反射＋透明・屈折」では、屈折を強めると粗く、水面画像を弱めると見えなくなる。**水面の可視化と川底の可視性を同じパラメータに背負わせない**。

## 公式一次資料
1. Blender 5.3 Glass BSDF（IOR≈1.33、Roughness/透過と反射）: https://docs.blender.org/manual/ja/5.3/render/shader_nodes/shader/glass.html
2. Blender Refraction BSDF: https://docs.blender.org/manual/en/latest/render/shader_nodes/shader/refraction.html
3. NVIDIA GPU Gems 1：大きな形状波と細かな法線波の分離: https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-1-effective-water-simulation-physical-models
4. NVIDIA GPU Gems 2：小さなUV屈折変位とFresnelで反射・屈折を切替: https://developer.nvidia.com/gpugems/gpugems2/part-ii-shading-lighting-and-shadows/chapter-19-generic-refraction-simulation
5. Unreal Single Layer Water：水底可視性/吸収/散乱/反射/屈折の分離設計: https://dev.epicgames.com/documentation/en-us/unreal-engine/single-layer-water-shading-model-in-unreal-engine
6. Three.js WaterMesh: https://threejs.org/docs/pages/WaterMesh.html / Refractor: https://threejs.org/docs/pages/Refractor.html
7. Blender Voronoi Distance to Edge：疑似水底カースティクスマスク実装: https://docs.blender.org/manual/en/5.3/render/shader_nodes/textures/voronoi.html

## 段階的な改善プラン
- V11：屈折混合11%、法線Bump .075/.006、Roughness .002。水底だけに弱い疑似カースティクス（Voronoi Distance to Edge＋ワープ＋水域マスク）を加える。カラーアルファ画像は保持。**試験開始段階で品質未検証**。
- V11が透明すぎる場合：波紋のAlphaではなく、水底の光模様の密度・水面の低周波反射・岸際マスクの順に調整。
- 水の色は深さによって薄く変え、浅瀬では川底の鮮明さを維持。実水深情報なしの一様な緑色濃度を避ける。
- Blender本番比較で3方向PNGとテクスチャ・Blendを保存。次のThree.js実装時はGPU Gemsの2枚法線や小振幅屈折を参考にし、ゲーム負荷測定後に採用する。
- Pinterestの公開参考ピン候補5件は https://github.com/koda24-cell/pinterest-reference-library/blob/main/references/f2-clear-water-optics-20261119.md 。Pin本体は配布素材として利用しない。

## 終了判定
正面・側面・斜めで (1)水面の存在感 (2)川底の輪郭 (3)自然な反射 (4)岸際の接触線 (5)ガラス・ゼリー・白線に見えない、を実画像で比較。未承認素材はゲームや正式素材フォルダへ昇格しない。ClamAVの実スキャンとSHA照合は毎回継続。

制作実験は https://github.com/koda24-cell/kotama-no-bouken/pull/517 。V11のrun成功が確認されるまで、美術品質も実装完了も未判定。
