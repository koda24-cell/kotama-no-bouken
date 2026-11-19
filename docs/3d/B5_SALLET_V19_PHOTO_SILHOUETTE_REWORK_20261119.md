# 第5層・サレット兜 V19 — Walters実物写真に沿った形状修正

作成 2026-11-19 / 承認状態: **NOT_APPROVED** / 関連: draft PR #424 / `development` は変更しない。

## 前版V18との実画像比較
一次資料: Walters Art Museum, Visored Sallet 51.470, 1480–1490 Germany。寸法 H25.5 × W22.5 × D39.6cm。
- 同一個体の正面／左右側面／斜め／上面／内部の写真10枚を取得済み。
- 資料一覧: `koda24-cell/pinterest-reference-library/handoff/b5-sallet-full-view-20261118.md`。
- V18左側レンダリングで、実物より頭頂部が球体的で高く見える。後部裾が厚く伸び、前面バイザーが単純な板に近い。
- 写真の撮影条件とBlenderの正投影は異なるので、画像の輪郭を「ピクセル一致」とはみなさない。まず写真の形状比率・稜線・接合部に合わせる。

## V19の修正点
1. ボウルの断面リングを再配置し、頭頂を約3mm下げて側面の球体感を抑える。
2. 後頭部の最下段を薄く絞り、後部頂点の流れを実物の長い鋼板に近づける。
3. 側頭部からテールへ向かう鍛造の面変化をボウル頂点側に直接形成する。別パーツの白い縁飾りは禁止。
4. バイザーを中央で浅く尖らせ、下端を丸い水平帯からやや弓状・折れ目のある薄鋼板へ変更。左右ピボットと目の隙間は保つ。
5. V18の錆・煤・局所的な3領域のひびマスク／生成画像は**変えない**。
6. 元V1〜V18・騎士像の胴体・台座・戦闘機能は変更なし。

## 検査
- ソース: `tools/b5-knights/build_sallet_v19.py`
- Actions: `.github/workflows/b5-knight-sallet-v19-render.yml`
- 実行: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44454334252
- 6視点 front/left/right/back/angle/top、GLB/Blend、PBR PNG、manifest/progress。
- 共有検証済みBlender+ClamAVコンテナ使用。ソース／テクスチャ／生成成果物のスキャンが必須。
- 完成を主張するのはActions success、出力実ファイルのSHA検証、画像を実際に目視した後。
- 人間による美術承認まで正式保存不可。
