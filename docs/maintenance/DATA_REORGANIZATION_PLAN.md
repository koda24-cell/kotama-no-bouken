# 資料・データ・コードの整理計画（Phase 1 の計画）

- 監査結果：`docs/maintenance/DATA_REORGANIZATION_AUDIT.md`（詳細は `docs/maintenance/audit/`）
- 基準：`development` `1dd7ade`
- 原則（仕様書 §2・§4）：**値・ID・キー・配列順・セーブ形式・saveVersion を変えない。** クラシックスクリプト方式を維持（ES Modules・ビルドなし）。小さな PR に分ける。マージはユーザー

---

## 1. 推奨フォルダ構成（整理後）

```text
AI_DEVELOPMENT_RULES.md      # 全AI共通ルール（正本）
AI_HANDOFF.md                # 構造・読み込み順・どこを触るか（正本。「正は index.html」）
CHATGPT_PROJECT_PROMPT.md    # ChatGPT 常設指示（要点＋リンク）
ASSETS_CREDITS.md
docs/
  PROJECT_CURRENT_STATE.md   # development の現状・未統合PR・テスト状況（正本。統合状況の資料を吸収）
  archive/                   # 新設：役目を終えた資料（元のフォルダ構成を保つ）
    README.md                #   一覧・移動日・後継の資料
    field-and-story/  battle-visual-reference/  world-tree-recreation/...
  field-and-story/           # FIELD_SPEC・LABYRINTH_SPEC（中身を現行に更新。場所は変えない）
  battle-visual-refresh/     # EVENT_SPEC（コードが参照）ほか
  specs/                     # 実装メモ
  world-tree-recreation/     # 世界樹再現の方針・照合表・分析
  maintenance/               # 本整理の仕様・監査・計画
  reviews/                   # 作業記録（そのまま保存）
data/
  field-maps.js              # 基底（説明と空の入れ物）
  field-area-1.js 〜 field-area-5.js   # 新設：階層ごとのマップ・物・サブイベント・仕掛け
  story.js                   # 基底（話者と空の入れ物）
  story-main.js  story-side.js  story-puzzle.js  story-common.js   # 新設：会話の種類別
  （その他の data/*.js は変更なし）
script.js                    # 状態・初期化・共通の小関数・起動処理だけを残す（約14KB）
game/                        # 新設（Phase 4）：audio・progress・story・screens・formation・shop・training・save・nav
battle/                      # 新設（Phase 4）：calc・fx・render・turn・enemy・flow・input
tools/
  data-check/                # 新設：分割前後のデータ比較（load.js・compare.js）、index.html の参照検査
```

## 2. 分割対象と方式

### 2-1. `data/field-maps.js` → 基底＋階層別5ファイル（Phase 3）
- 基底（`data/field-maps.js`）：冒頭の説明、`const FIELD_AREAS = {};` などの空の入れ物
- `data/field-area-1.js`〜`-5.js`：`FIELD_AREAS[n] = { ... };` と、その階層の `FIELD_SIDE_EVENTS`・`FIELD_PUZZLES` を `Object.assign(...)` で追加（各約100行）
- 階層のキーは整数なので列挙順は今と同じ。文字列キー（サブイベント・仕掛け）は元のファイルの上から順に読み込むことで順番を保つ
- ファイル名を `data/field-` で始めるので、`tools/world-tree/harness.js`（index.html の順で `data/field-*` を読む）は変更不要
- フロア単位までは分けない（1階層の3フロアは同じ物・仕掛けを共有するため）

### 2-2. `data/story.js` → 基底＋種類別4ファイル（Phase 3）
- 基底：話者の定義と `const STORY_SCENES = {}`
- `story-main.js`（本編）・`story-side.js`（サブイベント `side-*`）・`story-puzzle.js`（仕掛け `pz-*`）・`story-common.js`（その他）
- 案B（種類別）ならキー順まで完全一致。案A（階層別）は会話の並び順が変わる（ID で引くだけなので動作は同じ）

