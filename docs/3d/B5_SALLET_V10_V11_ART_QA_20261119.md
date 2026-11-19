# B5 サレット兜 — V10 / V11造形レビュー 2026-11-19

## 最新ユーザーフィードバック
- 全体的な丸みが強すぎる。
- 鋭角の縁と面の変化・バランスが不足。
- 金属の質感が単調。

## 実物と資料
Walters 51.470同一実物の10方向写真。金属は広い反射面が中心、特に鋭い鍛造の裾/縁の厚みを基準にする。実物写真へのリンク/権利はpinterest-reference-library `handoff/b5-sallet-full-view-20261118.md`。
公式 https://art.thewalters.org/object/51.470/
Poly Haven Rusty Iron https://polyhaven.com/a/rusty_iron はCC0表記だが現時点ではVault対象のため **常時無料で入手できる素材とは扱わない**（2026-11-19の公開ページ再確認）。このモデルに外部写真/PBR ZIPを取り込んでいない。

## V10
Run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44442544804
6方向 Cycles、GLB/Blend、manifestの技術検査 success。
視覚評価: FAIL。丸い頭部と角張った縁の対比を試したが、後部の独立した線が浮いて見える。側面で白い帯、背面で角のように突き出している。原本は保存。

## V11
Source `tools/b5-knights/build_sallet_v11.py`、前版非破壊。
Run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44443083044
Blender実レンダリング成功。front/left/right/back/angle/top各PNG、GLB、BlendをArtifact ID 14492216602に取得、manifest中SHAすべてローカル計算一致。
Workflow QAは `tail` という旧オブジェクト名を要求したため失敗。統合後部の実名は `01 continuous bowl with integrated flared rear forged lip`。形状欠落ではない。Workflowの検査名を修正し、再実行トリガー済み。
視覚評価: V10の浮いた白い縁を取り除き、低い縁を同一ボウル内の断面変形で表現。後部だけroughnessが高く暗い鋼鉄へ分割。改善したが、まだ丸いヘルメット感が強い。鼻・バイザー周りと側面継ぎ目が単純。最終美術合格ではない。

## 次の改善
- ヘルメット全体を多角形の塊にせず、眉上の小さい折れ、頬板の面変化、裾の細い断面、後方テールの長さの比率を実写真に近づける。
- 継ぎ目/リベットは実物の場所を優先、装飾として過剰に増やさない。
- 金属PBRはroughnessと微小正常の不均一性が重要。単に黒点や強い白線ではない。
- 追加造形は独立V12以降。元V1-V11は保持。
- 既存/正式asset未変更。Approval=NOT_APPROVED。実PNGの確認・ユーザー承認後に昇格。
