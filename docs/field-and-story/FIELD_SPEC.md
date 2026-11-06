# フィールド・エンカウント・ストーリー：共通インターフェース仕様

- 作成担当：Claude ／ 利用者：GPT（見た目・演出）、他AI
- 状態：**フェーズ1b実装済み（`feature/ai-claude-field-story`）。本書は実装に合わせて更新済み**。変更が必要になった場合は、Claude がこの文書を先に更新してから実装する。
- 目的：GPT が `field.js` の処理を読まなくても、**DOM構造・CSSクラス・イベント・データ形式**だけで見た目を作れるようにする。

---

## 1. ファイル構成（追加分）

| 順 | ファイル | 役割 | 担当 |
|---|---|---|---|
| data | `data/field-maps.js` | エリア定義（マップ文字列・オブジェクト・出現敵・BGM）と雑魚敵データ | Claude（数値）／GPT（触らない） |
| data | `data/story.js` | 会話シーン・話者定義 | Claude（初稿）／GPT（文章推敲のみ） |
| 本体 | `field.js` | 移動・当たり判定・カメラ・入力・エンカウント・会話・セーブ連携 | Claude |
| CSS | `css/06-field.css` | フィールド・会話・パッド・アナライズの見た目（`style.css` の直前で読み込む） | Claude（仮）→ GPT に引き継ぎ |

読み込み順：`data/*.js` → `battle-ext.js` → `script.js` → **`field.js`**（`script.js` の関数を使うため最後）。

`script.js` 側の変更は、`// [FIELD]` または `// [ANALYZE]` の目印を付けた短いフックに限定する。

## 2. 画面の DOM 構造

```html
<section id="field" class="screen field-screen" data-area="1" data-theme="forest">
  <div class="field-hud">
    <strong id="field-area-name">はじまりの樹海</strong>
    <span id="field-hint" class="field-hint">移動：矢印/WASD・パッド　調べる：Z/Enter・A</span>
    <button id="field-home-button" class="field-home-button" type="button">ホームへ</button>
  </div>
  <div id="field-viewport" class="field-viewport">
    <div id="field-map" class="field-map">               <!-- カメラは transform: translate() scale() -->
      <div class="field-tiles">
        <i class="field-tile tile-wall is-edge" style="left:…;top:…"></i> …   <!-- 1マス1要素 -->
      </div>
      <div class="field-object" data-kind="npc" data-object-id="woodcutter" data-key="npc:1:woodcutter"
           data-sprite="npc-woodcutter" style="left:…px; top:…px">
        <span class="field-object-sprite"></span><b class="field-object-label">木こりボルド</b>
      </div>
      <div id="field-player" class="field-player" data-dir="down" data-moving="false" data-step="0">
        <span class="field-player-shadow"></span><span class="field-player-sprite"></span>
      </div>
    </div>
    <div id="field-player-alert" class="field-player-alert" hidden>！</div>
    <div id="field-encounter-flash" class="field-encounter-flash" hidden></div>
    <div id="field-dialog" class="field-dialog" hidden role="dialog" aria-live="polite">   <!-- ビューポート内の下部 -->
      <div class="field-dialog-portrait"><img alt=""></div>
      <div class="field-dialog-body">
        <strong class="field-dialog-name"></strong>
        <p class="field-dialog-text"></p>
        <span class="field-dialog-next" aria-hidden="true">▼</span>
      </div>
      <div class="field-dialog-choices" hidden></div>     <!-- button[data-choice]、選択中は .is-selected -->
    </div>
  </div>
  <div id="field-pad" class="field-pad">
    <div class="field-dpad"><button data-dir="up">▲</button><button data-dir="left">◀</button>
      <button data-dir="right">▶</button><button data-dir="down">▼</button></div>   <!-- 押下中は .is-pressed -->
    <button id="field-action" class="field-action">A</button>                        <!-- 調べられる物の前で .is-ready -->
  </div>
</section>
```

### 2-1. CSS で使えるクラス・属性

