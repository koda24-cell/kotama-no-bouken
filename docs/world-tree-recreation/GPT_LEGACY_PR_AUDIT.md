# GPT旧積み上げPR #79〜#91 監査結果

更新日：2026-11-07
対象ブランチ：`development`
監査方針：旧PRを直接マージせず、機能単位で現行モジュールへ移植する。main は変更しない。

## 全体判定

- PR #79〜#91 はすべて未マージ・open。
- 13件は連続した積み上げブランチ。後続PRほど前段PRの変更を含む。
- `development` と各headを比較すると、全件が `diverged`。development側が49コミット先行し、旧head側は90〜122コミット分の独自履歴を持つ。
- すべてのPRをそのままマージすることは禁止。特に #90/#91 は旧monolithic `field.js`、旧 `index.html`、古いキャッシュキーを含み、現行の分割構成・PR #98と競合する。
- 監査対象PRは参照用としてopenのまま維持。close・merge・base変更は行っていない。

## PR別の移植判定

| PR | 主な機能 | 現行developmentとの照合 | 判定 |
|---|---|---|---|
| #79 | 探索危険度HUDの段階表示 | `field-danger` と `data-level` は現行DOM/JSに存在。ただし3段階バー等の追加CSSは未反映 | **CSSのみ移植候補**。現在のHUDを確認してから |
| #80 | FOEとの距離表示・接近段階 | 現行FOE移動モジュールに距離段階の `data-proximity` は未接続。旧実装はmonolithic `field.js` | **移植候補**。Claude AのFOE AI統合後に `field/field-movement-foe.js` へ再実装 |
| #81 | 宝箱・採集点・階段・セーブ点などの接近時演出 | 現行DOMに `.field-object.is-near` があり、汎用ハイライトも存在。種類別の強調CSSは未反映 | **CSSのみ移植候補**。Claude Bのオブジェクト仕様と照合 |
| #82 | 階層・フロアラベルの装飾 | `.field-floor-label` は現行DOM/CSSに存在。旧PRの追加装飾は未反映 | **CSSのみ移植候補** |
| #83 | ランダムエンカウント危険度に応じた画面枠演出 | 現行の危険度は `#field-danger[data-level]`。旧PRの `field-screen[data-danger-level]` は未接続 | **小規模再実装候補**。危険度更新を現行モジュールへ接続 |
| #84 | ボスゲート接近演出 | 現行の扉・ゲート仕様はClaude A再移植待ち。旧実装は旧 `field.js` のDOM走査に依存 | **保留**。Claude Aのゲート実装後に重複しない形で接続 |
| #85 | ボス戦開幕・階層別舞台 | 現行 `css/01-battle-base.css` に旧PRのボス舞台セレクタはなく、旧script.jsのフックも未反映 | **保留**。現行戦闘DOM・階層データに合わせて再評価 |
| #86 | ボスの存在感・HPゲージ・危険予兆 | 旧PRの追加CSSは現行battle CSSに未反映 | **保留**。#85と一体でレビュー |
| #87 | 階層ごとのボス戦舞台・情報表示 | 旧PRの階層別CSSは現行battle CSSに未反映 | **保留**。#85/#86と一体でレビュー |
| #88 | 通常戦にも階層の空気感・戦術UI | `data-battle-mode` 等の旧フックは現行script.jsに未反映 | **保留**。通常戦・ボス戦の現行描画処理を確認して再実装 |
| #89 | 敵種別の存在感・FOE戦の緊張感 | 現行CSSに `data-variant` を使う既存ルールはあるが、旧PRの `data-battle-threat` 接続は未反映 | **一部移植候補**。既存variant処理と統合してから |
| #90 | エンカウント／FOE遭遇カットイン | 旧CSSの `.field-screen.is-encounter` フックは現行モジュールに未接続 | **保留**。戦闘遷移演出の現行実装を確認して再評価 |
| #91 | 地図上のFOE巡回・追跡表示、凡例・状態表示 | 旧 `field.js` の地図描画・凡例はPR #98の9×9ミニマップUIに置換済み。現行 `field-render.js` にミニマップ状態・凡例が存在 | **旧地図UIは移植不要**。FOE状態の追加情報だけ、Claude AのFOEデータと照合して必要なら移植 |

## 現行モジュールへの移植先

- FOE距離・接近段階：`field/field-movement-foe.js`
- 危険度HUD・エンカウント警告：`field/field-movement-foe.js` と `css/07-labyrinth.css`
- オブジェクト接近演出：`field/field-render.js` の現行DOMに合わせて `css/06-field.css`
- ボスゲート接近：Claude Aのゲート・扉実装と調整後に決定
- ボス／通常戦の演出：現行戦闘DOM・script.js・CSS分割構成を確認してから
- ミニマップ：PR #98を正とし、旧PR #91の描画コードは戻さない

## 今回の監査で確認したこと

- 現行 `field-render.js` に `field-floor-label`、`field-danger`、`field-minimap-status`、`field-minimap-legend` が存在。
- 現行 `field-movement-foe.js` に危険度更新と `.field-object.is-near` の汎用接近判定が存在。
- 現行 `css/06-field.css` に汎用オブジェクト接近ハイライトが存在。
- 現行 `css/07-labyrinth.css` に危険度ドットとフロアラベルの基本スタイルが存在。
- 現行 `style.css` に敵variantを使う既存CSSが存在。
- 現行 `field/field-render.js` にPR #98のミニマップ状態欄・凡例が存在。
- 旧PRの画面表示・演出を実機で確認したわけではない。今回の照合はソースコードとブランチ差分によるもの。

## 次の作業順

1. Claude Aの現行development向けFOE・ゲート実装を受け取る。
2. #80/#83/#84/#91の必要な情報表示を、FOEデータ・描画仕様と重複しない形で統合する。
3. Claude Bのオブジェクト仕様を受け取り、#81/#82のCSSを適用するか判断する。
4. #79の危険度HUD装飾を現行表示に合わせて適用する。
5. #85〜#90の戦闘演出を、現行battle UIに合わせて個別レビューする。
6. 各移植後に構文・DOM・ブラウザ表示を確認し、統合管理表を更新する。

**この監査ではコード変更・PRマージ・mainへの反映は行っていない。**
