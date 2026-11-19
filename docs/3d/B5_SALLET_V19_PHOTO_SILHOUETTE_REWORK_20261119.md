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

## 検証済み結果 / V19・V20
- V19 run [44454334252](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44454334252) **success**、Artifact 14496564249。6方向PNG・GLB・Blend・PBRテクスチャのmanifest SHA-256 13/13一致。実際のBlender Cycles出力を目視。前後長と後頭部断面は改善したが、頭頂に独立リッジが白線として浮き、バイザーはまだ前方へ突き出す。**美術不合格**。
- そこでV20 `tools/b5-knights/build_sallet_v20.py` を独立追加。頭頂の独立カーブを削除し、鉢メッシュのごく浅い断面変形に変更。バイザー側端を後退・幅を控えめに変更。V18の汚れ・3か所の局所ひびを完全維持。
- V20 run [44454949220](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44454949220) **success**、Artifact 14497875347。GLB・Blend・実レンダ6方向・PBR 13ファイル SHA-256 13/13一致。生成候補のClamAVスキャン成功、source/texture scanned before build。
- V20実物写真との比較: Walters実物とモデルのfront/left/right/angleを並置。写真のカメラ投影・焦点距離・スタンドの影響が違うため、**実ピクセル一致・カメラ校正済みの検証とは主張しない**。頭頂白線は解消した。一方、正面下部が卵形に丸く、バイザーが板状に見え、実物の明瞭な裾・連続した側面鋼板との一致はまだ不十分。**美術品質未承認**。
- 承認するのはユーザーのみ。公式 `assets`、`development`、`main` は変更せず、Actions一時Artifacsとして保存。
