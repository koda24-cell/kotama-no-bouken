# B_DATA_AUDIT：`data/` 固定データの監査と分割計画（Phase 1・Claude B）

- 調査対象：`/home/claude/wt-reorg`（development `1dd7ade` ＋仕様書コミット `d9db26b`）
- 作業内容：読むだけ。リポジトリは一切変更していない（commit・push なし）
- 自分用の解析スクリプト：`/tmp/bdata/`（`load.js`・`audit.js`・`props.js`・`compare.js`・`split_trial.js`）
- **試行分割**：`/tmp/bdata/trial/`（リポジトリのコピー）で、下記 §4 の分割を実際に行い、既存テストと比較スクリプトを通した（結果は §4-4）。リポジトリ本体には反映していない。

---

## 1. 概要（主な発見5つ）

1. **データファイルどうしは読み込み時に依存していない。** 15個の `data/*.js` はどれも1ファイルだけで読み込みに成功する（`/tmp/bdata/props.js` で確認）。中身はすべてリテラルで、関数・`undefined`・`NaN`・共有参照は無い。`window.` への代入も無い。読み込み順に意味があるのはロジック側（`battle-ext.js`・`script.js`・`field*`）が実行時に参照するからで、データの値が順番で変わることはない。このため分割は「値を動かすだけ」で安全にできる。
2. **4フロアで宝箱データが1個余っている（本当に取れない宝箱）。** 2-1（第2階層2F）・3-0（第3階層1F）・4-1（第4階層2F）・5-1（第5階層2F）は、マップの `T` が1個なのに `chests` が2件ある。`field.js:80` は `T` を左上から読んだ順に `chests[i]` を割り当てるので、**2件目（ゴールド110／160／300／450）は手に入らない**。どれも仕掛け（PUZZLE）を置いたフロアで、仕掛けを置いたときに `T` が1つ消えたと推測される（推測）。値の修正はユーザー判断（§3-1）。
3. **説明（コメント）が古いままのところが多い。** `data/field-maps.js` の冒頭は「迷宮と雑魚敵・FOEのデータ」と書いているが、敵は `data/field-enemies.js` に移っている。`data/levels.js`・`field.js`・`monster-compendium.js` のコメントも「FIELD_ENEMIES／exp は field-maps.js」と書いたまま。`field-maps.js` が案内している仕様書2つ（`docs/specs/field-side-events/…`・`docs/specs/field-puzzles/…`）は存在しない。
4. **同じ情報が複数箇所にある。** ステージ名は3種類の表記がある（`FIELD_AREAS` の「はじまりの樹海」と、`script.js:933`・`admin-tools.js:29` の「樹海の入り口／炎竜の巣／魔王の城」）。BGM のファイル一覧が `script.js` 内に2回出てくる（`:127` と `:781`、一方は `%20` 付き）。素材ドロップ表は `script.js:702` の中に直接書かれている。`EXT_SKILL_BODY_PART.none` は `battle-ext.js:488` にも同じ配列がそのまま書かれている。定義だけあって使われていないもの（`growthLabels`・`growthPerPoint`）、入手できるのに使い道がないもの（`chaos_crystal`）もある。
5. **`field-maps.js` と `story.js` は、値・キー順を1つも変えずに分割できる。試行で確認済み。** 「入れ物（空のオブジェクト）を先に宣言するファイル → 各ファイルが追加する」という方式で `/tmp/bdata/trial` に分割し、分割前後の全56グローバルを `JSON.stringify` で比べて**完全に一致**した（キー順も含む）。既存テスト（world-tree の5本・battle-sim の tests）もすべて成功し、乱数を固定した戦闘の回帰比較も `battles=80 diff=0` だった。未統合の #103／#104 の `index.html` と3方向マージしても衝突は0件だった。ただし **`tools/world-tree/validate.js` は、ファイルの読み込み漏れがあってもエラー0件のまま通ってしまう**（階層が1つ消えても気づかない）ので、比較スクリプトを必ず併用する（§6）。

---

## 2. data ファイル一覧表

行数とバイト数は `sizes.tsv` と `wc` の値で、両者は一致している。「参照元」は `grep -rlw` の結果で、`docs/` は除いている。読み込み順は `index.html` の16〜30行目。

