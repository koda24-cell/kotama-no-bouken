# 第6層 成木：BotWの樹木軽量化に関する検証可能な知見（2026-11-17）

調査対象: 『ゼルダの伝説 ブレス オブ ザ ワイルド』の公開技術と、Three.jsゲームでの再現可能な軽量化。画像・ゲームデータの無断転用は行わない。

## 確認済み（講演に基づく）

1. CEDEC2024講演のBotW振り返りによると、木や崖などの配置物は2Dグリッドに登録され、四分木構造と大きさに応じた表示距離に基づき管理される。遠すぎるオブジェクトをロードしない。地形のLODと配置物のロードについても2Dにしたことで効率化した。出典: https://gamemakers.jp/article/2024_09_04_78145/
2. BotWの葉の個別頂点数・材質・LOD閾値・ビルボード実装の正確な内部仕様は公開資料だけでは確認できていない。断定禁止。
3. 西川善司による実機映像からの技術的推測では、樹木や草に透明領域のある板ポリゴンとAlpha to Coverageが使われている可能性に言及。ただし**開発者による採用確認ではない**。出典: https://games.app-liv.jp/archives/256335

## コタマ向けの提案（BotW実装と同一とは主張しない）

- 葉を1枚1メッシュで書き出さず、同じ材質の枝葉をまとめて数個のメッシュにする（近景品質維持）。
- 樹皮は幹・太枝に立体的な形状を与え、薄い小枝・葉群は透過テクスチャ付きの葉束カードで表現する。葉の影形状を優先し透明ブレンドの過剰オーバードローを減らす。
- Near/Medium/Far LODを独立生成し、近景は枝・数枚の個別葉、遠景は樹冠形状に沿う葉束カード・少ポリゴン・必要に応じてimpostor。閾値は実ゲームの一人称1マス移動と視野で検証する。
- 描画可能な同種樹木をインスタンス化する。例: THREE.InstancedMesh 公式 https://threejs.org/docs/pages/InstancedMesh.html
- Three.js公式MaterialのalphaTestとalphaToCoverageを比較する。条件・環境依存に注意：https://threejs.org/docs/pages/Material.html および https://threejs.org/manual/pages/transparency.html
- リアルタイム影は近景幹・主要枝に限定し、葉の影・風アニメ・透過表現の負荷を切り分ける。
- 遠方セルの非表示・チャンク単位読み込みを優先する。BotWの四分木をそのまま模倣する必要はなく、コタマのグリッド迷宮なら固定視界の読み込みが適する可能性が高い。

## 現状のV14との差とQA

- 対象PR: https://github.com/koda24-cell/kotama-no-bouken/pull/452
- 生成スクリプト: `tools/floor6/tree_mature_v1.py`（PRブランチ上）
- V14は約8967の葉（生成時に1枚ずつ別Blenderオブジェクト）を作成。1枚ずつGLBにexportしており、Three.jsでの多数draw callやCPU負荷の危険がある。ただし本番環境の実draw call / FPSは**未計測**。
- 目的: V14元形状を保持したまま、(a) leaf meshのバッチ化、(b) LODモデル出力、(c) 実モデルの描画コスト計測、(d) 4方向PNGの品質比較。
- 目標値は実測後設定する。単に葉数減だけで品質が上がるとは言えない。
- 注意: Blenderの「1つのGLBファイル」は「描画が1回になる」ことを意味しない。GLB内部のmesh・primitive・material・rendererにより描画回数は異なる。

確認後、未承認素材は正式素材フォルダへ昇格せず、独立PRに留める。

## 追加で見つかった海外一次資料・逆解析（2026-11-17）

