# 一層V5 改修レビュー・受け渡し

制作PR: https://github.com/koda24-cell/kotama-no-bouken/pull/733 。rootが単独・逐次で対応。既存17候補/V3/V4のGLBと元ゲームのモデルを保持し、新しいGLBの一括生成・並行agent・汎用decimationは使っていない。候補の正式な美術承認とmain公開は行わない。

## 修正

- 白い光源CircleGeometryを作らず、局所的な10sampleの柔らかい光の筋と独自の葉影cookieを追加。時間で筋・照射位置がゆっくり流れる。開口の全方向補助灯は撤去し、石の光井戸の内壁が白い円盤に見える過露出も修正。下向きSpotLight3灯、shadow mapは水場だけ1枚。
- 1F〜3Fに上部の石帯と連続した屋根の背面を設置。3Fの意図した開口3か所は、中心を開けた石張りの光井戸で接続。背景が天井と壁の隙間から見えないようにする。16mごとにまとめ、所有するgeometry/material/textureを破棄する。
- 3Fは106→191歩行セル、11→31分岐。旧106位置をすべて保持し、未使用だった領域へ通路/周回路を追加。固定7物・11水セル・FOE巡回と1F/2Fの地形/固定データを保持。
- 岩65、下草205、草花43、シダ30、垂れ蔓98、倒木8などを組として配置。8つの見所を手設計し、岩を地面へ沈め、壁際の蔓を中段まで下ろす。既存の葉のalpha cutoffや近景形状は維持。
- 通行不可の5つのNPC/箱/灯/看板まで壁として描いていた不具合を修正。通行は変えず、物の床と周囲の空間を見せる。元の報酬/会話/状態同期は維持。

## 確認済み証跡

- `docs/reviews/f1-v5/map-qa.json`: 191全歩行が接続、31分岐/11行き止まり、元7物と1F/2Fデータ不変、旧V4の106歩行位置は全保持。
- `geometry-clearance.json`: 実GLBの硬い配置対、幅1.8m/Y=.12..2.1mの181移動帯。衝突0。柔らかい草/紙は明示除外、全身高さ3mの物理保証ではない。
- `native-object-sightlines.json`: 実際の壁GLB三角形と接近方向の線分交差。旧2/7から修正後7/7物に遮られない接近方向あり。前版の遮蔽結果も保存。
- `roof-ray-coverage.json`: 196床（歩行191+物の床5）×9点=1764ray、1755hit。残り9点は意図した歩行路開口。旧GLB屋根だけの検査と新しい閉鎖helperの検査を区別する。
- `docs/reviews/f1-v5-game/verification.json`: 最終入力のfresh3条件。描画・移動/壁・80Gを一回だけ取得・1F/2Fの追加装飾・試験なし/不正SHA時の従来表示へのfallback、page/console errors0。ソースSHAの実行前後一致。
- `docs/reviews/f1-v5-water/water-verification.json`: 水を固定して光だけ時間を進めた画像差分あり。閉鎖helperの実三角形5方向rayがhit、開口中心は非hitで周囲はhit。2回dispose後のGPU geometry1/texture0はbaselineと一致、native材/影設定復元、GL error/警告0。全GPUや実機FPSの保証ではない。

## 画像と失敗履歴

最終の `12-v5-aperture-no-emitter.png`、`13-v5-nature-corridor.png` を確認。1F/2Fの継ぎ目の画像は `iteration-02/07...` と `08...`、物が見える画像は `iteration-04/14...`。それぞれの入力版は対応JSONへ保存。iteration-01は単体の岩を見て途中停止、iteration-03は実行中に美術を修正したため入力不変guardが失敗、iteration-04は技術検査passでも内壁の過露出を不採用として補助灯を撤去。未完了や失敗を完成として扱わない。

Drei SpotLightのMITとthree-good-godrays READMEを調査したが、React/postprocessing依存やライセンス未確定のコード/画像は導入しない。既存Three.js r180と独自のshader/葉影を使用。資料はSHARED_TOOLING_CATALOGのV5項目。外部画像のtexture転用やPinterest保存/投稿はしていない。

階段/会話/回復/戦闘帰還とwrapperの最終検査を別receiptへ追加する。実機FPS、長期進行、最終美術レビュー、main公開は未実施。