| # | ファイル | 役割 | 行／バイト | 定義するグローバル（すべて `const`） | 主な参照元 | 読込時の依存 |
|---|---|---|---|---|---|---|
| 1 | `battle-rules.js` | 職業補正・パッシブ・属性倍率・ブレイク値 | 7／612 | `BATTLE_RULES` | script.js, tools/battle-sim/sim.js | なし |
| 2 | `progression.js` | ステージ導入・クリアのイベント、成長キー、実績 | 30／4,041 | `stageEvents` `growthKeys` `growthLabels` `growthPerPoint` `achievementDefinitions` | script.js, field/field-navigation.js, loot_test | なし |
| 3 | `skill-trees.js` | スキルツリーと派生スキル、旧スキルとの対応 | 34／6,416 | `skillTreeDefinitions` `legacyEffectMap` `legacySkillMap` `skillTreeExtraSkills` `skillTreeBranchBSkills` `skillTreeDerivedSkills` | script.js | なし |
| 4 | `characters.js` | 初期6職業、ユニオンスキル | 16／2,407 | `characters` `unionSkills` | script.js, battle-ext.js（実行時に `characters.push`）, level.js, admin-tools.js, analyze-panel.js, tutorial.js, battle-sim | なし |
| 5 | `items.js` | 店売り装備・消耗品・素材名・レシピ・強化・アクセサリ・新職業武器 | 73／11,608 | `shopItems` `materialNames` `recipes` `enhancementCosts` `enhancementMaterials` `accessoryItems` `EXT_NEW_ITEMS` `EXT_ENH_MATERIALS` | script.js（実行時に `shopItems.push`）, battle-ext.js（`Object.assign(enhancementMaterials)`、`classes.push`）, field/field-interactions.js, admin-tools.js, loot_test | なし |
| 6 | `enemies.js` | 5ステージのボス・敵、隠しボス | 9／1,645 | `enemyData` `hiddenBossData` | script.js, battle-ext.js, monster-compendium.js, analyze-panel.js | なし |
| 7 | `jobs.js` | 素早さ、**敵の素早さ・ボス名**、後列、新職業、解放条件、熱、初期装備 | 63／7,920 | `EXT_JOB_SPEED` `EXT_ENEMY_SPEED` `EXT_BOSS_NAMES` `EXT_REAR_IDS` `EXT_NEW_JOB_IDS` `EXT_JOB_UNLOCK_BY_STAGE` `EXT_JOB_UNLOCK_HIDDEN` `EXT_HEAT_LIMIT` `EXT_RELEASE_MULT` `EXT_DEFENSELESS_MULT` `EXT_STARTER_GEAR` `EXT_NEW_JOBS` | battle-ext.js（ほぼ全部）, script.js, analyze-panel.js | なし |
| 8 | `status-effects.js` | 状態異常の定義・別名・効果量・部位 | 73／5,815 | `EXT_STATUS_DEFS` `EXT_STATUS_ALIASES` `EXT_AILMENT_RULES` `EXT_SKILL_BODY_PART` | battle-ext.js, analyze-panel.js | なし |
| 9 | `enemy-variants.js` | 1〜3面の敵バリエーション | 28／4,008 | `EXT_ENEMY_VARIANTS` | battle-ext.js, monster-compendium.js | なし |
| 10 | `boss-phases.js` | 魔王のフェーズ行動 | 38／2,239 | `EXT_MAOU_PHASES` | battle-ext.js | なし |
| 11 | **`field-maps.js`** | 5階層×3フロアのマップ・物・宝箱・採集・出現表・FOE・BGM、サブイベント、仕掛け | **541／34,575** | `FIELD_AREAS` `FIELD_SIDE_EVENTS` `FIELD_PUZZLES` | field.js, field/field-interactions.js・-navigation.js・-persistence.js・-puzzles.js, script.js:963, monster-compendium.js, tools/world-tree（validate・test_basic・test_puzzles・loot_test） | なし |
| 12 | `field-gathering.js` | 採集の種別・ルール・採集点ごとの表 | 77／5,039 | `FIELD_GATHER_KINDS` `FIELD_GATHER_RULES` `FIELD_GATHER_POINTS` | field/field-interactions.js, loot_test | なし（README の「field-maps.js の後」は実行時の都合で、読み込み時の依存ではない） |
| 13 | `field-enemies.js` | 迷宮の雑魚敵10種・FOE5種 | 47／8,191 | `FIELD_ENEMIES` | field/field-interactions.js・-movement-foe.js・-persistence.js, monster-compendium.js | なし |
| 14 | `levels.js` | レベル上限・経験値曲線・成長率・ボスの経験値 | 21／1,599 | `LEVEL_CAP` `LEVEL_EXP_CURVE` `LEVEL_GROWTH` `LEVEL_SKILL_POINTS` `LEVEL_ENEMY_EXP` | level.js | なし |
| 15 | **`story.js`** | 話者と、迷宮の会話66シーン（185行分のセリフ） | **435／28,348** | `STORY_SPEAKERS` `STORY_SCENES` | field/field-dialog.js（`STORY_SCENES` を実行時に一時追加・削除する：89・92行）, loot_test | なし |
| – | `README.md` | フォルダ案内 | 58／4,613 | – | – | – |

### 2-1. `script.js` などロジック側にあるデータ（参考。Phase 4 の対象）

