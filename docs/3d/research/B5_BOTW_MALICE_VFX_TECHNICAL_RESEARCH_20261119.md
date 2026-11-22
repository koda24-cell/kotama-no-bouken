# B5 瘴気: BotW 怨念 / TotK 瘴気の技術調査（2026-11-19）

状態: **資料調査済み / 実装未着手 / Blender・Three.js実描画未検証 / NOT_APPROVED**。任天堂の内部コード・素材を取得したものではない。第5層の既存岩V13・瘴気・遠景は保持し、独立候補として比較する。

## 結論（出典の種類を混同しない）

- **公式CEDEC 2017「エフェクト」**: スタイライズドな表現を大量のエフェクトアセットに落とし込む手法、データドリブンな実装を扱う。講演概要は公開、スライド公開不可。**怨念固有の実装構成は不明**。
- **Nintendo DREAMによるCEDEC取材**: BotWのVFX全体で「和アニメ調」と「ひも」がキーワード。**怨念専用の紐メッシュを証明するものではない**。
- **公式CEDEC 2017「レイヤー」**: 近景・中景・遠景・時間/空間を重ねた描画設計。瘴気を単一の霧レイヤーで終わらせない設計に応用可能。
- **任天堂公式エフェクト職種紹介**: VFXは状況の視認性・操作の手ごたえ・演出を担い、DCCと自社ツールを併用。怨念の実装詳細ではない。
- **MiasmaSharp（第三者解析・TotK）**: ゲームの瘴気レンダラーを研究し、不可視のsphere/box等の領域に含まれる地形表面に対して、ノイズと密度を計算し合成する構成を説明。**TotKの研究でありBotWの怨念の証明ではない**。リポジトリはAGPL-3.0であり**コードをコタマへコピーしない**。
- **NERD公式（TotK）**: 地底・洞窟等の継続LODレンダリングとWYSIWYG地形ツール。瘴気そのものの内部実装ではない。

## 原典・技術資料（リンクと検証状態）

| 区分 | 資料 | 抽出する知見 | 状態 |
|---|---|---|---|
| 任天堂/CEDEC公式 | https://cedec.cesa.or.jp/2017/session/VA/s58eed8209ffce.html | エフェクトの表現・大量生産・データドリブン | 講演概要確認。資料非公開 |
| CEDEC公式 | https://cedec.cesa.or.jp/2017/session/VA/s58eed7182c81b.html | 近景・中景・遠景、時間/空間の重ね塗り | 講演概要確認。資料非公開 |
| CEDEC取材 | https://www.ndw.jp/post-1121/ | 「ひも」「和アニメ調」の表現方針 | 記事確認。怨念専用とは未確認 |
| 任天堂公式 | https://www.nintendo.co.jp/jobs/introduction/design/work04.html | エフェクトを消した比較、予兆・手ごたえ | 職種紹介確認 |
| GDC講演 | https://www.youtube.com/watch?v=QyMsF31NdNc | BotWアートと技術の背景 | 公開講演確認。怨念個別解説は未確認 |
| GDC取材 | https://www.4gamer.net/games/341/G034168/20170304011/ | 絵作り・写実とデフォルメの判断 | 記事確認 |
| 任天堂NERD公式 | https://www.nerd.nintendo.com/2024/06/24/TOTK1.html | TotKの地底/洞窟LOD | 公式概要確認 |
| 第三者解析 | https://github.com/BladesawStudios/MiasmaSharp | TotK瘴気の領域・二段階合成・3Dノイズ | README確認、AGPL-3.0、コード流用禁止 |
| 第三者逆解析 | https://github.com/zeldaret/botw | BotW内部研究の入口 | 研究プロジェクト確認。怨念固有シェーダーは未特定 |
| シェーダー解説 | https://continis.io/tech/toon-shader/ | BotW風の影段階・輪郭光・emission | 独立再現、怨念専用ではない |
| GPU技法 | https://developer.nvidia.com/gpugems/gpugems3/part-i-geometry/chapter-1-generating-complex-procedural-terrains-using-gpu | 多段ノイズ・domain warp・triplanar | 技術記事確認 |
| GPU技法 | https://developer.nvidia.com/gpugems/gpugems3/part-iv-image-effects/chapter-23-high-speed-screen-particles | 煙・霧の低解像度オフスクリーン合成 | 技術記事確認 |
| Blender公式 | https://docs.blender.org/manual/en/4.5/modeling/geometry_nodes/curve/operations/curve_to_mesh.html | 紐・触手・根のCurve→Mesh | 機能資料確認 |
| Three.js公式 | https://threejs.org/docs/pages/ShaderMaterial.html | 独自GPUシェーダー | API資料確認 |
| Three.js公式 | https://threejs.org/docs/pages/DepthTexture.html | 地面との交差・深度ベースの霧 | API資料確認 |
| Three.js公式 | https://threejs.org/docs/pages/Data3DTexture.html | 3Dノイズの候補（WebGL2等を要検証） | API資料確認 |
| Kenney公式 | https://kenney.nl/assets/smoke-particles | CC0の煙70点 | 配布ページ・CC0確認。今回新規DLなし |

