# 迷宮システム（世界樹の迷宮参考）・レベル：共通仕様

- 作成：Claude（2026-11-06）／ 実装：`feature/ai-claude-labyrinth`
- ユーザー依頼：世界樹の迷宮のシステムとステージ構成を参考にする／視界の範囲を決め、通った場所を一定範囲マッピングして確認できる／レベルの可視化／インペリアルが選べない不具合／徘徊中の撤退でステージ画面が残る／新しい敵が弱い
- `FIELD_SPEC.md` の続き。DOM・イベントの基本はそちらを参照。

## 1. しくみ一覧

| 項目 | 内容 | 担当ファイル |
|---|---|---|
| 階層とフロア | 1エリア＝1階層（第1〜第5階層）。各階層3フロア（通し番号 1F〜15F）。1〜2フロア目は迷路、3フロア目は従来のマップ（NPC・導きの灯・ボスゲート） | `data/field-maps.js` の `floors` |
| 階段 | `>` 下り／`<` 上り。踏むと確認→移動。1Fの開始地点＝出口（ホームへ） | `field.js` |
| 磁軸（フロア選択） | START→階層と「行ったことのあるフロア」を選んで出発。踏破率も表示 | `field.js` `fieldOpenFloorSelect` |
| 視界 | 半径3.6マス。壁の向こうは見えない（見通し判定） | `field.js` `fieldUpdateVision` |
| オートマッピング | 見たマスを記録。ミニマップ（右上）と全体マップ（MAPボタン／Mキー／ミニマップをタップ）。セーブに保存 | `field.js` |
| 危険度 | HUDの玉が 青→緑→黄→橙→赤（次のエンカウントまでの近さ） | `#field-danger[data-level=0〜4]` |
| FOE | マップ上に見える強敵。**プレイヤーが動いたときだけ動く**。4.5マス以内で見通せると追跡、見失うと巡回に戻る。接触でFOE戦。倒すとホームに戻るまで出ない。逃げると起点へ戻り2.5秒停止 | `field.js`、`FIELD_ENEMIES` の `foe:true` |
| 採取ポイント | `G`。1回の探索で2回まで素材入手。ホームから出発し直すと復活 | `field.js` |
| フロアの強さ | `encounter.scale`（1.0／1.15／1.3）で雑魚敵のHP・攻撃・防御・経験値・ゴールドを倍率 | `data/field-maps.js` |
| レベル・経験値 | 勝利で生存者全員が経験値。レベルで基礎能力が成長（HP+5%／攻撃・SP攻撃・防御・SP防御+3%）し、スキルポイント+1。上限Lv50 | `data/levels.js`、`level.js` |
| 撤退（雑魚・FOE戦） | 「逃げる（迷宮へ）」「ホームへ帰還」「戦う」を選べる。ステージ戦（ボス）は従来どおり | `field.js` `fieldSetupRetreatChoice` |
| インペリアル | 編成の候補一覧に表示（以前のコミットで非表示にされていた）。解放条件は従来どおり隠しボス初回討伐 | `script.js`、`battle-ext.js` |

## 2. 追加DOM・クラス（GPTが見た目を付ける場所）

`field.js` が `#field` 内に自動で追加する（`index.html` は変更していない）。

| 要素 | 説明 |
|---|---|
| `#field-floor-label` | HUDのフロア表示（例：`2F`） |
| `#field-danger[data-level]` | 危険度の玉。0=青 1=緑 2=黄 3=橙 4=赤 |
| `#field-map-button` | MAPボタン |
| `#field-minimap`（canvas） | ミニマップ。1マス4px |
| `#field-fog` | 視界の暗さ（主人公中心の radial-gradient を毎フレーム設定） |
| `#field-fullmap` / `#field-fullmap-canvas` / `#field-fullmap-title` / `#field-fullmap-rate` | 全体マップ |
| `.field-tile.is-unexplored` / `.field-object.is-unexplored` | 未踏（真っ黒・非表示） |
| `.tile-stairs-up` / `.tile-stairs-down` | 階段のマス |
| `.field-object[data-kind="stairs"\|"gather"]` | 階段・採取ポイント（採り尽くすと `.is-opened`） |
| `#field-foes .field-foe[data-sprite="foe-○○"]` / `.is-chasing` | FOE（追跡中は `.is-chasing`） |
| `#field[data-floor]` | 0〜2 |
| `.lv-badge` / `.lv-exp` | レベル表示（戦闘・編成・ホーム・アナライズ） |
| `#retreat-home` | 撤退ダイアログの「ホームへ帰還」ボタン（雑魚・FOE戦のみ表示） |

仮スタイルは `css/07-labyrinth.css`（`06-field.css` とは別ファイル。GPTが調整してよい）。

## 3. イベント（追加分）

| イベント | detail |
|---|---|
| `field:enter` | 既存項目に `floor` `floorLabel` を追加 |
| `field:leave` | `reason` に `"stairs"` を追加 |
| `field:encounter` | `foe`（FOE戦なら true） |
| `field:foe:notice` | `key` `enemyName`（FOEがこちらに気づいた） |
| `field:gather` | `area` `floor` `objectId` `material` `count` |
| `battle:level:up` | `ups[]`：`{id, name, from, to}` |

## 4. セーブ

- `field.floor`、`field.maps`（`"階層-フロア"` → 16進ビット列）を追加。`levelExp`（キャラID→現在レベル内の経験値）を追加。レベル自体は既存の `characterLevels`。
- 旧セーブ：`floor` が無ければ1Fから。クリア済み階層は全フロアを磁軸から選べる。

## 5. バランス検証（自動戦闘・店売り装備のみ・スキルツリーなし）

想定レベル（第1階層 Lv2〜5、第2 Lv6〜10、第3 Lv11〜15、第4 Lv17〜22、第5 Lv23〜27）で測定。

| 階層 | 雑魚戦のターン | 1戦のHP減少 | FOE（そのフロア到着時） | ボス |
|---|---|---|---|---|
| 1 | 2 | 2〜15% | 勝てる（HP24%減） | 1ターン |
| 2 | 2〜3 | 5〜25% | 勝てる（HP38%減） | 2ターン |
| 3 | 2〜4 | 7〜28% | ほぼ勝てない（避けるのが前提） | 勝率100% |
| 4 | 4〜6 | 5〜24% | 勝てない（後で挑む強敵） | 勝率100% |
| 5 | 4〜5 | 14〜33% | 勝てない（後で挑む強敵） | 勝率0%（要育成） |

**ユーザー確認事項**：第1・第2階層のボス（スライム・ゴブリン）は、レベルが上がる分さらに楽になった。魔王は店売り装備＋簡単な操作では勝てない（スキルツリー・アクセサリ・強化が前提）。ボスの数値は変えていない。

## 6. GPTへの追加依頼（任意）

- G8：FOE・採取ポイント・階段の絵（`data-sprite` / `data-kind`）
- G9：ミニマップ・全体マップ・危険度の玉の見た目（色の意味は変えない）
- G10：視界の暗さ・未踏の黒の表現（`#field-fog` の濃さはCSSの `opacity` 等で調整可。半径は `field.js` の `FIELD_VISION`。変えたい場合はClaudeに依頼）
- `field.js` の処理・`[FIELD]` `[LEVEL]` フックは変更しない。
