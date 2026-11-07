# 世界樹の迷宮再現：迷宮の通行・扉・隠し通路／FOE AI 実装メモ（Claude A・development 再移植版）

- 指示書：`docs/world-tree-recreation/claude-tasks/CLAUDE_A_LABYRINTH_FOE.md`
- 旧PR：#95（旧来の一枚ものの `field.js` が前提。参照用に残す）。本PRは **現行 development の機能別モジュールへ移植したもの**（旧 `field.js` の丸ごと取り込みはしていない）
- ベース：`development`（`df2274b`）

## 0. 移植先の対応表
| 内容 | 旧PR #95／#45 | 移植先（現行 development） |
|---|---|---|
| #38・#45 の迷宮データ（サブイベント・仕掛けの配置、`FIELD_SIDE_EVENTS`・`FIELD_PUZZLES`、会話、仮の見た目） | `data/field-maps.js`・`data/story.js`・`css/07-labyrinth.css` | 同じファイル（最初のコミット `14d9fc0`。Claude B の新PRと共通）。`FIELD_ENEMIES` は `data/field-enemies.js` に分離済みのため取り込まない |
| 定数・状態・objects の項目・通行判定（`fieldLetterDef`・`fieldCharSolid`・`fieldDoorOpen`・`fieldCanEnter`・`fieldWallLike`・`fieldOpaque`）・`fieldSnapToTile`・`fieldViewPos` | `field.js` | `field.js` |
| グリッド移動・入力・正面の対象・ターン制FOE | `field.js` | `field/field-movement-foe.js` |
| 仕掛け（[PUZZLE]）・扉／ショートカット／隠し通路（[DOOR]）・状態クラス `fieldObjectStateClass` | `field.js` | **新規** `field/field-puzzles.js`（`field-interactions.js` の後に読み込む） |
| 調べたときの振り分け | `field.js` の `fieldInteract` | `field/field-interactions.js` の `fieldInteract`（サブイベントと扉の奥の宝箱は Claude B の関数を `typeof` 確認して呼ぶ） |
| 描画位置の補間・壁の描き分け・状態クラス | `field.js` | `field/field-render.js`（最小限：`fieldViewPos()`、`fieldWallLike` による壁表示、`fieldObjectStateClass` の呼び出し） |
| 旧セーブの位置をマスの中心へ | `field.js` の `fieldShow` | `field/field-navigation.js` の `fieldShow` |
| 検証スクリプト | `tools/world-tree/` | 同じ（index.html の読み込み順で `field.js`・`field/*.js` を読むよう変更。`test_puzzles.js` を追加） |

### Claude B との分担（同じ関数を二重定義しない）
- A：仕掛けの解き方（スイッチ・扉・`fieldPuzzleSolve`・`fieldPuzzleRefresh`）、扉・隠し通路、`fieldInteract` の振り分け、`fieldObjectStateClass`
- B：サブイベント（`fieldRunSideEvent(id, o)`・`fieldRunNpcSideEvents(o)`・`fieldSideDone` ほか）、扉の奥の宝箱の報酬（`fieldPuzzleOpenCache(o, pz)`）、宝箱・採集・セーブ
- B の関数が無い状態でも、A の処理はエラーにならない（`test_puzzles.js` で確認）

### GPT 地図UI（#98）との接続
- `field-render.js` は既に `fieldDoorOpen`・`fieldPuzzleSolved`・`fieldSideDone`・`fieldWallLike` を `typeof` 確認つきで呼んでいる。本PRでこれらが定義され、未発見の隠し通路は壁色で描かれ、扉記号も出ない（開いた後だけ表示）。
- FOE の `x`・`y` はマスの中心の座標のまま。ミニマップの FOE 表示はそのまま動く。

