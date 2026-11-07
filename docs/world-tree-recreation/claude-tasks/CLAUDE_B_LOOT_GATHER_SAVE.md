# Claude B 指示書：宝箱・採集・探索記録・セーブデータ連携

- 親仕様：`docs/world-tree-recreation/MASTER_SPEC.md`、`CLAUDE_GAMEPLAY_IMPLEMENTATION.md`（§2-C）
- 担当範囲：ユーザー依頼の 3（宝箱・採集・探索記録・セーブデータ連携）。**セーブ形式（`saveVersion`・`fieldSerialize`）の唯一の管理者**
- 並行作業：Claude A（迷宮・扉・FOE）、Claude C（戦闘バランス・状態異常・ボス）、GPT（画面・地図UI）
- 作業ブランチ：`feature/ai-claude-wt-loot-save`（ベースは Claude A と同じ。既定は `feature/ai-claude-field-puzzles`＝#45 の head。ユーザー指示を優先）
- 提出：development 向けの Draft PR。**main へのマージ禁止。ユーザー確認まで待つ。**

---

## 最上位指示
**『世界樹の迷宮』の「探索で資源を持ち帰り、装備を整えて次へ進む」循環を、実際のルールとして成立させること。**
宝箱・採集点は「見つけた／取った」が明確に記録され、素材がショップ・製作・売却・図鑑につながる。

## 1. 現状（development／#45 時点の事実）
| 項目 | 現状 | 問題 |
|---|---|---|
| 宝箱 | `T` を左上から順に読んで `floor.chests[i]` を割当。開封は `fieldState.flags["chest:<area-floor>:<x>:<y>"]=true` で保存 | 二重取得は防げている。「発見済み・未開封」の区別は踏破ビット頼み。中身が gold/item のみ（素材・装備なし） |
| 扉の奥の宝箱 | #45 の `cache`（`puzzle:<ID>:reward`） | 通常宝箱とキー体系が別 |
| 採集 | `G` 1種類のみ。1回の探索で各点2回。抽選は `floor.gathers` の重み | **採集種別（採取／伐採／採掘）が無い**。`gatherUsed` はセーブされず、ロード・ホーム帰還で復活（ロードで無限採集できる可能性） |
| 再出現 | 「ホームから出発し直すと復活」（`LABYRINTH_SPEC.md`）だが実装上はロードでも復活 | ルールが一貫していない |
| 探索記録 | `field.maps`（踏破ビット）、`flags`、`enemyEncounters` を保存 | 発見した宝箱・採集点の一覧、採集回数の記録なし |
| 素材の行き先 | `materials` に加算。製作・売却は未統合の GPT PR #55・#56 にもある | #55（素材売却）・#56（FOE素材と製作）との重複に注意 |
| セーブ | `createSaveData()` の `saveVersion: 10`（`script.js`）。`field` は `fieldSerialize()` | 変更時はバージョン＋マイグレーションが必須 |

## 2. 実装ステップ（3項目ずつ。各ステップ終了時に報告）

### ステップB1：調査と方式決定（コード変更前に報告）
1. 未統合PRの確認：#38・#45（`fieldState.flags` に追加したフラグ）、#47（`field.js` 改修）、#49（`data/field-maps.js` の採集テーブル変更）、#55（素材売却）、#56（FOE素材・製作）、#44（アイテム図鑑）の変更点と、素材ID・ショップ解放への影響を一覧化する。
2. **採集の再出現方式を決めてユーザーに提案**する。候補：
   - (a) ホーム帰還（＝宿泊・1日経過扱い）で全回復　← 現行の意図に最も近い
   - (b) 一定歩数で回復
   - (c) フロア移動で回復
   既定案は (a)。ロードでの復活は不具合として塞ぐ（採集回数をセーブする）。
3. 採集種別の導入案：`G` を残しつつ、採集点ごとに `kind: "take"（採取）｜"chop"（伐採）｜"mine"（採掘）` を付与。マップ文字列は変えず、**新規データファイル `data/field-gathering.js`** に「フロアキー→採集点座標→種別・素材テーブル・回数」を置く（`data/field-maps.js` の行を触らず Claude A との競合を避ける）。未定義の採集点は従来どおり `floor.gathers` で動く。
   - 世界樹では採集にスキルが必要だが、本作の職業構成で同じことをするかは**提案のみ**（実装はユーザー承認後）。

