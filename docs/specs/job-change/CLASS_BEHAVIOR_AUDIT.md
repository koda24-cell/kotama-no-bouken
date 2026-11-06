# 職業依存処理の監査（Issue #39・Claude A）

- 先行作業：Issue #28／PR #37（職業変更システム）。このブランチは PR #37 の上に積んでいます。
- 原則：`c.id` は**個体ID**。職業の判定には `characterJobId(c)`（script.js）、`extJobOf(c)`（battle-ext.js）、`jobOf(c)`（job.js）を使います。
- 調査方法：全 `.js` から、固定IDとの比較、`equipment.samurai` などの固定ID参照、`getCharacter("knight")`、職業表の `[c.id]` 引き、ID一覧の `includes(c.id)`、`classes.includes` を機械的に抽出しました（134件）。その上で1件ずつ分類しています。
- `level.js`・`field.js` には該当がありませんでした（レベル・経験値は個体IDのまま）。

## 1. 分類の基準

| 区分 | 判断基準 | 例 |
|---|---|---|
| **職業** | 職業ごとに定義された性能・規則。転職したら新しい職業のものに替わるべきもの | 職業補正 `classBonuses`、職業パッシブ `BATTLE_RULES.passives`、装備適性、装備枠、二刀流、後衛、素早さ、職業SPスキル、インペリアルの熱 |
| **個体** | その人物の成長・持ち物・物語上の役割 | Lv・経験値・育成値・装備品そのもの、スキルツリー（D-1）、ユニオン（D-2）、立ち絵・カットイン、チュートリアルの固定配役、仲間の解放 |

## 2. このPRで変更した判定（battle-ext.js）

| 箇所 | 変更前 | 変更後 | 区分 |
|---|---|---|---|
| `extJobOf`（新規） | — | 個体の現在の職業ID（job.js が無ければ `c.id`） | — |
| `extInstallCharacters` | `heatGauge`・`overheated`・`exposed` をインペリアル個体だけに定義 | 全個体に定義（熱の無い個体は 0／false を返すだけ） | 職業 |
| `extApplyStatusStats` | 素早さの予備値 `EXT_JOB_SPEED[c.id]` | `EXT_JOB_SPEED[extJobOf(c)]` | 職業 |
| `extJobBadges` | `c.id === "imperial"`（PR #37 で `jobOf`） | `extJobOf(c) === "imperial"` | 職業 |
| `extPickPartyTarget` | 後衛 `EXT_REAR_IDS.includes(c.id)` | `EXT_REAR_IDS.includes(extJobOf(c))` | 職業 |
| `extImperialGauge` | 既定は `getCharacter("imperial")` | パーティ内で職業がインペリアルの個体を優先 | 職業 |
| 戦闘イベント（熱の変化通知） | `c.id === "imperial"` | `extJobOf(c) === "imperial"` | 職業 |
| 戦闘イベント（魔法の種別） | `actor?.id === "mage"` | `extJobOf(actor) === "mage"` | 職業 |

`analyze-panel.js` のインペリアル熱表示は PR #37 で職業判定に変更済みです（今回は変更なし）。

## 3. script.js の変更案（GPTと調整が必要）

Issue #39 のファイル境界に従い、**script.js は編集していません**。必要な変更は、そのまま当てられるパッチにしました。

- パッチ：`docs/specs/job-change/script-js-job-behavior.patch`（`git apply` で適用可能なことを確認済み）
- 行番号：PR #37 適用後の script.js の行番号です。
- 動作確認：パッチを一時的に当てた状態で、Chrome で後衛判定・編成表示・二刀流・転職後の魔法を確認しました（エラー0件）。

| ID | 行 | 関数 | 変更案 | 区分 | 挙動の変化 |
|---|---|---|---|---|---|
| S-1 | 532 | `formationBaseStats` | `classBonuses[c.id]` → `classBonuses[characterJobId(c)]` | 職業 | 編成画面の能力値が戦闘時（`effectiveStats`）と一致する |
| S-2 | 1268 | `applyPartyDamageAnimated` | 騎士の被ダメ軽減 `character.id==="knight"` → 職業 | 職業 | 転職した騎士個体は失い、騎士になった個体が得る |
| S-3 | 1687 | `executeAction`（通常攻撃） | 戦士の通常攻撃補正と打撃SE `actor.id==="warrior"` → 職業 | 職業 | 同上 |
| S-4 | 1687・1730・1731 | `executeAction`（通常攻撃・`pierce`・SP攻撃） | 武士の二刀流 `actor.id==="samurai"&&equipment.samurai` → 職業＋**本人の**装備 `equipment[actor.id]` | 職業 | 1730 は従来、使用者を見ずに武士個体の刀を参照していた |
| S-5 | 1716 | `executeAction`（`multiSlash`） | 6回攻撃の条件 `equipment.samurai` → 職業が武士で本人が二刀 | 職業 | **従来は武士個体が二刀なら、戦士の旋風斬り・連撃も6回になっていた**。修正すると戦士は3回になる（要確認） |
| S-6 | 1699・1731・1734 | `executeAction`（SP攻撃） | 魔術師のSPダメージ補正 `actor.id==="mage"` → 職業 | 職業 | 転職で替わる |
| S-7 | 1713 | `executeAction`（ヒール） | 治癒士の回復補正 `actor.id==="healer"` → 職業 | 職業 | 同上 |
| S-8 | 1951 | `enemyTurn` 内 | 冒険者の低HP時防御 `target.id==="kotama"` → 職業 | 職業 | 同上（D-10 参照） |
| S-9 | 1959 | `enemyTurn` 内 | スライムの攻撃を騎士がガードした時の規則 `target.id==="knight"`・`equipment.knight` → 職業＋本人の装備 | 職業 | 同上 |

