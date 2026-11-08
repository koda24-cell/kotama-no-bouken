# 3D迷宮描画基盤

このディレクトリは、既存の迷宮ロジックから独立した3D表示レイヤーです。

## 現在のファイル

- `field-3d-grid-adapter.js`
  - `fieldArea()` が返す既存グリッドと `fieldState` を、3D描画向けの読み取り専用スナップショットへ変換するES module。
  - マップデータ・セーブ状態・FOE AI・衝突判定を変更しない。
  - 扉の開閉や仕掛けの状態は、既存関数をcallbackとして渡して反映する。
- `field-3d-world.js`
  - スナップショットから床と壁のInstancedMeshを生成する。
  - グリッドごとにMeshを大量生成せず、床・壁をまとめて描画する。
  - `dispose()` で生成Geometry/Materialを破棄する。

## Adapterの利用例

```js
import { buildField3DSnapshot } from "./field/3d/field-3d-grid-adapter.js";
import { buildField3DWorld } from "./field/3d/field-3d-world.js";

const area = fieldArea();
const snapshot = buildField3DSnapshot({
  area,
  fieldState,
  tilePixels: FIELD_TILE,
  // field.js の実関数。ラッパーを挟まず、そのまま渡せる。
  isSolidChar: fieldCharSolid,
  isDoorOpen: fieldDoorOpen,
  // field/field-puzzles.js の実関数。
  isPuzzleSolved: fieldPuzzleSolved,
  // 状態表示のみを返す。報酬付与・採集回数更新などの処理は呼ばない。
  getObjectState: object => ({
    presentationClass: fieldObjectStateClass(object),
    lootState: object.kind === "chest"
      ? (fieldState.flags[object.key] ? "opened" : "unopened")
      : object.kind === "cache"
        ? (fieldState.flags[`puzzle:${object.puzzle}:reward`] ? "opened" : "unopened")
        : object.kind === "gather" ? "tracked" : null
  })
});
const world = buildField3DWorld(THREE, snapshot);
scene.add(world.group);

// フロア切替・再構築時
world.dispose();
scene.remove(world.group);
```

上記の関数名・引数は、現在の development に存在する実装と照合済み。`fieldCharSolid(area, char)` は扉の開閉も含む通行判定、`fieldDoorOpen(object)` は扉状態、`fieldPuzzleSolved(id)` は仕掛け解決状態を返す。いずれも読み取り専用で利用する。なお、この例はAPI確認用であり、本編への接続を実施したものではない。


## GLB / glTF素材の読み込み口

`field-3d-asset-loader.js` は、将来制作する高品質なGLB素材を読み込むための任意モジュール。Three.js本体やGLTFLoaderの取得先を固定しないよう、呼び出し側から互換性のある `GLTFLoader` を注入する。

```js
import { loadField3DAssets } from "./field/3d/field-3d-asset-loader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const result = await loadField3DAssets({
  GLTFLoader,
  manifest: {
    ancientColumn: { url: "./assets/field-3d/ruins/column.glb", scale: 1 },
    mossCluster: { url: "./assets/field-3d/nature/moss.glb", scale: 0.8 }
  },
  onAssetError: ({ key, url, error }) => console.warn("3D asset unavailable", key, url, error)
});

const column = result.assets.ancientColumn?.clone();
if (column) scene.add(column);
```

- 読み込み失敗は個別に記録し、他の素材の読み込みを継続する。
- `clone()` は配置ごとの独立したObject3Dを返す。元の読み込みシーンは変更しない。
- GLTFLoaderは利用環境に合うものを呼び出し側で用意する。Three.jsのバージョン・CDN・ビルド方式をこのモジュールで固定しない。
- B1F初回素材として古代アーチ・崩れた石柱・壁面根・発光植物・シダ・苔の6モデルを登録済み。初回モデルは手続き生成メッシュで、外部テクスチャ・UV展開・LOD・アニメーションは未実装。最終品質版ではなく、実機表示と形状検品を行うための第1制作版。
- テクスチャ/ジオメトリの共有リソースを含むため、個別インスタンスの破棄時に共有material/geometryを不用意にdisposeしないこと。アセット全体の解放管理は本編統合時に設計する。

## スナップショット契約

