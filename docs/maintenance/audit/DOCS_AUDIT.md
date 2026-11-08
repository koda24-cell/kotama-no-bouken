# A_DOCS_AUDIT：Markdown 資料・ドキュメント監査（Phase 1）

- 担当：Claude A（資料の監査担当）／読み取りのみ。リポジトリ内のファイルは一切変更していない
- 調査対象：`/home/claude/wt-reorg`（ブランチ `feature/ai-claude-data-reorganization-spec`＝development `1dd7ade` ＋仕様書 `d9db26b`）
- 準拠：`docs/maintenance/CLAUDE_DATA_REORGANIZATION_SPEC.md` §3-1・§3-2・§4-1〜§4-3・§7
- 調査日：2026-11-08
- 根拠の取り方：現行コード（`index.html`・`script.js`・`field.js`・`field/*.js`・`data/*.js`）の grep、GitHub REST API（PR の状態・各ファイルの最終コミット）、`git log`
- **注意（日付）**：ローカルのクローンは shallow（23 コミット）で、`git log -1 -- <path>` は大半が境界コミット `6b5ad79`（2026-11-07）を返す。下表の「最終更新」は GitHub API（`commits?path=`）で取った **本当の最終コミット**を載せた

---

## 1. 概要

### 1-1. 件数

| 区分 | 件数 | 対象 |
|---|---|---|
| 現行正本 | 14 | ルート4件、フォルダREADME 3件（data/css/field）、PROJECT_CURRENT_STATE、FIELD_SPEC、LABYRINTH_SPEC、EVENT_SPEC、MASTER_SPEC、再編成仕様書、references/README |
| 現行補助資料 | 14 | 実装メモ2件、世界樹の補助資料4件（CLAUDE_GAMEPLAY・GPT_LAYOUT・REFERENCE_GUIDE・EO_RULES_CROSSCHECK）、references/etrian_odyssey 以下8件 |
| 重複 | 1 | DEVELOPMENT_INTEGRATION_STATUS（PROJECT_CURRENT_STATE と役割重複）。※ REFERENCE_GUIDE は §3 だけが EO_RULES_CROSSCHECK と重複（ファイルとしては補助資料に数えた） |
| 旧版・失効 | 6 | field-and-story の README／CLAUDE_TASK／GPT_TASK、battle-visual-reference/CLAUDE_SPEC、claude-tasks の A／B 指示書 |
| 作業記録 | 3 | reviews/pr26 の 2 件、GPT_LEGACY_PR_AUDIT |
| 未確定・要確認 | 6 | 動画参考タスク3件、IMPLEMENTATION_SPEC、C1_BALANCE_DESIGN、CLAUDE_C 指示書 |
| **合計** | **44** | ＋ `docs/reviews/pr26/` の xlsx 2件・テストスクリプト 3件（作業記録・付属物） |

※「現行正本」でも中身が古いものが多い（区分は**役割**で付け、古さは §3 に分けて書いた）。

### 1-2. 主な発見 5 つ

1. **入口の3資料（`AI_HANDOFF.md`・`docs/PROJECT_CURRENT_STATE.md`・`css/README.md`）が、2026-11-07 12時台の Claude A/B 統合（#99 `4be71c4`／#100 `ebb9d67`）より前で止まっている。**
   - PROJECT_CURRENT_STATE：「自由移動方式」「`saveVersion: 10`」「#94/#95/#97 未反映」「#92 Draft」と書いているが、実際はグリッド移動、`saveVersion:11`（`script.js:955`）、#99/#100 マージ済み、#92/#93/#96 は未マージで close（内容は手作業で取り込み済み）。
   - AI_HANDOFF §7「現在進行中の作業（2026-11-06 時点）」は PR #1・#2・#8 を「未マージ」としているが、3件とも 2026-11-06 02:22 にマージ済み。
   - css/README は「6ファイル（01〜05＋style.css）」の前提のまま。実際は 06・07・08 が増えており、しかも **08-cartography-ui.css は style.css の後に読み込まれる**（`index.html:14-15`）。「迷ったら style.css の末尾」という案内は、08 については誤り。
2. **現状を書く資料が2つに分かれている。** `docs/PROJECT_CURRENT_STATE.md`（古い）と `docs/world-tree-recreation/DEVELOPMENT_INTEGRATION_STATUS.md`（新しく正確）が同じ役割を持ち、内容が食い違う。どちらからもう一方への案内がない。DEVELOPMENT_INTEGRATION_STATUS の内容を PROJECT_CURRENT_STATE に移して一本化すべき。
3. **探索の仕様書（FIELD_SPEC・LABYRINTH_SPEC）と世界樹の作業指示書が、旧構成を前提にしたまま現行仕様として参照されている。**
   - 一枚ものの `field.js`、自由移動、`FIELD_ENEMIES` が `data/field-maps.js` の末尾にある前提、`saveVersion` を 10 にする記述、敵ID `field-slime`（実際は `stray-slime`）、FOE は「逃げると 2.5 秒停止」（実際はターン制で FOE が元のマスに戻る）など。
   - コード側のコメント（`field.js:6`、`data/field-maps.js:5`、`index.html:210`、`css/06-field.css:4`、`analyze-panel.js:8`、`data/story.js:5`）がこの2つの仕様書のパスを指しているため、**ファイルの移動はせず、中身を更新する**のがよい。
4. **ルール資料どうしに矛盾と重複がある。**
   - AI_HANDOFF §4-7 は「force push の禁止は現行ルールに明記されていない」と書いているが、AI_DEVELOPMENT_RULES §2-3 には「強制プッシュや履歴の書き換えは原則禁止する」と明記されている。
   - AI_DEVELOPMENT_RULES §2-5 は CHATGPT_PROJECT_PROMPT の本文とほぼ同じ。
   - AI_DEVELOPMENT_RULES は、存在しない `TEST_CHECKLIST.md`・`CHANGELOG.md` を正式な共有資料として指定している。
   - AI_DEVELOPMENT_RULES の状態は「正式版候補・ユーザー最終承認前」のまま（PR #1 はマージ済み。正式に承認されたかは未確認）。
5. **役目を終えた作業指示書が、現行資料と同じ場所に置かれている。**
   - `claude-tasks/CLAUDE_A_LABYRINTH_FOE.md`・`CLAUDE_B_LOOT_GATHER_SAVE.md`（#99/#100 で完了）。「development は自由移動」「#45 から分岐せよ」「`FIELD_ENEMIES` は field-maps.js 末尾」「採集の再出現の既定はホーム帰還」と書いているが、どれも現状と違う（実際は実時間30分、ユーザーが 2026-11-07 に決定）。
   - `field-and-story/README.md`・`CLAUDE_TASK.md`・`GPT_TASK.md`（フェーズ1は #16〜#18 で完了。自由移動・ランダムエンカウントの初期設計）。
   - `battle-visual-reference/CLAUDE_SPEC.md`（EVENT_SPEC が後継。存在しない「同フォルダの README.md、REF-01〜03」を参照）。
   - これらは `docs/archive/` への移動候補。
   - どの入口資料からも案内されていない「孤立した資料」も多い：docs/world-tree-recreation 一式、docs/specs 2件、docs/reviews、動画参考タスク3件。

---

## 2. 資料一覧表（44件）

凡例：行数は `sizes.tsv`／`wc -l`。最終更新は GitHub API の最終コミット（短縮SHA・UTC日時）。

### 2-1. ルート・フォルダ README

| # | ファイル | 役割 | 行数 | 最終更新 | 区分 | 照合結果（要点） |
|---|---|---|---|---|---|---|
| 1 | `AI_DEVELOPMENT_RULES.md` | 全AI共通の開発・Git運用ルール | 436 | `616e9c5` 11-06 02:48 | 現行正本 | 状態表記が「承認前」。TEST_CHECKLIST/CHANGELOG が存在しない。§2-5 は CHATGPT_PROJECT_PROMPT と重複。コミット形式 `[claude]` と実際の運用（`[Claude]`/`[GPT]`/無印）が不一致 |
| 2 | `AI_HANDOFF.md` | リポジトリの地図・読み込み順・注意点 | 134 | `d9dfdbd` 11-07 04:55 | 現行正本（要全面更新） | §2 の CSS 順・field 構成が古い、§3 に採集・仕掛け・図鑑・tools が無い、§4-3 の `[EXT]` 15か所は実際21、§4-7 がルールと矛盾、§7 が 11-06 時点のまま |
| 3 | `ASSETS_CREDITS.md` | 素材の出典・ライセンス台帳 | 105 | `1f59574` 11-06 07:50 | 現行正本 | 迷宮BGM 5曲は `data/field-maps.js` の `bgm` と一致（確認済み）。ライセンスは全件「要確認」のまま（内容の正否は未確認） |
| 4 | `CHATGPT_PROJECT_PROMPT.md` | ChatGPT 向け常設指示 | 35 | `b81237e` 11-06 02:48 | 現行正本 | 内容は RULES §2-5 と重複。現状と矛盾する記述は無し |
| 5 | `css/README.md` | CSS フォルダ案内 | 33 | `408a37e` 11-06 02:09 | 現行正本（要更新） | 06・07・08 の記載なし。08 が style.css の後に読まれる事実と矛盾 |
| 6 | `data/README.md` | data フォルダ案内 | 58 | `ebb9d67` 11-07 12:22 | 現行正本 | ほぼ最新。早見表に field-*／story／gathering が無い。`monster-compendium.js` の記載なし（軽微） |
| 7 | `field/README.md` | field フォルダ案内 | 26 | `4be71c4` 11-07 12:18 | 現行正本（軽微な更新） | 7モジュール・読み込み順は `index.html:37-44` と一致。末尾「セーブ形式を変更しません」は #100 で saveVersion 11 になったので古い。persistence の担当欄に `[LOOT]` 保存が無い |
| 8 | `docs/PROJECT_CURRENT_STATE.md` | development の現状・未統合PR | 67 | `21a0017` 11-07 04:50 | 現行正本（要全面更新） | §2「自由移動」「saveVersion 10」、§3 の PR 表、§5 の推奨作業順がすべて古い（§3 参照） |

