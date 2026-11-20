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

## 実行ログと評価（追記）
- 初回 run [#44463751813](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44463751813) は Blender 5.3 の `mesh.uv_layers.new()` の位置引数がエラーになり失敗。キーワード引数へ修正。
- 次のrun [#44463924609](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44463924609) はアセット出力成功したが、初期Cubeが残りGLB・レンダリングに混入。**不合格**として、シーン開始時に初期オブジェクトを全削除し、GLBにCube/描画用背景を混入させない検査追加。
- 修正後の [#44464482739](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44464482739) は **success**。Artifact #14500769738。GLB、Blend、4方向PNG、Roughness PNGの7ファイルのSHA-256を実取得し照合成功。実GLBのKHR_materials_transmissionの存在も検査済み。
- 正面、側面、斜め、破断面拡大の画像QA：中央の穴と周辺に残るガラス、薄い実断面は確認できた。しかし**ガラス全体が白っぽく透過が弱く、破断面の反射も不足**。破断輪郭も幾何学的な直線が多いので美術未承認。
- 粗さマスク `F3_GLASS_WEATHERING_ROUGHNESS_A_V5.png` は256×256 PNG、SHA256 `431a4468faa0b6e64f3e166268c6239d4a9ec3d90dbf94136e011d79511c7c77`。自作で外部素材は未導入。
- V6は `tools/floor3/broken_glass01/build_type_a_v6.py`、`.github/workflows/f3-broken-glass01-type-a-v6.yml` で透過率・露出・明暗を再調整。run [#44465072113](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44465072113)。**完了と実画像の視覚QAは未確認の段階でこの記録を追加**。

## V6実画像とV7の修正
- [V6 run #44465072113](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44465072113): **success**。GLB/Blend/正面・側面・斜め・破断部拡大PNG、Roughness PNGの7点のSHA256をダウンロードしたArtifact #14502240181で全一致照合。
- V6ではレンダリング用の背景を暗いEmissionへ変更し、露出とライトを抑えた。ガラスの開口部と残存部が明瞭になった。
- ただし、ひびの何本かが穴の中を斜めに横切るため **美術品質は不合格**。外形の大きな斜め欠けと細かいギザギザもまだ幾何学的。
- V7 `tools/floor3/broken_glass01/build_type_a_v7.py` は、`inner` の破断輪郭から `outer` の残存ガラスへ向けて、同じ半径方向に複数点で生成する亀裂だけを使用。開口を横断する線を発生させない設計。
- [V7 run #44465494696](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44465494696) 。完成の有無とアート判定は必ず実出力後に追記。

## V7 破断亀裂再設計：実検証結果
- [Blender Actions #44465494696](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44465494696) は **success**。Artifact ID `14502345703`、GLB/Blend/正面・側面・斜め・破断拡大PNG、自作Roughness PNGの**7ファイル**を実取得しmanifestのSHA256全一致確認。
- 実GLB分析: 6 mesh（ガラス1 + 細い亀裂5）、合計652 triangles、約98,328 bytes。中央が抜けた輪状ガラスメッシュは実形状。6mmのSolidifyで厚みを付けている。
- V6と違い、**穴の中を横断する長い亀裂が消えた**。亀裂を内側の破断エッジから、外周方向の残存ガラス上に限定している。3方向と拡大画像で目視確認。
- 見た目の改善: V5の白飛びを解消、V6の誤った穴横断線を除去。暗い背景と透明ガラスの差分を確認。
- **美術QAはまだ未承認**。中央の穴が角ばった多角形（星型に近い）で、いくつかの破断角が直線的。外周下側の大きい斜めカットも人工的。次の造形改善では写真の大きな残存破片と小さな縁の欠けのサイズ階層を加える。
- GLS/Three.jsの実ゲーム画面レンダリングおよびFPS測定は未実施。GLBに `KHR_materials_transmission` が存在し、Cube/Backdrop混入がない検査までは実施済み。
- 粗さマップ `F3_GLASS_WEATHERING_ROUGHNESS_A_V5` の自作PNGは256×256 / non-color data、SHA256 `431a4468faa0b6e64f3e166268c6239d4a9ec3d90dbf94136e011d79511c7c77`。V5〜V7でデータを共通再利用。共通テクスチャ台帳にdocs PR #602からdevelopmentへ記録済み。
- 承認前の正式GLB昇格なし。ClamAVの実スキャン未実施。外部GLB/テクスチャは今回一切ダウンロード・組み込みしていない。
