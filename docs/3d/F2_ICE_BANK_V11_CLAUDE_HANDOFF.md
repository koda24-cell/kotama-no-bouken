# 第2層 氷岸 V11 — 承認済み素材・Claude引き継ぎ

- 承認: ユーザーが2026-11-15に「これでおｋです。保存とクロード用、メモもして次行こう」と明示
- ソース: PR #340 / commit de48ba2d93019d2e43cfcdb3aa8cb2d3e84c8227
- 実レンダリング: GitHub Actions run 43607068046 (success) / artifact 14119060785
- 1マス2m x 2m、橋の左右の氷岸。長方形の新しい橋本体は不採用。既存の氷岸形状と接続端を維持。
- 採用候補: smooth_depth を標準として保存し、smooth_clear も比較用に保存。両方ユーザーのV11承認範囲内。
- 保存対象: assets/models/floor2/ice-bridge-banks/v11/ 内の左右GLB、正面/側面/斜めのPNG、2種のマテリアル比較PNG、manifest.json、SHA256SUMS.txt。
- 保存方式: Actions artifact は14日で消えるため、GitHubの独立ブランチ・PRへ実ファイルを恒久保存し、PRレビュー後 development にマージする。

## Claudeへの指示
ClaudeはBlenderを操作しない。manifest.json と PNGを確認し、GLBをThree.js GLTFLoaderで直接ロードする。左右のタイル方向、寸法、接続面、マテリアル透過、描画負荷をブラウザで検証する。ゲームへの実装は別PRとし、既存マップや橋を置換しない。再レンダリングや造形修正はGPTへ差し戻す。

## 品質・失敗メモ
- V9: 透明感不足、表面が粒状で青い不透明岩に見える。
- V10: 青を強めても内部の奥行きが不足。
- V11: ice/deep_ice の細かなNoise→Bumpを取り除き、Smooth Clear（roughness 0.035, transmission 0.94, density 0.025）、Smooth Depth（roughness 0.065, transmission 0.88, density 0.095）を追加。Cycles 48 samples。
- V11の画像には残る粒状感があるが、ユーザー承認済み。GLBの透過表示がThree.jsで一致するかは未検証。
- PNGの front/side/angle は出力時の既定の clear 設定。Smooth Depth固有の斜め画像は *_v11_smooth_depth_angle.png を参照。
- 正式フォルダへのコミット・PR・developmentマージはそれぞれ別の確認事項。PRだけで完成保存済みと断定しない。
