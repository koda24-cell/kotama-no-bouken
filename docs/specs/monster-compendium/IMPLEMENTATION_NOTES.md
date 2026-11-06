# モンスター図鑑（全敵対応）実装メモ

- 担当：Claude C（Issue #30）
- 仕様：`docs/ai-tasks/CLAUDE_C_COMPENDIUM_IMPLEMENTATION.md`（ブランチ `docs/claude-development-specs`）
- 基準：`development`（`bd6e8e8`）
- ブランチ：`feature/ai-claude-compendium-all-enemies`

## 1. 図鑑の対象（27種）

ID は「種類の接頭辞＋既存データのID」です。表示名ではなく ID を主キーにしているため、同じ名前の敵や、亜種と元のボスを取り違えません。

| 分類 | ID | 対象 | 参照するデータ |
|---|---|---|---|
| ステージボス（5） | `boss-1`〜`boss-5` | スライム／ゴブリン／オオカミ／ドラゴン／魔王 | `data/enemies.js` の `enemyData` |
| 隠しボス（1） | `hidden-boss` | 混沌の幻影 | `data/enemies.js` の `hiddenBossData`（今回追加） |
| 迷宮の通常敵（10） | `field:<ID>` | はぐれスライム、キノコもどき、森ゴブリン、ゴブリンの斥候、霧コウモリ、森オオカミ、火トカゲ、溶岩ゴーレム、魔王軍の騎士、さまよう亡霊 | `data/field-maps.js` の `FIELD_ENEMIES`（`foe` なし） |
| FOE（5） | `field:<ID>` | 森の暴れ熊、ゴブリン親衛隊長、霧纏いの大鹿、灼熱のサラマンダー、黒騎士団長 | `FIELD_ENEMIES`（`foe:true`） |
| 亜種（6） | `variant:<variantId>` | 毒スライム、炎スライム、ゴブリンアーチャー、ゴブリンシャーマン、大コウモリ、大蜘蛛 | `data/enemy-variants.js` の `EXT_ENEMY_VARIANTS` |

- 対象の一覧は `monsterCompendiumEntries()` が実行時に既存データから作ります。`FIELD_ENEMIES` や `EXT_ENEMY_VARIANTS` に敵を追加すれば、図鑑にも自動で載ります。
- オオカミ戦の幻影（`wolfClones`）と、ゴブリン戦の個体（`members`）は、それぞれ1つの戦闘の一部として扱います。別の項目にはしません。
- チュートリアル戦は記録しません。

## 2. 遭遇・討伐の記録方式

- 保存先：`monsterRecords[id] = { encountered, defeated, encounters, defeats }`（`monster-compendium.js`）。
- 敵 ID の決め方（`monsterCompendiumIdForEnemy`）：隠しボス → 亜種（`variantId`）→ 迷宮の敵（`fieldEnemyId`）→ ステージボス（ステージ番号と `enemyData` の名前が一致する場合）の順で判定します。
- **遭遇**：`script.js` の `beginStageCore()` で、既存の `registerEncounter()` の直後に `compendiumRecordEncounter(enemy, resumed)` を呼びます。
  - ステージ戦・迷宮の雑魚戦・FOE 戦は、すべてここを通ります。
  - 中断した戦闘の再開時は「遭遇済み」にするだけで、遭遇回数は増やしません。
- **討伐**：`script.js` の `finishStage()`（敵の HP が 0 になったときだけ呼ばれる）の先頭で、`compendiumRecordDefeat(e)` を呼びます。
  - 雑魚戦・FOE 戦も、`fieldFinishEncounter()` に分かれる前にここを通ります。そのため **`field.js` は変更していません**（Claude B の担当ファイル）。
- **二重登録の防止**：敵オブジェクトに `_compendiumEncounterRecorded`／`_compendiumDefeatRecorded` の印を付け、1回の戦闘で2回数えないようにしています。`finishStage()` 自体にも、既存の `stageFinished` による二重実行の防止があります。

## 3. 段階的な情報の開示

| 状態 | 表示 |
|---|---|
| 未遭遇 | 名前「？？？？」、画像「?」、「未遭遇」 |
| 遭遇済み | 名前、シルエット「影」、遭遇回数・討伐回数 |
| 討伐済み | 画像、HP／ATK／DEF（あれば SP攻撃・SP防御も）、属性、弱点、耐性、説明 |

- 説明は既存データから作ります。新しい文章データは追加していません。
  - 主な行動：`ai` の技名、または `actionName`
  - 出現場所：`FIELD_AREAS` の出現表と FOE 配置から求めた階層・フロア。亜種は出現するステージ。
- 迷宮の通常敵は、フロアによって強さに倍率（1.0〜1.3）がかかります。図鑑には補正前の値を表示し、その旨を注記しています。

## 4. 既存の図鑑・隠しボス条件との関係（変更なし）