- `area.grid`：既存マップの文字グリッド。幅・高さはarea.w/area.hを利用。
- `fieldState.x/y`：既存のピクセル座標。タイル幅は`tilePixels`で指定（現行FIELD_TILEは32）。
- `fieldState.foes`：既存FOE配列。tx/tyを優先し、未設定時はx/yから算出。
- `fieldState.explored[area.key]`：既存探索済み配列を読み取り専用コピーとして出力。
- `fieldState.visible`：既存可視範囲Setを配列化。
- `getObjectState`：既存の表示クラスやフラグから、3D側に必要な表示状態だけを渡す。報酬付与・採集回数の更新・イベント進行は呼び出さない。
- `concealed`：元データの `hidden` を表示上の属性として保持する。ゲーム上の発見条件を3D側で判定しない。
- 既存の`fieldCharSolid`を渡すことで、扉・壁付き仕掛けなどの判定を重複実装しない。

## 実マップ変換プレビュー

`prototypes/b1-grid-3d-adapter-test.html` は、実際の`FIELD_AREAS[1].floors[0].map`を読み込み、AdapterとWorld Builderを通して床・壁を3D表示する独立テストページ。

- 前進・後退・左右旋回
- 既存マップの壁・通路記号を利用した移動ブロック
- 実マップから生成した簡易ミニマップ
- 既存本編のfieldState・セーブ・イベントには接続しない
- B1Fのマップ文字・`FIELD_AREAS[1].objects`・`floors[0].foes` を参照して、オブジェクトとFOEの位置に仮形状を配置する。
- テストページ内で表示用のオブジェクト記述子を組み立てているため、本編の `fieldArea()` を直接呼び出す統合テストではない。ゲーム内イベント・FOE AI・発見状態の同期は未検証。

## 未実施の検証

この段階ではコードをGitHubへ追加した状態であり、iPhone Safari実機での表示・FPS・メモリ計測は未実施。ブラウザ上でプレビューを開き、動作確認する必要がある。本編の移動関数・FOE・オブジェクトイベントとの統合も未実施。


## スナップショット連動オブジェクト配置

`field-3d-object-layer.js` は `snapshot.objects` を読み、オブジェクトを3D空間へ配置する表示専用レイヤー。

```js
import { buildField3DObjectLayer } from "./field/3d/field-3d-object-layer.js";

const objectLayer = buildField3DObjectLayer(THREE, snapshot, {
  assets: loadedAssets.assets,
  // 必要に応じてmanifestのキー名に合わせて上書き
  assetKeys: { save: "saveLamp", gather: "harvestNode" },
  fallback: true
});
scene.add(objectLayer.group);

// フロア再構築時
objectLayer.dispose();
scene.remove(objectLayer.group);
```

- `snapshot.objects` の座標・種類・既存状態を使って配置する。ゲーム側の状態を変更しない。
- `hidden` がtrueのオブジェクトは初期設定で表示しない。発見条件そのものは既存ゲーム側のcallbackが決める。
- GLBが未登録・読み込み失敗の場合は種類別の簡易プレースホルダーを表示する。これは仮表示であり完成素材ではない。
- 扉が開いている場合の回転は見た目だけの表現。通行可否は既存ゲームの判定に従う。
- `placedKeys` と `skipped` で配置結果を確認できる。
- `dispose()` はこのレイヤーが生成したプレースホルダーのGeometry/Materialのみ破棄する。GLB由来の共有リソースは破棄しない。
- オブジェクトの高さ・向き・壁面配置は素材ごとに調整が必要。現在のfallbackは位置・種類確認用の箱形状。


## 床・壁の材質と面ごとの陰影

`field-3d-world.js` は、セルのterrainに応じて床色を切り替え、壁BoxGeometryの頂面・側面・下面に頂点カラーを設定する。InstancedMeshのセル単位の色変化と組み合わせ、面ごとの陰影を少ないMaterial数で表現する。

```js
const world = buildField3DWorld(THREE, snapshot, {
  palette: {
    floor: 0x59665a,
    path: 0x756c52,
    grass: 0x405d3d,
    safe: 0x777b62,
    wall: 0x39483f,
    hazard: 0x274d59
  },
  wallFaceShading: { top: 1.16, side: 0.82, underside: 0.68 },
  floorRoughness: 0.96,
  wallRoughness: 0.88
});
```

- 面ごとの色差は頂点カラーで表現し、壁ごとにMaterialを増やさない。
- セルごとの色変化は座標由来の固定値で、再読み込み後も同じ色になる。
- 現状は色・粗さによる仮材質。PBRテクスチャ、法線マップ、実素材の凹凸はGLB/テクスチャ制作後に追加する。


## 樹海の環境装飾レイヤー

