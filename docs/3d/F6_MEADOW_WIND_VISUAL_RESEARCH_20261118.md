# 第6層・花園：草原の美観と波状風の研究 (2026-11-18)

## 現状と保全
- 既存V7はユーザー造形承認済み: `docs/3d/F6_MEADOW_V7_CLAUDE_HANDOFF.md`、PR #346。3,200枚の草 + 440枚の下草葉、風向32度、7段の高さ、根元から葉先への頂点カラー。
- V7のBlender生成は**風に傾いた静止形状**。動的シェーダー・ゲーム統合・端末負荷は未検証。既存V7 GLBを上書きしない。
- `tools/floor6/meadow-wind-field.mjs` は **独立した試験用風向場の数学モデルとGLSL断片**。草モデルは再生成していない。JS関数の実行確認はNodeのみ、GPU/Three.jsは未接続。
- `node tools/floor6/meadow-wind-field.test.mjs` で根固定、近傍連続性、時変化、静止剛性、再現性を確認。Node単体テストは草が美しく動くことを証明しない。

## ブレワイの美しさを支える観察点と再現方針
1. **面で伝わる風**：全草に同じsin(time)を掛けず、草の世界座標を使い風下へ進む位相を与える。
2. **草ごとの動き**：長周期の面のうねりと、位置/個体差による短周期の葉先flutterを重ねる。
3. **根の接地**：高さ方向の重みと剛性により根元を完全に固定。長い葉は先端のしなりを優先。
4. **色と光**：V7の根→先端カラーを残し、環境光とシルエットで陰影を付ける。風に同期した色変化はやりすぎない。
5. **形状のばらつき**：高さ/幅/傾き/曲率と下草の密度を維持し、人工的な均一性を避ける。
6. **景色としての密度**：近景は細い葉先の分離、中景は群生のまとまり、遠景は低コストな色面・LODを検証。
7. **風の強弱**：定常風・移動する突風・静穏区間を重ねる。完全に全停止/全同位相は避ける。
8. **他の草木との同期**：ゆくゆくは第6層の花・木・草が同じ風場を読む。葉/枝は材質や剛性で振幅を別管理する。

## 参照と確証
- NVIDIA [GPU Gems: Rendering Countless Blades of Waving Grass](https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-7-rendering-countless-blades-waving-grass) — 頂点シェーダーによる広域の波状風と省Draw Call。公式の一般技術、任天堂固有の実装を公開した文書ではない。
- NVIDIA [GPU Gems 2: Virtual Botany](https://developer.nvidia.com/gpugems/gpugems2/part-i-geometric-complexity/chapter-1-toward-photorealism-virtual-botany) — 低頂点葉束、風の頂点変位、地面と一致する草色。
- [Stylized grass with Three.js](https://smythdesign.com/blog/stylized-grass-webgl/) — BotW風を目指した独立再現。ライセンス・コードの再利用は別確認。
- [AMD GPUOpen procedural grass rendering](https://gpuopen.com/learn/mesh_shaders/mesh_shaders-procedural_grass_rendering/) — 距離LODと広域風。mesh shaderはThree.js WebGLでそのまま使えない。
- [Cyrus Sarkosh: Grass, wind and trails](https://csarko.sh/research/grass-and-trail-realism) — 風を3段階に分け、遠景では草を沈める手法、遮蔽を抑える。個人の研究でありブレワイ実装の裏付けではない。
- [Bournemouth grass movement study](https://eprints.bournemouth.ac.uk/22568/1/grass.pdf) — 同位相・誇張された揺れ・葉の平面感の課題。
- [GDC 2021 Ghost of Tsushima grass talk PDF](https://media.gdcvault.com/GDC%2B2021/gdc_2021_procedural_grass_in_got.pdf) — 他作品の草の描画方法。Nintendo公式ではない。
- [ZeldaMods grass.extm](https://zeldamods.org/w_botw/index.php?title=Grass.extm) — 草の高さ/色データの外部解析。シェーダー内部とは区別する。
- 第三者の草モデルやゲームテクスチャを無断コピーせず、数学・色調の考え方を独自実装する。

## Three.js へ接続する前に必要な作業
1. V7の正規GLB/manifest、現在のruntime配置とマテリアル属性を再確認（別チャットの未マージPRも確認）。根から先端への重みを**明示属性**に持たせる。局所座標Yからの推定や頂点カラーからの単純推定で草全体を持ち上げない。
2. `onBeforeCompile` などで頂点変位を行う試作マテリアルを作り、**ワールド座標**の位相を使う。GLBのローカル座標、インスタンス座標、親オブジェクト変換、法線の更新、影・深度パスを検証。数学モデルに含むGLSL断片はまだ注入していない。
3. V7の全16隣接タイル境界ではなく草原1マスタイルの2x2/3x3配置で、風が繋がるか確認。4方向・ゲーム視点・低い視点で比較。
4. 同じカメラ/照明で静止V7と試作を動画・スクショ比較。根浮き、葉先の貫通、同位相、大きすぎる振幅、フリッカーがないか評価。
5. GPU時間/FPS/Draw Call/透明過描画をPCとスマホで計測。近遠で異なる品質にしても見た目の切り替わりを目立たせない。
6. **未承認の実装・GLBは本番へ入れない。** 合格後、ClaudeへのGLB/PNG/manifestを揃え、独立PRでゲーム統合。

## 利用先
- 共通風場は第6層の草原、白百合、成木の葉/枝の**将来的候補**。モデル毎の剛性と動作量は別々に指定する。
- 研究は全階層の植生シェーダーへ将来展開できるが、ゲームへの全階層適用は未実施。