### 2-2. docs/battle-visual-*

| # | ファイル | 役割 | 行数 | 最終更新 | 区分 | 照合結果 |
|---|---|---|---|---|---|---|
| 9 | `docs/battle-visual-reference/CLAUDE_SPEC.md` | 戦闘状態・演出トリガー連携の Claude 仕様（要求） | 70 | `dc08fd3` 11-06 03:32 | 旧版・失効 | 実装結果は EVENT_SPEC（#13 マージ済み）にある。参照先「同フォルダの README.md、REF-01〜REF-03」が存在しない |
| 10 | `docs/battle-visual-refresh/CLAUDE_VIDEO_REFERENCE_TASK.md` | 動画参考UIの Claude 作業指示 | 58 | `9e7a5dc` 11-06 06:46 | 未確定・要確認 | 対応する Claude の実装PRを特定できず、完了したかどうか未確認 |
| 11 | `docs/battle-visual-refresh/EVENT_SPEC.md` | `battle:*` イベント仕様（実装済み） | 88 | `48bb279` 11-06 04:08 | 現行正本（要追記） | 実装は `battle-ext.js:770` 付近・`script.js` に存在。`battle:status:resist`（C2で追加）と、新状態ID `sleep`/`confusion`/`bindHead`/`bindArm`/`bindLeg` の記載なし。「実装は `feature/claude-battle-events`」は #13 でマージ済み |
| 12 | `docs/battle-visual-refresh/GPT_VIDEO_REFERENCE_TASK.md` | 動画参考UIの GPT 作業指示 | 58 | `9e7a5dc` 11-06 06:46 | 未確定・要確認 | #15（スキル画面・イベントログ）はマージ済み。他の項目が完了したかは未確認 |
| 13 | `docs/battle-visual-refresh/IMPLEMENTATION_SPEC.md` | 戦闘演出・UI刷新の文章仕様（GPT） | 142 | `48cc3f6` 11-06 03:17 | 未確定・要確認 | REF-01〜03 の画像はリポジトリに無い。どこまで実装されたか未確認。#102〜#106（UI全面改修）と関係する可能性 |
| 14 | `docs/battle-visual-refresh/VIDEO_REFERENCE_TASKS.md` | 動画参考の担当別まとめ | 81 | `9e7a5dc` 11-06 06:46 | 未確定・要確認 | #10・#11 の親。完了したかは未確認 |

### 2-3. docs/field-and-story

| # | ファイル | 役割 | 行数 | 最終更新 | 区分 | 照合結果 |
|---|---|---|---|---|---|---|
| 15 | `docs/field-and-story/CLAUDE_TASK.md` | フィールド初期実装の Claude 指示 | 54 | `c9cff3f` 11-06 07:33 | 旧版・失効 | #16〜#18 で完了。C2「8方向・ピクセル単位の自由移動」は現行（グリッド）と反対の内容 |
| 16 | `docs/field-and-story/FIELD_SPEC.md` | `field:*` イベント・DOM・データ形式の共通仕様 | 193 | `1f59574` 11-06 07:50 | 現行正本（要大幅更新） | コード6か所から参照されている。§1・§4-1・§5 が古い（§3 参照） |
| 17 | `docs/field-and-story/GPT_TASK.md` | フィールドの見た目の GPT 指示 | 46 | `c9cff3f` 11-06 07:33 | 旧版・失効（要確認） | 対応PRは #19（未マージ close）と #21（open・Draft）。世界樹化後は GPT_LAYOUT_IMPLEMENTATION／#102 が後継とみられる |
| 18 | `docs/field-and-story/LABYRINTH_SPEC.md` | 迷宮システム（階層・視界・FOE・採集・レベル） | 81 | `ebb9d67` 11-07 12:22 | 現行正本（要更新） | 採集の行だけ #100 で更新された。FOE の行・担当ファイル欄・§2 の「field.js が追加」は古い |
| 19 | `docs/field-and-story/README.md` | フィールド作業の分担・進捗 | 124 | `c4f2c85` 11-06 08:37 | 旧版・失効 | 進捗は 11-06 時点。§1 の流れ（自由移動・エリア単位）、§6 のフェーズ1cのバランス表は、LABYRINTH §5 と C1 に置き換わっている |

### 2-4. docs/maintenance・reviews・specs

| # | ファイル | 役割 | 行数 | 最終更新 | 区分 | 照合結果 |
|---|---|---|---|---|---|---|
| 20 | `docs/maintenance/CLAUDE_DATA_REORGANIZATION_SPEC.md` | 本整理作業の仕様 | 284 | `d9db26b` 11-08 05:38 | 現行正本 | 成果物2件（AUDIT/PLAN）は作成予定のため未作成（正常） |
| 21 | `docs/reviews/pr26/CLAUDE_A_PR27_VERIFICATION.md` | PR #27 の独立検証 | 117 | `d4adbd2` 11-06 13:47 | 作業記録 | 結論「A-01 一部未解決」。その後 #107 が「確定直後の連打入力シールド」を移植している。再検証したかは未確認 |
| 22 | `docs/reviews/pr26/CLAUDE_A_PROCESS_REVIEW.md` | PR #26 の処理レビュー | 63 | `26252b8` 11-06 13:07 | 作業記録 | #26 は未マージで close。#107 が後継 |
| 23 | `docs/specs/monster-compendium/IMPLEMENTATION_NOTES.md` | 図鑑の実装メモ | 104 | `334ffda` 11-06 14:35 | 現行補助資料 | 「`FIELD_ENEMIES` は data/field-maps.js」→ 実際は `data/field-enemies.js`。仕様の参照先 `docs/ai-tasks/...`（別ブランチ `docs/claude-development-specs`＝#32 open）は development に無い。§9「field.js は Claude B 担当」は旧分担 |
| 24 | `docs/specs/world-tree-labyrinth-foe/IMPLEMENTATION_NOTES.md` | Claude A（#99）の実装メモ：グリッド・扉・FOE AI | 106 | `4be71c4` 11-07 12:18 | 現行補助資料 | 現行コードと一致（確認済み：`FIELD_FOE_RULES`、`fieldCanEnter`、`field-puzzles.js` など）。**FOE の詳しい仕様の実質的な正本**。LABYRINTH_SPEC の FOE 行より新しい |

### 2-5. docs/world-tree-recreation

