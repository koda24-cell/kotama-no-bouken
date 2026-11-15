# 第5層 玉座 — Blenderレンダリング失敗・修正履歴

## 2026-11-15 V1 初回失敗
- PR: https://github.com/koda24-cell/kotama-no-bouken/pull/383
- Run: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43726733310
- 環境: GitHub Actions ubuntu-24.04 / apt-get install blender / Cycles CPU
- 失敗ステップ: Render GLB and three views。GLBとPNGの成果物は未検証。
- **停止原因**: `RuntimeError: Error: Build without OpenImageDenoiser`。apt提供BlenderビルドにOpenImageDenoiserが含まれず、Cyclesのデノイズが失敗。
- **修正**: `scene.cycles.use_denoising=False`。ノイズ除去機能に依存せずCPUレンダを行う。画像のノイズはサンプル数・光量で調整。
- **追加警告**: Weighted Normalに対して `Enable 'Auto Smooth' in Object Data Properties` が多数発生。
- **修正**: Bevel対象メッシュで `o.data.use_auto_smooth=True` を設定してからWeighted Normalを追加。
- **再発防止**: Actions実行時のBlenderバージョン・ビルドオプションを確認。利用不可のデノイザは使わない。GLB/PNGは3方向全てファイル存在・サイズ・実画像を確認してから完成とする。
- **状態**: 初回失敗原因を記録しコード修正済み。再実行の成否は別途確認する。

このファイルはGPT/Claudeの共通引継ぎ用。レンダリング失敗を造形完成や素材承認と混同しない。
