# 一層後半「鎮守の根庭」 GLB/PNG受け渡し

基準development: `ae7995ae9ab7c36a547c6dbd7a5d601d3fc4bea5`。
制作PR: https://github.com/koda24-cell/kotama-no-bouken/pull/391 。
候補の保存先: `assets/3d/dungeons/b1_sacred_forest_candidates/`。
承認状態: pending_user_review。ゲーム本体への適用は未実施。

## 最初に確認するもの

1. `manifest.json`と`ASSET_LIST.md`で実GLB・寸法・原点・容量・source/hashを確認。
2. `renders/scene/`と個別4方向画像で造形を確認。
3. `verification/`でKhronos形式検査、Three.js読込と床接続、MCP再読込の実結果を確認。
4. `preview/f1-sacred-forest.html`からGLBをGLTFLoaderで直接読み、描画・原点・材質を確認。

Claudeへの受け渡しはGLB/PNG/manifestです。Blenderの直接操作や再レンダを
Claudeへ要求せず、造形修正があればGPT/Blender担当へ返します。

## 最終候補の規模と検証範囲

個別17アセット、GLB合計21,305,008 bytes / 136,665 triangles、単体4方向PNG計68枚。
全景は349配置（背景支持面1件を含む）です。Khronos検査は個別17点＋全景1点の
計18 GLBでerrors 0 / warnings 0。Three.js r180 GLTFLoaderの実読込、床2×2接続、
公式MCP経由の全景再読込も確認しています。実施時点と対象hashは各検証JSONを正とします。

全景の確認用ブラウザ計測は4,432,376 triangles / 1,475 draw callsです。
SwiftShaderでの提出時間を実機FPSへ換算しません。ゲーム未統合の静的素材であり、
距離カリング・共有インスタンス・密度調整と、実機での性能評価が統合時に必要です。
風・草の接触・扉開閉のアニメーション、ゲームイベント、粒子VFXは含みません。

全景撮影はentry / courtyard / corridor / shrine_detail / birdseyeの5視点を対象とし、
Cycles CPU・1600×1000px・48 samplesで行います。個々の完成状態とhashは
`scene/assembly-layout.json`の`renders`、画像自体、manifestを突き合わせてください。

## 空間の狙い

同じ低天井廊下の飾り替えに留めず、根の参道→鳥居→空の見える中庭→小祠→
地下封印回廊の断面変化を作ります。第3階層の遺跡都市や第5階層の深淵神殿と
区別し、小さな祭祀の跡を森が取り戻した場所として扱います。

主空間のデモと実ゲーム用配置は区別してください。デモは24×32mの主要部と
視覚用の外周を持ちます。外周はdressing_onlyで、歩行領域の拡張ではありません。

## 既存一層3Fへの接続

`tools/f1-sacred-forest/build_game_layout.cjs`は既存の`fieldArea(1,2)`をVMで読み、
map/固定object identity/FOEを保持した候補を生成します。

```sh
node tools/f1-sacred-forest/build_game_layout.cjs --require-assets
```

生成JSONの`scope`、検査結果、unsafeとして省略した装飾を確認してください。
配置は候補であり、既存描画runtimeはこのJSONをまだ参照していません。
通行判定は既存field系が正で、GLBから別の通行ルールを新設しません。

承認後の統合作業では、1F前半を維持し、後半の対象zoneだけ新素材へ切替えます。
開放zoneでは全セルへ天井を置く既存規則に例外を設け、回廊zoneは4m天井を残します。
NPC・宝箱・採集・スイッチ・扉・階段・ボス門のentries/sync契約は保持してください。
固定ID、探索bit配列、map寸法、セーブ構造を変えません。

## 材質と描画

- メートル、+Y上/+Z正面、4mセル/目高1.6m。原点例外はmanifest参照。
- PBR色・OpenGL法線・粗さ/ORMは埋込。追加decoderは不要。頂点カラーなし。
- 古杉は標準alphaMASKの両面針葉カード。alphaCutoffを保ち、BLENDへ変更しない。
- 石/木/苔の細かい差は暗い露出で潰れ得る。Three.js ACES、露出、環境光、
  実機の画面輝度を含めて確認。既存の一層を一律に再調色しない。
- 大量配置では同じgeometry/materialを共有し、距離カリングと品質設定で密度を調整。
  単体サイズ合格と全景フレームレート合格を混同しない。

## 回帰と承認

承認後に独立統合PRを作り、同じ位置の前半画像・移動/旋回・採集・宝箱・扉・
FOE・階段・戦闘復帰・セーブ再開・他階層からの帰還を検証します。
今回のbaselineゲームテストは部分実行で、全回帰完走を主張していません。
既存の`b1_ancient_forest/`を上書き・改名・削除しません。
mainへはユーザーの明示承認なしにマージしません。

## 第2改訂の受け渡し（現行）

改訂PR #428。デモ5視点は1600×1000/48samplesを完了し、各画像のscene blend SHA/source commit/cameraを照合済み。`verification/delivery-summary.json`が現行です。デモ263配置/4,480,724tri/1,012calls、元17GLBと68個別画像は不変です。

実3F候補は274床（石187/soil-only87）、178壁、129props（杉25）、177非歩行支持床。`floorRenderProfiles`とrequiredCapabilities全4件を実装し、SHA/node/materialの不一致や非対応を拒否してください。soilだけを選び祖先変換を保持し、fullGLBへ暗黙fallbackしません。`dressingGroundPlacements`を歩行マスへ変換しません。旧vault ceiling17枚は各行のSHAでpinした既存素材です。

`preview/f1-game-layout-candidate.html`と`docs/reviews/f1-sacred-forest-game-layout/`が独立GLTFLoaderでの実証です。全域3,911,334tri/概算2,092材質drawはコスト資料であり実機FPSではありません。水/固定object7点/FOEは独立ビューで描画していません。地形起伏・遠景の針葉LOD・一部背景の抜けは残るため、美術承認を技術検査の合格から推測しないでください。

### 開発ブランチ更新への対応

2026-11-17にdevelopment `7708b03` と比較し、map・field・移動/FOE・操作・保存・puzzleの6 sourceは一致。共有rendererには描画統計とB2 cache版の変更があるため、7 source全一致とは扱わない。`verification/development-baseline-check.json`を参照。統合時は最新development側の変更を保持し、確認した完全commit SHAを `F1_LAYOUT_BASELINE=<40桁SHA> node tools/f1-sacred-forest/build_game_layout.cjs --require-assets` に指定して再生成・ブラウザ検証する。指定したbaselineと実sourceが違えば生成を拒否する。デフォルトの保存済み候補は元baseline ae7995aのまま。

近景reviewは元walkセル中心/目高1.6m。祠の正面2壁は既存collapsed wallを縦0.32の低い囲いとし、178壁/通行不可は維持する。`preview/f1-foliage-coverage.js`は独立viewerの任意sampling補助で、source alphaCutoffを保持してmip coverageを補正する。採用する場合はGPUでのmip upload・テーマ破棄時のtexture lifetimeを対象環境で検証する。既にゲームへ導入したとは扱わない。