S-5 は、職業変更と関係なく既存の挙動が変わります。適用の可否を判断してください。

## 4. 個体のまま維持した判定（変更なし）

| 箇所 | 内容 | 区分 | 理由 |
|---|---|---|---|
| script.js `getCharacterSkills`・`treeNodes`・`getTreeLevel`・`setTreeLevel`・`treeStatBonus`・育成画面・`loadGame` のツリー移行（`skillTreeDefinitions[c.id]` ほか約30か所） | スキルツリー | 個体 | D-1（現状維持の指示） |
| script.js `effectiveStats` の `skillTreeDefinitions[c.id]?.passive?.stat` | ツリー基礎パッシブの対象能力 | 個体 | ツリーに付随 |
| script.js `getCharacterSkills` の `c.id==="healer"`（リフレッシュの対象・消費SP）、`c.id==="knight"`（フルガードの再使用待機） | ツリースキルの規則 | 個体 | ツリーに付随 |
| script.js フルガード関連（1249–1250、1693、1927、1940、1963 の `getCharacter("knight")`、battle-ext.js 262・529） | 騎士ツリーの派生スキル | 個体 | フルガードを持つのは騎士個体のツリー。転職後も使用者は騎士個体 |
| script.js 術式圧縮関連（`mageCompressionStacks.mage`、1281・1363・1687・1689・1690・1709・1711・1736・1749・1880、1731・1735 の `actor.id!=="mage"`） | 魔術師ツリーの派生スキル | 個体 | 同上。転職した魔術師個体が使うファイア等も、従来どおり圧縮の対象 |
| script.js ユニオン（`unionSkills[c.id]` 12か所、1630・300 のチュートリアル）、battle-ext.js 625、analyze-panel.js 87 | ユニオンスキル | 個体 | D-2（現状維持の指示） |
| script.js 1433 `healer-portrait`／`mage-portrait`、1778 ユニオンの武士マーク | 立ち絵・演出 | 個体 | 見た目は人物に付く |
| script.js 8・59–63・294–300・2272–2281 | 初期パーティ・初期装備・チュートリアル | 個体 | 物語上の固定配役 |
| script.js 354 `jobVictoryRoster` | 実績「全職業で勝利」 | 個体（暫定） | D-9 |
| battle-ext.js 48・58、script.js 947 `EXT_NEW_JOB_IDS` | 新しい仲間の解放 | 個体 | 解放条件は変更しない指示 |
| battle-ext.js 21 `EXT_JOB_SPEED[c.id]` | 起動時の素早さ初期値 | — | 起動時点では個体＝職業。職業テンプレートに取り込まれる |
| battle-ext.js 39–40 `classes` | 共用装備に新職業IDを追加 | — | データ作成のみ |
| script.js 515 `renderImperialStatus` | インペリアル専用パネル | 個体（未対応） | D-11 |

PR #37 で職業判定に変更済みの箇所（再掲）：`effectiveStats` の `classBonuses`、`equipmentSlots`、`equipItem`・ショップ・`isSkillRestricted` の装備適性、ショップの職業名。

## 5. 判断事項（現状維持で進め、確認をお願いしたい点）

| ID | 内容 | 現状 |
|---|---|---|
| D-1 | スキルツリーを職業ごとに切り替えるか | 個体に保持 |
| D-2 | ユニオンスキルを職業ごとに切り替えるか | 個体に保持 |
| D-3 | 転職で育成ポイントを減らすか | 減らさない |
| D-6 | 同一職業の複数個体 | 許可。職業パッシブは各個体に個別に効く（重複しても問題ない作りを確認済み） |
| D-9 | 実績「全職業で勝利」を個体と職業のどちらで数えるか | 個体ID |
| D-10 | コタマ（主人公）の低HP防御（S-8）は「冒険者」の職業特性か、コタマ個人の特性か | パッチ案では職業扱い。個人扱いにするなら S-8 は外す |
| D-11 | インペリアル専用パネル（`renderImperialStatus`）を、転職でインペリアルになった個体にも出すか | 未対応。出す場合は 515 行の検索を `characterJobId(c)==="imperial"` に変える（script.js・GPT と調整） |
| D-12 | S-5（`multiSlash` の6回攻撃）を、職業変更と別の不具合修正として扱うか | パッチ案に含めたが、既存挙動が変わるため要判断 |

## 6. 参照漏れの確認

- 抽出した134件すべてを、上の2〜4のいずれかに分類しました。
- このブランチの battle-ext.js・analyze-panel.js には、職業に属するのに `c.id` で判定している箇所は残っていません（残る `c.id` の判定は、4に挙げた個体側のもの）。
- 職業に属するのに `c.id` で判定している箇所は、script.js の S-1〜S-9 だけです。パッチを適用すると解消します。