### 2-3. `script.js` → 関数を機能別ファイルへ（Phase 4）
- **関数宣言だけを、行単位でそのまま移す**（書き換え・整形・改名なし）。各ファイル先頭に `"use strict";`
- **`script.js` に残す**：トップレベルの let/const（状態）、先頭74行の初期化、`$`/`esc`、能力値計算、DOMContentLoaded の起動処理（他ファイルが状態を直接書き換えるため。TDZ・再宣言・初期化順の問題を避ける）
- 読み込み時に動く処理（699行目の `registerCharacterLevel` 参照、document へのイベント登録6件）は、移す先のファイルが同じ順番で実行されるよう配置する
- 分割単位（案）：
  - `game/`：audio・progress（699行目を含む）・story・screens・formation・shop・training・save・nav
  - `battle/`：calc・fx・render・turn・enemy・flow・input
- 読み込み順（最終形）：`battle-ext.js` → `script.js` → `game/*` → `battle/*` → `tutorial.js` 以降

### 2-4. 分割しないもの
- `battle-ext.js`（7節に整理済み・開いている PR が多い）、CSS（UI 改修 Phase 5 で整理）、`field/*`（分割済み）、その他の `data/*`（小さい・責務が1つ。`items.js` は実行時に他のコードが配列を共有して書き換えるので分けると危険）

## 3. 依存関係・読み込み順

- データファイルは読み込み時に互いに依存しない（すべてリテラル）。順番が効くのはロジックが実行時に参照するところだけ
- `index.html` の `<script>` は `defer`（クラシック）。基底ファイルを追加ファイルより前に置く
- `script.js` の状態を書き換える他ファイル：`tutorial.js`（8個）、`field/field-interactions.js`（7個）→ 状態は `script.js` に残す
- 詳細：DATA §2・§4-3、CODE §2-3・§2-4・§5-3

## 4. 移動対応表

### 4-1. 資料（Phase 2）
| 旧 | 新 | 理由 |
|---|---|---|
| `docs/field-and-story/README.md` | `docs/archive/field-and-story/README.md` | 失効 |
| `docs/field-and-story/CLAUDE_TASK.md` | `docs/archive/field-and-story/CLAUDE_TASK.md` | 完了 |
| `docs/field-and-story/GPT_TASK.md` | `docs/archive/field-and-story/GPT_TASK.md` | 失効（#21 確認後） |
| `docs/battle-visual-reference/CLAUDE_SPEC.md` | `docs/archive/battle-visual-reference/CLAUDE_SPEC.md` | EVENT_SPEC に後継 |
| `docs/world-tree-recreation/claude-tasks/CLAUDE_A_LABYRINTH_FOE.md` | `docs/archive/world-tree-recreation/claude-tasks/…` | 完了（#99） |
| `docs/world-tree-recreation/claude-tasks/CLAUDE_B_LOOT_GATHER_SAVE.md` | 同上 | 完了（#100） |
| `docs/world-tree-recreation/DEVELOPMENT_INTEGRATION_STATUS.md` | `docs/archive/world-tree-recreation/…`（内容は PROJECT_CURRENT_STATE へ） | 重複 |

### 4-2. データ（Phase 3）
| 旧 | 新 |
|---|---|
| `data/field-maps.js` の階層1〜5（`FIELD_AREAS[1..5]` と、その階層の `FIELD_SIDE_EVENTS`・`FIELD_PUZZLES`） | `data/field-area-1.js`〜`-5.js`（行範囲は DATA §4-1） |
| `data/field-maps.js` の冒頭説明・入れ物 | `data/field-maps.js`（基底として残す） |
| `data/story.js` の本編・`side-*`・`pz-*`・その他 | `data/story-main.js`・`story-side.js`・`story-puzzle.js`・`story-common.js`（行範囲は DATA §4-2） |

### 4-3. コード（Phase 4、段階ごとに確定）
CODE §5-2 の表（機能 → 行範囲 → 新ファイル）。各段階の PR で「旧 `script.js` の行 → 新ファイル」の対応表を必ず書く。

## 5. 実施順（段階）

