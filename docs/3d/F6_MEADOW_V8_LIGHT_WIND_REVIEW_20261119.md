# 第6層 草原 V8：V7非破壊の光・風アップグレード（2026-11-19）

## 作業境界
- **正式承認済み V7 を上書きしない。** 元GLBは [run 43602069517](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43602069517) の `f6-meadow-floor-v1` artifact を一時取得して表示。
- 第6層のゲーム本体、既存草原の頂点位置、COLOR_0、原点、衝突、マップ、セーブ、他階層は変更しない。
- このV8は **Three.jsでの実GLB表示用シェーダー・照明試作**。Blenderで新しい造形を生成したわけではない。元GLBの恒久保存・ゲーム組み込み・美術承認は別作業。
- 実装は [PR #500](https://github.com/koda24-cell/kotama-no-bouken/pull/500) の未マージV7風アダプターの上に積む独立ブランチ。親PRの水面機能には手を加えない。

## 2026-11-19 実GLBの原因調査
- 元V7 Artifactの `f6_meadow_floor_v1.glb` (3,150,828 bytes) をダウンロードしてGLB JSONチャンクを解析。
- 草4＋下草4マテリアルすべてに `emissiveFactor: [1,1,1]` が存在。各草メッシュの `COLOR_0` は存在し、頂点カラーが欠落しているわけではない。
- 強い白色Emissiveは、前回のWebGL表示での白っぽさに寄与した可能性が高い。照明だけを原因と断定しない。
- V8はV7アダプターで複製した**レビュー用マテリアルだけ**Emissiveをゼロに設定し、原GLB・Blender・原マテリアルを保持。WebGLで色/陰影を再確認するまでは合格判定しない。

## 実装
1. `tools/floor6/meadow-v8-enhancement.mjs` — 既存8草メッシュのV7 vertex COLOR_0を保持したまま、根元の陰影、葉先の柔らかな色補正、草束単位の色ばらつき、世界座標の低周波色変化、控えめな疑似逆光を追加。マテリアルはV7アダプターで複製済みのものだけを変更。
2. `tools/floor6/meadow-v8-preview.html` — 露出0.65・環境光0.38・主光源0.65で白飛びを抑える比較環境。陰影ON/OFF、波状風ON/OFF、風強度、3×3タイル、露出を切り替える。各タイルの風はワールド座標に依存。
3. `tools/floor6/meadow-v8-visual-smoke.mjs` — 実V7 GLBをPlaywright/Chromium WebGLで描画し、旧陰影との同照明比較1枚、V8の4方向、3×3風時刻2枚の合計7PNG、JSONメトリクスを出力。
4. `.github/workflows/f6-meadow-v8-review.yml` — Node構文/シェーダー注入単体試験、V7元Artifact取得、実WebGL撮影、14日間の未承認Artifact出力。

## 見た目の合格条件
- 根元に暗部が残り、葉先は黄緑を維持。白飛び・ゼラチン状・一面単色の緑を避ける。
- 正面/側面/斜め/上からの見た目を比較し、V7造形を崩さない。
- 3×3タイル境界で風の波が繋がり、根元が浮かない。風の時刻を変えると葉先の姿勢が変化。
- 実GLBのGLTFLoader読み込み、GLSLコンパイル、ブラウザconsole errorなし、前後画像差分とGPU側の描画統計を検証。
- PC実機/スマホ実機のFPS、実ゲーム視点の総負荷、影・法線の風変形追従は未検証。これらが未確認なら完成としない。

## 次の改善候補
- 現在の葉形状（V7）はそのまま。実PNGで根元/葉先/密度を評価後、**別GLB候補**として葉断面・葉先の曲率・葉束の高さ分布をBlenderで造形して比較。
- 地面テクスチャと草色の統一、実ゲームの照明条件での比較、風による法線・影パス追従、草原LOD、同じ風場を白百合・成木へ共有。
- 3×3はレビュー専用の複製。ゲームへ9倍の草を常時描画する仕様ではない。

## QA証跡
- V8ワークフロー: https://github.com/koda24-cell/kotama-no-bouken/actions/workflows/f6-meadow-v8-review.yml
- 最初の実行: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44443487229
- **実行成功・PNGの美術的評価は実際の成果物を確認してから追記する。** 現時点の記録はコードと実行入口の作成であり、品質合格を意味しない。
- 承認状態: `NOT_APPROVED`。本番素材の昇格禁止。

## 初回実描画の目視評価とV8修正
- [run 44443816457](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44443816457) は **success**。実V7 GLB読み込み、GLSL、Nodeテスト、4方向PNGと3×3風時刻2枚、計7PNGを取得。
- 1タイル **9 draw calls / 43,072 triangles**、3×3 **81 draw calls / 387,648 triangles**（SwiftShader独立プレビューのみ）。画像SHAは変化し、風時刻差分があることを確認。
- **目視では初回V8は暗すぎて不合格。** 白い自己発光をゼロにしただけでは、V7のBlenderレンダリングにあった色の明るさが失われた。形状も均一に同じ方向へ傾き、ゼルダの草原品質には未到達。
- 修正案: 白いEmissiveを復活させず、`COLOR_0` に比例する間接拡散光の補助（0.30）をシェーダーに追加。環境光0.38→0.65、太陽0.65→0.85、露出0.65→0.85。新しいWebGL画像を再評価する。根元が黒く潰れないこと、葉先が白飛びしないことを確認。
- 現時点では **NOT_APPROVED**。新しい修正版の実描画成功/美術品質は別途確認。

## V8光量修正版の実描画結果（2026-11-19）
- [run 44444152185](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44444152185): **completed/success**。GLB読み込み、GLSLコンパイル、単体試験、実WebGL7PNG、Artifact `14492228152` を確認。
- 同一照明のBefore/Afterを実画像で比較。初回の黒潰れは大幅に改善し、根元が濃緑、葉先が黄緑として見えるようになった。白いEmissive復活なし。
- ただし草の方向が揃いすぎ、葉束のシルエットも平坦。BotW相当の草原品質とは判断しない。造形は別の [V9追加曲面葉候補 PR #533](https://github.com/koda24-cell/kotama-no-bouken/pull/533) で独立検証中。
- 3×3では 81 calls / 387,648 triangles。これはレビュー専用で本番最適化ではない。草原の繋がり、実ゲームFPS、影の整合、端末負荷は未合格。
- 状態: **技術QA成功 / 見た目は改善途中 / NOT_APPROVED**。