| 対象 | クラス／属性 | 値 |
|---|---|---|
| 画面 | `#field[data-theme]` | `forest` `goblin` `mist` `lava` `castle` |
| 画面 | `#field[data-area]` | `1`〜`5` |
| 画面 | `#field.is-dialog` / `.is-encounter` | 会話中・エンカウント演出中 |
| タイル | `.tile-wall` `.tile-floor` `.tile-path` `.tile-grass` `.tile-water` `.tile-safe` `.tile-gate` `.tile-exit` | 地形。`wall` と `water` は通れない |
| オブジェクト | `.field-object[data-kind]` | `npc` `sign` `save` `chest` `gate` `exit` |
| オブジェクト | `[data-sprite]` | 見た目の識別子（例：`npc-elder` `npc-merchant` `statue`）。一覧は `data/field-maps.js` |
| オブジェクト | `.is-opened`（宝箱） `.is-near`（調べられる距離） | |
| 主人公 | `#field-player[data-dir]` | `up` `down` `left` `right` |
| 主人公 | `#field-player[data-moving]` | `true` / `false`（歩行アニメ切替用） |
| 主人公 | `#field-player[data-step]` | `0`〜`3`（歩行コマ。8フレームごとに進む） |
| 会話 | `.field-dialog.has-portrait` / `.is-narration` / `[data-speaker]` | 顔画像あり／地の文／話者ID |
| タイル | `.tile-wall.is-edge` | 下が通路の壁（手前に見える面を描く用） |
| CSS変数 | `--tile` | 1マスのピクセル数（既定 32px） |

マス目の大きさは `--tile` で決まる。見た目担当は `--tile` を変えてよいが、当たり判定は `field.js` 内の論理座標（1マス=32）で行うため、**表示倍率は `#field-map` の `scale` で変える**こと。

## 3. 演出用イベント（`field:*`）

戦闘の `battle:*`（`docs/battle-visual-refresh/EVENT_SPEC.md`）と同じ方式。`document` に `CustomEvent` を発火し、中身は `event.detail`。**通知のみで、処理は待たない。**

| イベント | タイミング | detail |
|---|---|---|
| `field:enter` | フィールド画面に入った直後（戦闘からの復帰も含む） | `area` `areaName` `theme` `x` `y` `returning`（戦闘から戻った時 true） |
| `field:leave` | フィールドを離れる直前 | `area` `reason`：`"encounter"` `"boss"` `"home"` |
| `field:step` | 1マス分歩いた | `area` `tileX` `tileY` `steps`（前回の戦闘からの歩数） |
| `field:encounter` | エンカウント確定（演出開始） | `area` `enemyId` `enemyName` `delay`（戦闘画面へ移るまでのms、既定 900） |
| `field:dialog:open` | 会話開始 | `sceneId` |
| `field:dialog:line` | 1行表示開始 | `sceneId` `index` `speakerId` `speakerName` `portrait` `text` |
| `field:dialog:close` | 会話終了 | `sceneId` |
| `field:save` | 導きの灯を使った | `area` `x` `y` |
| `field:chest` | 宝箱を開けた | `area` `objectId` `reward`：`{gold}` または `{item, count}` |
| `field:boss:gate` | ボスゲートに入った（会話の後、戦闘開始の直前） | `area` `stage` |

演出の長さは `field:encounter` の `delay` 内に収める。延長が必要な場合は Claude に `delay` 変更を依頼する。

## 4. データ形式

### 4-1. エリア（`data/field-maps.js`）

```js
const FIELD_AREAS = {
  1: {
    stage: 1,                       // ボス戦で使う従来のステージ番号
    name: "はじまりの樹海", theme: "forest",
    bgm: "assets/music/仕分け雨/蒼獣シーガー.mp3",   // 仮割り当て（ユーザー確認待ち）
    encounter: { min: 14, max: 26, table: [ { enemy: "field-slime", weight: 60 }, … ] },
    enterScene: "a1-enter",         // 初回入場時の会話（data/story.js）
    map: [ "########…", "#P..,,,…", … ],   // 1文字=1マス
    objects: { a: { kind:"npc", id:"woodcutter", name:"木こり", sprite:"npc-woodcutter", scene:"a1-woodcutter" }, … }
  }, …
};
const FIELD_ENEMIES = { "field-slime": { name:"はぐれスライム", hp:…, attack:…, ai:[…], image:"…", dropAs:"スライム" }, … };
```

