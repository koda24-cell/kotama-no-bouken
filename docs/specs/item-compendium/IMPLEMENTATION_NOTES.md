# アイテム図鑑 実装メモ

- 担当：Claude C（Issue #40）
- 基準：`development`（`bd6e8e8`）
- ブランチ：`feature/ai-claude-item-compendium`

## 1. 対象データと件数（54件）

すべて `data/items.js` の定義を実行時に参照しています。データの複製はありません。新しいアイテムを足せば、図鑑にも自動で載ります。

| 分類 | 件数 | 元データ | 備考 |
|---|---|---|---|
| 武器 | 17 | `shopItems`（category: weapon）＋ `EXT_NEW_ITEMS` | 製作武器は「製作レシピ」に載せ、ここでは重複させない |
| 防具 | 3 | `shopItems`（category: armor。盾を含む） | |
| アクセサリー | 14 | `shopItems`（category: accessory）＋ `accessoryItems` | |
| 消耗品 | 3 | `shopItems`（category: healing） | |
| 素材 | 9 | `materialNames` | 使い道（製作・武器強化）と採取場所を表示 |
| 製作レシピ | 8 | `recipes` | 完成品の性能、必要素材、ゴールド費用、強化素材 |

- `script.js` は起動時に、`accessoryItems`・`EXT_NEW_ITEMS`・製作武器（`craftedOnly`）を `shopItems` に合流させています。図鑑はこれらを ID で重複除外し、`craftedOnly` の項目は製作レシピとして1回だけ表示します。
- 武器強化の素材は `enhancementMaterials` を参照します（`EXT_ENH_MATERIALS` も起動時に合流済み）。現在の強化値 `weaponLevels` も表示します。

## 2. 表示内容

- 共通：名前、状態（未解放／未入手／所持中・入手済み）、入手方法・解放条件
- 装備品：説明、効果、価格（0G 以外）、装備できる職業、強化素材、装備中のキャラ、所持数
- 消耗品：説明、効果、価格、所持数
- 素材：使い道（製作レシピ・武器強化）、採取場所（`FIELD_AREAS` の採取ポイントから求める）、所持数
- 製作レシピ：完成品の性能、必要素材と個数、費用、装備できる職業、強化素材
- 画面上部の分類タブ（すべて／武器／防具／アクセサリー／消耗品／素材／製作レシピ）で絞り込めます。
- スマホ幅 390px では1列表示になり、横スクロールは出ません。

## 3. 状態の判定

| 状態 | 条件 |
|---|---|
| 所持中 | `inventory[id] > 0`、誰かが装備している、または `materials[id] > 0` |
| 入手済み | 今は持っていないが、入手記録 `itemRecords[id]` がある |
| 未解放 | ショップ品で `unlock` が `state.maxUnlockedStage` より大きい。またはチュートリアル限定品・特別な報酬で、まだ入手していない |
| 未入手 | 上のどれにも当てはまらない（解放済みで未入手） |

- **図鑑を開いただけでは入手済みにしません**。確認済み：開く前も後も `itemRecords` は空のまま。
- 入手方法を `data/items.js` から読み取れないものだけ、`item-compendium.js` の `ITEM_SOURCE_NOTES` に表示用の補足を置いています（混沌の護符・混沌の結晶＝隠しボスの初回討伐報酬）。

## 4. セーブ・互換性

- 図鑑の入手記録 `itemRecords` は、新しいセーブ項目として追加する設計です。`saveVersion` は変えません。
- **このPRでは `script.js` を編集していないため、セーブ・ロードへの接続はまだありません**（第5節のフック1・2）。
  - そのため現状では、入手記録は常に空です。表示は「今持っているもの＝所持中」だけで判定します。
  - 起動時に所持品から記録を作ることもしていません。作ってしまうと、別のスロットをロードしたときに前のスロットの記録が残るためです。
- フックが入ったら、`itemCompendiumDeserialize(d)` が保存済みの記録を読み込み、旧セーブ（項目なし）では今の所持品・装備・素材から記録を補完します（「所持品から復元」）。
- 既存の所持品・素材・ショップ・製作処理は変更していません。

## 5. 必要な連携フック（GPT と調整）

`script.js`・`field.js` は他の担当と競合するため、このPRでは編集していません。下の位置に1行ずつ入れれば、入手記録が完成します。3〜9 も 1・2 と同じく `if(typeof itemCompendiumRecord==="function")…` の形で囲めば、`item-compendium.js` がない場合も動きます。