| # | ファイル | 役割 | 行数 | 最終更新 | 区分 | 照合結果 |
|---|---|---|---|---|---|---|
| 25 | `MASTER_SPEC.md` | 世界樹再現の共通方針・分担 | 137 | `20446e0` 11-07 09:32 | 現行正本 | 方針資料として有効。「視界半径 目安4マス／約4マス」は実際の値 `FIELD_VISION = 3.6` と表現がずれる（変えないという意味では矛盾しない）。§8「#66〜#91 は未統合の可能性」は現在も正しい（open） |
| 26 | `CLAUDE_GAMEPLAY_IMPLEMENTATION.md` | Claude 側のロジック指示 | 106 | `7ce13e7` 11-07 09:32 | 現行補助資料 | §2-A/B/C は #99/#100 で大半を実装済み。§3（バランス）は未完了。進み具合の記載が無い |
| 27 | `GPT_LAYOUT_IMPLEMENTATION.md` | GPT 側の地図UI指示 | 79 | `9085b65` 11-07 09:32 | 現行補助資料（要確認） | #98 で一部実装。§4「`field.js` の描画処理」は旧構成（現行は `field/field-render.js`）。#102（GPT UI 仕様書）が後継になる可能性 |
| 28 | `REFERENCE_GUIDE.md` | 公式URL・調査ルール・照合表の枠 | 56 | `543f5e4` 11-07 09:32 | 現行補助資料（§3 は重複） | §3 の照合表は全項目「未調査／要調査」のまま。記入済みの版が EO_RULES_CROSSCHECK |
| 29 | `DEVELOPMENT_INTEGRATION_STATUS.md` | 統合状況・テスト状況・プレビューURL | 53 | `44c69e5` 11-07 12:24 | 重複（ただし最新） | PROJECT_CURRENT_STATE と同じ役割。内容はこちらが正確（#97 C2・#98・#99・#100 を反映）。#101〜#107 は載っていない |
| 30 | `GPT_LEGACY_PR_AUDIT.md` | GPT 旧PR #79〜#91 の監査 | 61 | `b6f7f44` 11-07 11:57 | 作業記録 | 監査結果として有効。「次の作業順 1. Claude A の実装を受け取る」は #99 で完了済み |
| 31 | `claude-tasks/C1_BALANCE_DESIGN.md` | 難易度の計測と変更予定値（未適用） | 193 | `9e70a3f` 11-07 09:30 | 未確定・要確認 | 承認待ち。計測は A/B 統合前（ベース `5213192`）。§5-2「`FIELD_ENEMIES` は data/field-maps.js 末尾」は古い。FOE の移動・逃走が変わったので再計測が要るかは未確認 |
| 32 | `claude-tasks/CLAUDE_A_LABYRINTH_FOE.md` | Claude A 指示書 | 95 | `9d32b36` 11-07 09:32 | 旧版・失効 | #99 で完了。§0・§1・§3 が旧構成前提（下の §3 参照） |
| 33 | `claude-tasks/CLAUDE_B_LOOT_GATHER_SAVE.md` | Claude B 指示書 | 85 | `34ea7c4` 11-07 09:32 | 旧版・失効 | #100 で完了。saveVersion 10 前提、再出現方式の既定 (a) は不採用（実時間30分に決定） |
| 34 | `claude-tasks/CLAUDE_C_BATTLE_BALANCE_STATUS.md` | Claude C 指示書 | 96 | `483afdf` 11-07 09:33 | 未確定・要確認 | C2 は統合済み（`data/status-effects.js` に sleep〜bindLeg が存在）。C1 は承認待ち、C3 は未着手。§1-2「未実装：睡眠…封じ」は古い |
| 35 | `claude-tasks/EO_RULES_CROSSCHECK.md` | 世界樹の仕様照合表（出典つき） | 81 | `4be71c4` 11-07 12:18 | 現行補助資料 | 「本作の現状」欄が #95/#94/#97（旧PR）基準。採集の復活「ホーム出発で復活」は古い（実時間30分）。「座標表示：GPT PR（未統合）」→ `field-render.js:192` に座標表示あり。§6 はユーザーの判断待ち |

### 2-6. references

| # | ファイル | 役割 | 行数 | 最終更新 | 区分 | 照合結果 |
|---|---|---|---|---|---|---|
| 36 | `references/README.md` | 参考資料フォルダの案内 | 15 | `b61d76a` 11-06 08:50 | 現行正本 | 分類一覧に `reference_images/` が無い。どの入口資料からも案内されていない |
| 37 | `references/etrian_odyssey/README.md` | 研究リポジトリへの入口・研究ルール | 86 | `bee11b1` 11-06 11:03 | 現行補助資料 | §2 の状態「研究準備中」と §5-2 の進捗（成果あり）が食い違う。研究リポジトリ内のパスは外部のため未確認 |
| 38 | `references/etrian_odyssey/backgrounds/README.md` | 置き場の案内 | 5 | `960208c` 11-06 | 現行補助資料 | フォルダは README のみ（画像なし） |
| 39 | `references/etrian_odyssey/characters/README.md` | 同上 | 5 | `2438be3` 11-06 | 現行補助資料 | 同上 |
| 40 | `references/etrian_odyssey/monsters/README.md` | 同上 | 5 | `6810aa2` 11-06 | 現行補助資料 | 同上 |
| 41 | `references/etrian_odyssey/notes/README.md` | 同上 | 5 | `7421719` 11-06 | 現行補助資料 | 同上 |
| 42 | `references/etrian_odyssey/reference_images/README.md` | ZIP の置き場 | 13 | `0907e65` 11-06 | 現行補助資料 | ZIP は置かれていない |
| 43 | `references/etrian_odyssey/reference_images/battle_layout/README.md` | 戦闘レイアウト画像の置き場 | 15 | `84fd407` 11-06 | 現行補助資料 | 画像なし |
| 44 | `references/etrian_odyssey/ui/README.md` | 置き場の案内 | 5 | `1fd8972` 11-06 | 現行補助資料 | 画像なし |

### 2-7. Markdown 以外の付属物（docs/reviews/pr26/）

| ファイル | 内容 | 区分 | 備考 |
|---|---|---|---|
| `CLAUDE_A_PR27_VERIFICATION.xlsx` | #21 の表形式版 | 作業記録 | md と対になっている。どちらか一方だけを移さない |
| `CLAUDE_A_PROCESS_REVIEW.xlsx` | #22 の表形式版 | 作業記録 | 同上 |
| `tests/pr27_dialog_checks.js` ほか2件 | Playwright の再現スクリプト（`/usr/bin/google-chrome` を直接指定） | 作業記録 | ゲーム本体から読み込まれない。`node --check` の対象に含めるかは任意。PR #27 時点の DOM 前提のため、現行 #107 で動くかは未確認 |

---

## 3. 古い情報・矛盾の一覧

形式：場所 ／ 書かれている内容 ／ 実際の状態（根拠） ／ 直し方の案

### 3-1. マージ済み・統合済みのものを「未マージ／作業中」と書いている

| # | 場所 | 書かれている内容 | 実際（根拠） | 直し方 |
|---|---|---|---|---|
| S1 | `AI_HANDOFF.md` §7（95-104行） | PR #1・#2・#8 は「未マージ」、#2 は「取り込み直しが必要」 | #1/#2/#8 は 2026-11-06T02:22 にマージ済み（API） | §7 を削除し「現状と未統合PRは `docs/PROJECT_CURRENT_STATE.md` を参照」の1行にする |
| S2 | `docs/PROJECT_CURRENT_STATE.md` §3 | #92「Draft」、#94・#95・#97「未反映」、#96「未反映」 | #92/#93/#96 は未マージで close（内容は `7ce13e7`〜`11f16f8` で取り込み済み。#96 は #98 で置き換え）。#94/#95 の内容は #99/#100 で取り込み済み（PR 自体は open）。#97 は C2・シミュレータ・C1 資料を取り込み済み（DEVELOPMENT_INTEGRATION_STATUS） | 表を作り直す。統合済み：#98・#99・#100・#107、#97 の一部。open：#101〜#106、#94/#95/#97（内容は統合済み・PRは参照用）、#79〜#91・#47〜#56・#33〜#35・#21・#24・#31・#32・#37・#38・#42〜#45 |
| S3 | `docs/PROJECT_CURRENT_STATE.md` §3「統合上の注意」・§5 | #94/#95 を直接マージしない、A を移植してから B を接続、など | 移植は完了（`4be71c4`／`ebb9d67`） | 完了として履歴欄へ移す。§5 の推奨作業順は、#101 の ROADMAP（未統合）または DEVELOPMENT_INTEGRATION_STATUS の「未統合・再移植待ち」に置き換える |
| S4 | `docs/field-and-story/README.md` 冒頭・§3 進捗 | 「フェーズ2（GPT）着手可能」 | GPT のフェーズ2は #19 が未マージで close、#21 が open（Draft）。その後の世界樹化で方針自体が変わった | アーカイブし、冒頭に「11-06 時点の記録。後継は world-tree-recreation」と注記 |
| S5 | `docs/battle-visual-refresh/EVENT_SPEC.md` 冒頭 | 「実装は `feature/claude-battle-events`」 | #13 でマージ済み | 「#13 で development に統合済み」に変更 |
| S6 | `claude-tasks/CLAUDE_C_BATTLE_BALANCE_STATUS.md` §1-2 | 睡眠・混乱・封じは「未実装」 | `data/status-effects.js` に sleep/confusion/bindHead/bindArm/bindLeg が存在。`extEscapeBlocked()` もある | 冒頭に進み具合の表を置く（C1：承認待ち／C2：統合済み／C3：未着手） |
| S7 | `claude-tasks/EO_RULES_CROSSCHECK.md`「本作の現状」欄 | #95・#94・#97 を基準に記述。「座標表示：GPT PR（未統合）」 | #99/#100 で統合済み。座標表示は `field/field-render.js:192` にある | 「#95→#99（統合済み）」のように読み替えの注記を付ける。座標表示の行を更新 |
| S8 | `GPT_LEGACY_PR_AUDIT.md`「次の作業順」1〜3 | Claude A/B の実装を「受け取る」 | #99/#100 で統合済み | 作業記録なので本文は変えない。冒頭に「11-07 11:57 時点。A/B はその後統合済み」と注記するだけ |
| S9 | `docs/reviews/pr26/CLAUDE_A_PR27_VERIFICATION.md` 結論 | A-01 は一部未解決 | #107 で「確定直後の連打入力シールド」を移植（PR本文）。再検証の記録は無い | 作業記録なので本文は変えない。PROJECT_CURRENT_STATE の未確認事項に「A-01 の #107 での再検証は未実施」と書く |

### 3-2. 古いブランチ名・古いファイル構成・古い読み込み順