| 場所 | 内容 | 大きさ | メモ |
|---|---|---|---|
| `script.js:20` `BGM_TRACK_KEYS` | サウンドトラック16曲のキー | 1行 | index.html の `data-track` と対応 |
| `script.js:127-134` `playlists` | 戦闘BGMのファイル一覧 | 8行 | `:781-797` の `mp3Tracks` と同じファイルを別の書き方（`%20` 付き／無し）で書いている |
| `script.js:160` と `:805` `tracks` | 合成音BGMの音符 | 各1行 | ほぼ同じ内容が2回ある |
| `script.js:226` | ストーリーBGM2曲 | – | `mp3Tracks` と重複 |
| `script.js:295` `stageTracks` | ステージ→曲キー | 1行 | |
| `script.js:316-322` | 戦闘背景のエリア名と説明 | 7行 | エリア名が `FIELD_AREAS` と重複 |
| `script.js:403` `categoryNames`、`:411` `jobNames` | 表示名 | 各1行 | `jobNames.kotama` は「冒険者」（キャラ名は「コタマ」） |
| `script.js:702` `awardMaterials` 内の表 | ボス・雑魚の素材ドロップ率 | 1行 | data に置くべき数値（README の「残っているデータ」の一覧に載っていない） |
| `script.js:933` | ステージ選択の名前5つ | – | `admin-tools.js:29` と同じ表記で、`FIELD_AREAS` とは違う |
| `script.js:951` `starters` | 初期6職業の初期装備 | 1行 | 新職業の分は `jobs.js` の `EXT_STARTER_GEAR`。置き場所が分かれている |
| `script.js:979` `oldNodeIds` | 旧スキルノードIDの対応 | – | セーブ移行用。動かさない |
| `script.js:1069` `stageEventIds` | ステージ→導入イベントID | 1行 | `stageEvents` の導入イベントには `stage` が無いので、ここで対応させている |
| `script.js:2033-2036` | 隠しボス初回の報酬（1000G・混沌の結晶×3） | – | 素材名を直接書いている |
| `field.js:21-34` | FOE速度・当たり判定・タイル・`FIELD_GATHER_USES`・`FIELD_MATERIAL_FALLBACK` | 計14行 | `FIELD_MATERIAL_FALLBACK` は `materialNames` の一部と重複（読み込み失敗時の予備） |
| `battle-ext.js:488` | 部位を使わないスキルの一覧 | – | `EXT_SKILL_BODY_PART.none` と同じ配列 |

---

## 3. 重複・不整合・未使用の一覧（**値は変えない**。ユーザー判断が必要）

`/tmp/bdata/audit.js` で機械的に確認した。シーン参照、敵ID、素材ID、アイテムID、話者、採集点の座標、FOE経路、マップの幅、物の文字はすべて**問題なし**（シーンの欠落・未使用0、敵の未使用0、ID不明0）。見つかったのは次のとおり。

### 3-1. 不整合（ゲームの挙動に影響があるもの）

| ID | 内容 | 根拠 | 選択肢（要ユーザー判断） |
|---|---|---|---|
| D-1 | **宝箱が取れない**：2-1（2件目 `{gold:110}`）、3-0（`{gold:160}`）、4-1（`{gold:300}`）、5-1（`{gold:450}`）。どれも `T`=1、`chests`=2 | `field.js:80` は `chests[chestIndex++]` を使う。セーブキーは座標 `chest:<階層-フロア>:<x>:<y>` | (a) データの余分な2件目を削除する（挙動は変わらない）／(b) マップに `T` を1つ戻す（報酬が増える＝バランス変更。新しい座標のキーになるので既存セーブは壊れない）／(c) 現状のまま注記だけ |
| D-2 | ステージ名の表記が3系統ある：`FIELD_AREAS`（はじまりの樹海・ゴブリンの森・霧の森・焦土の溶岩洞窟・魔王城・回廊）、`script.js:933`／`admin-tools.js:29`（樹海の入り口・ゴブリンの森・霧の森・炎竜の巣・魔王の城）、`script.js:316-322` の戦闘背景（1〜3面がすべて「はじまりの樹海」） | 画面ごとに名前が違って見える | どれを正式名にするか。統一は表示テキストの変更になる |
| D-3 | `EXT_SKILL_BODY_PART.arm` に `"bindArms"` `"bindLegs"` があるが、そういう type のスキルは development に無い。`EXT_STATUS_ALIASES` も「未統合の GPT PR #47」を前提にしている | `status-effects.js:34-36, 71` | #47 を取り込まないなら削除候補。残しても害は無い |
| D-4 | 睡眠・混乱・頭／腕／脚封じは定義だけあって、付与する敵やスキルが無い（コメントにも「割り当てていない」とある） | `status-effects.js` | C1 のバランス表（#97）の承認待ち。現状維持 |

### 3-2. 重複（同じ情報が複数箇所にある）

| ID | 内容 | 場所 | 整理案（いずれも別PR・要承認） |
|---|---|---|---|
| R-1 | 素材ドロップ表がロジックの中にある | `script.js:702` | `data/items.js` か `data/enemies.js` に移す（Phase 4） |
| R-2 | BGM のファイル一覧が2回、合成音の音符も2回 | `script.js:127/781`、`:160/805` | 1つの表にまとめる（Phase 4） |
| R-3 | 敵の素早さ・ボス名が `jobs.js` にある | `jobs.js:2-3` | `enemies.js` に移す（README にも「将来移したい」とある）。値を変えずに移すだけ（§7 PR 3-4） |
| R-4 | 初期装備が2箇所に分かれている | `script.js:951`（初期6職業）／`jobs.js` `EXT_STARTER_GEAR`（新職業）。戦士は `starters` に無い | 意図的かどうか確認が必要 |
| R-5 | 部位を使わないスキルの一覧が data と battle-ext に重複 | `status-effects.js:72`／`battle-ext.js:488` | battle-ext が data を参照するように直す（ロジック変更） |
| R-6 | ステージ→導入イベントの対応がロジック側にある | `script.js:1069` | `stageEvents` に `stage` を足す案（データ構造の変更なので要承認） |
| R-7 | NPC 名を `FIELD_AREAS.objects[].name` と `STORY_SPEAKERS` の両方に書いている（7人とも一致） | field-maps.js／story.js | 今は一致しているので現状維持。分割後もこの2箇所を確認するよう README に書く |
| R-8 | 敵の経験値の持ち方が2通り：ボス・バリエーションは `LEVEL_ENEMY_EXP`（日本語名がキー）、迷宮の敵は `FIELD_ENEMIES[].exp` | levels.js／field-enemies.js | 現状維持（`level.js:26` が両方を見る） |
| R-9 | 素材名「混沌の結晶」を直接書いている | `script.js:2036` | `materialNames` を参照するように直す（Phase 4） |
| R-10 | `stageEvents` の「dragon-intro」と `story.js` の「a4-boss」がほぼ同じ文章（「熱風が吹き荒れ、巨大な翼が…」） | progression.js／story.js:202 | 文章担当の判断 |