`field-3d-decoration-layer.js` は、既存スナップショットの歩行可能セルを参照して苔・シダ・発光植物・壁際の根を配置する。配置は座標由来の決定的ハッシュで決めるため、同じマップなら再読み込み後も同じ配置になる。

```js
import { buildField3DDecorationLayer } from "./field/3d/field-3d-decoration-layer.js";

const decoration = buildField3DDecorationLayer(THREE, snapshot, {
  density: 1,
  maxPerKind: 420,
  includeRoots: true,
  rootDensity: 0.12,
  assets: loadedAssets.assets,
  assetKeys: {
    moss: "mossCluster",
    fern: "fern",
    glowPlant: "glowPlant",
    root: "wallRoot"
  }
});
scene.add(decoration.group);

// フロア再構築時
decoration.dispose();
scene.remove(decoration.group);
```

- 初期値では通路・安全地形・草地に地形別の密度で配置する。
- プレイヤー、FOE、操作オブジェクトと同じセルは装飾候補から除外する。
- 根は隣接する壁セルを検出した場合のみ壁際へ配置する。
- GLBが登録されていない場合はInstancedMeshの簡易形状で代用する。完成素材ではない。
- `density`、`maxPerKind`、`rules`で密度と上限を調整できる。iPhone実機で負荷を測定してから値を確定する。
- 本レイヤーは表示専用。装飾に衝突判定・採集判定・探索判定を持たせない。
- `dispose()` はこのレイヤーが生成したGeometry/Materialを破棄する。GLB由来の共有リソースは破棄しない。


## 遠景ランドマークレイヤー

`field-3d-landmark-layer.js` は、マップ制作者が明示した配置データだけを使って、大型の環境シルエットを配置する。通路の先に見せる古代アーチ、崩れた柱、巨大な石碑、垂れ下がる根、樹冠などを想定する。自動でマップやイベントを解釈・変更することはない。

```js
import { buildField3DLandmarkLayer } from "./field/3d/field-3d-landmark-layer.js";

const landmarks = buildField3DLandmarkLayer(THREE, [
  {
    id: "b1f-distant-arch-01",
    kind: "ancientArch",
    position: { x: 20, y: 0, z: -36 },
    rotation: { y: Math.PI }
  },
  {
    id: "b1f-monolith-01",
    kind: "monolith",
    position: { x: -12, y: 0, z: -24 },
    scale: 1.3
  }
], {
  assets: loadedAssets.assets,
  maxCount: 80
});
scene.add(landmarks.group);
```

- 配置座標はワールド座標。既存マップの通行セル・イベントセルと重ならない位置を制作者が指定する。
- GLBがあれば複製して使用し、未登録時は簡易形状を表示する。
- `maxCount` で配置上限を設定する。大量配置は避け、視線の先に少数のシルエットを置く。
- 生成した仮Geometry/Materialのみ破棄し、GLB由来の共有リソースには触れない。
- 表示専用であり、当たり判定・移動・探索・イベント進行には影響しない。


## 発光植物・菌類と壁面根の配置

環境装飾レイヤーは、既存の苔・シダ・発光植物に加えて、菌類（`fungus`）の表示候補を追加した。菌類は地形ごとの低確率で配置し、控えめな青紫色のEmissive表現を使う。manifestの`fungusA`が存在する場合はGLBを優先し、未配置時は簡易形状へフォールバックする。

壁面根は隣接する壁の方向を選び、通路中央から壁側へ寄せて配置する。根の上限も`maxPerKind`で制御する。いずれも描画専用で、通行判定・イベント・探索状態は変更しない。発光はマテリアルのEmissiveによる表現で、周囲を照らすPointLightは大量配置による負荷を避けるため追加していない。

## B1Fの照明・霧レイヤー

`field-3d-atmosphere.js` は、環境光・上方光・青緑の補助光・指数フォグ・控えめな疑似光芒をまとめて設定する。光芒はボリュームレンダリングではなく半透明メッシュによる軽量な演出で、実機で濃度を調整する前提。

```js
import { buildField3DAtmosphere } from "./field/3d/field-3d-atmosphere.js";

const atmosphere = buildField3DAtmosphere(THREE, scene, {
  fogDensity: 0.045,
  maxPixelRatio: 1.5
});
atmosphere.applyRendererQuality(renderer);
// 必要なら探索中に調整
atmosphere.setFogDensity(0.052);

// シーン終了時
atmosphere.dispose();
```