- 名前キーの `compendium`（ボス5種＋混沌の幻影）と `registerEncounter`／`registerDefeat` はそのまま残しています。
- `hiddenBossUnlocked()`（魔王・ドラゴン討伐＋ボス5種の80%）、実績 `compendium_80`、BGM 解放、アナライズパネルの「既知」判定は、従来どおり名前キーの記録を参照します。
- ステージボスと隠しボスのカードの表示も、従来どおり名前キーの `compendium` を使います。亜種を倒すと元のボスも討伐済みになる、という既存の挙動も維持しています（ID 単位の記録では、亜種は亜種として別に残ります）。
- 画面上部の進み具合は「ボス x / 5 討伐 ／ 全体 y / 27」です。前半の数字は、隠しボス解放条件の基準となる従来の値です。
- 隠しステージの解放条件の文言「通常モンスター図鑑80%以上」は、迷宮の通常敵と紛らわしくなるため「ステージボス図鑑（5種）80%以上」に変えました。**判定の内容は変えていません。**

## 5. 隠しボスの能力値の一本化

- これまで、戦闘用の値（`createEnemy` 内：HP 7200／ATK 145／DEF 155／SP攻撃 165／SP防御 95）と、図鑑に直接書かれた値（HP 4500／ATK 100／DEF 120 …）が食い違っていました。
- `data/enemies.js` に `hiddenBossData` を作り、戦闘と図鑑の両方がこれを参照するようにしました。戦闘での値は変わりません（`maxHp` と、ブレイク値 260 は `createEnemy` 側で付け足します）。

## 6. セーブ互換性

- 新しい項目：`createSaveData()` の `monsterRecords`。遭遇も討伐もしていない ID は保存しません。`saveVersion` は変えていません。
- 旧セーブ（`monsterRecords` なし）：全敵を未遭遇として初期化します。ロードエラーにはなりません。そのうえで、分かる範囲だけ引き継ぎます。
  - 旧 `compendium` のボス5種・混沌の幻影の遭遇・討伐 → `boss-n`／`hidden-boss`
  - 迷宮の遭遇回数 `field.enemyEncounters`（名前キー。`FIELD_ENEMIES` の名前はすべて異なる）→ `field:<ID>` の遭遇済みと回数
  - 迷宮の敵の討伐や、亜種の遭遇・討伐は旧セーブに記録がないため、未遭遇・未討伐から始まります。
- 新しいセーブを古い版で読み込んだ場合：`monsterRecords` は無視されるだけです。
- 値は読み込み時に整えます（真偽値に変換、回数は 0 以上の整数）。

## 7. 変更ファイル

| ファイル | 内容 |
|---|---|
| `monster-compendium.js`（新規） | 対象一覧、ID の判定、記録、セーブとロード、図鑑の描画 |
| `script.js` | 呼び出しを数か所に追加（`beginStageCore`・`finishStage`・`createSaveData`・ロード処理）。`renderCompendium` を新しい描画処理に委譲。`createEnemy` の隠しボスを `hiddenBossData` の参照に変更。編成・`level.js` には触れていない |
| `data/enemies.js` | `hiddenBossData` を追加 |
| `css/02-screens-and-shell.css` | 分類の見出しと分類ラベルの最小限のスタイル |
| `index.html` | `monster-compendium.js` の読み込み、`?v=20261106-19` への更新 |

## 8. 確認したこと・していないこと

仕様どおり、網羅的な検証は今回の対象外です。PR を壊さないための最低限の確認（ヘッドレス Chromium）だけ行いました。

- 確認済み
  - 起動時に JS エラーがない。
  - 図鑑の対象が27種（ボス5・隠しボス1・通常敵10・FOE5・亜種6）。
  - 雑魚戦（キノコもどき）の勝利で `field:mushroom` が遭遇1・討伐1になる。
  - FOE（森の暴れ熊）は遭遇時に遭遇済みになり、`finishStage` を2回呼んでも討伐は1回だけ数える。
  - 亜種（毒スライム）は `variant:poison-slime` で記録され、旧 `compendium` のスライムも従来どおり討伐済みになる。
  - セーブに `monsterRecords` が入る。
  - `monsterRecords` のない旧セーブを読み込むと、ボスと迷宮の遭遇回数が引き継がれ、それ以外は未遭遇になる。
  - 隠しステージの文言が新しいものになっている。
- 未確認
  - 実際に迷宮を歩いて遭遇した場合の流れ（呼び出し経路はコード上で確認済み）
  - 隠しボス戦
  - スマホ幅の表示
  - 実機
  - 他の担当者（Claude A・B、GPT）の変更との組み合わせ

## 9. 他の担当との境界

- `field.js`・`data/field-maps.js`（Claude B）、`script.js` の編成処理・`level.js`（GPT）は編集していません。
- `script.js` の変更は、1行ずつの呼び出しの追加と、関数の委譲だけです。いずれも `// [COMPENDIUM]` の印を付けています。セーブ構造には `monsterRecords` を1項目追加しています。GPT がセーブ構造を整理するときは、この項目を残してください。
