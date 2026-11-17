# 第2層 水表現研究・段階導入計画 (2026-11-18)

## 状態
- **調査成果を導入計画として保存済み。ゲーム描画・GLBは未変更、レンダリング・端末FPSは未検証。**
- 開発統合先は development。独立PRで比較し、ユーザー承認まで正式素材や既存の水面を置き換えない。
- 適用対象: 第2層「水源（氷）」を最初に検証し、安定後に他階層の水・溶岩へ共通化を検討。溶岩へ透明水の屈折等を盲目的に適用しない。

## development 実装調査
- `field/field-3d-b2-water.js` の `makeMaterials(opaqueWater)` は 512px 水面テクスチャ、256px 滝テクスチャを手続き生成し、MeshStandardMaterialの透過水/滝、泡を作る。代替の不透明水モード `kotama.field3d.b2.water` がある。
- 第2層の素材 `assets/3d/dungeons/b2_water_source/models/floor2-water-source-quality-v3.glb` と既存造形を保持する。共有ランタイムへの直接パッチより独立モジュール/opt-in実験を優先。
- `docs/3d/B2_WATER_TILE_CLAUDE_HANDOFF.md`: v0.7の16種 (00〜15) はN=8,E=2,S=1,W=4の方向マスク。**水域は通常非通行、マップ最外周へ開けない**。辺接続は実メッシュの断面も確認。v0.7暫定造形OK≠正式昇格。
- `docs/3d/GLOBAL_3D_LOD_PERFORMANCE_POLICY.md`: 画面投影サイズ/距離/可視性による品質変更を推奨。ただしゲームランタイムへ全階層LODは未統合。
- `docs/3d/FLOOR2_OPEN_CAVERN_WATERFALL_PLAN.md` は設計案のみ。滝・水車の既存PR/候補を消さない。

## 採用する技術と実装候補
| ID | 水の種類 | 技術 | 実装方針 | 留意事項 | 検証 |
| --- | --- | --- | --- | --- | --- |
| W01 | 全水面 | 2スケールスクロールNormal Map | 独立の法線テクスチャ/別速度・方向、遠景は微細波を減衰 | 色テクスチャのスクロールだけでは法線変化しない | 光の反射、タイル継ぎ目、時間ループ |
| W02 | 湖/池 | Fresnel＋軽量な環境反射 | まず近似反射/環境マップ、SSR/リアルタイム平面反射は別比較 | 洞窟で空を反射しない。周辺の色を合わせる | 斜め視角、洞窟内、端末負荷 |
| W03 | 浅瀬 | 水深色/Depth Fade | 水底メッシュと別制御、必要なら深度テクスチャの可用性を調査 | depthTexture/背景描画方式で互換性差 | 岸の半透明ソート、深度 |
| W04 | 川/水路 | Flow Map | UV方向場＋流速マスク、岸で減速・岩の手前で迂回 | 流線の急曲がり/UV継ぎ目 | T字/十字/曲がり/行止まり |
| W05 | 水辺 | Foam/shore mask | 手描き・生成マスクか深度交差で岸泡、固定白線を廃止 | 過剰な透明レイヤーを避ける | 陸・水の実メッシュ断面 |
| W06 | 滝 | 曲面メッシュ＋縦流れ＋泡＋少数の飛沫 | 既存凍結滝候補と別の動水候補で比較 | 結氷部を動く水に変えない/高密度粒子禁止 | 正面/側面/斜め/滝壺 |
| W07 | 水底 | Caustics | 水底・水中岩に低解像度の動く光模様を投影/重ねる | 水中の暗部を不自然に明るくしない | 浅瀬と深水、視点移動 |
| W08 | 全水域 | LOD/品質プリセット | 画面占有率・距離・水面可視性・端末の負荷で品質制御 | フリッカ/切替段差を防止、ヒステリシス | FPS/GPU ms/Draw Call/見た目 |
| W09 | 全水域 | テクスチャ共有/透過最適化 | 同じマテリアル/Normal/Flow atlas共有、過度な重複透明面を抑制 | メッシュ結合で個別カリングを失わない | テクスチャ/メモリ/overdraw |
| W10 | 水路・滝 | 泡の局所パーティクル | 必要箇所だけ少数、遠景で停止 | 周囲の霧/VFXと区別 | 視点変化/負荷 |

