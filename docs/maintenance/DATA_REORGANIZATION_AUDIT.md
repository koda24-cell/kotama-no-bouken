# 資料・データ・コードの棚卸しと監査（Phase 1）

- 仕様：`docs/maintenance/CLAUDE_DATA_REORGANIZATION_SPEC.md`
- 基準：最新 `development` **`1dd7ade`**（PR #107 統合後）＋仕様書コミット `d9db26b`（ブランチ `feature/ai-claude-data-reorganization-spec`）
- 調査日：2026-11-08
- 調査者：Claude（統括）、Claude A（資料）、Claude B（固定データ）、Claude C（コード・CSS）
- **この段階では、ファイルの削除・移動・コードの変更は行っていない。**
- 詳細レポート（根拠・行番号つき）：
  - `docs/maintenance/audit/DOCS_AUDIT.md`（Markdown 44件の一覧・古い情報と矛盾・正本・アーカイブ候補）
  - `docs/maintenance/audit/DATA_AUDIT.md`（`data/` の一覧・重複と不整合・分割の試行結果）
  - `docs/maintenance/audit/CODE_AUDIT.md`（`script.js` の構造地図・その他の JS・CSS の上書き関係・分割案）
  - `docs/maintenance/audit/file-sizes.tsv`（全テキストファイルの行数・バイト数）

---

## 1. 主な発見

| # | 発見 | 影響 | 詳細 |
|---|---|---|---|
| 1 | **入口の資料が 11-07 の統合より前で止まっている**。`docs/PROJECT_CURRENT_STATE.md` は「自由移動」「saveVersion 10」「#94/#95/#97 未反映」、`AI_HANDOFF.md` §7 は「#1・#2・#8 未マージ」（実際はすべてマージ済み）、`css/README.md` は「CSS は6ファイル」 | 次に作業する AI が古い前提で作業する | DOCS §3-1・§3-2 |
| 2 | **現状を書く資料が2つあり食い違う**（古い `PROJECT_CURRENT_STATE.md` と、新しく正確な `world-tree-recreation/DEVELOPMENT_INTEGRATION_STATUS.md`） | どちらを信じるか分からない | DOCS §1-2 |
| 3 | **ルール資料どうしの矛盾・重複**：force push の扱い（HANDOFF は「明記なし」、RULES は「原則禁止」）、`?v=` の更新担当（RULES は統合担当、HANDOFF は各PR）、存在しない `TEST_CHECKLIST.md`・`CHANGELOG.md` の指定、RULES §2-5 と `CHATGPT_PROJECT_PROMPT.md` がほぼ同文 | ルールが一意に読めない | DOCS §3-4 |
| 4 | **役目を終えた作業指示書が現行資料と同じ場所にある**（field-and-story の README/CLAUDE_TASK/GPT_TASK、claude-tasks の A/B 指示書、battle-visual-reference/CLAUDE_SPEC）。world-tree-recreation・specs・reviews はどの入口からも案内されていない | 古い指示で作業されるおそれ | DOCS §3-5・§5 |
| 5 | **探索の仕様書（FIELD_SPEC・LABYRINTH_SPEC）が旧構成前提**（一枚ものの field.js、FIELD_ENEMIES が field-maps.js、存在しない敵ID、FOE の「2.5秒停止」）。コードのコメントから6か所以上パスで参照されている | 仕様書と実装の不一致 | DOCS §3-3 |
| 6 | **取れない宝箱が4フロアにある**（2-1・3-0・4-1・5-1：マップの宝箱は1個なのに `chests` が2件。2件目の 110/160/300/450G は入手不能） | ゲームの不具合（値の修正は要承認） | DATA §3-1 |
| 7 | **データの重複**：ステージ名の表記が3通り、BGM 一覧と合成音の楽譜が `script.js` に2回、素材ドロップ表が `script.js:702` に直書き、部位の一覧が `battle-ext.js:488` にも、`growthLabels`・`growthPerPoint` は未使用、混沌の結晶は使い道なし | 修正漏れの原因 | DATA §3-2・§3-3 |
| 8 | **データファイルは読み込み時に互いに依存しない**（15個とも単体で読める、すべてリテラル）。`field-maps.js`・`story.js` は値・キー順を変えずに分割でき、**試行で全56グローバルの一致と全テスト成功を確認済み** | Phase 3 は安全に進められる | DATA §1・§4 |
| 9 | **`script.js`（258KB・2267行・1行が長い）は関数198・トップレベル let/const 51・読み込み時の実行文30**。関数宣言だけを移すなら初期化順の問題はほぼ起きない。ただし状態（let）は `tutorial.js` が8個、`field-interactions.js` が7個を直接書き換えるので `script.js` に残す必要がある | Phase 4 は「関数だけを移す」方針なら可能 | CODE §2 |
| 10 | **未統合 PR との衝突が大きい**：開いている PR 67件のうち `script.js` を変更するもの21件（`style.css` 13件、`css/07` 24件）。UI改修 #105・#106 は既に development（#107）と衝突 | `script.js` の分割は UI PR の統合後でないと危険 | CODE §1・§7 |
| 11 | **CSS の上書きが多重**：実際の読み込み順は 01→07 → `style.css` → 08（README の説明と違う）、2ファイル以上に同じセレクタ90個、`style.css` の `!important` 93個、未使用候補のクラス18個。#103〜#106 がさらに 09〜12 を追加 | CSS の整理は UI 改修 Phase 5 と一緒に行うのが安全 | CODE §4 |
| 12 | **比較・回帰の道具はほぼそろっている**（battle-sim の固定乱数比較 diff=0、world-tree の5テスト、データ比較の試行スクリプト、ui-shots の撮影を乱数・演出固定で2回バイト一致まで確認）。ただし `validate.js` と `battle-sim` は**ファイルの読み込み漏れに気づかない**（階層を1つ消してもエラー0） | 分割時はデータ比較スクリプトを必ず併用する | DATA §4-5、CODE §6 |