### 3-3. 使われていない定義・使い道の無いデータ

| ID | 内容 | 確認 |
|---|---|---|
| U-1 | `growthLabels`・`growthPerPoint`（progression.js）はどこからも参照されていない。`growthKeys` はセーブの読み込み（`script.js:979`）で使っている | `grep -rw` |
| U-2 | `chaos_crystal`（混沌の結晶）は隠しボスで入手できるが、レシピにも強化にも使われていない | audit.js |
| U-3 | `dragon_claw`・`maou_horn` はボスのドロップとレシピにだけ出てくる（迷宮の採集・宝箱では手に入らない）。仕様どおりと思われる | audit.js |
| U-4 | `hero-sword` には強化素材が設定されていない（チュートリアル専用）。意図どおりかどうかは未確認 | audit.js |

### 3-4. コメント・説明と実データの食い違い（値ではない。直しても挙動は変わらない）

| ID | 場所 | 食い違い |
|---|---|---|
| C-1 | `data/field-maps.js:3` | 「迷宮（階層・フロア）と雑魚敵・FOEのデータ」→ 敵は `field-enemies.js` にある。サブイベント・仕掛けも入っていることが書かれていない |
| C-2 | `data/field-maps.js:10` | 「G=採取ポイント」→ 実際は `field-gathering.js` で採取／伐採／採掘に分かれる（floor 0・1 の G は全部、採集点の定義がある） |
| C-3 | `data/field-maps.js:7` | 「外周は壁で閉じること」→ 3-0 の外周に壁付きの仕掛け `g@9,0`・`e@26,5`・`f@0,7` がある（onWall なので動作には問題ない。validate も通る） |
| C-4 | `data/field-maps.js:17` | 「bgm は仮割り当て（ユーザー確認待ち）」→ 確認済みかどうかは未確認 |
| C-5 | `data/field-maps.js:477, 514` | 案内している `docs/specs/field-side-events/IMPLEMENTATION_NOTES.md`・`docs/specs/field-puzzles/IMPLEMENTATION_NOTES.md` が存在しない |
| C-6 | `data/levels.js:16` | 「雑魚敵・FOE は data/field-maps.js の exp」→ 正しくは `field-enemies.js` |
| C-7 | `field.js:7`、`monster-compendium.js:5` | 「field-maps.js（…雑魚敵・FOE）」「field-maps.js の FIELD_ENEMIES」→ 正しくは `field-enemies.js` |
| C-8 | `data/jobs.js:63`（最終行） | 「新職業用の武器。…」という、`items.js` の `EXT_NEW_ITEMS` についてのコメントが jobs.js の末尾に取り残されている |
| C-9 | `data/README.md` 変更ルール2 | 「jobs.js の職業IDと items.js の classes を一致させる」→ 実際は、共用装備への新職業IDの追加は `battle-ext.js` の `extInstallItems` が実行時に行っている |
| C-10 | `data/README.md` の表 | `field-maps.js` の行に `FIELD_SIDE_EVENTS`・`FIELD_PUZZLES` が書かれていない。「script.js に残っているデータ」の一覧に素材ドロップ表・ステージ名が無い |
| C-11 | `docs/PROJECT_CURRENT_STATE.md:29-32` | #94・#95・#97 を「未反映」と書いているが、`docs/world-tree-recreation/DEVELOPMENT_INTEGRATION_STATUS.md:33` は「#99／#100 で再移植済み、旧PRは参照用」と書いている（ドキュメント担当へ回す） |

参考（ロジック側）：`field/field-render.js:57, 149` は採集点ごとの `uses` を見ずに、一律に `FIELD_GATHER_USES` で「採り終わった表示」を判定している。今は `uses` を指定した採集点が無いので表示上の差は出ない。

---

## 4. 分割計画

### 4-0. 共通方式（クラシックスクリプトのまま。ES Modules は使わない）