| # | 場所 | 書かれている内容 | 実際（根拠） | 直し方 |
|---|---|---|---|---|
| F1 | `docs/PROJECT_CURRENT_STATE.md` §2 | 「迷宮は自由移動方式」「`saveVersion: 10`」 | `field/field-movement-foe.js:3`「グリッド移動（1歩＝1ターン）」、`field.js:19` で FIELD_SPEED は「旧：未使用」。`script.js:955` は `saveVersion:11` | 「グリッド移動・ターン制FOE」「saveVersion 11（#100）」に変更 |
| F2 | `docs/PROJECT_CURRENT_STATE.md` §4 | `field/field-*.js` は「6ファイル」 | 7ファイル（#99 で `field-puzzles.js` が追加。`index.html:38-44`） | 7に直し、詳しくは `field/README.md` へリンク |
| F3 | `AI_HANDOFF.md` §2 表の1行目 | CSS は `css/01〜05-*.css` → `style.css` | `index.html:7-15`：01〜07 → `style.css` → `08-cartography-ui.css` | 表を実際の順に直す。CSS の詳細は css/README に任せる |
| F4 | `AI_HANDOFF.md` §2 表の10行目 | field モジュールの説明に「仕掛け」が無い | `field-puzzles.js`（扉・隠し通路・スイッチ） | 「詳しくは field/README.md」にする |
| F5 | `AI_HANDOFF.md` §3 | 採集・仕掛け・サブイベント・図鑑・検証ツールの置き場が無い | `data/field-gathering.js`、`FIELD_PUZZLES`／`FIELD_SIDE_EVENTS`（`data/field-maps.js:487,525`）、`monster-compendium.js`、`tools/world-tree/`、`tools/battle-sim/` | 行を追加 |
| F6 | `AI_HANDOFF.md` §4-3 | `[EXT]` フックは「現在15か所」 | `grep -o '\[EXT\]' script.js` → 21 | 数字を書かずに「`grep '\[EXT\]' script.js` で確認」とする |
| F7 | `css/README.md` 全体 | 「6ファイルを順に連結すると分割前の style.css と一致」「style.css を最後に読み込む」「新しいCSSは style.css の直前で読み込む」 | 06・07 は style.css の前、08 は style.css の後。#103〜#106（未統合）は 09〜12 を追加する予定 | 表を9行（01〜07・style・08）に直す。08 が最後である理由（地図UIを最後に上書き）を書く。「連結すると一致」は 01〜05 の分割当時の話だと明記する |
| F8 | `docs/field-and-story/FIELD_SPEC.md` §1 | `field.js`＝移動・判定・カメラ・入力・エンカウント・会話・セーブ。`FIELD_ENEMIES` は field-maps.js 内。読み込み順は data → battle-ext → script → field.js | field.js＋field/ 7モジュール。`FIELD_ENEMIES` は `data/field-enemies.js:14`。間に tutorial/admin/analyze/level/field-gathering が入る | 表を現行構成に直す（詳細は field/README・data/README へリンク） |
| F9 | `FIELD_SPEC.md` §4-1 | `FIELD_AREAS[n]` に直接 `map`・`encounter` がある。敵ID の例 `field-slime` | 実際は `FIELD_AREAS[n].floors[i]` ごとに `map`・`encounter`（scale 付き）・`foes`・`chests` を持つ（`data/field-maps.js:36` ほか）。敵IDは `stray-slime` など | 現行の形に書き直す。マップ文字に `<` `>` `G`・扉の文字を追加（`field.js:29-30` の FIELD_SOLID/FIELD_SAFE と一致させる） |
| F10 | `FIELD_SPEC.md` §5 | 「`saveVersion` を 10 にする」。`field` の項目は area/x/y/checkpoint/flags/fieldEnemyEncounters | 現行は 11。`floor`・`maps`・`gatherUsed`・`discovered`・`expedition` などが追加済み（`field/field-persistence.js:26,54-59`） | 「履歴：v10 で field 追加、v11 で採集・発見記録追加（#100）」と書き、項目の一覧は field-persistence.js のコメントを正とする |
| F11 | `FIELD_SPEC.md` §3 | `field:*` イベントは 10 種類 | 実装済みは18種類＋扉2種類（`fieldEmit`：foe:lost、loot:respawn、material、puzzle:solve、puzzle:reward、side:complete、gather、foe:notice、door:open、hidden:found など） | 表に追記する。LABYRINTH_SPEC §3 と重複させず、FIELD_SPEC §3 に一本化 |
| F12 | `docs/field-and-story/LABYRINTH_SPEC.md` §1 の FOE 行 | 「4.5マス以内で見通せると追跡」「逃げると起点へ戻り2.5秒停止」。担当ファイル欄は `field.js` | ターン制。前方視野（fov）、見失い3ターン（`FIELD_FOE_RULES`）、逃走後は FOE が移動前のマスに戻る。処理は `field/field-movement-foe.js` | FOE 行は「詳細は `docs/specs/world-tree-labyrinth-foe/IMPLEMENTATION_NOTES.md` §3」への案内にする。担当ファイル欄は `field/` の各モジュールに直す（`fieldOpenFloorSelect`→field-navigation.js、`fieldSetupRetreatChoice`→field-interactions.js、`fieldUpdateVision`→field.js） |
| F13 | `LABYRINTH_SPEC.md` §2 | 「`field.js` が `#field` 内に自動で追加」 | `field/field-render.js:14` などで生成 | `field/field-render.js` に直す |
| F14 | `claude-tasks/CLAUDE_A_LABYRINTH_FOE.md` §0・§1・§3 | 「development は自由移動」「`feature/ai-claude-field-puzzles`（#45）から分岐」「`FIELD_ENEMIES` は field-maps.js 末尾・C の担当」「FOE は実時間 2.6 秒」 | いずれも #99 の後は違う。#45 は open のままで、内容は `14d9fc0` で取り込まれた | アーカイブする。冒頭に「完了：#99（`4be71c4`）。実装の記録は docs/specs/world-tree-labyrinth-foe/」と注記 |
| F15 | `claude-tasks/CLAUDE_B_LOOT_GATHER_SAVE.md` §1・§2 | 「`saveVersion: 10`」「再出現の既定案 (a) ホーム帰還」「`field.js` の `fieldOpenChest`…を触ってよい」 | saveVersion 11、実時間30分（LABYRINTH_SPEC の採集の行・`data/field-gathering.js:28` `respawnMinutes: 30`）、処理は `field/field-interactions.js`／`field-persistence.js` | アーカイブする。冒頭に完了の注記（#100・`ebb9d67`） |
| F16 | `claude-tasks/CLAUDE_C_BATTLE_BALANCE_STATUS.md` §3、`C1_BALANCE_DESIGN.md` §5-2 | 「`data/field-maps.js` 末尾の `FIELD_ENEMIES` ブロックのみ」 | `data/field-enemies.js` に分かれている（`df2274b` の分割。PROJECT_CURRENT_STATE §4） | `data/field-enemies.js` に置き換える（C1 は承認待ちの資料なので、本文の数値は変えずパスだけ直す） |
| F17 | `docs/specs/monster-compendium/IMPLEMENTATION_NOTES.md` §1・§9 | `FIELD_ENEMIES` は `data/field-maps.js`、`field.js` は Claude B の担当 | `data/field-enemies.js`。分担は世界樹の A/B/C に変わった | パスを直す。§9 は「当時の分担」と注記。同じ古いパスが `monster-compendium.js:5` のコメントにもある（コード側。担当B/Cに連絡） |
| F18 | `GPT_LAYOUT_IMPLEMENTATION.md` §4 | 「`field.js` の描画・表示処理」 | 描画は `field/field-render.js` | `field/field-render.js`（描画）に直す |
| F19 | `AI_DEVELOPMENT_RULES.md` §2-1 | AI別ブランチ `feature/claude-work`・`feature/gemini-work`・`feature/gpt-work` を作業拠点として残してよい | `feature/gpt-work` はブランチ一覧に無い（`feature/claude-work`・`feature/gemini-work` はある） | 「現存：claude-work・gemini-work」に直すか、この段落ごと削除（ユーザー判断） |
| F20 | コード側コメント（参考） | `data/field-maps.js:477` → `docs/specs/field-side-events/IMPLEMENTATION_NOTES.md`、`:514` → `docs/specs/field-puzzles/IMPLEMENTATION_NOTES.md` | どちらも development に無い（#38/#45 のブランチにしか無い） | Phase 2 で、#38/#45 ブランチから2件を取り込むか（ユーザー判断）、コメントを直すかを決める。**コード変更は B/C の担当範囲** |

### 3-3. 仕様書と実装の食い違い

