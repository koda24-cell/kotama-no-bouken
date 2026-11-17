# 水・植生の共通シェーダー試作と導入状況 (2026-11-18)

## 追加した再利用部品
- `tools/3d-water/water-surface.mjs`: Three.js ShaderMaterial製の試作用湖/水路/滝パレット。2周波の波、簡易Fresnel、UV端の泡マスク、時間更新と品質切替を含む。現時点では**模擬表現**。真の動的反射、深度による水色・泡、屈折、流向場、Caustics、滝用の曲面メッシュ・飛沫は**未実装**。
- `tools/3d-water/water-quality.mjs`: 低/中/高プリセットの純粋関数と、画面投影サイズにヒステリシスを設けた切替判定。端末実測に基づく閾値ではない。
- `tools/floor6/meadow-wind-field.mjs`: 波状風・移動する突風・葉先フラッターの数式とGLSL断片。root height=0固定で動的風場を計算。V7 GLBへの属性割当/ゲーム実装は未実施。
- `tools/3d-water/preview.html`: Three.js WebGLの**独立ブラウザプレビュー**。実際の第2層/第6層モデルではなく小さな手続き生成の水面と草を使用。水3種、品質3段階、風のON/OFFに対応。実ブラウザのWebGL描画成功・見た目・FPSは未検証。

## テスト
- `node tools/floor6/meadow-wind-field.test.mjs`
- `node tools/3d-water/water-surface.test.mjs`
- 2026-11-18: Node 22で両テストPASSを確認（根の固定、風の連続性、時間変化、風の剛性、画質切替判定）。shaderのGPUコンパイル・端末ごとの性能を保証するテストではない。

## プレビューの開き方
リポジトリのルートをHTTPサーバー経由で公開して `/tools/3d-water/preview.html` にアクセスする。例: `python -m http.server 8000` の後 `http://localhost:8000/tools/3d-water/preview.html`。ネット接続があるブラウザでCDN版Three.jsを利用する。GitHubのファイル表示画面は実行可能なプレビューではない。ゲーム本体には接続しない。

## 既存の研究計画との対応
- 水: [PR #499](https://github.com/koda24-cell/kotama-no-bouken/pull/499) `docs/3d/B2_ADVANCED_WATER_RENDERING_ROADMAP.md` の W01/W02/W05/W08の一部を**比較用の近似素材**として開始。W01の正式なNormal Map/Flow Mapや岸の交差泡は今後。
- 草: このPRの `docs/3d/F6_MEADOW_WIND_VISUAL_RESEARCH_20261118.md` に対応。根元固定と共通風向場の試作のみ。
- 既存 `field/field-3d-b2-water.js`、水タイル16種、V7草原GLBと本番マテリアルは無変更。
- 本番への進行条件: 既存GLB・マテリアルの属性/UV確認、ベースライン取得、PC/スマホで同視点比較、実WebGLレンダリング、FPS・Draw Call・GPU時間記録、ユーザー承認を必要とする。
- 外部コードやゲームアセットを複製していない独自試作であり、第三者素材のライセンス状態を保証するものではない。

## 次の安全な実装
1. プレビューでWebGLコンパイルとGLSLエラーを確認・修正。静的3視点と動画フレームを比較。
2. V7 GLBに葉根元→先端の`windWeight`属性を持たせ、worldPositionで風場を評価。root/tip、各タイルの境界と影・深度パスを検証する。
3. water surfaceで**本物の**ノーマルマップ、Flow Map・depth-aware foam、水底Causticsを一項目ずつ追加する。
4. 第2層水面・第6層草原に限定してopt-inゲーム統合を試し、現行表示に戻せるフラグを維持。
5. UIと衝突/セーブ/マップを変えない。結果の品質が承認されるまで `development` / `main` に既存素材の置換をしない。