## 第5層向け独自表現案（任天堂の実装を断定しない）

**表現を6層に分割**する。原本の黒い侵食岩は変えず、独立した追加VFXとする。

1. **腐食した実体**: 岩面・床面に沿う黒紫の不均一な膜。元メッシュと位置を共有し、厚みと接地を多方向で検証。境界はワールド座標ノイズ＋距離フェード。
2. **有機的な紐/根**: Blender Curve→Meshで太さが先端へ変わる帯/管状の形を複数用意。S字・分岐・ねじれ・方向性をランダム化し、規則的なトゲの羅列を避ける。
3. **内部の脈動**: 黒を主役にして、割れ目・根元・結節点だけ赤紫emissionを非同期に明滅。光の線を全面に等間隔で描かない。
4. **地表を侵食する模様**: 世界座標ノイズ、domain warp、triplanar等で岩・床の継ぎ目を跨ぐ模様。深度・接地・遮蔽は独立テスト。
5. **浮遊する瘴気**: Kenney CC0煙を独自着色して低密度に多層化。奥行きと密度変化、ソフト交差を評価。原本/ライセンス/SHA/ウイルススキャンの成功を確認するまで導入済みと呼ばない。
6. **空間の雰囲気**: 遠景の暗紫霧・個別明滅の窓・短い紫閃光。既存PR #354とVFX共通プリセットを優先し、二重実装を避ける。

**順序**: 静止3方向のシルエット→材質比較→2秒/10秒の時系列→一人称視点で床/壁の接地→遠景→最終LOD/FPS。Blenderでの見た目とGLB標準材質・Three.js ShaderMaterialの見た目は異なるため、両方を実測する。

**合格基準（提案・未検証）**: 真っ黒な塊に潰れない／赤紫が発光しすぎない／帯・根が実際に立体に見える／浮遊する板が見えない／地面を貫通しない／4mセル境界で継ぎ目が目立たない／3方向＋時間差PNGで確認／ゲームで壁越しに見えない／FPSとdraw callsを計測。軽量化は品質を確立した後に行い、元の高品質データを保持する。

## 注意

- BotWの怨念、TotKの瘴気、コタマの第5層は別作品・別素材。見た目の参考に留め、任天堂のゲーム資産・テクスチャ・抽出モデルは使用しない。
- MiasmaSharpのAGPL-3.0ソースをゲームへコピーしない。手法の抽象的なアイデアを参考に独自設計する。
- これは**文献調査のみ**。画像の目視比較、Pinterestピン保存、素材の取得・実ウイルススキャン、Blenderレンダリング、Three.js実行、GitHub正式素材保存はこの調査では実施していない。
- 引継ぎ: `docs/3d/B5_GLOOM_TOOLS_AND_LESSONS.md`、`docs/3d/VFX_TOOL_CATALOG.md`、`docs/3d/BLENDER_SHARED_EXECUTION_ENTRYPOINT.md` を確認。