- **基底ファイル**（今と同じファイル名）が、グローバルを今と同じ名前で `const X = {};` として宣言する。説明コメントもここに残す。
- **追加ファイル**は宣言をせず、`X[キー] = {...};` または `Object.assign(X, {...});` で中身を足す。`const` を再宣言すると SyntaxError になるので、追加ファイルでは絶対に宣言しない。
- 理由：クラシックスクリプトのトップレベルの `const` は、ページ全体で共有されるグローバルの字句スコープに入るので、後から読み込むスクリプトからも参照できる。`defer` 付きのスクリプトは `index.html` に書いた順に実行される。`const` なので変数の付け替えはできないが、中身を足すことはできる。
- **順序が変わらない理由**
  - `FIELD_AREAS` のキーは整数（1〜5）。JavaScript のオブジェクトは整数のキーを常に昇順に並べるので、足した順番に関係なく `Object.keys`・`Object.entries` の結果は今と同じになる（`field-navigation.js:71`、`field-persistence.js:10`、`monster-compendium.js:50` が順番に読んでいる）。
  - 文字列キー（`FIELD_SIDE_EVENTS`・`FIELD_PUZZLES`・`STORY_SCENES`）は追加した順に並ぶ。今のファイルの上から順に、同じ順番でファイルを読み込めば、元と同じ順になる。
  - `floors` の配列や `objects` の中身は1つのファイルの中にまるごと残すので、順番も中身もそのまま。
  - データには共有参照が無い（props.js で確認）ので、ファイルをまたいで同じオブジェクトを参照する関係が切れることもない。
- **セーブへの影響なし**：宝箱・採集・扉のセーブキーは「階層-フロア＋座標」や ID でできていて、ファイル名を使っていない。saveVersion は変えない。

### 4-1. `data/field-maps.js` → 階層別の5ファイル＋基底ファイル（推奨）

行番号は `1dd7ade` 時点のもの。

| 新ファイル | 内容（元の行） | 書き方 | 試行での大きさ |
|---|---|---|---|
| `data/field-maps.js`（基底。名前はそのまま） | 冒頭の説明 1-18、`const FIELD_AREAS = {};`、サブイベントの説明 475-486 と `const FIELD_SIDE_EVENTS = {};`、仕掛けの説明 512-524 と `const FIELD_PUZZLES = {};` | 宣言だけ | 49行／4.4KB |
| `data/field-area-1.js` | 階層1（20-108）＋サブイベント a1（488-492）＋仕掛け a1-lever-gate（526-527） | `FIELD_AREAS[1] = {…};` `Object.assign(FIELD_SIDE_EVENTS, {…});` `Object.assign(FIELD_PUZZLES, {…});` | 103行／5.8KB |
| `data/field-area-2.js` | 階層2（109-199）＋a2（493-497）＋a2-twin-stones（528-530） | 同上 | 106行／6.4KB |
| `data/field-area-3.js` | 階層3（200-292）＋a3（498-501）＋a3-lanterns（531-534） | 同上 | 108行／6.3KB |
| `data/field-area-4.js` | 階層4（293-380）＋a4（502-505）＋a4-cracked-wall（535-536） | 同上 | 101行／5.2KB |
| `data/field-area-5.js` | 階層5（381-472）＋a5（506-509）＋a5-oath-statues（537-540） | 同上 | 107行／6.4KB |

- 1階層のマップ・物・サブイベント・仕掛けが1ファイルにまとまるので、「第3階層を直す」ときにそのファイルだけを開けばよい。AIどうしの作業の衝突も階層単位に減る。
- 字下げを2つ減らしても、それは文字列の外側の空白だけなので、値は変わらない（試行で確認済み）。
- **ファイル名を `data/field-` で始める理由**：`tools/world-tree/harness.js:23-24` は `index.html` から `^data\/field-` に合うファイルだけを読み込む。この名前ならツールを1行も直さずに済む。サブフォルダ（`data/field-areas/area1.js` など）にしたい場合は、harness の正規表現を `/^data\/field[-\/]/` に直す必要がある。
- **フロア単位（15ファイル）には分けない**：1フロアは約25行で小さすぎる。`FIELD_AREAS[n].floors[i] = …` のような添字での代入が増えて、読み込み漏れの危険も上がる。物（objects）は階層全体で共有しているので、フロアごとに分けると参照先が分かれてしまう。
- 任意：`FIELD_GATHER_POINTS` の各階層分を `field-area-N.js` に移す案もある。ただし `field-gathering.js` は77行で十分小さく、担当も分かれているので、今回は**移さない**ことを推奨する。

### 4-2. `data/story.js` → 種別の4ファイル＋基底ファイル（推奨：案B）

| 新ファイル | 内容（元の行） | 試行での大きさ |
|---|---|---|
| `data/story.js`（基底） | 冒頭の説明 1-13、`STORY_SPEAKERS` 14-26、`const STORY_SCENES = {};` | 28行／1.7KB |
| `data/story-main.js` | 迷宮の歩き方・プロローグ・エリア1〜5の会話（29-236） | 212行／12.4KB |
| `data/story-side.js` | `side-*`（238-360） | 127行／9.6KB |
| `data/story-puzzle.js` | `pz-*`（362-426） | 69行／4.8KB |
| `data/story-common.js` | `save-point`（428-434）。共通の会話を今後追加する場所 | 11行／0.5KB |

各ファイルは `Object.assign(STORY_SCENES, { …元の行をそのまま… });` の形にする。元のファイルの上から順に読み込むので、**`STORY_SCENES` のキー順まで完全に一致する**（試行で確認済み）。

