# 第2層水・第6層草原 シェーダー実描画QA (2026-11-18)

## 証跡の範囲
- [Actions run 44202793238](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44202793238): 簡易水・簡易草の **PC/モバイル Chromium Playwright WebGL表示成功**。独立の生成シーンで実PNG6枚とrenderer.info記録。端末実機FPSではない。
- [Actions run 44202963142](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44202963142): 第2層の実GLB `assets/3d/dungeons/b2_water_source/models/floor2-water-source-quality-v3.glb` を比較ビューで読み込み、`Clear blue water` 素材の差替え候補を認識し、既存/水V2の比較PNG取得。GLBは元データを無変更。**適用後に水が白くなりすぎた**ため未採用。修正候補は水面法線とUV欠落時の補完。
- [Actions run 44203548111](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44203548111): 既存の第6層V7成果物（元run 43602069517 / artifact 14117056247）を一時取得し、実GLBの草4メッシュ＋下草4メッシュにCPU生成した windWeight/plantPhase を追加してWebGL表示。風ON/OFFでPNGを保存、43,072 triangles / 9 draw calls（**独立ビューのrenderer.info**、ゲーム総負荷ではない）。原本GLB/PNGを正式フォルダへ昇格させていない。**比較ビューの照明が明るすぎて草が白っぽい**ので照明・露出修正中。

## 実装済み / 未実装
| 機能 | 実装されたこと | QA |
| --- | --- | --- |
| 共通波状風 | GLSLで世界座標の風波・移動する突風・葉先小揺れ | 実GLBの試作表示成功。ただし暗部・色・影/法線・揺れの美観はまだ未承認 |
| V7草GLBアダプター | V7の実頂点配置に合わせて根から葉先の高さ属性を生成（草24頂点/本、下草16頂点/枚） | V7だけを対象に件数・トポロジーを検証。一般の草モデルやLODへ流用しない |
| 水面V2 | 独立ShaderMaterial、Flow field、速度/泡マスク、Caustics模様の事前生成 | 実GLBで白飛び問題を観測。水底に投影する真のCausticsや深度色ではない |
| 既存GLB比較 | オリジナルと水マテリアル差替えのON/OFF独立ビュー | 222 draw calls / 16,765 tris（比較ビュー）。正式なゲームFPSではない |
| 水タイル接続ルール | 16マスクに対しN=8/E=2/S=1/W=4の辺一致をNode回帰テスト | **数学上の接続のみ**。実タイル形状の水/陸断面・ランダムマップは未試験 |
| 品質プリセット | low/medium/highとヒステリシス数式 | 純粋関数試験PASS。シェーダー品質モードのモバイルFPSは未測定 |

## 今回の発見と次の修正指示
1. **水**: 実GLBは曲面/垂直板であるため、法線を世界上向きに固定したFresnelは不自然。ジオメトリ法線を使用。UV欠落時の平面UVは比較専用に生成。今後は岸形状のFoam Mask/水深に応じた色と屈折へ進める。
2. **草**: V7のBlender元レンダリングでは黄緑が正常なのにPlaywrightビューはほぼ白。ビューの露出/光源強度を低下させ比較。必要なら glTF COLOR_0 とマテリアルの直交確認を行う。白さが直る前にユーザーに美術合格を求めない。
3. **滝**: 現在は水V2の材質色プリセットだけ。実際の落下曲面/泡・水しぶき・滝壺は未制作。単純な水平板を「滝完成」と報告しない。
4. **性能**: 比較ビューのrenderer.info calls/trianglesはCPU側構造指標でありモバイル実機のFPS/GPU msを証明しない。
5. **ゲーム連携**: `development` のゲーム描画、通行、FOE、セーブ、草原V7元形状を変更しない。試作PR #500 のまま未承認とする。

## 継続先
- [PR #500](https://github.com/koda24-cell/kotama-no-bouken/pull/500) のブラウザシェーダーテストと実GLB表示レビュー。
- [PR #499](https://github.com/koda24-cell/kotama-no-bouken/pull/499) は水の美術/導入研究の原資料。
- Blender実GLB/正面・側面・斜めPNG/manifest保存、ゲーム内導入は承認・品質検証の別工程。
