# tools/b1-3d：B1F「深淵に眠る樹海」3D素材の生成・検証ツール

B1F 用の GLB 素材を、プログラムで一括生成・再出力するための道具です。Blender ではなく **three.js（r180）をヘッドレス Chrome 上で動かして**形状とテクスチャを作り、`GLTFExporter` で GLB に書き出します。

- 出力先：`assets/3d/dungeons/b1_ancient_forest/`（`props/`、`modules/`、`scene/`、`renders/`）
- ゲーム本体のコード（`index.html`・`script.js`・`field/` など）は読み込みも変更もしません。

## Blender ではない理由

作業環境に Blender が無く、ネットワーク制限のため入れることもできませんでした。そのため、GPT の `tools/blender/generate_b1_assets.py` は実行できていません。

出力は標準の glTF 2.0 Binary なので Blender 4.x でも読み込める形式です。ただし Blender での表示は**未確認**です。

## 必要なもの

- Node.js 18 以上
- Google Chrome（ヘッドレスで使います）
- `playwright-core`
  - 既定のパスは `/opt/node-tools/node_modules/playwright-core`
  - 別の場所にある場合は環境変数 `PLAYWRIGHT` で指定します。
- three.js r180 の `build/` と `examples/jsm/`
  - リポジトリには含めていません。
  - 置き場所は環境変数 `THREE_DIR` で指定します（既定は `/tmp/three`）。

three.js は次のように取得します。

```bash
git clone --depth 1 --branch r180 --filter=blob:none --sparse https://github.com/mrdoob/three.js /tmp/three
cd /tmp/three && git sparse-checkout set build examples/jsm
```

## 使い方（リポジトリのルートで）

全素材を生成します。`assets/.../build-records.json` も更新されます。

```bash
THREE_DIR=/tmp/three node tools/b1-3d/build.js
```

一部だけ作り直す場合は、素材 ID をカンマ区切りで渡します。

```bash
THREE_DIR=/tmp/three node tools/b1-3d/build.js ancient_giant_tree,mod_wall_4m
```

GLB の構造を検査し、`manifest.json` と `ASSET_LIST.md` を作ります。

```bash
node tools/b1-3d/manifest.js
```

検証用シーンの配置 JSON を作ります。

```bash
node tools/b1-3d/scene/make_layout.js
```

実際の GLB を描画して画像にします。1点ずつでも、まとめてでも撮れます。

```bash
node tools/b1-3d/rshot.js out.jpg "f=/assets/3d/dungeons/b1_ancient_forest/props/ruin_archway.glb&w=960&h=720"
node tools/b1-3d/rshot.js out.jpg "cam=hall_to_tree&w=1600&h=900" scene.html
```

- `render.html` は素材1点の確認用の描画です。調整できるのは方位 `az`、仰角 `el`、拡大 `zoom`、霧 `fog`、光のにじみ `bloom` です。
- `scene.html` は検証用シーンのビューアです。
  - `cam` で `corridor_eye`・`hall_to_tree`・`hall_to_stairs`・`overview`・`plan` を切り替えます。
  - `orbit=1` を付けるとマウスで操作できます。

## 構成

| ファイル | 役割 |
|---|---|
| `lib/noise.js` | 種から決まる乱数。継ぎ目のない周期ノイズ（テクスチャ用）と3Dノイズ（形状用） |
| `lib/tex.js` | 手続き型 PBR テクスチャ。色・法線・ORM（R＝遮蔽、G＝粗さ、B＝金属）と、一部の発光。素材の定義表 `MATERIAL_DEFS` もここ |
| `lib/geo.js` | 形状の部品（岩・面取り石材・管＝根や幹・回転体・葉・結晶・鎖）。素材ごとに1メッシュへまとめる `build()` |
| `lib/kit.js` | 組み合わせ部品（苔の被覆・石積み壁・地を這う根・垂れ蔓・キノコ・結晶群・炎） |
| `assets/*.js` | 素材の定義。`nature`・`ruins`・`props` は GPT 試作40点の作り直し、`modules` は Claude 新規 |
| `build.html` / `build.js` | 生成と GLB の書き出し |
| `manifest.js` | GLB の検査、マニフェストと一覧の作成 |
| `render.html` / `scene.html` / `rshot.js` | 確認用の描画 |
| `scene/make_layout.js` | 検証用シーンの配置 |

## 素材を足すとき

`assets/*.js` にエントリを1つ足します。

```js
my_asset: {
  dir: 'props',
  cat: 'ruins',
  origin: 'Claude 新規',
  tex: 512,
  pivot: 'bottom-center',
  name: '名前',
  desc: '説明',
  build(P) { /* P.add(形状, '素材キー') */ },
}
```

- `pivot` は次の3つから選びます。
  - 省略：底面の中央
  - `'ground'`：XZ だけ中央に寄せる（地面に埋まった形のため）
  - `'as-built'`：組み立てた座標のまま
- 発光する場所には `P.light(位置, 色, 強さ, 距離)` を書きます。シーンで点光源として使われ、GLB の `extras.b1.lights` に記録されます。

## 既知の制約

- Khronos 公式の glTF-Validator はこの環境に無く、使っていません。代わりに `manifest.js` で次を検査しています。
  - GLB ヘッダ
  - チャンク
  - アクセサの範囲
  - 法線と UV の有無
  - 座標の min/max
- 描画は Chrome のソフトウェア描画（SwiftShader）で行っています。iPhone の実機での表示や負荷は未確認です。