| 段階 | 内容 | 値の変更 | 前提 | 競合 |
|---|---|---|---|---|
| **2-① 入口資料の更新** | `PROJECT_CURRENT_STATE.md`（統合状況を吸収し、現状に合わせる）、`AI_HANDOFF.md`（§7 を削除してリンク、§4-7 の誤りを修正、CSS の読み込み順、正本の一覧）、`css/README.md`（01〜08 と実際の順）、`data/README.md`・`field/README.md` の補足 | なし | — | `css/README.md`・`AI_HANDOFF.md` は UI PR 統合時に 09〜12 を追記 |
| **2-② 仕様書の更新** | `FIELD_SPEC.md`・`LABYRINTH_SPEC.md` を現行に（場所は変えない）、RULES と CHATGPT_PROJECT_PROMPT の重複整理、存在しない参照の修正 | なし | ユーザー判断 1〜3 | 小 |
| **2-③ アーカイブ移動** | §4-1 の移動、`docs/archive/README.md`、参照元3か所の書き換え | なし | ユーザー判断 4・5 | 小 |
| **3-0 比較ツール** | `tools/data-check/`（分割前後の全グローバルの JSON 比較・件数・index.html の参照と順番の検査） | なし | — | なし |
| **3-1 コメントの修正** | data・field.js・monster-compendium.js などの古いコメント（DATA §3-4） | なし（挙動不変） | — | 小 |
| **3-2 field-maps.js の分割** | §2-1 | なし | 3-0 | 旧 PR #94・#95・#49・#45・#38・#21 とほぼ確実に衝突 |
| **3-3 story.js の分割** | §2-2 | なし | 3-0、判断 9 | 同上 |
| **4-0** | UI PR（#103 → #104 → #106 → #105）の統合（#105・#106 は最新 development に取り込み直してから） | — | ユーザー | — |
| **4-1 battle-calc** | 純粋な計算を `battle/calc.js` へ（最も安全。UI PR が触らない・固定乱数比較で直接確かめられる） | なし | 4-0 推奨 | `script.js` を触る PR 21件 |
| **4-2〜4-5** | 戦闘系（fx・render・turn・enemy・flow・input） | なし | 4-1 | 同上 |
| **4-6〜4-8** | 音・ストーリー・実績、セーブ（JSON 比較が必須）、ボタン配線 | なし | — | 同上 |
| **4-9** | ホーム・編成・ショップ・育成（#105 の統合後、最後） | なし | #105 統合 | #105 |
| **別途（要承認）** | 値の修正：取れない宝箱、ステージ名の統一、未使用の定義の削除、敵の素早さ・ボス名の `enemies.js` への移動 | **あり** | ユーザー判断 6〜8 | 分割とは別の PR |
| **5 最終検証** | 全段階の差分確認、リンク切れ・参照先・古い PR 状態の残存検査、テスト一式 | — | — | — |

**今すぐ着手できる（ユーザー判断を待たずに安全）**：2-①（事実の誤りの修正のみ）、3-0（比較ツールの追加）、3-1（コメントのみ）

## 6. テスト方法（各段階）

| 対象 | 方法 |
|---|---|
| JS 構文 | 追加・変更したすべての JS に `node --check` |
| データ | `tools/data-check/compare.js <基準> <作業ブランチ>`：全グローバルの JSON 比較・件数・キー順で「すべて一致」 |
| index.html | 参照先の存在・重複なし・基底が追加より前、`?v=` は最新 development の最大値より大きい値で一貫 |
| 迷宮 | `tools/world-tree`：`test_basic`・`test_puzzles`・`test_flee`（成功）、`loot_test`（64 PASS）、`validate`（エラー0・注意3）※読み込み漏れは data-check で確認 |
| 戦闘 | `tools/battle-sim/tests.js`（43件成功）、`regress.js <基準> <作業ブランチ>`（固定乱数の戦闘ログ diff=0） |
| 画面 | `tools/ui-shots`（#103 で追加。乱数・演出を固定した撮影で、分割前後のバイト一致を確認） |
| セーブ | 新規・既存（v10・v11）のセーブを読み込んで再保存し、JSON が一致すること（saveVersion は変えない） |
| チュートリアル | 撮影スクリプトで最後まで進むこと |
| Markdown | 相対リンク切れ・古いブランチ名・古い PR 状態の残存を grep で検査 |
| 実機 | ブラウザ・iPhone で確認していない場合は「未確認」と明記 |

