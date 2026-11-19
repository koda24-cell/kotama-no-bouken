# 第3層 廃墟ガラス01 — 調査内容の実装 Type A V5

2026-11-19。既存のV1〜V4は保持し、独立した新バージョンを追加。

## 採用した資料
- `docs/3d/F3_RUINED_GLASS_RESEARCH_20261119.md`
- `pinterest-reference-library/references/f3-ruined-broken-window-glass-20261119.md` （Pin候補は取得、Pin画像実視認は未完了）
- Ordinary glass と wired/toughened/laminated glass の破壊形状は異なるため、今回は ordinary glass の大きい破片が枠に残る例を対象とする。

## V5 Type A 造形に反映した点
1. **中央の穴を本物のメッシュ開口に変更**。外縁の長方形と、24点からなる非対称の内側破断輪郭を結ぶ、輪状のガラスメッシュ。透明画像の黒塗りで擬似穴を作らない。
2. **額縁の近くに大きな残存片が残る**表現を優先。四辺の幅を均等にせず、中央の破損が偏った形になる。
3. **ガラス厚6mm**をSolidify、破断端に微小ベベル。正面と側面で厚みを検査。
4. **ひびは5本に限定**し、残存ガラス面上に薄く配置。長い輪郭の全周を均等なジグザグにしない。
5. **埃・雨筋・表面粗さ**は自作256pxのnon-color Roughness PNGに限定。汚れで全面乳白色にしない。画像は生成コードで再現可能。
6. **透過のglTF保存**: Blender Principled BSDFのTransmission Weight 0.94、IOR 1.47。GLB内にKHR_materials_transmissionが存在することをワークフローで確認する。
7. **検証背景はGLBに含めない**。正面・側面・斜め・破断部拡大の4方向レンダリングで確認する。

## 実装箇所
- `tools/floor3/broken_glass01/build_type_a_v5.py`
- `.github/workflows/f3-broken-glass01-type-a-v5.yml`
- [Actions Type A V5 run #44463751813](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44463751813)

## 事前に確定できないこと
- Blenderの透過とゲーム上のThree.js描画は同一ではない。Three.jsテストは未実施。
- 外部素材のGLBは今回直接導入しておらず、ライセンス/ウイルススキャン済みとも扱わない。使った汚れ画像は完全自作。
- 実GLB/PNG/Blendの存在、SHA一致、アート品質はActionsとArtifactの取得後に判定する。
- 完成・正式保存・ゲーム実装はユーザーの承認後。V5が不合格なら次のバージョンで局所修正する。