### ステップB2：宝箱・採集の状態管理
1. **状態モデル**：宝箱・採集点・扉の奥の宝箱を共通の「探索オブジェクト状態」で扱う。
   - 宝箱：`undiscovered → discovered → opened`（`opened` は既存の `chest:...` フラグをそのまま使う。キー名を変えない）
   - 採集点：`undiscovered → ready → depleted`（回数は `gatherUsed` を保存）
   - 発見＝そのマスが踏破ビットで既知になったとき（既存処理と整合）
2. **報酬テーブル**：宝箱に素材・装備も入れられるようにする（`{ material: id, count }`、`{ item: id }` の追加。既存の gold/item はそのまま）。採集結果は階層・フロア・種別と素材テーブルを対応させる。素材IDは既存のものを使い、新規IDが必要ならユーザーに提案。
3. **再取得防止とログ**：開封・採集は「フラグ（状態）を先に保存 → 報酬付与 → オートセーブ」の順（#45 と同じ）。`field:chest`・`field:gather` イベントに `kind`、`remaining`、`respawn` を追加。

### ステップB3：セーブ互換と接続
1. **`saveVersion` を 11 に上げ、マイグレーションを実装**：
   - `field.gatherUsed`（採集回数）、`field.discovered`（発見済みオブジェクトキー一覧）、必要なら A から依頼された FOE 状態を追加。
   - 旧セーブ（項目なし）は「未採集・発見状態は踏破ビットから再構成」で読み込む。読み込めないセーブを作らない。
   - バージョン10以前の既存マイグレーション（装備形式・トレーニングポイント等）を壊さない。
2. **素材の行き先**：ショップの装備解放・製作・売却に接続。#55・#56 が未統合なら、それらと同じ関数を再実装せず、データの受け渡し点だけを用意して PR に「#55／#56 統合後に接続確認が必要」と書く。
3. **図鑑・地図用の集計関数**を提供（GPT が表示に使う）。未発見のものは数に含めない。

## 3. 触ってよいファイル／触らないファイル
| 可 | 内容 |
|---|---|
| `field.js` | `fieldOpenChest`、`fieldGather`、#45 の `cache` 報酬処理、`fieldSerialize`／`fieldDeserialize`、ホーム帰還時の採集リセット、集計関数（新設） |
| `data/field-gathering.js`（新規） | 採集点の種別・テーブル・回数・再出現 |
| `data/field-maps.js` | 各フロアの `chests` 配列の中身だけ（`map` 文字列・`foes`・`FIELD_ENEMIES` は触らない） |
| `script.js` | `createSaveData` の `saveVersion` と `[FIELD]` 周辺の読み込み処理のみ（最小限） |
| `index.html` | 新規データファイルの `<script>` 追加と、自分が変更したファイルの `?v=` |

| 不可 | 理由 |
|---|---|
| 通行判定・扉・FOE の処理 | Claude A 担当 |
| `css/*`、地図の描画・凡例・HUD | GPT 担当 |
| 戦闘計算・敵データ | Claude C 担当 |
| 既存のフラグ名（`chest:...`、`puzzle:...`、`floor:...`）の変更 | セーブ互換 |

## 4. 他の担当との取り決め
- **セーブ項目の追加窓口は B のみ。** A・C から依頼が来たら、キー名・型・既定値・旧セーブ時の扱いを決めて実装し、PR に記載する。
- A が扉・隠し通路で使う `fieldState.flags` のキー（`door:<id>:open`、`hidden:<id>:found` 等）は既存の保存機構でそのまま保存されることを確認する。

## 5. GPT に渡す表示用データ（PR本文にも記載すること）
| データ | 型 | 更新タイミング | 未発見時 |
|---|---|---|---|
| `fieldLootState(objectKey)` | `"undiscovered"｜"discovered"｜"opened"｜"ready"｜"depleted"` | 踏破・開封・採集ごと | `"undiscovered"` は地図・集計に出さない |
| 採集点の `gatherKind` | `"take"｜"chop"｜"mine"` | 生成時 | 発見前は返さない |
| `fieldFloorSummary(area, floor)` | `{ chestsKnown, chestsOpened, gathersKnown, gathersReady }` | 呼び出し時 | 未発見分は数えない（**総数を出さない**） |
| イベント | `field:chest`、`field:gather`（`kind`・`remaining` を追加） | 発生時 | — |

## 6. 報告ルール
- B1 の方式提案はコード変更前に報告し、ユーザーの承認を得る。
- 旧セーブ（saveVersion 10、フィールド導入前、フロア導入前）の読み込みを、テスト用のJSONで検証し、結果を PR に記載する。ユーザーの実データは使わない・上書きしない。
- テスト結果は「確認済み／未確認／問題あり／条件付き」で区別。ブラウザで遊んでいないことを確認済みと書かない。