| # | ファイル・箇所 | 追加する内容 | 目的 |
|---|---|---|---|
| 1 | `script.js` `createSaveData()` | `itemRecords:(typeof itemCompendiumSerialize==="function"?itemCompendiumSerialize():undefined),` | 記録の保存 |
| 2 | `script.js` ロード処理（`inventory`・`materials`・`equipment` の読み込みの後） | `if(typeof itemCompendiumDeserialize==="function")itemCompendiumDeserialize(d);` | 記録の読み込みと、旧セーブでの補完 |
| 3 | `script.js` `buyItem()` の購入成功時 | `itemCompendiumRecord(id,"buy")` | 購入 |
| 4 | `script.js` `craftRecipe()` の製作成功時 | `itemCompendiumRecord(r.id,"craft")` | 製作 |
| 5 | `script.js` `awardMaterials()` の素材を加算する行 | `itemCompendiumRecord(id,"drop")` | 敵のドロップ |
| 6 | `script.js` 隠しボスの初回報酬（`acc-chaos-charm`・`chaos_crystal` の加算） | `itemCompendiumRecord(...,"reward")` | 特別な報酬 |
| 7 | `script.js` チュートリアルで勇者の剣を渡す処理 | `itemCompendiumRecord("hero-sword","tutorial")` | チュートリアル |
| 8 | `field.js` 採取（Claude B の担当） | `itemCompendiumRecord(mat,"gather")` | 採取 |
| 9 | `field.js` 宝箱のアイテム（Claude B の担当） | `itemCompendiumRecord(item,"chest")` | 宝箱 |
| 10（任意） | `script.js` `awardMaterials()` 内のローカルなドロップ表 | 関数の外の定数に出す（例：`const MATERIAL_DROP_TABLE={...}`） | 素材がどの敵から落ちるかを、図鑑に表示できるようにするため。現状は関数内のローカル定数で参照できないので、「ほか敵のドロップ」とだけ表示している |

## 6. ソース上の整合チェック

`itemCompendiumValidate()`（画面には出さない、開発時の確認用）を、実行時に合流した後のデータで実行しました。**問題は0件です。**

- 図鑑の全54件で ID の重複なし（アイテム・素材・レシピの間も含む）
- 全レシピの必要素材が `materialNames` に存在する
- `enhancementMaterials` の全武器 ID がアイテムまたはレシピに存在し、全素材が `materialNames` に存在する
- 全アイテム・レシピの装備職業 ID が、`characters` または `EXT_NEW_JOBS` に存在する

## 7. 調査中に気づいた既存の挙動（このPRでは修正していない）

- **混沌の護符（`acc-chaos-charm`）が、最初からショップで 0G で買える。** `price:0` で `unlock` がなく、ショップ側に除外条件もないため、アクセサリーの棚に表示されて購入ボタンも押せます（ヘッドレスブラウザで確認済み）。本来は隠しボスの初回討伐報酬のようです。図鑑では「隠しボスの報酬」として扱い、入手するまでは未解放と表示しています。直すかどうかはユーザーの判断です（例：`data/items.js` に `rewardOnly:true` を付け、ショップで除外する）。

## 8. 変更ファイル

| ファイル | 内容 |
|---|---|
| `item-compendium.js`（新規） | 対象一覧、状態判定、記録・セーブ用の API、描画、整合チェック、メニューとの接続 |
| `css/08-item-compendium.css`（新規） | 図鑑のスタイル（戦闘中はメニューのボタンを隠す） |
| `index.html` | メニューに「アイテム図鑑」を追加、画面 `#item-compendium`、CSS と JS の読み込み（`?v=20261106-20`） |
| `docs/specs/item-compendium/IMPLEMENTATION_NOTES.md`（新規） | このメモ |

`data/items.js`・`script.js`・`field.js`・`data/field-maps.js`・`level.js`・`monster-compendium.js` は編集していません。

## 9. 確認したこと

指示どおり、網羅的な検証はしていません。ヘッドレス Chromium で最低限の確認だけ行いました。
- JS エラーなし
- 全6分類・54件が一覧になる
- 分類タブが動く
- 所持中・未入手・未解放が区別される
- 開いても記録が増えない
- BACK でホームに戻る
- 390px で崩れない

**未確認**：実機、フック追加後の記録・セーブの流れ、ほかのPR（PR #36 のモンスター図鑑など）とのマージ後の表示。
