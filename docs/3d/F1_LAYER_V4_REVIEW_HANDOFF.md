# 第一層 V4 — 逐次制作・改修レビュー

対象 PR: https://github.com/koda24-cell/kotama-no-bouken/pull/728 。前版V3と全原本を保持。今回の指示どおり、複数agentの同時制作は使っていない。候補素材の正式な美術承認は未取得。

## 個別モデル1: 接続用の両面アーチ

- 共通Blender5.3+ClamAV実行: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/45147327732 。入力/出力スキャン後、書出GLBを再importして正面・背面・側面・斜め・上面の5画像を生成。`assets/3d/dungeons/b1_layer_v4_candidates/` に原本GLB/Blend/PNG/receiptを永続保存。
- 初版の側面に重なった石の黒い面が出たため不採用。石の体積をBoolean EXACT UNIONで結合し、再レンダリング5方向を目視。初版失敗画像も保存した。
- 最終GLB SHA256: `0a2bbcf4b0b470f3b615e771dfdc2034a8bc68fc5224cd8d44c0cdf5eaaa3dca`。11784 triangles、4 primitives、2673540 bytes。Khronos形式検査: errors/warnings/infos/hints全0。
- 共通性能監査: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/45149374790 成功。高品質原本を保ち、自動decimationは行っていない。実機FPS合格の意味ではない。
- 共有ゲートウェイではBlenderのPython例外がexit0になる場合があった。タスクwrapperでtraceback保存・非0終了・GLB/5PNG存在検査を追加。run45144416128のgreenだけを制作成功と解釈しない。

## 実マップと配置

`data/field-maps.js` の一層3Fを改修。106歩行セルがすべて接続、11行き止まり、11分岐。固定7オブジェクトのID/座標/内容、11水セルを保持。FOE patrolは全辺が隣接する往復経路へ変更。1F/2Fの地形・固定データは元developmentと一致。

`tools/f1-layer-v4/build_layout.cjs` はこの実マップから床・壁・天井を再コンパイルする。古い中庭のハードコード配置や旧クリアランス合格主張は流用しない。鳥居→接続アーチ→祠を枝道の終端へ集約。水場に水没した石壁・アーチを追加。壁体と接続したアーチ8箇所、廊下角の支持柱、端の植生を使用。

`geometry-clearance.json`: 元GLBを完全な親子変換で読み、硬い757配置と幅1.8m/Y=.12..2.1mの106移動帯を保守的な三角形AABBで照合、衝突0。苔・柔らかい草・紙は明示的に除外。この検査は全身3m高の物理保証ではない。

`roof-ray-coverage.json`: 歩行106床×9点=954本、945本hit、9本は歩行路にある指定採光穴。全3開口の中心は天井に遮られていない。全屋根の連続面や全カメラの美術保証ではない。

## 水・光・階層間の連続性

- 水はV3を保持した別module。単一256px planar reflectionを11水面で共有し、world座標の低振幅normalとFresnelで合成。移動時2frame/静止時6frame間隔、画面外は更新しない。水底/沈石/岸の藻を保持。所有target/material/textureをdisposeし、native materialを復元する。
- 3局所開口: 見える空の小円、depth-tested光の筋、下向きSpotLight。水場のみ512px shadow map。通常レンダラーのshadow設定はdisposeで復元。
- 1F/2Fは元の表示を保持し、試験フラグ時のみ追加の苔・低木・柱・両面アーチを段階的に追加。元の固定物や通行を置換しない。
- 試遊wrapperは1F/2F/3F選択付き。通常Storageをメモリー内へ隔離し、通常セーブを読まず書かない。

## 実ゲームと資源解放の受入結果

- 石材詳細追加後のfresh3条件がpass: 移動、壁、宝箱80Gを一度だけ取得、1F/2Fの地形・固定物保持と段階装飾、フラグなしの従来表示、故意のSHA不一致で従来表示へのfallback。page/console errors0、WebGL/shader警告0。`docs/reviews/f1-v4-game/verification.json`。
- 別fresh条件で実階段2F↔3F、NPC/看板、回復灯の全回復・checkpoint、通常戦闘開始とretreat帰還がpass。`supplementary-verification.json`。
- 水/光の独立WebGL検査でmaterial/geometry復元、2回dispose、GL error0、shader警告0、native rendererのshadow設定復元を確認。GPU memoryのgeometry1/texture0が破棄後もbaselineと一致。`docs/reviews/f1-v4-water/water-verification.json`。全ゲームのあらゆるGPU資源・実機FPS保証とは区別する。
- 1F石材詳細38%・2F68%。元の石の形/UVを保持し、既存の石だけに共通の微細normal/roughnessと石肌を追加。1Fは苔36/低層植生13/柱4/アーチ1、2Fは苔96/低層植生34/柱14/アーチ3。prototype材を直接変更せず、clone材は破棄時に復元/解放。
- 初回8画像は `initial-pass/` に保存。旧水カメラ画像03は改修後の壁、アーチ画像05はアーチ直下で、対象表面の証明には使わない。修正位置を09/10で撮り直した。初回の天井coverageメタ値1は実ray検査を受けて105/106へ修正。観測結果や失敗を隠さない。
- 高品質原本を保持。新アーチは衝突に関わる通路形状でもあるため、汎用decimationで開口を変えない。16mバケットのinstancing/cullingを使用。汎用Auto Review workflowはstartup_failureで、そこからのLOD生成を成功扱いしない。

通常セーブから隔離したwrapperも実ブラウザーでpass。CDPで通常保存領域に置いたsentinelは不変、iframeはそれを読まず独立したメモリー保存を使用し、1F選択と表示中statusを確認。`wrapper-verification.json` と画面11。最初の検査は「メモリーにも保存がないはず」という誤ったnull条件で失敗し、試遊内の保存を許容して外部保存領域の不変を検査する条件へ修正した。製品コードをこの誤判定に合わせて変更していない。実機FPS、長期進行、最終美術承認とmain公開は未実施。