- **案A（階層別：`story-a1.js`〜`story-a5.js`＋共通）**：1階層の会話（本編・サブイベント・仕掛け）が1ファイルにまとまり、`field-area-N.js` と対応するので編集はしやすい。ただし `STORY_SCENES` のキー順が変わる（a1本編→a1サブ→a1仕掛け→a2…の順になる）。ゲームのコードは `STORY_SCENES[id]` で ID を引くだけで、順番に読む処理は無い（`field-dialog.js:16, 60, 89, 92` を確認）ので、動作には影響しない。それでも仕様書 §2-2・§4-4 の「順序を変えない」に厳密に従うなら、案B がよい。**どちらにするかはユーザー判断。** 推奨は、比較が単純な案B。
- 文章を推敲する GPT は主に `story-main.js` を、迷宮イベントを追加する Claude は `story-side.js`・`story-puzzle.js` を触ることになり、作業の衝突も減る。

### 4-3. index.html の新しい読み込み順（16〜30行目を置き換え）

```html
  <script src="./data/battle-rules.js?v=20261106-11" defer></script>
  … （17〜25行目は変えない） …
  <script src="./data/field-maps.js?v=<NEW>" defer></script>      <!-- 基底：FIELD_AREAS / FIELD_SIDE_EVENTS / FIELD_PUZZLES を宣言 -->
  <script src="./data/field-area-1.js?v=<NEW>" defer></script>
  <script src="./data/field-area-2.js?v=<NEW>" defer></script>
  <script src="./data/field-area-3.js?v=<NEW>" defer></script>
  <script src="./data/field-area-4.js?v=<NEW>" defer></script>
  <script src="./data/field-area-5.js?v=<NEW>" defer></script>
  <script src="./data/field-gathering.js?v=20261107-21" defer></script>
  <script src="./data/field-enemies.js?v=20261107-01" defer></script>
  <script src="./data/levels.js?v=20261106-15" defer></script>
  <script src="./data/story.js?v=<NEW>" defer></script>           <!-- 基底：STORY_SPEAKERS / STORY_SCENES を宣言 -->
  <script src="./data/story-main.js?v=<NEW>" defer></script>
  <script src="./data/story-side.js?v=<NEW>" defer></script>
  <script src="./data/story-puzzle.js?v=<NEW>" defer></script>
  <script src="./data/story-common.js?v=<NEW>" defer></script>
  <script src="./battle-ext.js?v=20261107-01" defer></script>
  … （以下は変えない） …
```

- 条件：基底ファイル → 追加ファイル の順にする。追加ファイルどうしは、`FIELD_AREAS` に関しては順不同でも結果は同じだが、文字列キーの順を保つために上の順番に固定する。
- `<NEW>`：development の `?v=` の最大値は今のところ `20261108-01`（script.js）。#103 も `20261108-01` を使っている。実施する時点の最大値より大きい番号（例：`20261108-20` 以上、または実施日の番号）にする。**基底ファイルの番号は必ず上げる**（中身が空の入れ物に変わるため）。

### 4-4. 分割前後で値が完全に同じことを確かめる方法（試行済み）

`/tmp/bdata/load.js`＋`/tmp/bdata/compare.js` を、Phase 3 の最初のPRで `tools/data-check/` などに置くことを提案する。使い方は `node compare.js <分割前のフォルダ> <分割後のフォルダ>`（分割前のフォルダは `git worktree add` か `git archive development | tar -x` で用意する）。

1. 両方のフォルダについて、`index.html` の `<script src>` を上から読み、`data/` で始まるものだけを1つの `vm` コンテキストで**クラシックスクリプトとして**順に実行する（ロジックは読まない。`script.js`・`battle-ext.js` は実行時に `shopItems.push`・`characters.push`・`Object.assign(enhancementMaterials)` でデータを書き換えるため）。
2. 各ファイルの `^(const|let|var) 名前` を集めて、グローバル名の一覧を作る。`const` は `globalThis` のプロパティにならないので、`vm.runInContext("typeof 名前==='undefined'?undefined:名前")` で値を取り出す。
3. 比べるもの：(a) グローバル名の集合（今は56個）、(b) 各グローバルの `JSON.stringify` の結果（**キー順も含めて**文字列で比べる）、(c) 違いがあれば、キーを並べ替えてもう一度比べ、「キー順だけの違い」か「値の違い」かを表示する。
4. 関数・`undefined`・`NaN`・`Infinity`・Symbol は、`JSON.stringify` の replacer で `"[Function <ソース>]"` `"[undefined]"` `"[Number NaN]"` のような文字列に置き換えてから比べる。こうすると、JSON では消えてしまう値の違いも見落とさない（今のデータには該当するものが無いことを props.js で確認済み）。共有参照の検出も、同じ walker で行える。
5. 試行の結果：`OK グローバル名の集合が一致（56個）`、56個すべて「値・キー順とも一致」、件数は FIELD_AREAS 5／FIELD_SIDE_EVENTS 17／FIELD_PUZZLES 5／STORY_SCENES 66／STORY_SPEAKERS 11、読み込むファイルは15→24。
6. 読み込み漏れを検出できること：試行コピーから `field-area-3.js` と `story-side.js` の行を消したところ、compare.js は NG 4件（FIELD_AREAS・FIELD_PUZZLES・FIELD_SIDE_EVENTS・STORY_SCENES）を出した。**validate.js はエラー0件のまま通った**（階層3を飛ばして、フロア番号を詰めて表示した）。loot_test.js は例外で止まった。