## 1. グリッド移動（1歩＝1ターン）
| 項目 | 内容 |
|---|---|
| 移動 | 1入力＝1マス。押しっぱなしで `FIELD_STEP_MS`（150ms）ごとに1マス。一瞬の押下も1歩として受け付ける |
| 壁・閉扉 | 進めない。向きだけ変わり（正面を調べられる）、ターンは進まない |
| 通行判定 | `fieldCanEnter(a, tx, ty, who)` に一本化。`who="foe"` は安全地帯・階段・出口・ボス門・物・他のFOEのマスにも入らない |
| 位置 | 論理位置 `fieldState.x/y` は常にマスの中心（1歩ごとに即更新）。見た目だけ `fieldState.view` で補間（`fieldViewPos()`）。旧セーブの自由移動の位置は `fieldShow` でマスの中心にそろえる |
| 止まっているとき | FOEも時間も進まない（実時間による追跡解除・猶予を廃止） |

（旧メモにあった GPT PR #47 との重複は、現行 development では #47 の移動処理が入っていないため発生しない。）

## 2. 扉・ショートカット・隠し通路（`field/field-puzzles.js` の `[DOOR]` 節）
`#45` の仕掛けの扉（`puzzle` 付き）はそのまま。仕掛けに属さない扉を `objects` に置けるようにした。

| 定義 | 動き |
|---|---|
| `{ kind:"door", id, name, sprite }` | 調べると開く |
| `oneWay:"left"` など | ショートカット扉。指定した側（例：扉の西側）から調べたときだけ開く。反対側からは「かんぬきが掛かっている」 |
| `requires:{ flag }`／`{ item }` | 鍵。条件を満たすまで開かない（`lockedText`） |
| `hidden:true` | 隠し通路。開くまでは壁と同じ扱い（タイル・ミニマップ・視界・踏破率の分母）。正面の壁を調べて見つける。**名前は空文字にする**（ラベルで存在が漏れないように） |

- 開いた状態は `fieldState.flags["door:<ID>:open"]`（既存の保存の仕組みでそのまま保存される。Claude B が確認済み）。
- `fieldDoorOpen(o)` が仕掛けの扉・通常の扉の両方を判定する。`fieldCharSolid`・`fieldWallLike`・ミニマップの扉表示・正面の対象判定はこれを使う。
- 状態クラス：`is-open`、`is-hidden-door`、`is-one-way`、`is-locked`（GPT が見た目を付ける）。
- イベント：`field:door:open`、`field:hidden:found`（`doorId`・`oneWay`）。
- **マップへのショートカット・隠し通路の追加は、ユーザー承認後に行う**（候補はPR本文に記載）。

## 3. FOE AI（`field/field-movement-foe.js` の `[FOE]` 節）
`data/field-maps.js` の `floors[].foes[]` に任意の項目を追加できる。既存の定義（`enemy`・`path` の2点）はそのまま動く。

| 項目 | 既定 | 内容 |
|---|---|---|
| `type` | `"chaser"` | `chaser`：巡回し、見つけると追う／`patrol`：決まった道を巡回し続け、追わない／`sentinel`：持ち場で見張り、見つけると追い、見失うと戻る |
| `path` | — | 巡回地点の列。1点ならその場から動かない |
| `loop` | `"pingpong"` | 往復。`"cycle"` で周回 |
| `sight` | 4.5 | 気づく距離（マス） |
| `fov` | `"front"` | 前方と真横、すぐ隣（1.5マス以内）だけ見える。真後ろは見えない。`"all"` で全方向 |
| `pace` | 1 | 1ターンに動くマス数（0.5＝2歩に1回、2＝1歩に2マス） |
| `dir`・`turns`・`turnEvery` | 次の巡回点の方向 | 最初の向き／持ち場で向きを変える順番と間隔（ターン） |

