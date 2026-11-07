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

## 編集ルール

1. 共通状態・定数を新しいモジュールに重複定義しない。
2. 機能の修正は、原則として担当範囲のファイルだけに行う。
3. 新しいモジュールを追加・改名した場合は、必ず `index.html` の読み込み順も更新する。
4. すべて通常の classic script として読み込む。モジュール間で共有する関数・状態は既存のグローバルスコープを利用する。
5. 読み込み順は `field.js` → `field-render.js` → `field-movement-foe.js` → `field-dialog.js` → `field-interactions.js` → `field-puzzles.js` → `field-navigation.js` → `field-persistence.js`。
6. 迷宮データは `data/field-maps.js`、敵能力値は `data/field-enemies.js`、会話は `data/story.js` を編集する。
7. セーブ形式や既存フラグの意味を変える場合は、旧セーブとの互換性を確認し、変更前にユーザーへ説明する。

この分割は処理の移動のみを目的とし、ゲーム仕様・数値・セーブ形式を変更しません。