### 4-5. 検証ツールへの影響

| ツール | ファイルの探し方 | 分割の影響 |
|---|---|---|
| `tools/world-tree/harness.js`（validate・test_basic・test_puzzles・test_flee が使う） | index.html の中で `^data\/field-` に合うものと field.js・`field/` を読む。`const`/`let` は `var` に置き換える | `data/field-area-N.js` という名前なら**修正不要**（試行で読み込まれることを確認）。`story*.js` はもともと読まないので影響なし |
| `tools/world-tree/loot_harness.js`（loot_test） | index.html のすべての `<script src>` を順に読む | 修正不要。なお loot_test は引数を省略すると `git archive 14d9fc0` を使うので、git の無いフォルダでは基準フォルダを引数で渡す必要がある |
| `tools/battle-sim/env.js`（tests・regress） | index.html のすべての `<script src>` を読む。**存在しないファイルは黙って飛ばす**（`if (!fs.existsSync(p)) continue`）。読み込みエラーも `quiet` のときは表示しない | 修正不要。ただし、読み込み漏れやファイル名の間違いに気づけないので、compare.js を併用する |
| `tools/battle-sim/regress.js` | 2つのフォルダで固定乱数の戦闘ログを比べる | 分割前後の比較にそのまま使える（試行：`battles=80 diff=0`） |
| PR #104 の `tools/ui-shots/*` | ブラウザで index.html を開く | 影響なし |

---

## 5. 分割しないものと理由

| ファイル | 判断 | 理由 |
|---|---|---|
| `items.js`（73行・11.6KB） | **不要** | 行数が少なく、表ごとにまとまっている。さらに、`script.js:11` の `shopItems.push(...accessoryItems)` と `battle-ext.js` の `extInstallItems`（`classes.push`）が**実行時にオブジェクトを共有して書き換える**ので、移動するなら参照関係に注意が必要で、分けてもあまり得がない。1行が長いのは整形の問題で、整形し直すだけでも差分が大きくなるので今回はしない |
| `jobs.js`（63行） | **分割は不要**。ただし移動を1件推奨 | `EXT_ENEMY_SPEED`・`EXT_BOSS_NAMES` を `enemies.js`（index.html では jobs.js より前）に移すと、敵のデータが1箇所にまとまる。値は変えない。README と AI_HANDOFF が「衝突しやすい」としている jobs.js 先頭の衝突も減る（任意・要承認） |
| `skill-trees.js`（34行） | 不要 | 6職業×6表で、用途ごとにまとまっている |
| `status-effects.js`（73行） | 不要 | 定義・別名・効果量・部位の4つで責務がはっきりしている。#97 の続きの作業と衝突しやすいので触らない |
| `field-enemies.js`（47行・8.2KB） | 不要 | 15体を1つのオブジェクトに入れていて、1行が長いだけ。階層別に分けても、図鑑（monster-compendium.js）や FOE 処理が全体を見るので得がない |
| `field-gathering.js`（77行） | 不要 | 小さく、担当がはっきりしている（Claude B） |
| `progression.js`・`characters.js`・`enemies.js`・`enemy-variants.js`・`boss-phases.js`・`levels.js`・`battle-rules.js` | 不要 | どれも40行以下で、責務が1つ |

---

## 6. リスク・テスト方法・未統合PRとの関係

### 6-1. リスク

| リスク | 症状 | 対策 |
|---|---|---|
| 基底ファイルより先に追加ファイルを読む | `ReferenceError: FIELD_AREAS is not defined`（または STORY_SCENES）。そのファイルの分が丸ごと無くなる | index.html の順番を compare.js と目視の両方で確認する |
| 追加ファイルの読み込み漏れ・ファイル名の間違い（404） | 迷宮：`Object.keys(FIELD_AREAS).length` が減り、`field-navigation.js:34` が上限を詰めるので、後ろの階層に行けなくなる。その階層の物・サブイベント・仕掛けも消える。会話：`fieldSceneLines` が `null` を返して会話が**黙って飛ばされる**（報酬だけ入る）。**validate.js と battle-sim はこれに気づかない** | compare.js を必ず実行する。件数の確認（areas=5、scenes=66、side=17、puzzles=5）を compare.js かテストに組み込む |
| 追加ファイルで `const` を再宣言する | 2回目の宣言で SyntaxError になり、そのファイルが全部無効になる | `node --check` では見つからない（ファイルごとの検査では正しいため）。compare.js と、loot_harness でまとめて読み込むことで検出する |
| `?v=` を上げ忘れる | 古い `field-maps.js`（全部入り）がキャッシュに残っていても、追加ファイルが同じ値で上書きするだけなので実害は無い。逆に、**古い index.html がキャッシュに残っていて、新しい基底ファイル（空の入れ物）を読むと迷宮が空になる**（GitHub Pages の HTML キャッシュは約10分。再読み込みで直る） | 基底ファイルと追加ファイルの番号を全部上げる。PR 本文に「公開直後は再読み込みが必要な場合がある」と書く。ブラウザ／iPhone での確認は未実施として報告する |
| 古い PR とのマージ衝突 | `data/field-maps.js`・`story.js` を変更しているまだ開いている PR：#95・#94・#49・#45・#38・#21（index.html だけなら #59〜#91 なども）。分割後はこれらがほぼ確実に衝突する | #94・#95 は「#99／#100 で再移植済み、旧PRは参照用」（DEVELOPMENT_INTEGRATION_STATUS.md）。ほかの古い GPT PR も含めて、閉じるか参照用のままにするかをユーザーが決めてから分割する |
| 分割と値の修正を同じ PR に混ぜる | 差分のレビューができなくなる | §3 の修正は分割とは別の PR にする |

