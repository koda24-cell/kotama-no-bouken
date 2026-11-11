# C_CODE_AUDIT：長大JS・CSSの監査と分割計画（Phase 1・Claude C）

- 対象：`/home/claude/wt-reorg`（development `1dd7ade` ＋仕様書1コミット）
- 作業：読むだけ（リポジトリのファイルは変更していない）。解析スクリプトは `/tmp/caudit/`（acorn による構文解析、簡易CSS解析、PR差分取得）。
- 仕様書：`docs/maintenance/CLAUDE_DATA_REORGANIZATION_SPEC.md` §2・§3-3・§4-4・§5 Phase 4・§6 を前提にしている。
- 行番号はすべて現在の `script.js`（2267行）のもの。PR #103〜#106 の基準 `44c69e5` から development は script.js に +196 行入っているため、PR 内の行番号とはずれる（例：`renderAllyMenu` は PR では 1312 行目、現在は 1508 行目）。

---

## 1. 概要（主な発見5つ）

1. **script.js は「関数宣言 198 個＋トップレベル let/const 51 個＋即実行文 30 個」で、読み込み時に動く処理は先頭74行とごく少数に集中している。** 即実行文は「先頭の初期データ構築（1〜63行）」「`window.KotamaGameProgression` の登録（699行）」「document へのイベント登録6件（1472・2126・2139・2146・2149・2228行）」「DOMContentLoaded の起動処理（2230〜2267行）」だけ。それ以外はすべて関数宣言なので、**関数宣言だけを別ファイルへ移すなら、TDZ や初期化順の問題はほぼ起きない**。読み込み時に別機能の関数を直接参照しているのは 699 行目（`registerCharacterLevel`）だけ。
2. **グローバル状態は script.js 先頭（1〜74行）と 222・506・2125・2148 行目に集まっていて、他ファイルからも書き換えられている。** `tutorial.js` が `tutorialState`・`shopBuyerId`・`currentCategory`・`goblinCharging` など8個、`field/field-interactions.js` が `retryContext`・`battleStartSnapshot`・`totalEnemyDefeats` など7個を直接代入している。72行目は26個の変数を1つの `let` で宣言している。**状態（let/const）は最後まで script.js に残し、移すのは関数だけ**にするのが安全。
3. **未統合PRとの衝突範囲が非常に大きい。** 開いているPRは67件あり、そのうち **script.js を変更するものが21件**（#105・#106 のほか、#97・#94・#89・#88・#85・#65・#56・#55・#54・#50・#49・#48・#47・#43・#37・#35・#34・#33・#24）、`style.css` を変更するものが13件、`css/07` が24件。#105・#106・#97・#94 はすでに development と衝突している（mergeable=false）。field 分割の前例でも、分割前を基準にした #94・#95（field.js +409/+497 行）が古いまま残っている。**script.js の分割は、UI PR の統合と、script.js を触る古いPRの扱いを決めてから始めるべき**。
4. **CSS は上書きの重なりが多く、案内文書が古い。** 読み込み順は `01→02→03→04→05→06→07→style.css→08` で、**style.css は最後ではない**（`css/README.md` と `style.css` の先頭コメントは「style.css が最後」「01〜05 のみ」と書いていて古い）。同じセレクタが2ファイル以上にあるものが90個（3ファイル以上は31個、`.topbar`・`.battle-commands` などは4ファイル）。`!important` は style.css に93個。HTML/JS のどこにも出てこないクラス（使われていない候補）が18個（`.log-window`・`.stat-line`・`.story-event-panel` など）。#103〜#106 はさらに `css/09〜12` を 08 の後ろに足し、`!important` を合計約190個使って旧ルールを上書きする設計で、旧ルールの整理は UI 改修の Phase 5 で行う予定（09 のヘッダーコメント）。**データ整理側では CSS の分割・統合をしない**のが妥当。
5. **分割前後の比較手段はすでにほぼそろっている。** `tools/battle-sim/env.js` は `index.html` の `<script>` を記載順に読み込むので、ファイルを分けても自動で追従する。現状で `tests.js` 43件成功、`regress.js . . 2` で80戦の差分0、`tools/world-tree` の5テストもすべて成功。`tools/ui-shots/capture.js`（PR #103 にだけ存在）は、そのままだと home・shop・battle の画像が実行ごとに変わる（アニメと乱数）。**乱数固定・reduced-motion・アニメ無効化を加えると、全10画面が2回の実行でバイト一致した**（`/tmp/caudit/uishots/capture-det.js`）。

---

## 2. script.js の構造地図

### 2-1. 全体の数字

