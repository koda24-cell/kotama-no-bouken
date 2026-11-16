# 第5階層 V5 VFX 安全移植・検証記録（2026-11-16）

## 原本・承認
- 基準レンダリング: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43793433118
- Artifact: 14193302337（承認された確認用プレビュー。ゲーム画面ではない）
- 原本: PR #354 / feature/b5-fog-window-background-20261114
- Claude用既存ハンドオフ: docs/3d/B5_V5_CLAUDE_HANDOFF_20261116.md

## 本ブランチの方針
- developmentの最新 map-driven フィールド描画をベースに、PR #354のVFX追加部分だけを適用。既存の床/壁/当たり判定/セーブ/ボス/階層遷移は置換しない。
- 遠景・窓・魔力粒子・道の左右の霧は Three.js の JS/ShaderMaterial を直接編集する。GLBではない。
- ゲーム本体での描画、遮蔽、回転、モバイルFPSは未検証。承認済みは確認用プレビューのみ。
- シーンのfaceFill/floorFillスポットライトはゲーム本体へそのままコピーしない。実環境の視認性を先に評価する。

## 検証ゲート
1. GitHub Actions B5 Fog Backdrop Browser Preview の新しいrunを成功させ、PNGとconsole errorsを確認する。
2. 本物の第5階層を起動し、ゲームのスクリーンショットを撮る。壁越しの表示なし、4方向回転、通路終端、階層切替、リソース解放、低画質FPSを確認。
3. 承認基準PNGと実ゲームPNGを比較し、差異があればゲーム側のVFX配置・照明のみを修正。
4. Facade020C emission派生PNGは未昇格。元URL・ambientCG CC0・元/派生ファイルSHA256を正式素材とともに永続化。未保存時はprocedural fallback。
5. 検証が揃うまで本PRはDraftで維持し、developmentへのマージを「完了」と報告しない。

## 他PR
#277 #279 #312 #325 #339 #373 #383 #395 は独立案件。今回のゲーム統合PRには混入させず、承認済みのGLB/PNG恒久保存をそれぞれ追跡する。

## 3方向ブラウザレンダー・品質確認（2026-11-16）
- 参照Actions run: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43805363902
- Artifact 14198536222: `render-output/b5-fog/b5-v5-{front,side,angle}.png` の実PNG3枚を取得し目視確認済み。
- 解像度: 全て1100x620。Pillow独立検査の平均輝度（8bit grayscale）: front 19.014、side 15.335、angle 17.828。
- 正面: 霧と窓明かりを保持、通路奥の明確な水平境界は目立たないが奥の柱は暗め。
- 側面: 柱の間に窓光を確認。実マップの壁遮蔽の実証ではない。
- 斜め: 前景の柱の輪郭と紫色の床が確認できるが、柱正面は暗い。
- Run 43805363902は技術画像QAのmanifest書込み権限不足で失敗（Docker root所有）。3枚のブラウザレンダー自体は成功・Artifact保存済み。原因と修正を区別する。
- 修正: 画像QA実行前にActions側でrender-outputフォルダをrunner権限に戻す。修正版ワークフローrun https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43805723148 の結果は別途確認する。
- 上記の技術QAは美観の承認ではない。**NOT_APPROVED**で保持、正式素材保存・developmentマージ不可。