| 文字 | 意味 | 通行 | エンカウント |
|---|---|---|---|
| `#` | 壁（木・岩・城壁。見た目はテーマで変える） | × | – |
| `.` | 地面 | ○ | あり |
| `,` | 道 | ○ | あり |
| `*` | 草むら | ○ | あり（出現率 1.5 倍） |
| `~` | 水・溶岩 | × | – |
| `_` | 安全地帯 | ○ | なし |
| `P` | 開始位置（安全地帯扱い） | ○ | なし |
| `E` | 出口（ホームへ戻る確認） | ○ | なし |
| `B` | ボスゲート（踏むとボス前会話→ボス戦） | ○ | なし |
| `S` | 導きの灯（セーブポイント） | × | – |
| `T` | 宝箱 | × | – |
| `?` | 看板 | × | – |
| `a`〜`z` | `objects` で定義する NPC など | × | – |

雑魚敵は既存の「敵バリエーション」と同じ `ai` 形式（`data/enemy-variants.js` 冒頭の説明参照）で動くため、`battle-ext.js` の処理をそのまま使う。

### 4-2. 会話シーン（`data/story.js`）

```js
const STORY_SPEAKERS = { narration:{ name:"" }, elder:{ name:"長老ゲン", portrait:null }, … };
const STORY_SCENES = {
  "a1-woodcutter": {
    once: false,                    // true：一度だけ（既読ならスキップ or repeat を表示）
    lines: [
      { who:"woodcutter", text:"…" },
      { who:"knight", text:"…", ifParty:true },   // 騎士が編成にいる時だけ表示
      { who:"kotama", text:"…" }
    ],
    repeat: [ { who:"woodcutter", text:"…" } ],   // 2回目以降（任意）
    setFlag: "met-woodcutter"       // 任意
  }
};
```

- `who` は `STORY_SPEAKERS` のキー、または味方キャラID（`kotama` `knight` `healer` `warrior` `mage` `samurai` …）。味方IDの場合、名前と顔画像は `characters` から取る。
- `ifParty:true` の行は、そのキャラが編成にいない時は飛ばす。
- 文章推敲（G6）では `text` だけを変える。シーンID・`who`・`setFlag`・`once` は変えない（セーブの既読記録と紐づくため）。

## 5. セーブデータ（追加項目）

`createSaveData()` に `field` を追加し、`saveVersion` を 10 にする。**項目が無い旧セーブは初期値で補う**。

```js
field: {
  area: 1, x: 64, y: 96,           // 最後にいた場所（論理座標）
  checkpoint: { area: 1, x: 64, y: 96 },   // 最後に使った導きの灯
  flags: { "a1-enter": true, "chest:1:3:5": true },   // 既読シーン・開けた宝箱
  fieldEnemyEncounters: { "はぐれスライム": 2 }        // 雑魚敵のアナライズ開示用
}
```

戦闘中セーブ（スロット）の `battle` には `encounterMode` と `fieldEnemyId` を追加し、雑魚戦のロードで「ステージクリア扱い」にならないようにする。

## 6. 敵アナライズ（C1）の DOM

```html
<div class="analyze-tabs">                                    <!-- .battle-arena の右端に縦並び -->
  <button id="analyze-enemy-button" data-analyze="enemy">敵</button>
  <button id="analyze-party-button" data-analyze="party">味方</button>
</div>
<section id="analyze-panel" class="analyze-panel" hidden role="dialog">
  <div class="analyze-panel-head"><button data-analyze-tab="enemy">敵</button><button data-analyze-tab="party">味方</button><button id="analyze-close">×</button></div>
  <div id="analyze-panel-body"></div>
</section>
```

- 敵タブ：従来の `#enemy-analysis` の内容（2回目の遭遇で能力値を開示するルールは維持）＋現在の状態変化。
- 味方タブ：各キャラのHP/SP、攻撃・防御・SP攻撃・SP防御・速さ（装備・状態込みの現在値）、状態異常と残りターン、ユニオンゲージ。
- 従来の `#enemy-analysis` 要素は残すが常時表示しない（ID互換のため削除しない）。
- パネルは読み取り専用。行動再生中も開いてよく、開いている間は戦闘画面の再描画のたびに内容が更新される。戦闘の進行・結果には影響しない。