| ルール | 内容 |
|---|---|
| 1ターンの順番 | プレイヤー移動 → 接触判定 → 各FOEが気づく／見失う → FOE移動（1マスごとに接触判定） → 歩数・ランダムエンカウント |
| 接触 | 同じマスに入ったとき。プレイヤーが入っても、FOEが来ても接触。FOE戦が優先され、同じ歩でランダムエンカウントは起きない |
| 発見 | 距離・前方視野・壁による見通し。安全地帯（階段など）の上にいると見つからない |
| 見失い | 追跡中に見えなくなると「search」：最後に見た地点へ向かう。着くか、`FIELD_FOE_RULES.loseTurns`（3）ターン過ぎると「return」：いちばん近い巡回点へ戻り、巡回を再開 |
| 衝突 | FOE同士は同じマスに入らない（ふさがれていれば待つ）。壁・閉扉・安全地帯・物のマスにも入らない |
| 逃走後 | 3マス以内のFOEは、巡回路のうちプレイヤーからいちばん遠い地点へ戻る。全FOEが3歩のあいだ止まる。止まっていても、自分から入れば接触する |
| 撃破 | 従来どおり、ホームに戻るまで出ない（保存しない）。復活ルールを変える場合は Claude B にセーブ項目を依頼する |

- 互換のため `fieldUpdateFoes()`・`fieldCheckFoeContact()` は残している（中身はターン制）。
- FOEオブジェクトに `tx`・`ty`・`dir`・`mode`・`type`・`nextTile` を追加。`x`・`y` は従来どおりマスの中心の座標で、GPT の既存コード（`Math.floor(f.x / FIELD_TILE)` など）はそのまま動く。

## 4. FOE配置の検証と修正（`tools/world-tree/validate.js`）
`node tools/world-tree/validate.js` で全15フロアを検証する（DOMなしのスタブ環境）。
- 扉を閉じた状態・開いた状態の両方で、開始位置から階段・出口・ボス門・導きの灯・宝箱・採集点・NPC・サブイベント・スイッチに届く。扉を開ければ仕掛けの宝箱に届く
- FOEの巡回点に入れる・巡回できている
- 巡回路が必須地点への唯一の通り道か（＝タイミングを見て抜ける必要があるか）
- FOEが階段・出口の隣にいる時間
- FOE同士が近づくか（挟み撃ち）
- **接触せずに**次のフロアへ行けるか／**一度も見つからずに**行けるか（FOEの動きをターンごとに再現し、位置×ターンで探索）

修正前は、第2階層1F・2Fで「見つからずに下り階段へ行く経路がない」状態だった（巡回が唯一の通り道を見張っていた）。巡回点を1〜2マスずらして解消した。

| フロア | 変更前 | 変更後 |
|---|---|---|
| 第2階層 1F（4F） | `[[22,7],[25,8]]` | `[[22,9],[25,8]]` |
| 第2階層 2F（5F） | `[[21,1],[24,3]]` | `[[21,1],[25,3]]` |

修正後の結果：エラー0件／注意3件（4F・5F・8F で巡回路が唯一の通り道だが、見つからずに抜ける経路がある＝観察して抜けるFOE）。

## 5. テスト
- `node --check field.js data/field-maps.js`：**確認済み**（構文）
- `node tools/world-tree/test_puzzles.js`：16項目すべて成功。**条件付き**（スタブ環境）。内容：仕掛けの扉・レバー、壁付きの物、隠し通路と踏破率、汎用の隠し通路、B の処理が無い状態での振り分け
- `node tools/world-tree/test_basic.js`：21項目すべて成功（現行モジュール構成で再実行）。**条件付き**（スタブ環境で関数を直接呼んだもの）。内容：壁・扉の通行、汎用扉と一方通行、前方視野、ターン基準の見失い、止まっている間は進まない、接触、逃走後の停止、FOEが階段に入らない
- `node tools/world-tree/validate.js`：エラー0件。**条件付き**
- ブラウザでの操作感（押しっぱなしの移動速度、アニメーション、スマホの十字ボタン）：**未確認**