- **公開された任天堂の説明**: BotWのフィールドでは木や崖を二次元グリッド／四分木に登録。大きさ別表示距離で不要な遠景ロードを回避。これは確定。TotKは縦方向の拡張により八分木などの3Dデータ構造を使うため、両作品の仕様を混同しない。 https://gamemakers.jp/article/2024_09_04_78145/ と https://document.4gamer.net/games/578/G057883/20240824003/
- **BotWのエミュレータ解析**: Cemu Graphic Packsの描画距離調整アセンブリには「Tree billboard draw distance」「Grass blades draw distance」「Object draw distance」「Actor draw distance」が独立して登場する。木の遠景ビルボード存在を裏付けるコミュニティ解析。Nintendoのソースコード・LODシェーダーの全容を解明したものではない。 https://github.com/cemu-project/cemu_graphic_packs/blob/master/src/BreathOfTheWild/Mods/DrawDistance/patch_DrawDistance.asm
- **BotWの逆コンパイル**: zeldaret/botw はSwitch 1.5.0向けの進行中の逆解析プロジェクトで、ゲームアセットやROMは含まない。まだ樹木レンダリングの完全仕様を示す資料は見つからない。 https://github.com/zeldaret/botw
- **GPU Gems 2（SpeedTree）**: 近景では細葉と詳細枝、中距離では大きな葉束billboard（枚数を減らしながら1カードの葉描写量を増やす）、遠距離では複数角度impostorへ。葉テクスチャをatlasにまとめることで描画の共通化を進める。 https://developer.nvidia.cn/gpugems/gpugems2/part-i-geometric-complexity/chapter-1-toward-photorealism-virtual-botany
- **GPU Gems 3（SpeedTree）**: Alpha to Coverageは透過輪郭をMSAAのカバレッジで表す。透過ソートに依存しにくいが、解像度・sample数・見た目が変わる。LOD間をnoiseに基づくcutoutで滑らかに移行する方式が紹介されている。 https://developer.nvidia.com/gpugems/gpugems3/part-i-geometry/chapter-4-next-generation-speedtree-rendering
- **GPU Gems 3（Crysis）**: 葉はAlpha Test＋両面描画、草はAlpha Blendで、草の重いfill-rateを理由に照明計算を分ける実例。ゲームにより最適なblendは異なる。 https://developer.nvidia.com/gpugems/gpugems3/part-iii-rendering/chapter-16-vegetation-procedural-animation-and-shading-crysis
- **植物LOD論文**: 葉のような小さく非連結なジオメトリは一般的なポリゴンリダクションが苦手。Billboard cloudは葉群の投影を少数カードへ変換する。本文の60〜260は研究文脈であり、コタマの品質基準値として無条件使用しない。 https://www.gametools.org/projects_udg/gt_ibr/papers/multilayeredIndirectTexturing.pdf
- **glTF2.0公式**: 切抜き表現はalphaMode=MASK、alphaCutoff、doubleSidedを標準定義。MASKは樹木の葉の用途が想定されている。BLENDは半透明合成用途。 https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html
- **Three.js公式**: 同形状・同材質・複数配置にはInstancedMesh、異形状だが同材質ならBatchedMesh、静的メッシュの結合にはBufferGeometryUtils。alphaToCoverage、alphaTest、forceSinglePassは端末差・MSAA・透明処理の制約を評価。 https://threejs.org/docs/pages/InstancedMesh.html 、 https://threejs.org/docs/pages/BatchedMesh 、 https://threejs.org/docs/pages/Material.html 、 https://threejs.org/manual/pages/optimize-lots-of-objects.html

### developmentの既存コードを監査した結果

1. field/field-3d-view.js の load() はGLTFLoaderのPromiseをMapでキャッシュする。place()ではGLB sceneをcloneしている。レンダラーは画質設定を持ち、カメラfarは階層ごとに変わる。
2. 同ファイルの KotamaField3D.stats() / renderInfo() はドローコール・三角形・ジオメトリ・テクスチャ数を既に提供。high画質はBloom後処理を含みうるので比較条件を統一する。
3. field/field-3d-b1-sacred-trial.js は16m空間バケット、同一geometry/materialのInstancedMesh、シーンのベースモデルSHA検証、取消/rollbackの構成が既にある。ただし第1層の限定試験として実装されたもの。全階層対応を宣言していない。
4. 第6層tree_mature V14（未承認PR #452）のBlender生成器は葉を8967個の独立メッシュとして出力する。実際のThree.js draw calls、FPS、GPUメモリ削減量は**未測定**。
5. **不足**: 汎用の3段階LOD、可視距離別の読み込み・破棄、葉束のtexture atlas、ゲーム視点での比較・ベンチマーク。現時点で実装済みとは扱わない。

共通の採用基準と各ステージへの展開順序は GLOBAL_3D_LOD_PERFORMANCE_POLICY.md を参照。最初の小さな試験はV14の原本保持＋葉材質別統合で、4方向レンダリングの差とdraw callsを数値で比較する。
