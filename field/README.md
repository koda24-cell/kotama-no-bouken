# 迷宮探索ロジックの分割構成

探索処理は、今後の修正で同じ巨大ファイルを複数担当が同時編集しないよう、機能別に分けています。

| ファイル | 担当範囲 |
|---|---|
| `../field.js` | 共通定数、探索状態、座標・マップ参照、視界と踏破率の基礎処理 |
| `field-render.js` | 探索画面DOM、プレイヤー表示、HUD、ミニマップ、全体マップ |
| `field-movement-foe.js` | キー/タッチ入力、グリッド移動（1歩＝1ターン）、移動後処理、ターン制FOEの巡回・追跡・接触 |
| `field-dialog.js` | 話者、会話ウィンドウ、選択肢、ストーリーシーン再生 |
| `field-interactions.js` | オブジェクト操作、宝箱、採集、階段、ボスゲート、戦闘開始/終了 |
| `field-puzzles.js` | 仕掛け（スイッチ・扉）、扉・ショートカット・隠し通路の操作（Claude A） |
| `field-navigation.js` | 探索画面への入退場、階層/フロア選択 |
| `field-persistence.js` | 探索BGM、セーブ/ロード、入力初期化 |
| `field-3d-view.js` | **一人称3D表示（第1階層のみ）**。ES module（three.js r180 を CDN から読む）。表示専用で、状態は読むだけ（下の節） |

## 編集ルール

1. 共通状態・定数を新しいモジュールに重複定義しない。
2. 機能の修正は、原則として担当範囲のファイルだけに行う。
3. 新しいモジュールを追加・改名した場合は、必ず `index.html` の読み込み順も更新する。
4. すべて通常の classic script として読み込む（例外：`field-3d-view.js` は表示専用の ES module）。モジュール間で共有する関数・状態は既存のグローバルスコープを利用する。
5. 読み込み順は `field.js` → `field-render.js` → `field-movement-foe.js` → `field-dialog.js` → `field-interactions.js` → `field-puzzles.js` → `field-navigation.js` → `field-persistence.js`。
6. 迷宮データは `data/field-maps.js`、敵能力値は `data/field-enemies.js`、会話は `data/story.js` を編集する。
7. セーブ形式や既存フラグの意味を変える場合は、旧セーブとの互換性を確認し、変更前にユーザーへ説明する。

この分割は処理の移動のみを目的とし、ゲーム仕様・数値・セーブ形式を変更しません。


## 一人称3D表示（field-3d-view.js）

- **対象**：第1階層（はじまりの樹海）1F〜3F のみ（`AREAS_3D`）。ほかの階層は従来の2D表示。
- **方針**：ゲームのルールは既存の field 系が正。3D側は `fieldState`／`fieldArea()` を読み、マップ・物・FOE・状態を見た目に置き換えるだけ。セーブ形式・フラグは変えない。
- **既存コードとの接点**：3か所の短いフック（`// [FIELD-3D]`）
  - `field-render.js` の `fieldBuildDom()` の最後で `KotamaField3D.build()`、`fieldRender()` の最後で `KotamaField3D.frame()` を呼ぶ。
  - `field-movement-foe.js` の `fieldUpdate()` で、3D表示中は `KotamaField3D.input()` が入力を受け持つ。移動は既存の `fieldTryStep()` を通す。
- **操作（3D表示中）**：↑↓・W/S で前進・後退（向きは変わらない）、←→・A/D で90度向きを変える（ターンは進まない）、Q/E で横に動く、Z/Enter・A で正面を調べる。押しっぱなしで連続移動する（既存の仕様どおり）。
- **表示の対応**：
  - 床・壁・天井：1マス＝4m の組み立て部品
  - 宝箱：開けると開いた宝箱に替わる
  - 採集点：採取・伐採・採掘の3種。採り尽くすと暗くなる
  - 導きの灯、看板、上り・下りの階段、出口、ボス門
  - 仕掛け：壁のレバー。解くと光が消える
  - 鉄格子の扉：開くと上がる。隠し通路は開くまで壁で、開くと作り直す
  - サブイベントの物、NPC（木こり・薬草摘み・汎用の旅人）、水
  - FOE：敵の画像を立て札のように表示し、足元に光の輪を出す。追跡中は赤
  - 正面の調べられる物の上に、ひし形の目印を出す
- **切り替え**：HUD の「2D表示／3D表示」ボタン。設定は localStorage の `kotama.field3d` に保存（セーブデータには入らない）。
- **画質**：localStorage の `kotama.field3d.quality` が `high` か `low`。既定は PC が高画質（光のにじみあり、点光源14）、タッチ端末が低画質（点光源6）。
- **フォールバック**：three.js の読み込み・WebGL・素材の読み込みのどれかが失敗したら、2D表示のまま遊べる。
- **素材**：`assets/3d/dungeons/b1_ancient_forest/`（生成は `tools/b1-3d/`）
- **仕様と制作ルール**：システムの仕様（現状・共通部分と階層固有部分・水やエフェクトの拡張・2層に向けた課題）は `docs/field-and-story/FIELD_3D_SPEC.md`。素材の制作ルール（GPT 向け）は `docs/field-and-story/FIELD_3D_ASSET_GUIDE.md`。
- **階層を足すとき**：第1階層の値・素材は変えない。1層の回帰確認（`game-test.js`・スクリーンショットの比較・既存テスト）を毎回行う（仕様 §5）。
- **確認**：`tools/b1-3d/game-test.js` がゲームを開き、第1階層で次を通しで確かめる。移動・旋回・横移動・壁への衝突、採集、宝箱、レバーと扉、階段、2F の導きの灯、3F の NPC・看板・水・ボス門、戦闘への切り替え、2D/3D の切り替え。
