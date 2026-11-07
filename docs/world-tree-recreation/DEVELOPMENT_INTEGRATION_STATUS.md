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
- Claude PR #99（A）：グリッド1マス移動、扉・隠し通路・スイッチ・仕掛け、ターン制FOE AI、逃走時の位置処理。
- Claude PR #100（B）：宝箱・採集（採取／伐採／採掘）・サブイベント・仕掛け宝箱報酬・探索記録・saveVersion 11。採集点は最初の採集から実時間30分で復活し、時刻もセーブ。
- Claude PR #97の戦闘シミュレーション用ツールとC1設計資料。
- GPT PR #92の共通仕様書4点。
- Claude PR #93のA/B/C作業指示書・仕様照合表4点。

## 未統合・再移植待ち
- GPTの旧積み上げPR #79〜#91：個別監査済み。結果は `docs/world-tree-recreation/GPT_LEGACY_PR_AUDIT.md`。旧PRはマージせず、機能単位で現行モジュールへ移植する。
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
- Claude A（PR #99）報告：構文チェック、基本24項目、逃走3項目、仕掛け16項目が成功。全15フロア検証はエラー0・注意3。DOMスタブ中心で、ブラウザ／iPhone実機は未確認。
- Claude B（PR #100）報告：単体56 PASS／0 FAIL、Aと合わせた状態で59 PASS／0 FAIL（DOMスタブ）。ブラウザ／iPhone実機は未確認。
- GPT統合時に閉じた扉も視界を遮るよう修正し、テスト項目を追加したが、その追加分を含む再実行は未実施。
- GitHub ActionsのCI実行結果は確認できていない。
- C2の元PRで報告されたDOMスタブテスト結果は、developmentへ移植後の再実行結果ではない。
- 迷宮・採集・セーブのブラウザ／iPhone実機テスト：未実施。
- 画面確認はdevelopmentのプレビューURLで行い、問題があれば修正してから次の統合へ進む。

## 統合PR
- PR #99（Claude A）：merged。developmentへの統合コミット `4be71c445f7b6db2283fd067b721a5396c90dd7f`。
- PR #100（Claude B）：merged。Aの最新コード・FOE巡回経路・地図データを保持し、Bの宝箱報酬・採集・セーブを手動で合流。developmentへの統合コミット `ebb9d672ddc7353f03c42d2ec578fd2ed064d6c9`。
- `main` は変更していない。

## 画面確認
`https://raw.githack.com/koda24-cell/kotama-no-bouken/development/index.html`

これはdevelopmentブランチの暫定プレビュー。GitHub Pagesのmain公開先は変更しない。