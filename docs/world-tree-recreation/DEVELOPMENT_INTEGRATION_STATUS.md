# development 統合・画面確認状況

更新日：2026-11-07

## 方針
- 統合・動作確認先は `development` のみ。
- `main` にはユーザーの最終承認前に一切反映しない。
- 旧構成のファイルを丸ごと上書きせず、現行の機能別モジュールへ移植する。
- 動作確認前の機能は「実装済み」と「検証済み」を分けて記録する。

## development へ反映済み
- GPT PR #98：周囲9×9マップ、探索マップUI、スマートフォン配置。
- Claude PR #97 のC2相当：睡眠・混乱・頭／腕／脚封じ、耐性・耐性上昇、戦闘行動への接続。
- Claude PR #97の戦闘シミュレーション用ツールとC1設計資料。
- GPT PR #92の共通仕様書4点。
- Claude PR #93のA/B/C作業指示書・仕様照合表4点。

## 未統合・再移植待ち
- Claude PR #95（A）：グリッド移動、扉・隠し通路、ターン制FOE AI。
- Claude PR #94（B）：宝箱・採集・サブイベント・仕掛け・セーブ追加情報。
- GPTの旧積み上げPR #79〜#91：現行developmentへの反映有無・重複・移植要否を個別監査する。
- Claude PR #97のC1：敵・FOE・ボスの数値変更は未実施。ユーザー承認待ち。
- 新状態異常をどの敵・スキルに割り当てるかは未決定。

## 現行コード構成
- `field.js`：探索状態・マップ基礎・視界
- `field/field-movement-foe.js`：入力・移動・FOE
- `field/field-interactions.js`：調べる・宝箱・採集・階段・戦闘遷移
- `field/field-render.js`：探索画面・地図描画
- `field/field-persistence.js`：探索セーブ／ロード
- `field/field-navigation.js`：探索画面の出入り・階層選択

Claude A/Bの旧PRはmonolithicな `field.js` を前提にしているため、現行モジュールへ移植する。旧 `field.js` をそのまま置き換えない。

## テスト状況
- 主要JavaScript 13ファイル：構文チェック済み。
- C2のブラウザ／実機テスト：未実施。
- C2の元PRで報告されたDOMスタブテスト結果は、developmentへ移植後の再実行結果ではない。
- 迷宮・採集・セーブのブラウザ／iPhone実機テスト：未実施。
- 画面確認はdevelopmentのプレビューURLで行い、問題があれば修正してから次の統合へ進む。

## 画面確認
`https://raw.githack.com/koda24-cell/kotama-no-bouken/development/index.html`

これはdevelopmentブランチの暫定プレビュー。GitHub Pagesのmain公開先は変更しない。