## 実装順とPRの分離
1. **A: ベースラインと独立プレビュー** — 現状の水面・滝を同一視点/同時間に保存。既存のレンダラとWebGLの対応状況、iPhone/PC、fpsと renderer.info を記録する。凍結滝と可動水を混同しない。
2. **B: 水面シェーダー候補 (W01/W02)** — 独立モジュール＋プレビューの opt-in。既存の `makeMaterials` をそのまま残す。比較用画像と性能記録が出るまでゲーム本体へ配線しない。
3. **C: 水路 (W04/W05/W09)** — 16方向タイルの接続マスク/断面テストを先に実施し、流向場と岸泡を追加。
4. **D: 浅瀬/水底 (W03/W07)** — 水深と水中Caustics。透過ソートとカメラ位置を変えて検証。
5. **E: 滝 (W06/W10)** — 静止形状・流れるUV・白波・飛沫を独立管理し、既存モデルに重ねる方式から試す。
6. **F: 3段階品質モード (W08/W09)** — ノーマル枚数、Foam、Caustics、VFXを段階制御し、可視性・距離を計測して調整。
7. **G: 候補の統合** — 画像・性能評価を経てユーザー承認を取得した候補のみ正式導入。Claude向けGLB/PNG/manifest/変更点メモを渡す。

## 最低限の検証ゲート
- **描画**: 近景/中景/遠景、正面/側面/斜め/上面、低角度視線、暗い洞窟、深浅の水。
- **タイル**: 16種x4辺の接続、2x2・3x3、水・陸の断面一致、マップ外周に水が出ないこと。
- **ゲームの互換性**: 既存の通行判定/FOE/イベント/セーブ/戦闘を変更しない。非通行水域を渡れるようにしない。
- **性能**: 比較時に同解像度・同カメラ・同可視水量でFPS、フレームタイム、Draw Call、triangles、テクスチャ容量を記録。数値目標は端末ベースライン取得後に決定する。
- **安全性**: 端末非対応/負荷超過なら現在の水素材に戻す。レンダリング未確認の候補は正式保存しない。

## 出典と確証の区分
- [Unity公式 Production Ready Water](https://github.com/Unity-Technologies/Graphics/blob/master/Packages/com.unity.shadergraph/Documentation~/Shader-Graph-Sample-Production-Ready-Water.md) — 湖/流れ/滝のシェーダー構成の参考。Unityの実装をThree.jsでそのまま実行できるわけではない。
- [原神の海 再現](https://qiita.com/uynet/items/f8b087d47f5cf316eb7e) と [再現コード](https://github.com/Uynet/Gensin-Sea) — **非公式**再現。原神内部の正式な実装と断定しない。
- [原神の滝 Reverse Genshin Impact WaterFall](https://www.wangtao-ta.com/?a=index&aid=105&c=View&m=home) — **非公式**RenderDoc等を用いた分析。権利のある元テクスチャ/ゲームデータを取り込まない。
- [BotW renderer研究](https://github.com/ntngel1/botw-renderer) — **非公式**研究、未完全再現。ゲーム固有データは使用しない。
- [Directional Flow](https://catlikecoding.com/unity/tutorials/flow/directional-flow/) / [Waterfall Shader Breakdown](https://www.cyanilux.com/tutorials/waterfall-shader-breakdown/) / [Shoreline Shader Breakdown](https://www.cyanilux.com/tutorials/shoreline-shader-breakdown/) — シェーダーの学習資料。
- [GDC 2023 Open-World Water Rendering](https://www.gdcvault.com/play/1028829/Advanced-Graphics-Summit-Open-World) — 大規模な水描画の参考。
- 技術的な考え方を参照し、ソース・テクスチャ・3Dモデルの無断コピーを避ける。個々のコード・アセットは使用条件を別途確認する。

## Claude 引き継ぎ
- この文書と `docs/3d/B2_WATER_TILE_CLAUDE_HANDOFF.md`, `field/field-3d-b2-water.js` を読む。
- GPT側で生成・承認されたGLBと実際の比較PNG/manifestを受け取り、ClaudeはGLTFLoader/Three.js上の表示と性能/継ぎ目を検証する。Blender実操作をClaude担当にしない。
- ユーザーが「すべて取り込む」と指示しても、未検証の手法を一括で本番有効にしない。試作→計測→承認の順番を厳守。