## 7. リスク

| リスク | 症状 | 対策 |
|---|---|---|
| 基底より先に追加ファイルを読む | `ReferenceError`、その階層・会話が丸ごと消える | index.html の順番を data-check で検査 |
| 追加ファイルの読み込み漏れ・404 | 後ろの階層に行けない、会話が出ない（validate・battle-sim は気づかない） | data-check の件数比較を必須に |
| 追加ファイルで `const` を再宣言 | SyntaxError でファイル全体が無効（`node --check` では見つからない） | data-check で全ファイルを順に読み込んで検査 |
| `script.js` の関数移動で初期化順が変わる | ボタンが反応しない、イベントが二重登録 | 関数宣言だけを移す。読み込み時の処理は同じ順番を保つ。撮影・固定乱数比較 |
| 未統合 PR との衝突 | 旧 PR が統合できなくなる | UI PR を先に統合。旧 PR の扱いを先に決める（判断 10） |
| 分割と値の修正を混ぜる | レビュー不能 | 値の修正は必ず別 PR |

## 8. ユーザーに決めていただくこと

| # | 決めること | 選択肢 | 推奨 |
|---|---|---|---|
| 1 | `?v=` の更新担当 | 統合担当がまとめて／各 PR で最大値＋1 | **各 PR で最大値＋1**（並行作業が多いため。衝突時は大きい方を残す） |
| 2 | `TEST_CHECKLIST.md`・`CHANGELOG.md` | 作る／RULES から記述を削る | **記述を削る**（PR 本文とこの監査で代替） |
| 3 | RULES §2-5 と CHATGPT_PROJECT_PROMPT の重複 | RULES を本文にし、PROMPT は要約＋リンク／現状 | **RULES を本文に**（存在しない `feature/gpt-work` の記述も現状に合わせる） |
| 4 | §5 のアーカイブを実施するか | する／しない | **する**（GPT_TASK は #21 の扱いを決めてから） |
| 5 | DEVELOPMENT_INTEGRATION_STATUS | 内容を移してアーカイブ／短い案内として残す | **移してアーカイブ** |
| 6 | 宝箱・採集・saveVersion 11 の正本 | #100 の実装メモを取り込む／LABYRINTH_SPEC に節を足す | **LABYRINTH_SPEC に節を足す** |
| 7 | 取れない宝箱（4フロア） | データの余分を消す（挙動不変）／マップに宝箱を戻す（報酬が増える）／現状 | **マップに宝箱を戻す**（意図された報酬の可能性が高い）。分割とは別の PR |
| 8 | ステージ名の正式表記（3通り） | 「はじまりの樹海」系／「樹海の入り口」系／その他 | 迷宮の名前（「はじまりの樹海」系）に統一 |
| 9 | `story.js` の分け方 | 種類別（案B、キー順も一致）／階層別（案A） | **案B** |
| 10 | 内容は統合済みなのに開いたままの PR（#24・#38・#45・#94・#95・#97 など）と、`script.js` を触る残り19件 | 閉じる／参照用に残す | 統合済みのものは**閉じる**（分割後はほぼ確実に衝突するため） |
| 11 | UI PR（#103〜#106）を `script.js` の分割より先に統合するか | 先に統合／分割を先に | **UI PR を先に** |
| 12 | 分割中、他の AI に `script.js` の変更を控えてもらうか | 控えてもらう／控えない | **控えてもらう**（各段階の PR が開いている間） |
| 13 | フォルダ名 `game/`・`battle/` | このまま／別名 | このまま |
| 14 | 使われていない定義の削除（`growthLabels`・`growthPerPoint`、#47 前提の別名など） | 削除／残す | 分割の後に別 PR で削除 |
| 15 | 敵の素早さ・ボス名を `enemies.js` へ移す | 移す（値は不変）／残す | 移す（Phase 3 の任意段階） |
| 16 | 動画参考タスク3件は完了か | 完了／未完了 | 要確認 |