## 2. 資料の区分（Markdown 44件）

| 区分 | 件数 | 代表例 |
|---|---|---|
| 現行正本 | 14 | `AI_DEVELOPMENT_RULES.md`、`AI_HANDOFF.md`、`data/README.md`、`field/README.md`、`docs/specs/world-tree-labyrinth-foe/IMPLEMENTATION_NOTES.md`、`docs/battle-visual-refresh/EVENT_SPEC.md`、`world-tree-recreation/MASTER_SPEC.md`、`EO_RULES_CROSSCHECK.md`、`ASSETS_CREDITS.md` |
| 現行補助資料 | 14 | `REFERENCE_GUIDE.md`、`references/**/README.md`、`C1_BALANCE_DESIGN.md`、`GPT_LEGACY_PR_AUDIT.md` |
| 重複 | 1 | `DEVELOPMENT_INTEGRATION_STATUS.md`（`PROJECT_CURRENT_STATE.md` と役割が重複） |
| 旧版・失効 | 6 | `field-and-story/README.md`・`CLAUDE_TASK.md`・`GPT_TASK.md`、`battle-visual-reference/CLAUDE_SPEC.md`、`claude-tasks/CLAUDE_A_LABYRINTH_FOE.md`・`CLAUDE_B_LOOT_GATHER_SAVE.md` |
| 作業記録 | 3 | `docs/reviews/pr26/*.md`（xlsx・テストとセット） |
| 未確定・要確認 | 6 | 動画参考タスク3件（完了したか未確認）、`PROJECT_CURRENT_STATE.md`（内容が古いが正本の位置）など |

全件の表（役割・行数・最終更新・区分・根拠）は DOCS §2。最終更新日は GitHub API で取得（手元は浅いクローンのため `git log` の日付は使っていない）。

## 3. 古い情報・矛盾（抜粋）

| 資料 | 書かれている内容 | 実際（根拠） |
|---|---|---|
| `docs/PROJECT_CURRENT_STATE.md` | 自由移動方式、saveVersion 10、#94/#95/#97 未反映、#92 Draft | グリッド移動（#99 `4be71c4`）、saveVersion 11（`script.js:955`、#100 `ebb9d67`）、#92/#93/#96 は内容を手作業で取り込んで閉じられた |
| `AI_HANDOFF.md` §7 | PR #1・#2・#8 未マージ | 3件とも 11-06 にマージ済み |
| `AI_HANDOFF.md` §4-7 | force push の禁止は明記されていない | `AI_DEVELOPMENT_RULES.md` §2-3 に「原則禁止」 |
| `css/README.md`・`style.css` 冒頭・`AI_HANDOFF.md` | CSS は 01〜05＋style.css、style.css が最後 | 01〜07 → style.css → 08 |
| `FIELD_SPEC.md`・`LABYRINTH_SPEC.md` | 一枚ものの field.js、FIELD_ENEMIES は field-maps.js、saveVersion を10に、敵ID `field-slime`、FOE は逃走後2.5秒停止 | field/ に分割済み、`data/field-enemies.js`、11、存在しない、FOE は移動前のマスへ戻る（#99） |
| `claude-tasks/CLAUDE_A/B_*.md` | development は自由移動、#45 から分岐、採集はホーム帰還で復活が既定 | 完了済み（#99/#100）、採集は実時間30分（ユーザー決定） |
| `data/field-maps.js` 冒頭・`levels.js`・`field.js`・`monster-compendium.js` のコメント | 敵データは field-maps.js にある | `data/field-enemies.js` |
| `data/field-maps.js:477,514` のコメント | `docs/specs/field-side-events/`・`field-puzzles/` を参照 | 存在しない（#38/#45 のブランチにだけある） |
| `AI_DEVELOPMENT_RULES.md` | `TEST_CHECKLIST.md`・`CHANGELOG.md` を共有資料に | 存在しない |

全件は DOCS §3、DATA §3-4。

## 4. 正本と参照先（決定案）