| # | 場所 | 内容 | 実際 | 直し方 |
|---|---|---|---|---|
| I1 | `MASTER_SPEC.md` §3-1・§8、`CLAUDE_GAMEPLAY_IMPLEMENTATION.md` §6 | 視界半径は「目安4マス」「約4マス」 | `FIELD_VISION = 3.6`（`field.js:22`）。PROJECT_CURRENT_STATE・LABYRINTH_SPEC は 3.6 と書いている | 「`FIELD_VISION = 3.6`（約4マス）」に統一 |
| I2 | `EVENT_SPEC.md` §2・§3 | 状態IDの一覧は burn〜attackDown と stun のみ。`status:resist` が無い | `data/status-effects.js` に sleep・confusion・bindHead/Arm/Leg、`battle-ext.js` に `battleEmit("status:resist")` がある | 一覧に追加。CLAUDE_C §4 の表示用データ（`kind`・`battle:status:resist`）と合わせる |
| I3 | `EVENT_SPEC.md` §4 | 「`#imperial-status-panel`（PR #2）は撤去してよい」 | `index.html`・`script.js`・`style.css` にまだ残っている | 「残っている（撤去は GPT／UI 改修の判断）」と現状を書く |
| I4 | `FIELD_SPEC.md` §2 の DOM、`index.html:210` のコメント | 「見下ろし型の自由移動」 | グリッド移動（`index.html:213` のヒント文言も「1マスずつ」） | FIELD_SPEC の DOM の節に注記。index.html のコメントはコード側の修正（担当外。連絡事項） |
| I5 | `field/README.md` 末尾 | 「この分割は…セーブ形式を変更しません」 | #100 で `field-persistence.js` に `[LOOT]` の保存が入り saveVersion 11 になった | 「分割そのものは変更なし。その後 #100 で v11 化」に直す |
| I6 | `references/etrian_odyssey/README.md` §2 と §5-2 | 「研究準備中・データ確認待ち」と「研究成果が追加済み」が同じファイルに並ぶ | どちらが新しいかは §5-2（11-06 時点）。研究リポジトリの今の状態は未確認 | §2 の状態欄を「§5-2 参照」に直す |
| I7 | `AI_HANDOFF.md` §5 末尾 | 新職業の解放条件は「仮決めで、現在調整中」 | `data/jobs.js:6-8` の条件は記述どおり。確定したかは未確認 | 「確定済みかはユーザー確認待ち」と明記（未確認のまま） |

### 3-4. 同じ仕様の重複記述

| # | 重複している箇所 | 内容 | 正本の案 | 重複側の扱い |
|---|---|---|---|---|
| D1 | `AI_DEVELOPMENT_RULES.md` §2-5（103-114行）／`CHATGPT_PROJECT_PROMPT.md` 全体 | development の常時維持、開発データの事前準備、main 反映の条件 | ルールの本文は AI_DEVELOPMENT_RULES §2-5 | CHATGPT_PROJECT_PROMPT は「ChatGPT が最初に読む要約」として**重要ルールの箇条書き（5〜8行）は残す**（仕様書 §4-1 の但し書き）。詳細は RULES §2-5 へリンク |
| D2 | `AI_HANDOFF.md` §4（壊しやすいところ）／`AI_DEVELOPMENT_RULES.md` §5・§6・§10／`data/README.md`「変更時のルール」 | ID不変、セーブ互換、`?v=` の更新、素材のファイル名 | ルール＝RULES、具体例と場所＝AI_HANDOFF、data 固有の注意＝data/README | AI_HANDOFF §4 は「RULES §5 の具体例」と明記。`?v=` は RULES §10「統合担当が更新」と AI_HANDOFF §4-5「各PRで最大値＋1」が違うので、**どちらにするかユーザーが決める** |
| D3 | `AI_HANDOFF.md` §4-7 ／ `AI_DEVELOPMENT_RULES.md` §2-3 | force push | RULES §2-3「原則禁止」が正 | AI_HANDOFF の「現行ルールに明記されていない」を削除（**矛盾**） |
| D4 | `AI_HANDOFF.md` §2 ／ `css/README.md` ／ `data/README.md` ／ `field/README.md` ／ `FIELD_SPEC.md` §1 ／ `PROJECT_CURRENT_STATE.md` §4 | 読み込み順・ファイル構成 | 全体の順＝AI_HANDOFF §2（「正は index.html」の1文を残す）、各フォルダ内＝各 README | FIELD_SPEC §1・PROJECT_CURRENT_STATE §4 はリンクだけにする |
| D5 | `PROJECT_CURRENT_STATE.md` ／ `DEVELOPMENT_INTEGRATION_STATUS.md` ／ `AI_HANDOFF.md` §7 | development の現状・未統合PR・テスト状況 | PROJECT_CURRENT_STATE | DEVELOPMENT_INTEGRATION_STATUS の内容を移したうえで、短い案内に置き換えるか docs/archive へ（プレビューURLは PROJECT_CURRENT_STATE に移す）。AI_HANDOFF §7 は削除してリンクのみ |
| D6 | `LABYRINTH_SPEC.md` §1 の FOE 行・§3 イベント ／ `docs/specs/world-tree-labyrinth-foe/IMPLEMENTATION_NOTES.md` §3 ／ `EO_RULES_CROSSCHECK.md` §2 | FOE のルール | 詳しいルール＝IMPLEMENTATION_NOTES §3（現行と一致）。概要＝LABYRINTH_SPEC | LABYRINTH の FOE 行を1行の概要＋リンクにする |
| D7 | `REFERENCE_GUIDE.md` §3 ／ `EO_RULES_CROSSCHECK.md` | 世界樹の仕様照合表 | EO_RULES_CROSSCHECK（記入済み） | REFERENCE_GUIDE §3 を「記入版は claude-tasks/EO_RULES_CROSSCHECK.md」の1行にする |
| D8 | `MASTER_SPEC.md` §4・§6・§7 ／ `CLAUDE_GAMEPLAY_IMPLEMENTATION.md` §4 ／ `GPT_LAYOUT_IMPLEMENTATION.md` §4・§5 ／ `claude-tasks/CLAUDE_A/B/C` §3 | GPT と Claude の担当境界、触ってよいファイル | MASTER_SPEC §4 | 各指示書は「MASTER_SPEC §4 に従う」＋固有の追加だけにする（A/B はアーカイブするので対象外） |
| D9 | `docs/field-and-story/README.md` §6 ／ `LABYRINTH_SPEC.md` §5 ／ `C1_BALANCE_DESIGN.md` §2 | バランスの計測表 | 最新の計測は C1（ただし A/B 統合前） | field-and-story README（アーカイブ）と LABYRINTH §5 に「最新は C1」の注記 |
| D10 | `battle-visual-reference/CLAUDE_SPEC.md` ／ `battle-visual-refresh/CLAUDE_VIDEO_REFERENCE_TASK.md` ／ `EVENT_SPEC.md` | 状態異常・インペリアル・演出トリガーの連携 | EVENT_SPEC（実装済み） | CLAUDE_SPEC はアーカイブ。VIDEO タスクは完了したかを確認してから判断 |
| D11 | `references/etrian_odyssey/README.md` §4 ／ `AI_HANDOFF.md` §9 ／ `REFERENCE_GUIDE.md` §2 ／ `MASTER_SPEC.md` §2 | 参考作品の扱い（転用禁止・事実と推測を分ける） | references/etrian_odyssey/README §4（研究ルール）、MASTER_SPEC §2（実装での扱い） | AI_HANDOFF §9 の「AIへの依頼事項」7行をリンク＋要点2行に短くする |

### 3-5. 作業指示書と現在のファイル構成・分担の矛盾

| # | 指示書 | 矛盾 |
|---|---|---|
| T1 | `claude-tasks/CLAUDE_A_LABYRINTH_FOE.md` §3 | 触ってよいファイルが `field.js` の節単位（`fieldSpawnFoes`〜）。現行は `field/field-movement-foe.js`・`field-puzzles.js` |
| T2 | `claude-tasks/CLAUDE_B_LOOT_GATHER_SAVE.md` §3 | `field.js` の `fieldOpenChest`・`fieldSerialize` → 現行は `field/field-interactions.js`・`field-persistence.js`。「セーブ形式は B が唯一の管理者」という取り決めは今も有効か未確認（A/B の作業は終了） |
| T3 | `claude-tasks/CLAUDE_C_BATTLE_BALANCE_STATUS.md` §3 | `data/field-maps.js` 末尾の FIELD_ENEMIES → `data/field-enemies.js`。「field.js、迷宮マップは A/B 担当」→ A/B は終了。#101 の ROADMAP（未統合）で分担が見直されている |
| T4 | `docs/field-and-story/GPT_TASK.md` | 「`field.js` の処理を変更しない」「`css/06-field.css` は GPT 担当」→ 現行では 07・08 も関係し、#103〜#106（Claude の UI 全面改修）は `css/07`・`08` と `field/field-render.js`・`field-movement-foe.js` を変更する。**担当者が入れ替わっている** |
| T5 | `docs/field-and-story/CLAUDE_TASK.md` C2 | 「8方向・ピクセル単位の自由移動」→ 現行はグリッド移動 |
| T6 | `GPT_LAYOUT_IMPLEMENTATION.md` | 「Draft PR で提出」「`field.js` の描画処理」→ GPT の地図UIは #98 でマージ済み。その後 #102（GPT 仕様書）と #103〜#106（Claude 実装）が同じ領域を扱っている |

### 3-6. リンク切れ・存在しない参照（Markdown 内）