- 初期値はB1F向けの仮値。実際のカメラ距離・照明・GLB素材と合わせて調整する。
- 光芒は固定位置の演出用。プレイヤー位置やイベント状態を変更しない。
- iPhoneではpixel ratioを制限し、描画負荷と発熱を確認してから上限を決める。
- 本モジュールはRendererやSceneの生成・破棄を所有しない。fogはdispose時に解除する。


## B1F素材マニフェスト

`assets/field-3d/b1/manifest.json` にB1F向け素材キーと相対パスを登録している。初回6モデル（`ancientArchA` / `brokenColumnA` / `wallRootA` / `glowPlantA` / `fernA` / `mossClusterA`）は `enabled:true`。石壁・床・天井根・扉・菌類・宝箱・採集ポイント・セーブ灯など未制作素材は引き続き無効で、仮形状へフォールバックする。

```js
import manifest from "./assets/field-3d/b1/manifest.json";
import { loadField3DAssets } from "./field/3d/field-3d-asset-loader.js";

const loaded = await loadField3DAssets({
  GLTFLoader,
  manifest: manifest.assets,
  baseUrl: new URL("./assets/field-3d/b1/", import.meta.url).href,
  onProgress: ({ key, status, completed, total }) => {
    console.info("3D asset", key, status, completed + "/" + total);
  },
  onAssetError: ({ key, url, error }) => {
    console.warn("3D asset fallback:", key, url, error);
  }
});
```

- `baseUrl` を指定すると、manifest内の相対パスをその基準URLから解決する。
- `completed` は成功・失敗を問わず処理が完了した件数、`loaded` は読み込み成功数。
- GLBを追加したらmanifestのキー・パス・スケールを更新し、ライセンス情報も別途記録する。
- manifest登録済みでも最終完成を意味しない。初回6モデルはglTF 2.0の実ファイルだが、PBRテクスチャ、UV、LOD、実機検品は未完了。


## GLBのPBRマテリアル統一

`field-3d-materials.js` はGLB読込後のMeshStandard/Physical系マテリアルを、素材カテゴリ別の基準値へ整える補助関数。

```js
import { configureField3DMaterials } from "./field/3d/field-3d-materials.js";

const model = loaded.assets.stoneWallA.scene;
const report = configureField3DMaterials(THREE, model, {
  profile: "stone",
  renderer,
  overrides: { maxAnisotropy: 4 }
});
console.info(report.meshCount, report.materialCount, report.textureCount);
```

利用可能なプロファイルは `stone`、`dirt`、`moss`、`foliage`、`glow`、`metal`。Base ColorとEmissiveテクスチャはsRGB、Normal/ORM系はGLTFLoader標準のNon-Color設定を維持する。テクスチャの異方性はRendererの上限を超えないよう制限する。

この関数は素材を最適化・変換するものではなく、既存GLBのマテリアル値を調整する。元の素材を保管し、実機表示で過度な光沢・暗さ・発光にならないか確認すること。


## B1F実マップ向け配置プランナー

`field-3d-landmark-planner.js` は、`buildField3DSnapshot()` の結果から壁セルと隣接歩行セルを調べ、根・崩れた柱・古代アーチの候補を決定的に提案する。配置は壁セル側へ寄せ、プレイヤー・FOE・オブジェクトのセルを除外する。提案結果は表示用であり、マップデータに書き戻さない。

```js
import { planField3DLandmarks } from "./field/3d/field-3d-landmark-planner.js";
import { buildField3DLandmarkLayer } from "./field/3d/field-3d-landmark-layer.js";

const suggestions = planField3DLandmarks(snapshot, {
  maxCount: layout.landmarkLimit,
  seed: layout.landmarkSeed,
  ...layout.landmarkOptions
});
const landmarks = buildField3DLandmarkLayer(THREE, suggestions, {
  assets: loadedAssets.assets,
  maxCount: layout.landmarkLimit
});
scene.add(landmarks.group);
```

## B1Fフロア別ビジュアルプロファイル

`field-3d-b1-layout.js` は第1階層「はじまりの樹海」の1F〜3Fに、霧色・霧密度・装飾密度・ランドマーク上限・配置seed・植物色を割り当てる。

```js
import { getB1F3DLayoutFromSnapshot } from "./field/3d/field-3d-b1-layout.js";
import { planField3DLandmarks } from "./field/3d/field-3d-landmark-planner.js";

const layout = getB1F3DLayoutFromSnapshot(snapshot);
if (layout) {
  atmosphere.setFogDensity(layout.fogDensity);
  const placements = planField3DLandmarks(snapshot, {
    maxCount: layout.landmarkLimit,
    seed: layout.landmarkSeed,
    ...layout.landmarkOptions
  });
}
```

