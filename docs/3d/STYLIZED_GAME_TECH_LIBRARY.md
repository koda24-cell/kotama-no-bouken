# スタイライズ3D制作 技術・ツールライブラリ（2026-11-14 初版）

> **用途**：コタマのぼうけん第3層の鉄骨・錆・亀裂・破損、さらに全階層のBlender生成品質向上。GPT/Claude共通参照。
> **収録内容**：外部一次資料・研究実装・生成補助ツールのURL、利用判断、具体的な適用手順。**第三者のゲーム内モデル、抽出素材、画像本体は収録しない**。リンク保存≠ツール導入/動作確認。

## 1. ゲーム別 技術資料（公式とファン研究を区別）

| 対象 | 資料 | 使える知見 | 状態 |
|---|---|---|---|
| 原神 | [GDC 2021 原神アニメ調オープンワールド講演](https://www.gdcvault.com/play/1027539) / [発表PDF](https://media.gdcvault.com/GDC%2B2021/2021GDC%2B_%2BHaoyu%2BCai%2B_%2Bpresentation%2Bfile.pdf) | キャラクターと背景の美術設計、アート主導のシェーディング、シルエットの設計 | 公式講演・参照用 |
| 原神 | [GDC 2021 スケーラブルなゲーム制作](https://media.gdcvault.com/GDC%2B2021/20210528_%2BGDC21_shuo_presentation%2B_Final.pdf) | 大規模コンテンツの工程・品質管理 | 公式講演・参照用 |
| 原神 | [Sandrone NPR Rendering](https://github.com/SWzei/Sandrone-NPR-Rendering) | Face SDF、ランプ陰影、アウトライン、色調整、テストとスクショ比較 | **非公式研究**、Unity向け、ライセンス要確認 |
| 崩壊：スターレイル | [StarRailNPRShader](https://github.com/stalomeow/StarRailNPRShader) | 髪の透過、セル陰影、輪郭、Bloom、法線の自動調整 | **非公式研究**、GPL-3.0、2025-03アーカイブ |
| 崩壊：スターレイル | [Blender-StellarToon](https://github.com/festivities/Blender-StellarToon) | Blender系のNPRノード設計、キャラクター陰影 | **非公式研究**、GPL-3.0、Goo Engine依存・アーカイブ。抽出モデルは取得しない |
| ゼンレスゾーンゼロ | [公式PC描画更新FAQ](https://zenless.hoyoverse.com/en-us/news/165408?catchSpider=1&lang=en-us&page=news) | GI、レイトレーシング、解像度補完の品質階層を参考にする | 公式、**ゲーム内部シェーダー公開ではない** |
| ゼンゼロ・原神・スタレ | [HoyoToon](https://github.com/Hoyotoon/HoyoToon) | アニメ陰影、特殊材質の参考 | **非公式**、Unity Built-in向け、抽出アセット前提。コタマへそのまま導入しない |
| エンドフィールド | [Apple Developer 開発者インタビュー](https://developer.apple.com/news/?id=cpt08xv8) | コンセプト→3D検討→エンジン内ブロックアウト→統一制作工程 | 開発者一次情報 |
| エンドフィールド | [開発者技術インタビュー](https://www.invenglobal.com/articles/24006/the-know-how-behind-arknights-endfield-seamlessly-implementing-fields-and-factories-with-unity) | ECS、カリング、バッチング、独自レンダリング基盤 | 開発者発言を報じた記事 |
| エンドフィールド | [Endfield Character Rendering](https://github.com/congyuxiaoyoudao/Endfield_Character_Rendering) | PBR+NPRの混合、スムーズ法線、輪郭、半透明前髪 | **非公式研究**、Unity URP、ライセンス要確認 |
| エンドフィールド | [ファンによるAI補助Look-dev研究](https://minoming.artstation.com/projects/RKRdem) | パラメータ駆動の陰影調整、AIを使った工程の反復 | 非公式・研究事例、ゲーム素材再利用はしない |

## 2. 実制作に使える補助ツール

| 名称 | URL | 優先度 | 利用条件・導入判断 |
|---|---|---|---|
| Blender標準 Geometry Nodes | https://docs.blender.org/manual/en/latest/modeling/geometry_nodes/ | **A** | 標準搭載。散乱、ボルト列、破損の追加メッシュ、錆マスク生成に使う |
| Blender標準 Boolean / Bevel / Weighted Normal | https://docs.blender.org/manual/en/latest/modeling/modifiers/ | **A** | 標準搭載。実際の欠損、切断面、板厚、金属エッジの形状改善 |
| MaterialCreator | https://github.com/Calla-Ji/materialcreator | **B** | ノード型PBRマップ作成。オープンソース。ライセンス/実行互換性確認後に使用 |
| Damage Geometry Nodes集 | https://blendatlas.com/products/damage | **B** | 無料配布ページの紹介。**個別アセットのライセンス確認必須** |
| Procedural Damage & Wear | https://www.strayspark.studio/docs/procedural-damage | **C** | 商用アドオン、Blender 4.2+、有料。**自動購入禁止**。機能の設計参考に限定 |
| Blender無料アドオン索引 | https://github.com/naranyala/awesome-3d-blender-addons | **B** | 候補の探索用。列挙だけで互換・安全・ライセンスを保証しない |

## 3. コタマへの具体的な適用ルール

### 3層・クレーンの鉄骨/リール/カウンターウェイト
1. **形状を先に**：曲げた鉄骨、切断面、剥離した板、ボルト、リブ、露出した断面を独立メッシュとして追加。既存形状は保持。
2. **金属とコンクリートを分ける**：金属は粗さ・錆の不均一、コンクリートは破断面と粗骨材を幾何形状で表現。
3. **汚れの根拠を持たせる**：雨筋は鉛直方向、錆は継ぎ目・ボルト周り・水溜まり、傷は接触/荷重方向。
4. **PBR + スタイライズ**：素材の反射/粗さを保ちつつ、色数と明暗階調を制御。キャラ用Face SDFは工業小物へ無条件適用しない。
5. **出力検証**：Blender実レンダーのfront/side/angle、GLBを必ず生成し、Three.js上の見え方も別途確認。
6. **パフォーマンスは後から**：制作時は品質優先。ゲーム統合前にメッシュ統合、LOD、テクスチャ共有、描画負荷測定。

### AI制作担当向けの推奨プロンプト
「この索引を参照して、対象の用途に合う一次資料と合法な生成補助を選び、既存メッシュを保持した追加造形で改善。マテリアルだけで欠損をごまかさず、接合・荷重・破断面を検証。GLBとBlender正面/側面/斜めレンダーを出力し、見た目と不具合を報告。第三者ゲームの抽出アセットは使用しない。」

## 4. 権利・技術上の注意
- 公式の技術講演・画像は**参考資料**。モデル/テクスチャの再配布許可ではない。
- GPL等のライセンス、アドオンの再配布条件、商用可否は個別に確認する。ゲームの内部アセットやデータマイニング由来の素材は保存・再配布しない。
- Unity向けシェーダーをThree.jsやBlenderでそのまま動かせるとは限らない。**アルゴリズムを研究して独自実装する**。
- この文書は調査とリンク保存の初版。外部リポジトリのコードのGit取り込み、インストール、Blender動作検証、モデル品質改善は**未実施**。

## 5. 次の実装候補
- A: Blender標準機能だけで「錆・エッジ欠損・鉄骨の座屈」を自動生成するPython補助モジュール。
- B: 既存のfloor3 crane V2 3種へ適用し、V2/V3の3方向比較。
- C: Three.jsでPBR/NPRのバランスを確認する専用プレビュー。
- D: Pinterestから廃工場・鉄骨破断・巻きワイヤーの参考画像を収集（別リポジトリで引き継ぎ）。
