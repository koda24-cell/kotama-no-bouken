# 無料鉱石素材の一括取り込み（2026-11-18）

## 対象と状態
- **CC0・一括取得の実装対象**: Poly Haven `boulder_01`, `rock_boulder_dry`, `rock_surface`; ambientCG `Rock002`, `Rock060`。
- 公式ライセンス: https://polyhaven.com/license / https://ambientcg.com/license
- 取得スクリプト: `python3 tools/ore/intake_cc0_assets.py --out ore-cc0-review`
- Poly Haven APIのファイルメタデータから候補を選択。ambientCGは公式1K-JPG ZIP URLを使用。実行後 `intake_manifest.json` に元URL・SHA256・サイズ・失敗理由・`NOT_APPROVED`を記録。
- **未検証**: GitHub Actions/ローカルでの実ダウンロード、モデル読み込み、レンダリング、全ファイルのマップ完全性。自動選択は最適なマップ一式を保証しない。初期段階は配布物のレビュー用取得であり、最終品質の素材取り込みではない。
- ネットワーク不可なら失敗を記録。ZIPの内容は自動展開しない。元の配布物は承認まで本番アセットに入れない。

## 無料だが自動取得対象に含めないもの
- Entagma Procedural Crystal Generator https://entagma.com/free-tutorial-procedural-crystal-generator/ — 無料講座とプロジェクト配布リンク。**添付ファイルのライセンス未確認**。学習資料としてリンクを保存。
- Alex Martinelli Procedural Crystal https://blendshelf.com/product/procedural-crystal-blender-geometry-nodes-494fd51b — 無料/任意支払いの外部販売ページ。取得/商用/再配布条件は購入・ライセンス画面で確認。
- Crystals Path https://sagado.gumroad.com/l/nfxavj — 無料版とスタジオ向け有料条件が併記。取得と利用範囲の確認が必要。
- CG Cookie Crystal Growth https://www.youtube.com/watch?v=EMIuxMW6mpw — 無料閲覧可能な制作参考。動画・配布ファイルをGitへ転載しない。

## 次の検証
1. スクリプトをネットワーク接続環境で実行し、実ファイルのSHAと形式を確認。
2. PBRのBaseColor/Normal/Roughnessの組を確認し、母岩と結晶をBlenderで別管理。
3. `tools/ore/generate_ore.py` (PR #507) の鉱床に接合して4方向レンダリング。
4. ゲームのGLB/PNG/manifestへの正式保存はユーザー承認後。実装コードPR #507とは別管理。
