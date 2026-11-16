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
