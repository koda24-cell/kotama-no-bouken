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
