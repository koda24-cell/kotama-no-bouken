# 第2層・浅瀬水面の曇りガラス感：V9/V10原因調査とV11試験計画

更新: 2026-11-19（日本時間） / 対象PR: #517 / ブランチ `feature/f2-safe-water-render-20261119`

## 実画像で確認したこと
- V7: カラー＋アルファの実画像を水面に使うと、水面は認識できたが白い波の反復と大きいハイライトが不自然。
- V8: 白い波の透明度と反射を下げると、水面の実在感が失われた。
- V9: `ShaderNodeBsdfRefraction`、IOR=1.333、混合40%、Bump Strength=.24/Distance=.028、Roughness=.075で本物の屈折を導入したが、実画像は細かい歪み/曇りガラス状。Run #44461004945、Artifact #14499769163（success、実PNG確認、ClamAV検査合格）。
- V10: 屈折混合23%、Roughness=.008、Bump=.13/.012、Cycles 38samples/85%解像度。Run #44461754859 は **success**、Artifact #14501101855 を実取得・3方向PNG確認。V9より濁りが少ないが、依然として濡れた石畳に見え、水面が弱い。合格ではない。
- 原因仮説：強い微細法線で屈折方向が大きく散乱し（屈折Roughnessや低サンプル描画でさらにノイズ）、実際の水深・光環境が弱い一方、カラー波画像は「表面に貼った白線」に見えている。IOR=1.333そのものを誤値扱いしない。既存の水は薄いポリゴン面だけなので、スクリーン空間水深/水底カースティクス等を独立に検証する必要がある。
- 原画像PNGの96pxアップスケール版は局所的に解像感不足。現状の描画テストに使えても高精細本番用ではない。水面SVG、泡SVG、元の3D石・砂利は保持。

## 一次技術資料（直接参照）
1. [Blender 5.3: Glass BSDF](https://docs.blender.org/manual/ja/5.3/render/shader_nodes/shader/glass.html) — 水のIOR約1.33、Roughnessと屈折/反射の関係。ガラス用粗さを水面にそのまま強く適用しない。
2. [Blender 5.2: Refraction BSDF](https://docs.blender.org/manual/en/latest/render/shader_nodes/shader/refraction.html) — 屈折方向と粗さ。Cycles/Blender版と実装互換性を試験する。
3. [NVIDIA GPU Gems 1: Effective Water Simulation from Physical Models](https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-1-effective-water-simulation-physical-models) — 大きい幾何波と微細normal波を別レイヤーに分ける。ゲームでは法線のスクロール/軽量化に応用。
4. [NVIDIA GPU Gems 2: Generic Refraction Simulation](https://developer.nvidia.com/gpugems/gpugems2/part-ii-shading-lighting-and-shadows/chapter-19-generic-refraction-simulation) — 正面での水底屈折は弱い2D UVずらし、強い歪みは避ける。屈折/反射のFresnel混合に関する参考。
5. [Unreal Engine Single Layer Water](https://dev.epicgames.com/documentation/en-us/unreal-engine/single-layer-water-shading-model-in-unreal-engine) — 水中吸収、散乱、反射、屈折を分ける（Blenderのノードと同一実装ではない）。
6. [Three.js WaterMesh](https://threejs.org/docs/pages/WaterMesh.html) / [Refractor](https://threejs.org/docs/pages/Refractor.html) — ブラウザ本実装の参考。現段階ではゲーム本体未統合。
7. [Blender Voronoi Texture - Distance to Edge](https://docs.blender.org/manual/en/5.3/render/shader_nodes/textures/voronoi.html) — 浅瀬の水底で光模様（疑似caustics）を作る画像ベースの候補。物理的に計算したカースティクスではない。

## V11を先に試す（A/B比較、いずれも独立候補）
- A：屈折を10〜12%以下、Roughnessほぼ0、法線による屈折BumpをV10より弱く。表面カラーのAlphaとFresnelは別ゲートで保存、河床写真のシャープさを維持。
- B：Aと同じ水面材質に、**水底側**だけに弱い疑似カースティクスを追加する。水面上に白線を描くのではなく、川底に光が落ちて見えるようにする。明るさは控えめ、低周波の自然な反射ムラは維持。
- C（必要時）：大きな波メッシュと細かい波Normalをさらに分離し、角度別反射率/水深色を独立調整。ゲームThree.js本実装時はUVスクロール2枚の小さな法線、Fresnel、浅瀬深さマスクを優先し、過剰な描画パスを避ける。
- 毎回正面・側面・斜めの実PNGと安全検査/manifestを確認。水面が見えるか、川底が読めるか、白線が均等か、岸の接触線があるか、材質にガラス/ゼラチン感がないかの5基準で判定。前版と違いを定性的に記録。未検証数値を「最適解」と断定しない。

## 安全と保存
- 外部Poly Haven川底画像は毎回 `safe_acquire.py` → freshclam → clamscan(exit 0/検出0) → SHA-256照合の既存ゲートを維持。
- 3方向画像、Blend、生成テクスチャ、scan_manifest、execution_report をActions Artifactに一時保存。素材を直接正式フォルダへ移動しない。
- 本書は設計・研究記録であってV11の合格報告ではない。V11のrun/画像を実際に取得してから状態を更新する。