| 項目 | 値 |
|---|---|
| 行数・サイズ | 2267行・258,847バイト |
| トップレベル要素 | 279個（関数宣言 198、const 27、let 24、即実行文 30） |
| 1行で書かれた関数 | 107個（関数の半数以上が1行） |
| 300文字を超える行 | 138行（最長は 928 行目の 3,662 文字） |
| 目印コメント | `[EXT]` 20・`[EVT]` 21・`[FIELD]` 17・`[LEVEL]` 4・`[COMPENDIUM]` 4・`[ANALYZE]` 2（AI_HANDOFF の「[EXT] 15か所」は古い） |
| strict モード | 先頭が `"use strict";`。分けたファイルにもすべて付ける必要がある |
| 他ファイルから参照される script.js の名前 | battle-ext.js 41個、field-interactions.js 31個、tutorial.js 22個、admin-tools.js 19個、analyze-panel.js 12個、field-navigation.js 11個 ほか |
| script.js が参照する他ファイルの名前 | battle-ext.js 46個、tutorial.js 14個、level.js 6個、monster-compendium.js 5個、field/* 10個、admin-tools.js 1個（`initAdminTools`） |
| トップレベル名の重複（全JS） | なし |

### 2-2. 機能ごとの地図

「依存先」は、そのまとまりの関数が参照している他のまとまり（参照回数の多い順）。core は 2-3 の「状態・共通」。

| 行範囲 | 量 | 機能 | 主な関数 | 依存先 | 注意 |
|---|---|---|---|---|---|
| 1〜74 | 6.0KB | **状態・初期データ構築・共通ヘルパ** | `$`・`esc`・`getCharacter`・`getParty`・`itemById`（いずれも const のアロー関数） | data/*、battle-ext（`extInstallCharacters`・`extInstallItems`） | **読み込み時に実行**。`shopItems.push`、`equipment` の初期装備、`growth`・`characterLevels` などの初期化。3-3 参照 |
| 76〜169 | 6.7KB | BGM・効果音 | `playSe`・`sound`・`currentBgmTrack`・`startBgm`・`playReadyChime`・`stopBgm` | core | BGM の割り当て表が関数内にある（データ混在） |
| 170〜177 | 3.5KB | 装備・能力値計算 | `equippedItems`・`effectiveStats`（2,443文字の1行）・`effectiveAttackPower` ほか | core、training（`treeStatBonus`） | ほぼ全機能から呼ばれる。core に含める |
| 178〜181 | 1.8KB | 画面切替・ホーム | `showScreen`・`getCharacterImage`・`renderGold`・`renderHome` | core、tutorial | **#105 が変更**（`renderHome` 書き換え、`uiJobName`・`uiWeaponSlot` 追加） |
| 182〜212 | 3.5KB | 実績・ランク・図鑑記録 | `renderAchievements`・`unlockAchievement`・`recordBattleRank`・`awardVictoryAchievements`・`registerEncounter`・`registerDefeat` | core | |
| 213〜221 | 3.0KB | 図鑑・イベント記録の描画 | `renderCompendium`・`renderEventGallery` | core、monster-compendium | **#105 が変更**（`renderEventGallery`） |
| 222〜283 | 4.6KB | ストーリーイベント | `openEvent`・`playStorySequence`・`closeStoryEvent`・`playStageEvent`・`setupStoryEvents` | core、audio | 222行目に状態 `let`（8個）。async |
| 284〜289 | 0.9KB | 全体再描画 | `renderAll`・`renderClearSummary` | 多数 | 画面描画のハブ |
| 290〜311 | 1.3KB | BGM解放・サウンドトラック一覧 | `unlockBgm`・`unlockBgmForEncounter`・`renderBgmUnlocks` | core | |
| 312〜361 | 4.5KB | 戦闘の背景・敵分析・インペリアル熱表示 | `renderStageEnvironment`・`renderEnemyAnalysis`・`renderImperialStatus` | core | 戦闘描画に属する |
| 363〜399 | 8.5KB | 編成・装備 | `formationBaseStats`・`renderFormation`（3,500文字）・`equipItem`・`toggleCharacter`・`removeCharacter`・`shopDisplayCategory` | core、screens、audio | **#105 が変更**（`renderFormation` 書き換え、`formationFocus`・`formationStatsHtml` 追加）。チュートリアル参照28回 |
| 400〜425 | 4.0KB | ショップ描画 | `renderShop` | core、screens | **#105 が変更** |
| 427〜444 | 2.0KB | スキルツリー基礎 | `treeNodes`・`getTreeLevel`・`setTreeLevel`・`hasTreeSkill`・`getCharacterSkills` | core、data/skill-trees | 427・428・434行目に const と即実行の初期化 |
| 446〜681 | 22.9KB | 育成・スキル強化確認ダイアログ | `getTrainingUpgradeEligibility`・`getTrainingEffectPreview`・`openSkillUpgradeDialog`・`renderProgressionPanelUnsafe`（7,933文字）・`renderProgressionPanel` | core、shop | **1dd7ade（#107）で +193 行入ったばかり**。**#105 が `renderProgressionPanelUnsafe` を変更**しており、すでに衝突中 |
| 683〜715 | 3.6KB | 製作・強化・レベル登録・素材獲得 | `craftRecipe`・`enhanceWeapon`・`registerCharacterLevel`・`awardMaterials`・`showItemDropAnimation` | core、bfx | **699行目は読み込み時に `registerCharacterLevel` を参照** |
| 716〜765 | 4.8KB | ショップ購入・比較表示 | `getShopItemSlot`・`previewEquipmentStats`・`renderShopStatPreview`・`buyItem`・`showPurchasePopup`・`setSystemMessage` | core、screens | |
| 766〜816 | 3.2KB | サウンドトラック試聴 | `stopPreview`・`previewTrack` | core | |
| 817〜936 | 19.9KB | **画面のボタン配線（設定・メニュー含む）** | `setupNavigation`（16,001文字・927〜928行目に巨大な1行）・`openStageSelectDialog`・`persistAudioSettings`・`applyVolumeControls`・`updateListMenuForScreen` | ほぼ全機能 | DOMContentLoaded から呼ばれる。全画面のイベント登録を1関数で行う。チュートリアル参照144回 |
| 938〜1008 | 16.5KB | **セーブ／ロード** | `buildEquipmentState`・`createSaveData`・`persistAutoSave`・`createBattleStartSnapshot`・`migrateLegacySlot`・`renderSaveSlots`・`saveGame`・`loadSaveSlot`・`loadGame`（8,173文字） | core 69回、training、audio、shop | localStorage 12回。field・level・compendium のシリアライズを呼ぶ |
| 1009〜1170 | 11.7KB | 戦闘開始 | `createEnemy`・`resetTransientBattleState`・`startBattle`・`beginStageCore`・`beginStage` | core、bfx、audio、bui | async。`[FIELD]` 7か所 |
| 1171〜1222 | 2.3KB | ステージ演出 | `createStageParticles`・`playMaouClearAnimation` | core | **`Math.random` を13回使う**（見た目用だが戦闘と同じ乱数列を消費） |
| 1223〜1242 | 1.3KB | 戦闘ログ | `refreshBattleLog`・`pushLog`・`renderBattleLogDialog`・`pushEvent` | core | |
| 1243〜1318 | 8.0KB | 戦闘アニメ・速度 | `animateEnemyAttack`・`showEnemyOmen`・`combatNumber`・`flashEnemyDamage`・`applyPartyDamageAnimated`・`battleDelayMs`・`wait`・`syncBattleSpeedUI` | core、bcalc | |
| 1319〜1418 | 9.5KB | **ダメージ計算** | `calcDamage`・`calcPhysical`・`calcEnemyPhysicalDamage`・`applyDamageToEnemyTarget`・`livingParty`・`partyDamageReduction`・`enemyElementMultiplier`・`addBreakDamage`・`checkBossTransformation` | core、bfx | 26関数。battle-ext.js からも多数呼ばれる |
| 1419〜1571 | 30.2KB | 戦闘画面描画・コマンドメニュー | `renderBattle`（8,072文字）・`renderActionMenu`・`describeSkill`・`renderSkillMenu`・`renderItemMenu`・`renderAllyMenu`・`targetEnemy`・`commitAction` | core、audio、bcalc | **1472行目で document に click（capture）を登録**。**#106 が `renderAllyMenu` を変更** |
| 1572〜1679 | 9.0KB | 行動表示・ターン進行 | `actionDisplayLabel`・`battleMemberActionStatus`・`undoPrevious`・`executeTurn` | bcalc、bfx、core | async |
| 1680〜1843 | 25.0KB | 味方の行動・ユニオン | `applySequentialMagicHits`・`executeAction`（14,369文字）・`clearNegativeStatuses`・`showUnionCutin`・`executeUnion` | bcalc、bfx、core | 1796行目に const `unionPortraitFiles`（データ） |
| 1844〜2008 | 14.5KB | **敵ターン・ボス行動** | `applyEnemyTurnStatuses`・`describeEnemyAction`・`enemyTurn`（12,379文字） | core、bfx、bcalc | ゴブリン連携・オオカミ分身・ドラゴン・魔王の行動がすべて `enemyTurn` 内。**敵の判定に表示名（`name==="魔王"` など）を使っている**。`Math.random` 14回 |
| 2009〜2111 | 7.9KB | 戦闘終了・リトライ | `playEnemyDefeatAnimation`・`finishStage`・`finishDefeat`・`retrySameStage`・`startHiddenBoss`・`nextStage`・`setupBattleButtons` | core、progress、bfx | |
| 2112〜2229 | 8.0KB | コマンド説明・キーボード/ポインタ入力 | `describeCommand` | bui | **読み込み時に document へ pointerover・pointerout・focusin・keydown・click を登録**。2125・2148行目に状態 let |
| 2230〜2267 | 4.1KB | **起動処理（DOMContentLoaded）** | 無名関数 | admin-tools（`initAdminTools`）、tutorial（`tutorialSave`・`showTutorialWelcome`・`syncTutorialActive`・`ensureStarterGear`）、save、nav | 新規開始・旧セーブ移行・チュートリアル移行（`kotamaTutorialStartMigrationV2`）・音量の復元。新規開始時の初期所持品が2か所に重複 |

### 2-3. グローバル状態（let/const）

| 行 | 内容 | 書き換えるところ |
|---|---|---|
| 4〜56 | `PARTY_LIMIT`・`state`・`materials`・`compendium`・`eventRead`・`BGM_TRACK_KEYS`・`bgmUnlocks`・`enemyEncounterCounts`・`growth`・`characterLevels`・`achievementUnlocked`・`unlockedSkills`・`trainingPoints`・`weaponLevels`・`inventory`・`equipment`（const）／`hiddenBossFirstClear`・`totalEnemyDefeats`・`bestRanks`・`jobVictoryRoster`・`battleSpeed`・`tutorialState`・`tutorialSpotlightTarget`・`retryContext`・`stageCleared`・`stageEntered`・`selectedStartStage`・`battleStartSnapshot`・`bgmVolume`・`seVolume` ほか（let） | save・bflow・nav・boot・tutorial.js・field-interactions.js |
| 66〜70 | `$`・`esc`・`getCharacter`・`getParty`・`itemById`（const のアロー関数。**巻き上げされない**） | — |
| 71〜74 | `formationTargetSlot`、72行目の26個（`currentCategory`・`shopBuyerId`・`audioContext`・`bgmTimer`・`currentBgmKey`・`goblinCharging`・`burnedTurns`・`specialOmenShown`・`battleBgmSelections` など）、`battleState`（大きな初期値）、`goblinTeamAttackUsed`・`defenseDownFresh`・`lastEnemyAttackMissed` | audio・shop・nav・bflow・benemy・bcalc・tutorial.js・field-interactions.js |
| 222 | ストーリーの状態8個（`activeEvent`・`storyRun` など） | story のみ |
| 427・428・434 | `skillLevels`・`legacyTreeBonuses`・`newTreeCharacterIds` | training・save |
| 506 | `skillUpgradeDialogCleanup` | training のみ |
| 1468・1796 | `SKILL_RESTRICTED_REASON`・`unionPortraitFiles`（データ） | — |
| 2125・2148 | `lastHoveredCommand`・`mouseFocusedCommand`・`keyboardCursor` | 入力処理のみ |

複数のまとまりから書き換えられる例：`retryContext`（screens・nav・bflow・field-interactions）、`shopBuyerId`（shop・training・nav・tutorial）、`bgmVolume`/`seVolume`（nav・save・boot）、`battleStartSnapshot`（nav・bflow・field-interactions）、`goblinCharging` など（bflow・benemy・tutorial）。

### 2-4. 読み込み時に実行される処理（すべて）

| 行 | 処理 | 分割時の扱い |
|---|---|---|
| 1 | `"use strict"` | 新しいファイルすべての先頭に付ける |
| 7・13 | `extInstallCharacters(characters)`・`extInstallItems(shopItems, …)`（battle-ext.js の関数） | script.js に残す（battle-ext.js より後であることが必要） |
| 11・14 | `shopItems.push(...accessoryItems)`、製作レシピを `shopItems` に追加 | 残す。**配列の並び順が変わるので順番を変えない** |
| 26・30・43・44・57〜63 | `growth`・`characterLevels`・`unlockedSkills`・`trainingPoints`・`equipment` の初期化、初期装備 | 残す |
| 427・428 | `skillLevels`・`legacyTreeBonuses` の初期化 | 状態と一緒に script.js へ集める（宣言と初期化は離さない） |
| 699 | `window.KotamaGameProgression = Object.freeze({setCharacterLevel: registerCharacterLevel, …})` | **読み込み時に関数の値を取り込む**。`registerCharacterLevel` と同じファイルか、それより後ろに置く（リポジトリ内に利用者はいない） |
| 1472 | document click（**capture**、`stopImmediatePropagation`）：使えないコマンドの説明 | 戦闘コマンドのファイルへ。2228行目より前に読み込まれる位置を保つ |
| 2126・2139・2146・2149 | document の pointerover・pointerout・focusin・keydown（キーボード操作・チュートリアル中の操作制限） | 入力のファイルへ。順番を変えない |
| 2228 | document click：ボタン共通の選択音と BGM 開始 | 同上（最後に登録） |
| 2230 | `DOMContentLoaded` の起動処理 | **script.js に残す**。analyze-panel.js・field-persistence.js の DOMContentLoaded より先に登録される順番を保つため |

他のJSの読み込み時処理：`tutorial.js` 96・97行（window の resize/scroll）、`analyze-panel.js` 144行（DOMContentLoaded）、`field/field-interactions.js` 337行（setInterval）、`field/field-persistence.js` 89行（DOMContentLoaded）。

---

## 3. その他の JS の判断

| ファイル | 規模 | 判断 | 理由 |
|---|---|---|---|
| `battle-ext.js` | 858行・50KB・関数84・let 2 | **今は分割不要**（将来分けるなら下記6単位） | 区切りコメントで7節に整理済み（職業解放／状態異常／耐性・付与率／行動順／スキル・インペリアル／敵バリエーション／魔王フェーズ／戦闘イベント通知）。読み込み時の処理は宣言だけ。script.js の変数は関数の中でのみ参照（AI_HANDOFF の約束どおり）。開いている PR #97（+210行）・#64・#53・#52・#51・#49・#47・#42 が触っており、分けると衝突する。分けるなら `battle-ext/ext-jobs.js`（19〜75）、`ext-status.js`（77〜456）、`ext-order.js`（458〜524）、`ext-skills.js`（526〜644）、`ext-enemy.js`（646〜760）、`ext-events.js`（762〜858） |
| `tutorial.js` | 172行・19KB | 分割不要 | 1機能。ただし script.js の let を8個直接書き換える（設計上の課題として §7-3） |
| `admin-tools.js` | 71行・11KB | 分割不要 | 独立。1行が長い |
| `analyze-panel.js` | 144行・10KB | 分割不要 | 読み取り専用パネル |
| `level.js` | 72行・4KB | 分割不要 | |
| `monster-compendium.js` | 184行・12KB | 分割不要 | #105 が変更中 |
| `field.js`＋`field/*` | 合計約2,000行 | 分割済み。追加の分割は不要 | 最大の `field/field-interactions.js`（559行・38KB）は「宝箱・採集の状態管理（`[LOOT]`、198〜360行付近）」を `field-loot.js` に分ける余地はあるが、急がない。#104 が `field-render.js`・`field-movement-foe.js` を変更中 |

参考：field 分割の前例は「機能別ファイル＋README の担当表＋読み込み順の明記＋classic script のまま」で、script.js 分割でもこの形をそのまま使える。一方で、分割前の `field.js` を基準にした PR #94・#95 が古いまま残っている。script.js でも同じことが起きる。

---

## 4. CSS の棚卸しと上書き関係

### 4-1. 読み込み順と役割（現在の development）

| 順 | ファイル | 行・サイズ | ルール数 | `!important` | 役割 |
|---|---|---|---|---|---|
| 1 | `css/01-battle-base.css` | 346行・40KB | 313 | 19 | 戦闘画面の土台、敵登場・撃破・ユニオン演出、ダメージ表示（keyframes 34） |
| 2 | `css/02-screens-and-shell.css` | 229行・26KB | 205 | 15 | 外枠、ショップ・装備、素材・製作、図鑑・イベント記録、実績、倍速 |
| 3 | `css/03-responsive-layout.css` | 484行・8KB | 80 | 3 | 全画面レイアウト・レスポンシブ（01・02 を大量に上書き） |
| 4 | `css/04-nav-and-battle-panels.css` | 256行・6KB | 31 | 0 | 上部ナビ、コマンド欄・ログ欄 |
| 5 | `css/05-progression-and-boss.css` | 224行・21KB | 204 | 8 | HP・報酬、育成、スキルツリー、魔王、撤退確認、スキル強化確認（1dd7ade で +33行） |
| 6 | `css/06-field.css` | 162行・14KB | 129 | 1 | 探索画面 |
| 7 | `css/07-labyrinth.css` | — | 86 | 8 | 迷宮（開いているPR 24件が追記） |
| 8 | `style.css` | 475行・38KB | 244 | **93** | チュートリアル、メニュー、STORY 演出、管理画面、`[EXT]` 状態表示ほか |
| 9 | `css/08-cartography-ui.css` | — | 32 | 2 | 地図UI（**style.css より後**） |
| 10〜13 | `css/09-ui-base.css`〜`12-ui-screens.css` | — | — | 09:33・11:59（#106）・12:96（#105） | **未統合（#103〜#106）**。08 の後ろに追加 |

文書の古い点：`css/README.md` は「6ファイル」「style.css が最後」、`style.css` の先頭コメントは「css/ は 01〜05」、`AI_HANDOFF.md` の表は「css/01〜05 → style.css」と書いている。実際は 06・07 が style.css の前、08 が style.css の後。**「迷ったら style.css の末尾」はもう「最後に勝つ」ことを意味しない**。

### 4-2. 上書きの重なり

- 同じセレクタが2ファイル以上にあるもの：90個（全1,009個中）。3ファイル以上：31個。
- 重なりの多い組み合わせ：01×03（46個）、02×03（25個）、01×02（18個）、02×05（14個）、01×04・03×04（各12個）、01×style（9個）。
- 4ファイルにまたがるもの：`.topbar`（01・03・04・style）、`.battle-screen`（01・02・03・05）、`.battle-bottom`・`.battle-commands`・`.log-window`・`.command-window`（01〜04）、`.battle-commands .command-option`（02〜05）。
- `!important` が複数ファイルで重なるセレクタ：13個（`.battle-party`・`.command-window`・`.enemy-image.damage-flash`・`.battle-arena.dragon-breath::after`・`#list-button`・`.list-menu`・`.battle-member.damage-flash` など）。`!important` 同士は**読み込み順で勝敗が決まる**ので、順番の入れ替えで見た目が変わる。
- 同じファイル内で同じセレクタを同じ条件で2回以上書いているもの：01 が40個、02 が16個、style が13個、03 が11個。
- keyframes 名の重複：なし。

### 4-3. 使われていない候補（HTML・JS に名前が出てこないクラス）

`.log-window`（5ファイル）・`.stat-line`（4ファイル）・`.story-event-panel`・`.story-event-footer`・`.victory-overlay`・`.status-burn`・`.status-down`・`.snd`・`.wolf-clone`・`.shop-class-tabs`・`.samurai-emblem`・`.growth-note`・`.growth-preview`・`.growth-actions`・`.maou-story`・`.maou-story-text`・`.lg-event`・`.lg-puzzle` の18個。ほかに、`"prefix-"+変数` の形で動的に作られている可能性がある16個は除外した。**削除は見た目に影響しうる（セレクタの一部として使われる場合など）ので、UI 改修 Phase 5 の整理PRで撮影比較しながら行う**。

### 4-4. #103〜#106 の CSS との関係

- 4つのPRは共通の土台コミット `d2fc731`（`09-ui-base.css` と、空の `10`〜`12` を作る）から枝分かれしていて、#104 が `10-ui-field`、#106 が `11-ui-battle`、#105 が `12-ui-screens` を埋める分担になっている。お互いの衝突は少ない（#103 だけ `09` に +6 行の追加コミットがある）。
- #104 だけが既存CSS（`07`・`08`）を変更している。**#105 は既存CSSを変更していない**（依頼文の「#105 は既存CSSの一部」は、PR の変更ファイル一覧では確認できなかった）。
- 09〜12 は 08 の後ろで読み込まれ、`!important` で旧ルールに勝つ前提。旧ルール（01・03・04・05・style）の整理は UI 改修 Phase 5 で行う予定。

### 4-5. CSS の分割・統合の方針

- **データ整理の Phase 3・4 では CSS を分割・統合しない**。やるのは文書（`css/README.md`、`style.css` 先頭コメント、`AI_HANDOFF.md`）の読み込み順の修正だけ（Phase 2）。
- 将来、整理するとき（UI Phase 5 の後）の順序を保つ方法：
  1. 分割・統合の前後で「`index.html` の `<link>` 順にファイルを連結した結果」が一致することを確認する（ルールの並びを変えずに区切るだけなら、連結結果は完全一致する。前回の 01〜05 分割と同じ方法）。
  2. ルールの移動や削除を伴う場合は、撮影比較（6-3）でバイト一致を確認する。
  3. `style.css` を 08 の後ろに移す、などの順番の入れ替えはしない。

---

## 5. 分割計画

### 5-1. 基本方針

1. **classic script のまま**。`defer` 付きの `<script>` を増やすだけ。ES Modules・ビルドは使わない。
2. **移すのは関数宣言だけ。トップレベルの let/const（状態・定数）と、読み込み時の実行文は script.js に残す**（例外は 699 行目、§5-4）。
3. **1行も書き換えない**。行をそのまま切り取って新しいファイルに貼る（整形・改名・コメント追加をしない）。新しいファイルの先頭に `"use strict";` と、担当範囲を書いたコメントだけを足す。
4. 1回のPRで1〜2まとまり（目安：1,000〜3万文字、関数30個まで）。
5. script.js の名前は残す（`index.html` の `onerror`、文書、ツールが参照しているため）。最後に script.js は「状態・初期化・共通ヘルパ・能力値計算・起動処理」（約14KB）になる。

### 5-2. 分割後のファイル（最終形の案）

field の前例にならって、フォルダ＋機能名のファイルにする。

| ファイル | 元の行範囲 | 量 | 主な関数 |
|---|---|---|---|
| `script.js`（残す） | 1〜74、170〜177、427〜428・434（状態）、2230〜2267 | 約14KB | 状態・初期化・`$`/`esc`・`effectiveStats` 系・起動処理 |
| `game/game-audio.js` | 76〜169、290〜311、766〜816、934〜935 | 約11KB | BGM・効果音・BGM解放・試聴・音量 |
| `game/game-progress.js` | 182〜212、687〜715（699行目を含む） | 約7KB | 実績・ランク・図鑑記録・レベル登録・素材獲得 |
| `game/game-story.js` | 223〜283（222行目の状態は script.js へ） | 約4.5KB | ストーリーイベント |
| `game/game-screens.js` | 178〜181、213〜221、284〜289 | 約6KB | 画面切替・ホーム・図鑑描画・イベント記録・全体再描画 |
| `game/game-formation.js` | 363〜399 | 約8.5KB | 編成・装備 |
| `game/game-shop.js` | 400〜425、683〜684、716〜765 | 約12KB | ショップ・製作・強化・購入 |
| `game/game-training.js` | 429〜433、435〜444、446〜681 | 約25KB | スキルツリー・育成・強化確認ダイアログ |
| `game/game-save.js` | 938〜1008 | 約16.5KB | セーブ／ロード |
| `game/game-nav.js` | 817〜933、936 | 約20KB | 画面のボタン配線・ステージ選択・リスト |
| `battle/battle-calc.js` | 1319〜1418 | 約9.5KB | ダメージ計算 |
| `battle/battle-fx.js` | 1171〜1318 | 約10KB | ステージ演出・ログ・戦闘アニメ・速度 |
| `battle/battle-render.js` | 312〜361、1419〜1471、1473〜1550 | 約30KB | 戦闘画面描画・コマンドメニュー・対象選択（1472行目の登録を含めるかは §5-4） |
| `battle/battle-turn.js` | 1551〜1843 | 約38KB | 行動確定・ターン進行・味方行動・ユニオン |
| `battle/battle-enemy.js` | 1844〜2008 | 約14.5KB | 敵ターン・ボス行動 |
| `battle/battle-flow.js` | 1009〜1170、2009〜2111 | 約20KB | 戦闘開始・終了・リトライ |
| `battle/battle-input.js` | 2112〜2229（1472行目も） | 約8KB | コマンド説明・document への入力イベント登録 |

フォルダ名（`game/`・`battle/`）とファイル名はユーザー判断事項（§8）。`battle/` と既存の `battle-ext.js` が紛らわしい場合は `core/` などにする。

### 5-3. index.html の読み込み順（最終形）

```
data/*.js（現状のまま）
battle-ext.js
script.js                ← 状態・初期化・共通ヘルパ・DOMContentLoaded の登録（現在と同じ位置）
game/game-audio.js
game/game-progress.js    ← 699行目（KotamaGameProgression）を含む
game/game-story.js
game/game-screens.js
game/game-formation.js
game/game-shop.js
game/game-training.js
game/game-save.js
game/game-nav.js
battle/battle-calc.js
battle/battle-fx.js
battle/battle-render.js
battle/battle-turn.js
battle/battle-enemy.js
battle/battle-flow.js
battle/battle-input.js   ← document の入力イベント（1472 → 2126〜2228 の順を保つ）
tutorial.js 以降（現状のまま）
```

関数宣言は呼ばれるのが実行時（イベント・DOMContentLoaded の後）なので、`game/`・`battle/` の中の順番は本来自由。ただし、読み込み時に実行される 699 行目とイベント登録は、上の順番で現在と同じ順序になる。

### 5-4. classic script でトップレベルの let/const を別ファイルに移すときの問題と対策

| 問題 | 内容 | 対策 |
|---|---|---|
| 再宣言エラー | 別ファイルで同じ名前を let/const/class で宣言すると、または関数宣言と let が同じ名前になると、**後のファイル全体が SyntaxError で1行も実行されない** | 移動のたびに「全ファイルのトップレベル名に重複がない」ことを機械的に確認する（`/tmp/caudit/xref.js` の重複チェックを tools 化） |
| 永久TDZ | ファイルの途中で例外が起きると、そのファイルの let/const は「宣言済み・未初期化」のまま残り、**他のすべてのファイルから参照するたびに ReferenceError** になる | 状態は script.js に残す。新しいファイルには読み込み時の処理を置かない |
| 初期化順 | 移したファイルの let/const の初期値が、後で読み込まれるファイルの関数や値を使うと失敗する。同じファイル内なら関数宣言は巻き上げで使えたが、ファイルをまたぐと使えない | 今回の分析では、初期値が別機能の関数を使う例は 699 行目だけ。699 行目は `registerCharacterLevel` と同じファイルに移す |
| window のプロパティでなくなる | トップレベルの let/const は `window.xxx` にならない。関数宣言は `window.xxx` になる | 関数宣言を `const xxx = () =>` に書き換えない。`tools/ui-shots/capture.js` は `window.persistAutoSave = () => true` で関数を差し替えている（関数宣言だから効いている） |
| strict モード | `"use strict"` はファイルごと。付け忘れると、宣言していない変数への代入がエラーにならず、黙ってグローバル変数が作られる | 新しいファイルの1行目に必ず `"use strict";` |
| `typeof x === "function"` の確認 | 後のファイルの関数は、読み込み時点では存在しない | 読み込み時に `typeof` で他ファイルの関数を確認している箇所は、現在は 7・13 行目（battle-ext.js、先に読み込み済み）だけ。新たに作らない |
| イベント登録の順番 | 同じ要素・同じ段階のリスナーは登録順に動く。`stopImmediatePropagation` を使う 1472 行目（capture）と 2228 行目（bubble）は段階が違うので、お互いの順番には依存しないが、他ファイルの document リスナーとの順番は変わりうる | 入力イベントの登録は1つのファイル（battle-input.js）に、元の順番のまま置く。DOMContentLoaded は script.js に残す |
| 72行目の26変数の1行宣言 | 一部だけ移すには宣言を分けて書き換える必要がある | 分けない。状態は script.js に残す |

**結論：状態（let/const）は移さない。** 機能ごとに状態を持たせる（例：audio の `audioContext`・`bgmTimer`）のは分割後の別提案にし、やる場合も「そのまとまりだけが書き換え、他ファイルから参照されない」ものに限る（2-3 の表で、`audioContext`・`bgmTimer`・`storyRun` などは1か所からしか書き換えられていない）。

### 5-5. 移す順番と PR の分け方

前提：§7 の「UI PR の統合」と「古いPRの扱いの決定」が済んでいること（S0 だけは先に進めてよい）。

| PR | 内容 | 規模 | 理由・確認 |
|---|---|---|---|
| **S0** | 比較ツールだけを追加（script.js は触らない）：トップレベル名の一覧・重複チェック、`node --check` 一括、行の対応表チェック（移した行が元の行と完全一致）、セーブJSON比較、撮影の決定化（§6） | ツールのみ | ゲーム本体に影響しないので UI PR と並行可 |
| **S1** | `battle/battle-calc.js`（1319〜1418） | 100行・26関数 | 最初の候補として最も安全：純粋な計算が中心、読み込み時の処理なし、UI PR が触らない、`regress.js` で直接検証できる |
| S2 | `battle/battle-fx.js`（1171〜1318）＋`battle/battle-enemy.js`（1844〜2008） | 約310行 | regress で検証。ボス行動は §7-4 の別提案があるので、移すだけにする |
| S3 | `battle/battle-turn.js`（1551〜1843） | 約290行 | regress＋チュートリアル戦闘 |
| S4 | `battle/battle-render.js`＋`battle/battle-input.js` | 約350行 | **#106 の統合後**。撮影比較（battle-states）、キーボード操作の確認 |
| S5 | `battle/battle-flow.js` | 約260行 | `[FIELD]` フックがあるので、world-tree テストも実行 |
| S6 | `game/game-audio.js`＋`game/game-story.js`＋`game/game-progress.js`（699行目を含む） | 約300行 | 撮影比較・音の手動確認 |
| S7 | `game/game-save.js` | 約70行（16.5KB） | **セーブJSON比較が必須**。saveVersion・キーは変えない |
| S8 | `game/game-nav.js` | 約120行（20KB） | 全画面のボタン操作・チュートリアル全体の流れ |
| S9 | `game/game-screens.js`・`game-formation.js`・`game-shop.js`・`game-training.js` | 約370行 | **#105 の統合後、最後**。撮影比較（screens-states・tutorial-flow） |
| S10 | 文書：`AI_HANDOFF.md` の読み込み順・「何を直したいか→どこを触るか」、新しい `game/README.md`・`battle/README.md`（field/README.md と同じ形） | 文書 | 各PRで少しずつ更新してもよい |

各PRで `index.html` の `?v=` は「その時点の development の最大値＋1」に統一（現在の最大は `20261108-01`）。script.js と、新しく足すファイルの両方に付ける。

---

## 6. テスト・比較方法

| 方法 | 内容 | 現状 |
|---|---|---|
| 構文 | 全JSに `node --check` | 現在すべて成功 |
| トップレベル名 | 分割前の script.js のトップレベル名の集合 ＝ 分割後の script.js＋新ファイルの集合。全ファイルで重複なし。他ファイルからの参照先がすべて存在する | `/tmp/caudit/xref.js`・`an.js` を tools 化（S0） |
| 行の対応 | 移動したブロックが元の script.js の連続した行と完全一致し、残りの script.js が「元から移動した行を除いたもの」と一致する（`diff` で確認。PR に移動対応表を載せる） | S0 で作る |
| 戦闘（乱数固定） | `node tools/battle-sim/regress.js <分割前> <分割後> 10`（80〜400戦のログのハッシュ比較）、`node tools/battle-sim/tests.js` | 現在 43件成功、`regress . . 2` で 80戦 diff=0。`env.js` は index.html の順で読み込むので、分割に自動で追従する |
| 探索 | `tools/world-tree/validate.js`・`test_basic.js`・`test_flee.js`・`test_puzzles.js`・`loot_test.js` | 現在すべて成功（validate は注意3件） |
| セーブ | `loot_harness.js` と同じ方法で全スクリプトを読み込み、決まった操作（購入・装備・育成・戦闘1回）の後の `createSaveData()` を JSON にして前後で比較。逆に、保存済みJSONを `loadGame` で読んで再保存した結果も比較 | S0 で作る |
| 撮影 | `tools/ui-shots/capture.js`（#103 で追加）を、**乱数固定（`addInitScript` で `Math.random` を置き換え）＋`emulateMedia({reducedMotion:"reduce"})`＋アニメ・トランジション無効化の CSS 注入**で実行し、前後の PNG をバイト比較。390×844・360・1280 の3サイズ | そのままでは home・shop・battle が毎回変わる。上記の変更で10画面すべて2回一致を確認（`/tmp/caudit/uishots/capture-det.js`）。#104〜#106 の状態別撮影（`field-states.js`・`battle-states.js`・`screens-states.js`・`tutorial-flow.js`）も同じ変更で使える |
| チュートリアル | #105 の `tools/ui-shots/tutorial-flow.js` で流れを撮影比較。加えて新規開始（`kotamaStartNewGameNow`）と旧セーブからの起動を手動で確認 | #105 統合後 |
| ブラウザ・実機 | コンソールエラーがないこと、1面の戦闘が最後まで進むこと。iPhone 実機は未確認なら「未確認」と書く | 毎PR |

---

## 7. リスクと未統合PRとの関係、推奨する進め方

### 7-1. 未統合PRとの関係

| PR | 変更（JS・CSS・HTML） | 状態 | script.js 分割との衝突 |
|---|---|---|---|
| #103 | `css/09〜12`（新規）、`index.html`（viewport・`<link>` 4行）、`tools/ui-shots/*` | 衝突なし | 小（index.html の head のみ） |
| #104 | `css/07`・`08`・`09〜12`、`field/field-render.js`・`field-movement-foe.js`、`index.html` | 衝突なし | なし（script.js を触らない） |
| #105 | script.js +69/−28（`renderHome`・`renderEventGallery`・`renderFormation`・`shopDisplayCategory` 付近・`renderShop`・`renderProgressionPanelUnsafe`、新関数 `uiJobName`・`uiWeaponSlot`・`formationFocus`・`formationStatsHtml`）、`monster-compendium.js`、`index.html` +34/−16、`css/12` | **衝突中**（`renderProgressionPanelUnsafe` が #107 の変更と重なる、`?v=` も） | **大**（S9 の範囲すべて） |
| #106 | script.js +1/−1（`renderAllyMenu`）、`css/11`、`index.html` | **衝突中**（`?v=`） | 中（S4 の範囲） |
| その他 | script.js を触るPRが19件（#97・#94・#89・#88・#85・#65・#56・#55・#54・#50・#49・#48・#47・#43・#37・#35・#34・#33・#24）。多くは古い基準（`bd6e8e8`・`5213192`）や、GPT のPRを積み重ねたもの | #97・#94 は衝突中 | 分割後は全件、作り直しが必要になる |

### 7-2. リスク一覧

| リスク | 影響 | 対策 |
|---|---|---|
| 開いているPRとの衝突（21件） | 分割後、各PRの差分が「消えた行」に当たり、手で移し直すことになる | UI PR を先に統合する。残りのPRは統合・作り直し・閉じるのどれにするかをユーザーが決めてから分割を始める |
| 1行に詰め込んだ巨大関数 | 移動は1行単位なので楽だが、衝突も関数単位で起きる | 移動は行をそのまま扱う。整形は別提案（§7-4） |
| 読み込み時の処理の順番 | 699行目・イベント登録・DOMContentLoaded の順番が変わると挙動が変わる | §5-3 の順を守る。DOMContentLoaded は script.js に残す |
| 永久TDZ・再宣言 | 1か所の失敗で全体が止まる | 状態を移さない。重複チェックを毎回実行 |
| `Math.random` を描画でも使っている | 呼び出し順が変わると戦闘結果が変わる | 行を書き換えない限り呼び出し順は変わらない。regress で確認 |
| ファイルの置き忘れ | ローカルで index.html を開いて遊ぶ場合、`game/`・`battle/` フォルダを一緒に置かないと動かない。`onerror` の案内は script.js にしかない | field/ と同じ扱い。案内文に「フォルダごと置く」を足すかはユーザー判断 |
| `?v=` の競合 | 新しいファイルが増えるほど index.html の head が衝突しやすい | PRごとに最新 development を取り込み、最大値＋1 に統一 |
| CSS を整理した場合の見た目の変化 | `!important` の重なり・同じセレクタの複数定義 | 今回は CSS を触らない。UI Phase 5 で撮影比較しながら整理 |

### 7-3. 推奨する進め方（順番）

1. **今すぐ（並行可）**：この監査を共有。文書だけの修正（`css/README.md`・`style.css` 先頭コメント・`AI_HANDOFF.md` の CSS 読み込み順と `[EXT]` の数）を Phase 2 で行う。S0（比較ツール）を作る。
2. **UI PR の統合**：#103 → #104 → #106 → #105 の順（#103 は土台、#104 は script.js を触らない、#106 は script.js 1行、#105 は script.js の変更が最大で development との衝突解消も必要なので最後）。#105・#106 は最新 development に取り込み直してから統合する。
3. **古いPRの扱いを決める**：script.js・battle-ext.js・style.css を触る開いているPR（特に GPT の積み重ね #43〜#89、Claude の #94・#95・#97）を、統合・作り直し・閉じるに分ける。
4. **script.js の分割**：S1（battle-calc）→ S2 → S3 → S4 → S5（戦闘系、regress で検証しやすい順）→ S6 → S7（セーブ）→ S8（配線）→ S9（UI画面、#105 統合後）。各PRは小さく、統合を確認してから次へ。分割中は他のAIに script.js への新しい変更を控えてもらう（「凍結期間」を設けるか、ユーザー判断）。
5. **battle-ext.js と CSS は今回分割しない**。CSS の整理は UI 改修 Phase 5 に任せる。

### 7-4. 分割だけでは解決できない設計上の問題（別提案）

1. **ボス・敵の行動を表示名で判定している**：`enemyTurn` などで `e.name==="魔王"`・`"オオカミ"`・`"ゴブリン"` など。表示名を変えると行動が壊れる。敵ID（`data/enemies.js`）で判定する形への移行を提案（仕様変更なしで可能だが、挙動確認が必要）。
2. **巨大な1行関数**：`setupNavigation`（16,001文字）、`executeAction`（14,369）、`enemyTurn`（12,379）、`loadGame`（8,173）、`renderBattle`（8,072）、`renderProgressionPanelUnsafe`（7,933）。1行が長いため、小さな修正でも衝突する。自動整形（改行を入れるだけ）を、開いているPRが少ない時期に単独のPRで行う案。分割と同時にはしない（「行がそのまま移った」ことを確認できなくなる）。
3. **グローバル状態を他ファイルが直接書き換える**：`tutorial.js`（8個）・`field-interactions.js`（7個）・`admin-tools.js`（読み取り）。状態を1つの名前空間（例：`state` に寄せる）にまとめるか、書き換え用の関数を用意する案。セーブ構造に関わるものは触らない。
4. **script.js にまだあるデータ**：BGM の割り当て（`currentBgmTrack`・`startBgm` 内の表、`BGM_TRACK_KEYS`）、`unionPortraitFiles`、`SKILL_RESTRICTED_REASON`、新規開始時の初期所持品・初期装備（起動処理内で2か所に重複、57〜63行目の初期装備）。data/ への移動は Phase 3 の候補（値・順番は変えない）。
5. **画面のボタン配線が1関数に集中**：`setupNavigation` が全画面のイベント登録とチュートリアル連携（`tutorial` を144回参照）を持つ。画面ごとの登録関数に分ける案（登録順が変わるので挙動確認が必要）。
6. **起動処理にセーブ移行が混ざっている**：`kotamaTutorialStartMigrationV2`、旧スロット移行（`migrateLegacySlot`）。セーブ処理（game-save.js）側にまとめる案。セーブ形式は変えない。
7. **CSS の重複・使われていないルール・`!important` の多さ**：UI 改修 Phase 5 で整理。

---

## 8. ユーザー判断事項

1. **順番**：UI PR（#103 → #104 → #106 → #105）の統合を、script.js 分割より先に行ってよいか（推奨：先に統合）。
2. **古いPRの扱い**：script.js を触る開いているPR 21件（UI PR 以外に19件）を、分割前に統合する・作り直す・閉じる、のどれにするか。決まるまで分割は始めない（推奨）。
3. **凍結期間**：分割PR（S1〜S9）の間、他のAIの script.js への変更を控えてもらうか。
4. **フォルダ名・ファイル名**：`game/`・`battle/`（案）でよいか。`battle-ext.js` と紛らわしければ別名にする。
5. **状態の扱い**：let/const は script.js に残す方針でよいか（推奨）。機能ごとに状態を持たせるのは別提案にする。
6. **CSS**：今回は文書の修正だけにして、分割・統合・使われていないルールの削除は UI 改修 Phase 5 に任せてよいか。
7. **battle-ext.js**：今回は分割しない判断でよいか。
8. **別提案の扱い**：§7-4 のうち、どれを次の作業にするか（特に 1：敵の判定を表示名からIDへ、2：自動整形）。
9. **撮影ツール**：`tools/ui-shots/capture.js` に乱数固定・アニメ無効化のオプションを足すか（#103 統合後。UI 改修担当と調整）。