## 品質プリセット

`field-3d-quality-presets.js` は `high` / `balanced` / `mobile` の初期値を提供する。これらは実測済み性能値ではない。iPhone Safariを含む実機測定前の保守的な出発点として扱い、GPU・発熱・フレーム時間を測定して調整する。

```js
import { resolveField3DQualityPreset, applyField3DQualityPreset } from "./field/3d/field-3d-quality-presets.js";

const quality = resolveField3DQualityPreset({
  profile: "mobile",
  devicePixelRatio: window.devicePixelRatio,
  maxTextureSize: renderer.capabilities.maxTextureSize
});
applyField3DQualityPreset(renderer, quality);
```

プランナーは壁セルの隣接関係を使うヒューリスティックであり、手作業による演出配置の代替ではない。採用前に各フロアのプレビューで視界・通行幅・重なりを確認し、必要なら候補を個別に除外・調整する。


## 3フロア一括ビジュアル確認ページ

`prototypes/b1-three-floor-showcase.html` をブラウザで開くと、B1Fの実データ `FIELD_AREAS[1].floors[0..2]` を切り替えて表示できる。各フロアのマップからテスト用オブジェクト・FOEマーカーを組み立て、次の表示モジュールをまとめて確認する。

- グリッド壁・床の3D化
- フロア別の霧・照明プロファイル
- 決定的な環境装飾
- マップ形状由来のランドマーク候補
- モバイル向け品質プリセット
- ミニマップ、タッチ操作、キーボード操作

このページは独立した展示・確認用であり、実ゲームの `fieldArea()`、移動・衝突、扉・仕掛け、FOE AI、探索可視範囲、セーブとは接続していない。オブジェクトやFOEの形状も仮マーカーで、正式なGLBモデルではない。Three.js CDNへのアクセスが必要。

### 確認チェックリスト

1. 1F・2F・3Fを切り替え、各マップの壁・床・出口・階段の位置がデータと一致するか。
2. 旋回・前進・後退で壁を通り抜けないか。オブジェクトマーカーと装飾が通路中央を塞いで見えないか。
3. ランドマークが壁面に沿って配置され、通路・階段・広場の視界を不自然に遮らないか。
4. iPhone Safariで画面回転、タッチボタン、描画負荷、発熱を確認する。
5. 問題があればフロア別プロファイルまたは候補配置を調整し、ゲーム本編への統合は別途レビュー後に行う。

配置プランナーはマップ全体から候補を選ぶため、フロアごとの演出密度は `landmarkLimit` で制御する。候補位置は壁面から通路側へ壁厚相当以上離しており、候補選択は座標seedで分散させる。最終的な見栄えはブラウザでの目視確認が必要。


## GLB素材を展示ページへ接続

`prototypes/b1-three-floor-showcase.html` は、B1F manifestを読み込み、GLTFLoaderでGLBを取得してPBR材質設定を適用する。現在のキー対応は以下。

- 環境装飾：`mossClusterA` / `fernA` / `glowPlantA` / `wallRootA`
- 大型ランドマーク：`brokenColumnA` / `ancientArchA` / `wallRootA`
- オブジェクト：`chestA` / `saveLampA` / `gatherA`

未配置・未制作のGLBは読み込みエラーとして記録し、該当箇所は既存の仮形状へフォールバックする。manifestに登録した15個のGLBファイル自体は、まだリポジトリに追加されていないため、現状の初回表示は仮素材中心となる。GLBの実制作・追加後に同じ展示ページで反映を確認できる。

## スナップショットQA

`field-3d-qa.js` の `inspectField3DSnapshot(snapshot)` は、描画前に以下の構造を読み取り専用で検査する。

- セル数と座標重複・マップ範囲
- プレイヤー開始位置の存在と壁セル侵入
- オブジェクトとFOEの座標範囲
- FOEが壁セル上に配置されている場合の警告

展示ページのステータス欄にQA結果を表示する。これはデータ構造の検査であり、実ゲームの移動・扉・仕掛け・セーブ・FOE AIのテストを代替しない。


## GLBマニフェスト・読み込みQA

`field-3d-asset-qa.js` は、素材の取得前後にマニフェストと読み込み結果を読み取り専用で検査する。