| 参照元 | 参照先 | 状態 |
|---|---|---|
| `AI_DEVELOPMENT_RULES.md` §7-2・§9-2 | `TEST_CHECKLIST.md`、`CHANGELOG.md` | **存在しない** |
| `docs/specs/monster-compendium/IMPLEMENTATION_NOTES.md` 4行 | `docs/ai-tasks/CLAUDE_C_COMPENDIUM_IMPLEMENTATION.md` | development に無い（ブランチ `docs/claude-development-specs`＝PR #32 open） |
| `docs/battle-visual-reference/CLAUDE_SPEC.md` 5行 | 「同フォルダの README.md、REF-01〜REF-03」 | **存在しない**（REF 画像は IMPLEMENTATION_SPEC §10 で「後日追加」） |
| `claude-tasks/*.md` | `CLAUDE_GAMEPLAY_IMPLEMENTATION.md`・`LABYRINTH_SPEC.md`・`REFERENCE_GUIDE.md`（ファイル名だけ） | 実在するが別フォルダ（`../` または `docs/field-and-story/`）。名前だけの参照なので迷いやすい |
| `references/etrian_odyssey/README.md`、`EO_RULES_CROSSCHECK.md` | 研究リポジトリ内のパス | 外部の非公開リポジトリ。未確認 |
| Markdown 形式のリンク `[..](..)` | — | リポジトリ全体で1件のみ（`AI_HANDOFF.md:121` → `references/etrian_odyssey/README.md`、リンク先は存在）。ほかはすべてバッククォートでのパス表記 |

---

## 4. 正本と参照先の対応表（仕様書 §4-1 準拠）

| 話題 | 正本 | 参照する側（短い案内にする） | 備考 |
|---|---|---|---|
| 全AI共通の開発・Git運用ルール | `AI_DEVELOPMENT_RULES.md` | CHATGPT_PROJECT_PROMPT（要点だけ残す）、AI_HANDOFF §4、再編成仕様書 §2 | 存在しない TEST_CHECKLIST/CHANGELOG の扱いを決める |
| ChatGPT の常設指示 | `CHATGPT_PROJECT_PROMPT.md` | — | RULES §2-5 と同じ文章を長々と持たず、要約とリンクにする |
| リポジトリの構造・全体の読み込み順・「どこを触るか」 | `AI_HANDOFF.md` | PROJECT_CURRENT_STATE §4、FIELD_SPEC §1、data/css/field の README の冒頭 | 「正は index.html」を明記 |
| development の現状・未統合PR・テスト状況・プレビューURL | `docs/PROJECT_CURRENT_STATE.md` | DEVELOPMENT_INTEGRATION_STATUS（移した後は案内かアーカイブ）、AI_HANDOFF §7（削除） | 日付と基準コミットを必ず書く |
| CSS の順番・上書き関係 | `css/README.md` | AI_HANDOFF §2 | 08 が最後、#103〜#106 の 09〜12 は統合時に追記 |
| 固定データの置き場 | `data/README.md` | AI_HANDOFF §3 | |
| 探索モジュールの分担 | `field/README.md` | AI_HANDOFF §2、PROJECT_CURRENT_STATE §4、FIELD_SPEC §1 | |
| `field:*` イベント・探索 DOM・マップ文字・データ形式 | `docs/field-and-story/FIELD_SPEC.md`（更新して残す） | LABYRINTH_SPEC §2・§3（追加分は FIELD_SPEC に統合するか、差分として残す） | コードのコメントから参照されているので**移動しない** |
| 迷宮システムの概要（階層・視界・磁軸・採集・レベル） | `docs/field-and-story/LABYRINTH_SPEC.md` | — | FOE 行はリンクにする |
| FOE AI・扉・隠し通路の詳細ルール | `docs/specs/world-tree-labyrinth-foe/IMPLEMENTATION_NOTES.md` | LABYRINTH_SPEC、EO_RULES_CROSSCHECK §2 | 名前は「実装メモ」だが実質は現行仕様。Phase 2 で LABYRINTH_SPEC から目立つようにリンクする |
| 宝箱・採集・探索記録・saveVersion 11 | **正本となる資料が無い**（#100 の B 側実装メモが development に入っていない） | — | `field/field-persistence.js:54-59`・`data/field-gathering.js` のコメントが実質の正本。B の実装メモを取り込むか、LABYRINTH_SPEC に節を足す（ユーザー判断） |
| 図鑑 | `docs/specs/monster-compendium/IMPLEMENTATION_NOTES.md` | — | パスだけ直す |
| `battle:*` イベント | `docs/battle-visual-refresh/EVENT_SPEC.md` | battle-visual-reference/CLAUDE_SPEC（アーカイブ） | コード（`battle-ext.js:770`）から参照されているので**移動しない** |
| 戦闘演出・UI の要求 | `docs/battle-visual-refresh/IMPLEMENTATION_SPEC.md`（暫定） | VIDEO_REFERENCE_TASKS ほか | #102（GPT UI 仕様）がマージされたら正本を見直す |
| 世界樹再現の方針・分担 | `docs/world-tree-recreation/MASTER_SPEC.md` | CLAUDE_GAMEPLAY / GPT_LAYOUT / claude-tasks 各指示書 | #101 の ROADMAP が統合されたら、進め方の正本は ROADMAP になる見込み |
| 世界樹の参考URL | `REFERENCE_GUIDE.md` §1・§2 | — | §3 は EO_RULES_CROSSCHECK へ |
| 世界樹の仕様照合 | `claude-tasks/EO_RULES_CROSSCHECK.md` | REFERENCE_GUIDE §3 | 置き場所を `world-tree-recreation/` 直下に移す案あり（§5） |
| 戦闘バランス（承認待ち） | `claude-tasks/C1_BALANCE_DESIGN.md` | LABYRINTH §5、field-and-story README §6 | |
| 素材のライセンス | `ASSETS_CREDITS.md` | RULES §6-1、GPT_TASK | |
| 参考作品・研究 | `references/etrian_odyssey/README.md` | AI_HANDOFF §9、MASTER_SPEC §2 | |
| 資料整理の作業 | `docs/maintenance/CLAUDE_DATA_REORGANIZATION_SPEC.md` | — | |

---

## 5. アーカイブ・削除の候補と理由、リンク切れ対策

### 5-1. アーカイブ候補（`docs/archive/` へ移す。本文は変えず、冒頭に「アーカイブ注記」を3行足す）

提案する構成：`docs/archive/<元のフォルダ名>/<元のファイル名>`（元の場所が分かるようにする）＋ `docs/archive/README.md`（一覧・移動日・後継の資料）。

| 対象 | 移動先の案 | 理由 | 後継の資料 |
|---|---|---|---|
| `docs/field-and-story/README.md` | `docs/archive/field-and-story/README.md` | 11-06 時点の分担と進捗。自由移動を前提にした流れ | LABYRINTH_SPEC、world-tree-recreation/MASTER_SPEC |
| `docs/field-and-story/CLAUDE_TASK.md` | `docs/archive/field-and-story/CLAUDE_TASK.md` | 完了済み（#16〜#18） | FIELD_SPEC |
| `docs/field-and-story/GPT_TASK.md` | `docs/archive/field-and-story/GPT_TASK.md` | 世界樹化で GPT_LAYOUT_IMPLEMENTATION／#102 に置き換わった（**#21 が open のため、ユーザー確認後に移す**） | GPT_LAYOUT_IMPLEMENTATION |
| `docs/battle-visual-reference/CLAUDE_SPEC.md`（フォルダごと） | `docs/archive/battle-visual-reference/CLAUDE_SPEC.md` | 要求仕様。実装は EVENT_SPEC。参照先の README・REF は存在しない | EVENT_SPEC |
| `docs/world-tree-recreation/claude-tasks/CLAUDE_A_LABYRINTH_FOE.md` | `docs/archive/world-tree-recreation/claude-tasks/` | 完了（#99） | docs/specs/world-tree-labyrinth-foe/IMPLEMENTATION_NOTES.md |
| `docs/world-tree-recreation/claude-tasks/CLAUDE_B_LOOT_GATHER_SAVE.md` | 同上 | 完了（#100） | LABYRINTH_SPEC の採集の行・field-persistence.js |
| `docs/world-tree-recreation/DEVELOPMENT_INTEGRATION_STATUS.md` | `docs/archive/world-tree-recreation/`（**PROJECT_CURRENT_STATE に内容を移した後**） | 役割が重複 | PROJECT_CURRENT_STATE |
| （条件付き）`docs/battle-visual-refresh/CLAUDE_VIDEO_REFERENCE_TASK.md`・`GPT_VIDEO_REFERENCE_TASK.md`・`VIDEO_REFERENCE_TASKS.md` | `docs/archive/battle-visual-refresh/` | 完了したかは未確認。**ユーザーが完了と判断した場合のみ** | IMPLEMENTATION_SPEC／#102 |

**アーカイブしないもの（作業記録だが今の場所に残す）**
- `docs/reviews/pr26/` 一式：場所がすでに「reviews」で、現行資料と混同されにくい。xlsx・tests とセットで保存。
- `GPT_LEGACY_PR_AUDIT.md`：#79〜#91 がまだ open で、移植判断の根拠として現役。冒頭に注記だけ足す。
- `C1_BALANCE_DESIGN.md`・`CLAUDE_C_BATTLE_BALANCE_STATUS.md`：承認待ち・未完了。

**置き場所の見直し（任意）**
- `claude-tasks/EO_RULES_CROSSCHECK.md` は作業指示ではなく照合表なので、`docs/world-tree-recreation/EO_RULES_CROSSCHECK.md` に移す案がある。参照元は REFERENCE_GUIDE だけ（Markdown 内）。優先度は低い。