### 6-2. 未統合の UI PR（#103〜#106）との関係

- 4つとも `data/` は変更していない（REST API で全ファイルを確認済み）。
- `index.html` を変更しているのは #103（`<meta viewport>` と CSS の `<link>` 追加）と #104（それに加えて `field-render.js`・`field-movement-foe.js` の `?v=`、38・39行目）。#105・#106 は index.html を変更していない。
- 試行で分割した index.html と、#103・#104 の index.html を `git merge-file` で3方向マージしたところ、**衝突は0件**だった（データの行と、CSS・field の行は離れている）。
- `?v=` の番号は #103 が `20261108-01` を使っているので、それより大きい番号にする。UI PR が先にマージされた場合は、その時点の最大値を確認し直す。
- **推奨する順番**：UI PR（#103〜#106）がマージされた後か、次の UI PR を作る直前の静かなタイミングで Phase 3 を行う。データの分割はロジックファイルを触らないので、UI PR を待たずに進めてもよい。

### 6-3. テスト方法（各PRで実施）

1. 追加・変更したすべての JS に `node --check` を実行する。
2. `node tools/data-check/compare.js <development> <作業ブランチ>` → 「すべて一致」になること。
3. `node tools/world-tree/validate.js`（エラー0・注意3は今と同じ）、`test_basic.js`・`test_puzzles.js`・`test_flee.js`（すべて成功）、`loot_test.js <基準フォルダ>`（64 PASS／0 FAIL）。
4. `node tools/battle-sim/tests.js`（pass=43）、`node tools/battle-sim/regress.js <development> <作業ブランチ> 2`（diff=0）。
5. index.html の検査：`<script src>` の参照先がすべて存在すること、重複が無いこと、基底ファイルが追加ファイルより前にあること（小さなスクリプトで確認できる）。
6. ブラウザで確認する場合：コンソールにエラーが無いこと。各階層の1F に入れること、サブイベントの会話、仕掛け、導きの灯の会話、図鑑の出現場所の表示。**実機で確認していなければ「未確認」と書く。**

---

## 7. Phase 3 の実施手順（小さい PR に分ける順番）

| 順 | PR | 内容 | 値の変更 |
|---|---|---|---|
| 3-0 | 比較ツールの追加 | `tools/data-check/load.js`・`compare.js`（§4-4）。件数の確認も入れる。`tools/README` か data/README に使い方を書く | なし |
| 3-1 | コメントだけの修正 | §3-4 の C-1〜C-8 を直す（data と、field.js・monster-compendium.js のコメント）。compare.js で「すべて一致」になることを確認する。Phase 2（ドキュメント整理）に入れてもよい | なし |
| 3-2 | `field-maps.js` の階層別分割 | §4-1 の6ファイル。index.html（§4-3 の前半）、`data/README.md`、`AI_HANDOFF.md` の早見表の行、`field-gathering.js` などのコメントにある「field-maps.js の …」の案内を更新する | なし |
| 3-3 | `story.js` の分割 | §4-2 の案B（ユーザーが案A を選べば案A）。index.html、README、`field-interactions.js:72`・`field-puzzles.js:6,22` のコメントの案内を更新する | なし |
| 3-4（任意） | `EXT_ENEMY_SPEED`・`EXT_BOSS_NAMES` を `enemies.js` に移動 | 値を変えずに移すだけ。compare.js で確認できる | なし（要承認） |
| 別途 | §3-1〜3-3 の値の修正 | D-1（宝箱）、D-2（ステージ名）、U-1（未使用の定義の削除）など。**ユーザーが決めてから**、分割とは別の PR で行う | あり（要承認） |
| Phase 4 | script.js 内のデータ | R-1・R-2・R-9 などを data へ移す | なし〜あり |

各 PR は §6-3 のテストをすべて実行し、PR 本文に「旧ファイルの行 → 新ファイル」の対応表、compare.js の出力、テスト結果、未確認の事項を書く。

---

### 付録：試行で使った分割スクリプトの要点（`/tmp/bdata/split_trial.js`）

- 元の行を、行番号の範囲（§4-1・§4-2 の表）で切り出しただけ。中身は書き換えていない。
- 変えたのは、階層の先頭行 `  1: {` → `FIELD_AREAS[1] = {`、末尾の `  },` → `};`、字下げを2つ減らすこと、`Object.assign(..., {` と `});` で囲むこと、最後の要素の末尾のカンマを外すこと、だけ。
- 実施するときは、このスクリプトを使うか同じ手順を手で行い、そのあと compare.js で確認する。