```js
import {
  inspectField3DManifest,
  inspectField3DAssetLoad
} from "./field/3d/field-3d-asset-qa.js";

const manifestReport = inspectField3DManifest(manifest);
const loadResult = await loadField3DAssets({ GLTFLoader, manifest: manifest.assets, baseUrl });
const loadReport = inspectField3DAssetLoad(manifestReport, loadResult);
console.table(loadReport.issues);
```

- キー、相対URL、GLB拡張子、カテゴリ、required指定、正のscale、LOD値を検査する。
- `required:true` の素材が読み込み失敗した場合は `requiredMissing` に反映する。
- optional素材の失敗も記録するが、ゲーム全体を停止する理由にはしない。
- この検査はファイルの実在・GLB内部構造・テクスチャ品質までは検証しない。実ロード結果と別途の目視確認が必要。
- 展示ページのステータス欄にマニフェスト/ロードQAを追加した。現在のmanifestは全件optionalで実GLB未配置のため、未配置はエラーではなく確認項目として表示される。

## GLB共有リソースの解放

`field-3d-asset-disposal.js` は、ロード結果が所有する元シーンのGeometry・Material・Textureを重複なく解放する。

```js
import { disposeField3DAssets } from "./field/3d/field-3d-asset-disposal.js";

// 先に、ロード結果から作った全cloneをシーンから取り除いておく。
const report = disposeField3DAssets(loadResult);
console.info(report);
```

**重要：** cloneが表示中、または別シーンで共有リソースを使用中に呼び出してはいけない。フロア切替時に個別cloneを破棄する用途ではなく、展示/ゲーム全体を終了し、共有アセットを使う全cloneを除去した後の一括解放用。呼び出し側が所有権と寿命を管理する。


## ORMパックマップ（B1Fブロックアウト）

手続き生成テクスチャは、従来の個別Roughness画像に加えてglTF標準のORMチャンネル配置を持つ1枚のテクスチャを生成する。

- R：Occlusion（現状は白=遮蔽なし）
- G：Roughness（石・土の表面粗さ）
- B：Metalness（現状は0=非金属）

同じORMテクスチャを `roughnessMap` と `metalnessMap` へ共有設定し、Three.jsの各マテリアルが対応チャンネルを参照する。AOはUV2がある素材だけ有効化し、UV2がない素材では無理に適用しない。現段階の石・土は非金属素材を想定しているため、Metalnessは0で生成する。

これはPBRチャンネルの接続確認用であり、完成素材のAOベイクや金属表現を作成したものではない。最終GLBでは素材ごとのORM値とUV/UV2を制作・検品する。

## Procedural PBRテクスチャ（B1Fブロックアウト）

`field-3d-procedural-textures.js` はブラウザ内Canvasで、石材・土のタイル可能なColor / Normal / Roughnessテクスチャを生成する。外部画像やGLBが未配置でも、単色ブロックより表面の凹凸・湿った質感を確認できる。

```js
import { createField3DProceduralTextures } from "./field-3d-procedural-textures.js";
import { buildField3DWorld } from "./field-3d-world.js";

const pbr = createField3DProceduralTextures(THREE, { resolution: 256, seed: 1701 });
const world = buildField3DWorld(THREE, snapshot, { proceduralTextures: pbr });
scene.add(world.group);
// world.dispose() の後、すべての利用を終えてから
pbr.dispose();
```

- 生成サイズは64〜512pxに制限し、展示ページでは256pxを使用。
- 石床/壁には石材、草地/通常床には土のPBRセットを割り当てる。
- 同じテクスチャを全InstancedMeshで共有する。ワールドのdisposeは共有テクスチャを破棄せず、生成セット側のdisposeで一度だけ解放する。
- テクスチャはブロックアウト用の手続き生成であり、完成アートの代替ではない。実際の高品質素材ではアーティスト制作のBase Color / Normal / ORMへ置き換える。
- iPhone実機でのCanvas生成時間・GPU負荷は未計測。端末負荷が高い場合は解像度128pxまたはPBR生成を無効にして比較する。


## 既存フィールド処理との接続ブリッジ

`field-3d-runtime-bridge.js` は、一人称3D表示から既存の迷宮処理を呼び出す薄い接続層。移動・旋回・調べる操作の入口をまとめる。