### 5-2. 削除候補

**Markdown の削除候補は無い。** 旧版もすべてアーカイブで残す。

参考（Markdown 以外・担当外）：ルートの `github-desktop-test.txt`（5行）は GitHub Desktop の動作テスト用とみられる。中身と用途は未確認。削除するかはユーザーが判断（この監査の対象外のため、報告だけ）。

### 5-3. 移動したときにリンク切れが起きる参照元

調べ方：`grep -rn` で Markdown・JS・HTML・CSS の中にあるパスとファイル名を検索した。

| 移動対象 | 参照元（パス表記） | 対応 |
|---|---|---|
| `docs/field-and-story/README.md` | `AI_HANDOFF.md:104`（`docs/field-and-story/README.md`）、`CLAUDE_TASK.md:3`・`GPT_TASK.md:3`（`README.md`）、`FIELD_SPEC.md` 冒頭（関連文書として名前だけ） | AI_HANDOFF の §7 は削除予定。ほかはアーカイブ先でも同じフォルダ内の相対参照なので、一緒に移せば切れない |
| `docs/field-and-story/CLAUDE_TASK.md`・`GPT_TASK.md` | `docs/field-and-story/README.md:7`、`GPT_TASK.md:3`（相互） | 3件を一緒に移す |
| `docs/battle-visual-reference/CLAUDE_SPEC.md` | `EVENT_SPEC.md:6`、`CLAUDE_VIDEO_REFERENCE_TASK.md:4`（`../battle-visual-reference/CLAUDE_SPEC.md`） | 両方を `docs/archive/battle-visual-reference/CLAUDE_SPEC.md` に書き換える |
| `claude-tasks/CLAUDE_A_LABYRINTH_FOE.md` | `docs/specs/world-tree-labyrinth-foe/IMPLEMENTATION_NOTES.md:3` | アーカイブ先のパスに書き換える |
| `claude-tasks/CLAUDE_B_LOOT_GATHER_SAVE.md` | Markdown・コードからの参照なし（grep 結果） | — |
| `DEVELOPMENT_INTEGRATION_STATUS.md` | Markdown・コードからの参照なし | — |
| 動画参考タスク3件 | 3件の間の相互参照のみ（`VIDEO_REFERENCE_TASKS.md`） | 一緒に移す |
| **移動禁止（コードから参照されている）** | `FIELD_SPEC.md`：`field.js:6`、`data/field-maps.js:5`、`data/story.js:5`、`css/06-field.css:4`、`analyze-panel.js:8`、`index.html:210`／`LABYRINTH_SPEC.md`：`field.js:6`、`data/field-maps.js:5`／`EVENT_SPEC.md`：`battle-ext.js:770` | 置き場所を変えない |

外部からの参照（PR 本文・Issue・研究リポジトリ・ChatGPT のプロジェクト設定など）は grep できない（未確認）。アーカイブ先の README に「旧パス → 新パス」の対応表を必ず置く。

---

## 6. 分割候補（仕様書 §4-3）

結論：**分割を強く勧める Markdown は無い。** 最大の AI_DEVELOPMENT_RULES（436行・15KB）でも章ごとに短く、AI が最初に通して読む前提の資料なので、分けると見落としが増える。

| 対象 | 行数 | 判断 | 理由・案 |
|---|---|---|---|
| `AI_DEVELOPMENT_RULES.md` | 436 | 分割しない | 1ファイルで読むことに意味がある。代わりに重複（§2-5）を減らし、冒頭に目次を足す |
| `CLAUDE_DATA_REORGANIZATION_SPEC.md` | 284 | 分割しない | 一度きりの作業仕様 |
| `FIELD_SPEC.md` | 193 | 分割しない（更新で対応） | DOM・イベント・データ形式・セーブ・アナライズの5章。コードから参照されているので1ファイルのまま。§6 アナライズは独立しているので、将来 `ANALYZE_SPEC.md` に分ける余地はある（今は不要） |
| `C1_BALANCE_DESIGN.md` | 193 | 分割しない | 承認待ちの1つの提案書 |
| `docs/field-and-story/`（フォルダ） | — | **入口の README を作り直す** | 旧 README をアーカイブした後、新しい `README.md`（10〜20行）を置く。内容：FIELD_SPEC＝インターフェース、LABYRINTH_SPEC＝迷宮システム、FOE の詳細＝docs/specs/world-tree-labyrinth-foe、旧資料＝docs/archive/field-and-story |
| `docs/world-tree-recreation/`（フォルダ） | 計 約1,000行 | **入口の README を新しく置く** | 各資料の役割と状態（方針／指示／完了／承認待ち／照合／記録）を1つの表で示す。#101 も `analysis/README.md` を追加する予定なので、統合の順番によって衝突しうる |
| `docs/`（全体） | — | **`docs/README.md` を新しく置く** | フォルダごとの役割（仕様・実装メモ・レビュー・保守・アーカイブ）と、§4 の正本対応表の要約 |

---

## 7. Phase 2（ドキュメント整理）の作業手順案

前提：PR は分ける（①入口の更新 ②仕様書の更新 ③アーカイブ移動）。コードのコメント修正（F20・I4・F17 のコード側）は Phase 2 に含めず、担当 B/C に連絡する。各 PR の前に最新の development を取り込み、#101〜#106 の統合状況を確認する。

### PR ①：入口資料の更新（優先度：最高）

| ファイル | 書き換えの内容 |
|---|---|
| `docs/PROJECT_CURRENT_STATE.md` | 全面的に書き直す：基準コミット・確認日／§2 グリッド移動・ターン制FOE・`FIELD_VISION 3.6`・saveVersion 11・field-gathering／§3 PR 表を作り直す（統合済み：#98・#99・#100・#107・#97 の一部（C2・シミュレータ・C1 資料）、#92/#93 の内容。open で内容は統合済み：#94/#95/#97、#38/#45 の迷宮データ、#24（#107 が後継）。open で未統合：#101〜#106、#79〜#91（監査済み）、#47〜#56、#33〜#35、#21、#31・#32・#37・#42〜#44）／DEVELOPMENT_INTEGRATION_STATUS の「テスト状況」「画面確認URL」を移す／§5 を「次の作業：C1 承認待ち、#101 の ROADMAP、UI 全面改修 #103〜#106、本整理作業」に書き換える／未確認事項（実機テスト未実施、A-01 の再検証未実施、CI 結果未確認） |
| `AI_HANDOFF.md` | §2 の表：CSS を 01〜07 → style → 08 に、data に field-gathering を、field を7モジュール（詳細は field/README）に、`tools/` の行を追加／§3：採集（`data/field-gathering.js`）、仕掛け・サブイベント（`FIELD_PUZZLES`・`FIELD_SIDE_EVENTS`／`field/field-puzzles.js`）、FOE AI（`field/field-movement-foe.js`）、図鑑（`monster-compendium.js`）、検証ツール（`tools/world-tree`・`tools/battle-sim`）を追加／§4-3 の「15か所」を削除／§4-5 の `?v=` の担当を RULES §10 と合わせる（ユーザー判断）／§4-7 の「現行ルールに明記されていない」を削除し RULES §2-3 にリンク／§6 用語に `[LOOT]` `[DOOR]` `[PUZZLE]` `[FOE]` `[GRID]` `[COMPENDIUM]` `[LEVEL]` を追加／§7 を削除して「現状は PROJECT_CURRENT_STATE」の1行に／§9 の依頼事項を2行の要点＋リンクに／冒頭の読む順番に `field/README.md` と `docs/README.md`（新規）を追加／最終更新日 |
| `css/README.md` | 表を 01〜07・style・08 の9行に／「連結すると一致」は 01〜05 の分割当時の話と明記／編集ルール4「style.css の直前で読み込む」を「06・07 は style.css の前、08 は最後。新規は役割に応じて置き、index.html と本表を更新」に直す／#103〜#106 が 09〜12 を追加予定であることを注記（統合されたら更新） |
| `field/README.md` | `field-persistence.js` の行に「`[LOOT]` 宝箱・採集・探索記録のセーブ（saveVersion 11）」を追加／末尾の文を「分割そのものは仕様を変えない。saveVersion 11 化は #100」に直す／詳しい仕様のリンク（FIELD_SPEC・LABYRINTH_SPEC・world-tree-labyrinth-foe の実装メモ）を追加 |
| `data/README.md` | 早見表に `field-maps.js`／`field-enemies.js`／`field-gathering.js`／`story.js` を追加／読み込み順に `monster-compendium.js` を追加（軽微） |
| `AI_DEVELOPMENT_RULES.md` | **本文のルールは変えない**（変えるにはユーザー承認が要る）。ユーザーの承認を得たうえで：TEST_CHECKLIST/CHANGELOG の扱い（作る／記述を削る）、状態表記、§2-1 の AI 別ブランチ、§8-2 のコミット形式、§2-5 と CHATGPT_PROJECT_PROMPT のどちらを本文にするか |
| `CHATGPT_PROJECT_PROMPT.md` | ユーザーの承認後：要約を残し、詳細は「RULES §2-5」へのリンクにする（重要ルールの箇条書きは残す） |
| `docs/README.md`（新規） | docs の地図（§6）。正本対応表（§4）の要約 |

