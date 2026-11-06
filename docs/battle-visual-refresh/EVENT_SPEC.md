# 戦闘イベント仕様書（Claude → GPT 向け）

- 作成担当：Claude
- 対象：`development`（実装は `feature/claude-battle-events`）
- 目的：演出・UI（GPT 担当）が、戦闘の進行を **読み取るだけ** で表示できるようにする。
- 関連：`docs/battle-visual-reference/CLAUDE_SPEC.md`、`docs/battle-visual-refresh/IMPLEMENTATION_SPEC.md`

## 1. 基本ルール

- イベントは `document` に `CustomEvent` として発火する。名前は **`battle:` + イベント名**、中身は `event.detail`。

  ```js
  document.addEventListener("battle:damage:applied", e => { const d = e.detail; /* ... */ });
  ```
- **通知するだけで、戦闘は待たない。** ダメージ計算・行動順・乱数・ログ文言・セーブ形式は変えていない。リスナーが無くても、あっても、戦闘の結果は同じ（元の `development` と同一乱数で5場面を比較し、最終HP/SP・ターン数・ログが完全一致することを確認済み）。
- リスナー側で例外が出ても戦闘は止まらない。演出の長さは、既存の `wait()` の時間内に収めること（演出を待つ仕組みは無い）。
- すべての `detail` に `turn`（いま処理中のターン番号、1始まり）が入る。
- 味方のIDは既存どおり（`kotama` `knight` `healer` `mage` `imperial` など）。敵は `"enemy"`。集団・分身の個体は、その個体の `id`（`goblin-1`、`wolf-main` など）。

## 2. イベント一覧

| イベント | 発火タイミング | `detail`（主な項目） |
|---|---|---|
| `battle:start` | 戦闘開始（敵の生成後・最初の表示前） | `partyIds[]` `stage` `enemyName` `resumed` |
| `battle:end` | 勝利・敗北・撤退の確定時 | `result`：`"win"` / `"lose"` / `"retreat"` |
| `battle:turn:start` | そのターンの行動処理を始める直前 | `turn` |
| `battle:turn:order` | 行動順が決まった直後 | `order[]`：`{side, actorId, kind}` を行動する順に |
| `battle:turn:end` | ターン数を +1 した直後 | `turn`（終わったターン） |
| `battle:action:start` | 各行動の実行直前 | 下の「行動情報」 |
| `battle:action:end` | 各行動の実行が終わった直後 | 同上 |
| `battle:damage:applied` | HPが実際に減った直後（＝命中・ダメージ確定） | `targetId` `side` `amount` `hpAfter` `ko` `action` ほか |
| `battle:damage:missed` | 回避・ミスでダメージ0になったとき | `targetId` `side` `amount:0` `missed:true` `action` |
| `battle:heal:applied` | 回復の確定時 | `targetId` `amount` |
| `battle:status:added` | 味方に状態異常が付いた | `targetId` `statusId` `statuses[]`（付与後の全状態） |
| `battle:status:cleared` | 味方の状態異常が消えた | `targetId` `statusId` `statuses[]`（解除後の全状態） |
| `battle:union:start` | ユニオンのカットインを出す直前 | `actorId` `participantIds[]` `skillName` `skillType` |
| `battle:union:end` | カットインを片付けた直後 | 同上 |
| `battle:imperial:changed` | インペリアルの熱が増減した | `characterId` `heat` `before` `max` `overheated` |
| `battle:log:push` | バトルログに1行追加（`pushLog`/`pushEvent`） | `message` `turn` |

### 行動情報（`action:start` / `action:end` / `damage.action`）

| 項目 | 意味 |
|---|---|
| `actorId` / `side` | 行動者（`"enemy"` も） / `"party"` か `"enemy"` |
| `kind` | `normal`（通常攻撃）・`sp`（SPスキル）・`magic`（魔法）・`guard`・`union`・`item`・`enemy-normal`・`enemy-special` |
| `skillId` / `skillName` | スキルのIDと名前（なければ `null`）。ユニオンは `skillName` のみ |
| `element` | 属性（なければ `null`） |
| `targetIds[]` | 選択された対象（分からなければ空） |
| `participantIds[]` | ユニオンの参加者（本人＋パートナー）。`kind:"union"` のときのみ |