```js
import { createField3DRuntimeBridge } from "./field/3d/field-3d-runtime-bridge.js";

const bridge = createField3DRuntimeBridge({
  getArea: () => fieldArea(),
  getFieldState: () => fieldState,
  getTilePixels: () => FIELD_TILE,
  isInputBlocked: () => fieldModalOpen(),
  tryStep: (area, dir, now) => fieldTryStep(area, dir, now),
  action: () => fieldActionPressed(),
  snapshotOptions: {
    isSolidChar: fieldCharSolid,
    isDoorOpen: fieldDoorOpen,
    isPuzzleSolved: fieldPuzzleSolved,
    getObjectState: object => ({
      presentationClass: fieldObjectStateClass(object),
      lootState: object.kind === "chest"
        ? (fieldState.flags[object.key] ? "opened" : "unopened")
        : null
    })
  }
});

// 3Dの入力から既存ロジックを呼び出す
bridge.moveForward();
bridge.moveBackward();
bridge.turnLeft();
bridge.turnRight();
bridge.interact();

// 描画ループから毎フレーム取得する（状態を変更しない）
const snapshot = bridge.getSnapshot();
const playerPose = bridge.getPlayerPose();
```

- `moveForward/moveBackward/move` は既存の `fieldTryStep(area, dir, now)` に委譲する。壁・扉の通行判定、1歩1ターン、FOE移動・接触、階段・出口・ゲート、歩数・エンカウントの処理を3D側へ複製しない。
- `interact` は既存の `fieldActionPressed()` に委譲する。宝箱・採集・NPC・扉・仕掛けのイベント処理は既存コードが担当する。
- 旋回は既存 `fieldState.dir` のみを90度変更し、歩数・FOEターンを進めない。向きの角度は3Dカメラ座標系（上=0、右=-π/2、下=π、左=π/2）に合わせる。
- `getPlayerPose()` は既存の `fieldState.view` があれば補間中の表示座標を読み、なければ論理座標を読む。位置やセーブデータは書き換えない。
- `snapshotOptions` には既存の読み取り専用関数を渡す。特に `fieldCharSolid` を省略すると、文字グリッドの既定判定にフォールバックするため、本編接続時は実関数を渡す。
- このブリッジは本編HTMLへの読み込み登録やThree.jsレンダラーの組み込みまでは行わない。既存の2D画面を残したまま3D画面を切り替える統合UIは次工程。
- `prototypes/b1-3d-runtime-bridge-test.html` は移動委譲・旋回・向き・ロック・調べる操作を確認する独立テスト。ブラウザで開いて全項目PASSを確認する。これは本編統合テストや実機性能テストの代替ではない。


## 本編の2D / 3D切り替え

本編では `index.html` から `field/3d/field-3d-screen.js` を module として読み込みます。
既存 `field.js` は `window.__kotamaField3D` に読み取り用アクセサーを公開し、3D画面はそれを使ってスナップショットとプレイヤー姿勢を取得します。

- 既定表示は従来の2D探索です。3Dはユーザーが切り替えた場合だけ初期化します。
- 3D移動は `fieldTryStep(area, dir, now)`、調べる操作は `fieldActionPressed()` に委譲します。
- 3D表示中は2Dキーボード移動を停止し、既存の移動パッドも隠します。
- 戦闘、会話、マップ、メニューなど既存の入力ロック中は3D操作も受け付けません。
- 3D初期化に失敗した場合は2D表示へ戻せます。
- 現段階の3D表示はグリッド地形・壁・霧・照明による接続確認版です。GLB素材、装飾レイヤー、FOEやオブジェクトの3D表現、探索済み領域の視界反映は次段階です。

## 本編3D表示への環境レイヤー接続（2026-11-08）

`field/3d/field-3d-screen.js` は次の表示専用レイヤーを統合します。

- `createField3DProceduralTextures`: 石材・土のカラー、ノーマル、ラフネスマップをCanvasから生成
- `buildField3DDecorationLayer`: 苔、シダ、発光植物、菌類、壁際の根を決定的に配置
- `buildField3DObjectLayer`: 既存マップの扉、宝箱、採集地点、階段等を表示（GLB未配置時は仮形状）
- `planField3DLandmarks` + `buildField3DLandmarkLayer`: 壁際の崩れた柱、アーチ、根のシルエットを配置

全レイヤーへ探索済みセルだけを渡します。マップ未探索範囲の装飾・オブジェクトが先に見えることを避けます。装飾は決定的な座標ハッシュで配置するため、同じマップ状態なら再構築後も配置が安定します。

現時点のmanifestは将来のGLB配置先を定義したものです。実GLBファイルはまだリポジトリに存在しないため、現段階の本編表示ではプロシージャルテクスチャと仮形状を使います。高品質な専用GLB素材への置き換えは別工程です。

