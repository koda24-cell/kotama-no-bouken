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

## 2026-11-15 V1 2回目失敗：glTFエクスポータ依存不足
- Run: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43727012505
- 正面・側面・斜めのBlenderレンダリング処理は成功したが、GLBエクスポートで `ModuleNotFoundError: No module named 'numpy'` が発生。
- その結果、成果物の存在検証に失敗。PNGのみの成功を「GLB+PNG完成」と報告しない。
- 修正: Actionsのaptインストールに `python3-numpy` を追加し、Blender内で `import numpy` を実行する依存チェックをGLB出力前に設置。
- ログの `Draco mesh compression is not available` は併記された警告。主因はNumPy欠如。圧縮を明示的に使用していない場合は混同しない。
- 教訓: **レンダリング成功、GLB書き出し成功、ファイル検証成功は別段階**。環境のPythonモジュールはBlender実行環境内で検証する。
- 修正コード: PR #383。再実行の成否は別途確認する。