### PR ②：仕様書の更新（中身を現行に合わせる。ファイルは移動しない）

| ファイル | 書き換えの内容 |
|---|---|
| `docs/field-and-story/FIELD_SPEC.md` | 冒頭の状態を「#18 で作成、#22・#99・#100 で拡張。現行の構成は下記」に／§1 を field/ 7モジュールと data 4ファイルに／§2 の DOM に「自由移動 → グリッド」の注記と、LABYRINTH §2 にある追加 DOM へのリンク／§3 イベント表に foe:lost・loot:respawn・material・puzzle:solve・puzzle:reward・side:complete・door:open・hidden:found・gather・foe:notice を追加（detail は実装から書き写す）／§4-1 を `floors[]` の形に、敵IDを実在するものに、マップ文字を `field.js:29-30` と合わせる／§5 を v10→v11 の履歴と項目一覧に |
| `docs/field-and-story/LABYRINTH_SPEC.md` | §1：FOE 行を概要＋world-tree-labyrinth-foe の実装メモ §3 へのリンクに、担当ファイル欄を field/ の各モジュールに／扉・隠し通路・仕掛けの行を追加（詳細はリンク）／§2「field.js が追加」→ `field/field-render.js`／§5 に「最新の計測は C1_BALANCE_DESIGN」の注記 |
| `docs/battle-visual-refresh/EVENT_SPEC.md` | 冒頭の「実装は feature/…」→「#13 で統合済み」／§3 の状態IDに sleep・confusion・bindHead/Arm/Leg を追加、`battle:status:resist` の行を追加（C2 の実装から書き写す）／§4 の `#imperial-status-panel` は現在も残っていると書く |
| `docs/specs/monster-compendium/IMPLEMENTATION_NOTES.md` | `FIELD_ENEMIES` のパスを `data/field-enemies.js` に／仕様の参照先に「development には無い（PR #32 のブランチ）」と注記／§9 に「当時の分担」と注記 |
| `docs/world-tree-recreation/MASTER_SPEC.md` | 視界を「`FIELD_VISION = 3.6`（約4マス）」に統一。§5 に各段階の進み具合を1行ずつ（例：第2段階＝#99/#100 で統合済み）。**方針の本文は変えない** |
| `docs/world-tree-recreation/CLAUDE_GAMEPLAY_IMPLEMENTATION.md` | 冒頭に進み具合（A/B/C の §2 は完了、§3 は C1 承認待ち）／§6 の視界の表記を統一 |
| `docs/world-tree-recreation/GPT_LAYOUT_IMPLEMENTATION.md` | 冒頭に「#98 で一部実装、#102 が後継の仕様書（未統合）」／§4 の `field.js` → `field/field-render.js` |
| `docs/world-tree-recreation/REFERENCE_GUIDE.md` | §3 の表を削除し、「記入版は EO_RULES_CROSSCHECK」の1行にする |
| `claude-tasks/EO_RULES_CROSSCHECK.md` | 冒頭に「#95→#99、#94→#100 として読む」の注記／採集の復活を「実時間30分（2026-11-07 ユーザー決定）」に／座標表示を「#98 で実装済み」に |
| `claude-tasks/CLAUDE_C_BATTLE_BALANCE_STATUS.md` | 冒頭に進み具合の表（C1 承認待ち／C2 統合済み／C3 未着手）／§1-2 の「未実装」に「C2 で実装済み」と注記／§3 の FIELD_ENEMIES のパスを直す |
| `claude-tasks/C1_BALANCE_DESIGN.md` | §5-2 のパスだけ直す。冒頭に「計測は A/B 統合前の `5213192`。再計測が必要かは未確認」と注記。**数値は変えない** |
| `references/README.md` | 分類に `reference_images/` を追加。研究の入口として `etrian_odyssey/README.md` へリンク |
| `references/etrian_odyssey/README.md` | §2 の状態欄を「§5-2 参照」に直す |
| `GPT_LEGACY_PR_AUDIT.md`、`docs/reviews/pr26/*.md` | 本文は変えない。冒頭に「記録時点」と、その後の状況の注記だけを足す |

### PR ③：アーカイブ移動

1. `docs/archive/README.md` を作る（一覧・移動日・旧パス → 新パス・後継の資料）。
2. `git mv` で §5-1 の対象を移す（履歴を残すため git mv を使う）。各ファイルの冒頭に3行の注記を足す（「アーカイブ：YYYY-MM-DD／理由／後継：…」）。
3. 参照元を書き換える：`EVENT_SPEC.md:6`、`battle-visual-refresh/CLAUDE_VIDEO_REFERENCE_TASK.md:4`（残す場合）、`docs/specs/world-tree-labyrinth-foe/IMPLEMENTATION_NOTES.md:3`、AI_HANDOFF の旧 §7（PR ① で削除済みのはず）。
4. `docs/field-and-story/README.md` と `docs/world-tree-recreation/README.md` を新しい入口として作る（§6）。
5. 確かめ方：Markdown 内のバッククォートのパスとリンクを機械的に抜き出し、存在しないものを一覧にする（今回の監査で使った手順）。`grep -rn 'field-and-story/README\|battle-visual-reference\|CLAUDE_A_LABYRINTH_FOE\|CLAUDE_B_LOOT' --include=*.md --include=*.js --include=*.html .` の結果が、アーカイブ先を指すものだけになること。

### 競合に注意するファイル

- #103〜#106 は `index.html`・`css/07`・`08` を変え、`css/09〜12`・`docs/ui-overhaul/` を追加する → **css/README と AI_HANDOFF §2 の更新は、統合の順番を見て行う**。#105・#106 の変更ファイル一覧は、API の制限で最初の100件までしか確認できていない（未確認）。
- #101 は `docs/world-tree-recreation/analysis/` を追加する → world-tree の README を新しく作るときに衝突しうる。
- #102 は `docs/ui-overhaul/WORLD_TREE_UI_OVERHAUL_SPEC.md` を追加する → `docs/README.md` に入れるかは統合後に判断。

---

## 8. 未確認事項・ユーザー判断事項

### 8-1. 未確認事項

1. AI_DEVELOPMENT_RULES がユーザーに正式承認されたか（状態表記は「承認前」、PR #1 はマージ済み）。
2. 動画参考タスク3件と IMPLEMENTATION_SPEC がどこまで実装されたか（#15 はマージ済み。ほかの項目の実装PRを特定できていない）。
3. 新職業の解放条件が確定したか（AI_HANDOFF §5 は「調整中」）。
4. #107 で PR #27 の A-01（タブレット幅の連打）が直ったか（再検証の記録なし）。
5. `docs/reviews/pr26/tests/*.js` が現行の DOM で動くか（実行していない）。
6. 研究リポジトリ内のパス（外部・非公開）。
7. 外部（PR 本文・Issue・ChatGPT プロジェクト設定）から docs のパスを参照しているか（grep できない）。
8. #105・#106 の変更ファイルのうち 101 件目以降。
9. C1 の計測値が、A/B 統合後（グリッド移動・FOE の逃走処理の変更後）も有効か。
10. ASSETS_CREDITS の「要確認」欄の中身（ライセンス情報そのもの）。
11. `github-desktop-test.txt` の用途。
12. ローカルが shallow clone のため、`git log` による最終更新日は信頼できない（API で代わりに取得した）。

### 8-2. ユーザー判断事項

1. **`?v=` の更新担当**：RULES §10「統合担当が更新」と AI_HANDOFF §4-5「各PRで最大値＋1」のどちらにするか。
2. **TEST_CHECKLIST.md／CHANGELOG.md**：作るか、RULES から記述を削るか。
3. **RULES と CHATGPT_PROJECT_PROMPT の重複**：§2-5 を本文とし、PROMPT は要約＋リンクにしてよいか（重要ルールの箇条書きは残す前提）。
4. **RULES のその他の記述**：AI 別ブランチの記述（`feature/gpt-work` は存在しない）とコミット形式 `[claude]` を、実態に合わせて直すか。
5. **アーカイブの実施**：§5-1 の6件（＋動画参考タスク3件は完了と判断した場合のみ）を `docs/archive/` に移してよいか。`GPT_TASK.md` は #21 が open のままでよいか（#21 を閉じるか）。
6. **DEVELOPMENT_INTEGRATION_STATUS の扱い**：PROJECT_CURRENT_STATE に移した後、アーカイブするか、短い案内として残すか。
7. **宝箱・採集・セーブ v11 の仕様書**：#100（Claude B）の実装メモを development に取り込むか、LABYRINTH_SPEC に節を足すか。
8. **コードのコメントが指している存在しない資料**（`docs/specs/field-side-events/`・`docs/specs/field-puzzles/`）：#38/#45 のブランチから取り込むか、コメントを直すか（コード変更は担当 B/C）。
9. **#24・#94・#95・#97・#38・#45 など、内容は統合済みで PR が open のままのもの**：close するか（資料では「内容は統合済み・PR は参照用」と書く予定）。
10. **整理の順番**：#101〜#106 の統合を先にするか、ドキュメント整理を先にするか（css/README・AI_HANDOFF §2・world-tree の README が衝突する）。