注意：ブラウザ実行・iPhone実機・GPU負荷・全マップでの表示は未検証です。

## 本編3Dの品質プリセット

本編の `field-3d-screen.js` は起動時に表示幅・タッチ入力・端末メモリ情報を参照し、描画品質を選択します。

- タッチ端末または幅768px以下：mobile。ピクセル比上限1、プロシージャルテクスチャ128px、装飾密度とランドマーク数を抑制。
- それ以外：high。ピクセル比上限1.75、テクスチャ256px、装飾・ランドマーク上限を拡大。
- `prefers-reduced-motion` は品質設定に渡します。現時点では移動アニメーション自体の変更には未使用です。
- これは実機計測済みの保証値ではなく、初期負荷を抑えるためのプリセットです。iPhone実機でFPS・発熱・メモリを確認して調整します。


## 本編でのGLBロード接続

本編の `field-3d-screen.js` は、3Dモードへ初めて入ったときにB1F manifestを読み、`enabled:true` の素材だけを非同期ロードします。ロード完了後に表示レイヤーを再構築し、対応するassetKeyが存在する配置はGLBへ差し替えます。読み込み失敗・キー未登録は従来の仮形状へフォールバックします。

- manifestの全素材は初期状態で `enabled:false`。GLBファイル未制作の段階で15件の404リクエストが発生しないようにしています。
- GLBファイルを追加した素材だけmanifestの `enabled:true` に変更してください。
- 現在の接続キー：`mossClusterA`、`fernA`、`glowPlantA`、`fungusA`、`wallRootA`、`ancientDoorA`、`chestA`、`gatherA`、`saveLampA`、`ancientArchA`、`brokenColumnA`。
- GLTFLoaderはThree.jsと同じ `0.180.0` のCDNから遅延読込します。manifestに有効素材がない場合はGLTFLoader自体を読み込みません。
- GLBの共有Geometry/Material/Textureは配置レイヤーの破棄時には解放せず、3D画面終了時に全配置を取り除いた後で一括解放します。
- 現時点で実GLBファイルは未配置のため、本編は仮形状で表示されます。実ファイルを追加した後にブラウザでロード・描画を検証してください。

## 距離別LOD（B1F）

`field-3d-lod.js` はThree.jsの `LOD` を使う表示専用の距離切替基盤。カメラ距離に応じてモデルを切り替え、マップ・当たり判定・FOE・探索状態・セーブには触れない。

### 現行距離

| 用途 | LOD0（高精細） | LOD1（中精細） | LOD2（低精細） |
|---|---:|---:|---:|
| PCの大型ランドマーク | 0〜18 | 18〜36 | 36以上 |
| iPhoneの大型ランドマーク | 0〜12 | 12〜26 | 26以上 |
| 小物（将来の標準値） | 0〜12 | 12〜26 | 26以上 |

切替境界には8%のヒステリシスを設定し、境界付近で表示が頻繁に往復する現象を抑える。距離はThree.jsのワールド単位。

### 現在の動作

- 専用LODモデルが未登録の大型ランドマークは、仮形状をLOD0/1/2で生成。遠距離ほど円柱・多面体の分割数を減らす。
- GLBのLOD0しかない場合は、品質を落とす切替を行わず、そのGLBを維持する。
- LOD0/1/2のGLBが揃った場合は、manifest上のキー `<assetKey>`、`<assetKey>_lod1`、`<assetKey>_lod2` を使って自動的に切り替えられる。
- LOD0がない不完全なLODチェーンは採用しない。
- LODの各段階で生成したGeometry/Materialは、ランドマークレイヤーのdispose時に解放する。ロード済みGLBの共有リソースはアセット管理側の所有とし、レイヤーから解放しない。

### 高品質モデル制作時の目安

- LOD0：近距離用。シルエット・欠け・苔・根の形状を優先。
- LOD1：中距離用。小さな凹凸や裏面の不要な面を整理し、LOD0の約40〜60%程度のポリゴン数を目安にする。
- LOD2：遠距離用。大きな輪郭と色面を維持し、LOD0の約10〜25%程度を目安にする。
- 3段階で原点、向き、外形寸法、マテリアルの色味を揃える。切替時に位置・サイズが跳ねないことを優先する。
- これは制作目標値であり、現時点で実GLBのLODモデルが完成したことを意味しない。

現時点では大型ランドマークの仮形状でLOD切替経路を用意した段階。専用GLBのLOD1/LOD2制作、iPhone Safariでの視覚的な切替・FPS・発熱確認は未完了。