- `damage:applied` の `action` は「そのダメージを起こした行動」。ラウンド開始・終了時の毒や火傷のダメージは行動の外なので `null`（`statusDamage:true` が付く）。
- 敵の `kind` は、行動名が通常攻撃かどうかで分けた **おおよその分類**。実際に当たった攻撃は `damage:applied`（`element` `magic`）で確認できる。

## 3. 状態異常（背景色用）

- 識別子（統一）：`burn`（火傷）`poison`（毒）`paralysis`（麻痺）`curse`（呪い）`defenseDown`（防御↓）`attackDown`（攻撃↓）`stun`（行動不能）。
- **強化（攻撃↑など）は通知しない。** 悪い状態異常だけ。
- 現在の状態を読むだけなら、`extGetStatusIds(character)` が識別子の配列を返す（空なら通常状態）。
- 付与・解除の経路（時間切れ・解除スキル・スタンの消費など）は多いが、**すべて同じ2イベントに集約**している。解除のたびに `status:cleared`、`statuses` が空になったら通常背景へ戻す。
- 複数同時のときの優先順位は、仕様書どおり **まず共通の「状態異常中」表現** とする想定。種類ごとに色分けする場合は、`statuses[]` の並び順（付与順ではなく固定順）に頼らず、GPT 側で優先順位を決めること。
- 戦闘開始時は全員通常状態で始まる（`battle:start` で全員の表示を戻してよい）。

## 4. インペリアルの縦線（SP攻撃コマンド右側）

- 縦線の本数 = **熱（`heat`）**。`0`〜`max`（現在は `6`）。
- 現在値は `extImperialGauge()` で読める：`{ characterId, heat, max, overheated, charging }`。変化は `battle:imperial:changed`（`before` が直前の値）。
- 増える：インペリアルのSP攻撃を **放ったとき**（チャージ開始ではなく、放った時点）、スキルごとの量だけ。
- 減る：ラウンド終了ごとに 1。ただし **オーバーヒート中は戦闘終了まで減らない**。
- `heat >= max` で `overheated: true`（その戦闘中、新職業のスキルが使えない）。戦闘開始時は `0`。
- `charging: true` はチャージ中（無防備）。縦線とは別の情報なので、必要なら別の表現で。
- 専用ゲージは作らない仕様なので、既存の `#imperial-status-panel`（PR #2）は撤去してよい（GPT 側の担当）。

## 5. 守っていること（受け入れ条件との対応）

| 条件 | 確認 |
|---|---|
| 状態異常の付与・解除が既存処理と一致 | 付与・解除・時間切れ・スタン消費を個別に確認。強化は通知されない |
| インペリアルの蓄積・消費が変わらない | 熱の処理は無変更。増減を通知するだけ |
| ターン・ログが既存の結果と一致 | 5場面で、元の `development` と最終状態・ログが完全一致 |
| 演出トリガーが実際の行動と一致 | `action:start` と `action:end` は必ず1対1で、行動が重なって発火することはない／ユニオン参加者は実際の参加者（1人・2人とも確認） |
| 二重行動・二重ダメージなし | 通知は待たない・再実行しない。ダメージ通知はHPを減らす1か所ごとに1回 |

## 6. 未対応・注意

- スキルの HP 消費（`hpCost`）は「ダメージ」ではなく「コスト」なので、`damage:applied` は出ない。HP表示は通常の再描画で変わる。
- 敵の複数対象攻撃は、対象ごとに `damage:applied` が出る。1回の攻撃にまとめるイベントは無い。
- 魔王・ドラゴンの専用演出の通知（予兆 `showEnemyOmen` など）は対象外。必要なら追加する。
