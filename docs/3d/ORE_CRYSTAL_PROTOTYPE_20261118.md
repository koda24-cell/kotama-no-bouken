# 結晶・鉱床ジェネレーター試作（2026-11-18）

目的: BotWの通常・希少・夜光鉱床を研究し、独自の母岩＋結晶形状をBlenderで作成。第2層（ice）/第4層（volcanic）へ展開する。

- Script: `tools/ore/generate_ore.py`
- Workflow: `.github/workflows/ore-crystal-preview.yml`
- 生成種: normal / rare / luminous / ice / volcanic
- 出力: `<variant>.glb`, `<variant>_{front,side,angle,top}.png`, `manifest.json` SHA256、NOT_APPROVED
- Blender CLI: `blender -b -t 2 --python tools/ore/generate_ore.py -- --out /tmp/ore --variant luminous --seed 17`
- 出力はActions Artifactsで一時保存。**承認前にゲーム本体/正式素材フォルダへ統合しない**。
- 原本は独立した造形であり、Entagmaなどの外部配布ファイルを転載しない。

## 今回の限界
- EntagmaのGeometry Nodes/内部亀裂/分散を再現済みではない。現段階はPython生成の不規則母岩＋5〜7角断面の多段リング結晶＋粗いマテリアルの初期試作。
- 実Blender実行・PNG目視・GLBロード・shader/発光・ゲームFPSはActionsのrun/Artifactを実際に確認するまで**未検証**。
- 透明度/屈折の表現、母岩と結晶の自然な接合、ボロノイ亀裂、微細内包物、PBR/Normalテクスチャ、GPU負荷は次の反復課題。
- Blenderのバージョン・エクスポータ差異でエラーになる場合、ログを確認して修正。
- 研究の参考URLとライセンス候補: https://github.com/koda24-cell/pinterest-reference-library/pull/17

## QA合格基準
1. 4方向PNGとGLBが実ファイルとして存在、SHA一致。
2. 母岩が消えない、結晶が浮かない、上から見て等間隔のトゲにならない。
3. 通常/希少/夜光の色と発光が区別でき、白飛びしない。
4. 母岩・結晶の法線、透過ソート、GLB表示をブラウザで検証。
5. ユーザー承認後のみ正式昇格。