| 話題 | 正本 | 参照する側の扱い |
|---|---|---|
| 全AI共通の開発・Git運用ルール | `AI_DEVELOPMENT_RULES.md` | `CHATGPT_PROJECT_PROMPT.md` は要点とリンク、`AI_HANDOFF.md` §4 はリンク |
| ChatGPT の常設指示 | `CHATGPT_PROJECT_PROMPT.md` | RULES §2-5 と同じ文章を持たない |
| リポジトリの構造・読み込み順・どこを触るか | `AI_HANDOFF.md`（「正は index.html」と明記） | 各 README の冒頭はリンク |
| development の現状・未統合PR・テスト状況 | `docs/PROJECT_CURRENT_STATE.md`（`DEVELOPMENT_INTEGRATION_STATUS.md` の内容を移す） | `AI_HANDOFF.md` §7 は削除してリンク |
| CSS の順番・上書き関係 | `css/README.md` | — |
| 固定データの置き場 | `data/README.md` | — |
| 探索モジュールの分担 | `field/README.md` | — |
| `field:*` イベント・探索の DOM・マップ文字 | `docs/field-and-story/FIELD_SPEC.md`（中身を更新して残す） | — |
| 迷宮システムの概要 | `docs/field-and-story/LABYRINTH_SPEC.md`（更新） | FOE の詳細は下へリンク |
| FOE・扉・隠し通路の詳細ルール | `docs/specs/world-tree-labyrinth-foe/IMPLEMENTATION_NOTES.md` | — |
| 宝箱・採集・saveVersion 11 | **正本が無い**（#100 の実装メモが development に無い） | 作成するか LABYRINTH_SPEC に節を足す（要判断） |
| `battle:*` イベント | `docs/battle-visual-refresh/EVENT_SPEC.md`（コードが参照。移動しない） | — |
| 世界樹再現の方針 | `world-tree-recreation/MASTER_SPEC.md`（#101 統合後は ROADMAP） | — |
| 世界樹の仕様照合 | `claude-tasks/EO_RULES_CROSSCHECK.md` | REFERENCE_GUIDE §3 はリンク |

全件は DOCS §4。

## 5. アーカイブ・削除候補

**アーカイブ（`docs/archive/<元のフォルダ>/<元のファイル名>` へ移動。本文は変えず冒頭に注記3行。`docs/archive/README.md` に一覧）**

| 対象 | 理由 | 後継 | 条件 |
|---|---|---|---|
| `docs/field-and-story/README.md`・`CLAUDE_TASK.md` | 11-06 時点の分担・完了済みタスク | LABYRINTH_SPEC、FIELD_SPEC、MASTER_SPEC | — |
| `docs/field-and-story/GPT_TASK.md` | GPT_LAYOUT_IMPLEMENTATION／#102 に置き換わった | 同左 | PR #21 が open のため、ユーザー確認後 |
| `docs/battle-visual-reference/CLAUDE_SPEC.md` | 実装は EVENT_SPEC。参照先の README・画像が存在しない | EVENT_SPEC | — |
| `claude-tasks/CLAUDE_A_LABYRINTH_FOE.md`・`CLAUDE_B_LOOT_GATHER_SAVE.md` | 完了（#99・#100） | 実装メモ・LABYRINTH_SPEC | — |
| `world-tree-recreation/DEVELOPMENT_INTEGRATION_STATUS.md` | PROJECT_CURRENT_STATE と重複 | PROJECT_CURRENT_STATE | 内容を移した後 |
| 動画参考タスク3件（battle-visual-refresh） | 完了したか未確認 | — | ユーザーが完了と判断した場合のみ |

移動でリンク切れになる参照元は3か所（DOCS §5-3 に書き換え先）。`FIELD_SPEC`・`LABYRINTH_SPEC`・`EVENT_SPEC` はコードから参照されているので移動しない。

**削除候補：なし。**（Markdown・データ・コードとも、削除は提案しない。未使用の定義の削除はユーザー判断事項として別に挙げる）

## 6. 長大ファイル（上位）

| ファイル | 行数 | サイズ | 判断 |
|---|---|---|---|
| `script.js` | 2267 | 258KB | **分割する**（関数だけを機能単位で。UI PR 統合後に小さく段階的に） |
| `battle-ext.js` | 858 | 51KB | 今回は分割しない（7節に整理済み、開いている PR が多い） |
| `css/01-battle-base.css`・`style.css`・`css/02`・`05` | 224〜475 | 20〜40KB | 今回は分割しない（UI 改修 Phase 5 で整理） |
| `field/field-interactions.js` | 559 | 38KB | 今回は分割しない（2週間以内に分割済みのモジュール。必要なら [SIDE]/[LOOT] を別ファイルに。保留） |
| `data/field-maps.js` | 541 | 35KB | **分割する**（階層別5ファイル＋基底） |
| `data/story.js` | 435 | 28KB | **分割する**（種類別4ファイル＋基底） |
| `tools/world-tree/loot_test.js` | 238 | 28KB | 分割不要（テスト） |
| その他の `data/*`（items・jobs・status-effects・field-enemies など） | 〜77 | 〜12KB | 分割不要（DATA §5 に理由） |
| 長い Markdown（`C1_BALANCE_DESIGN.md` 193行、`AI_DEVELOPMENT_RULES.md` 436行） | — | — | 分割しない（章立てで十分。RULES は重複を減らす） |

全ファイルの一覧は `audit/file-sizes.tsv`。
