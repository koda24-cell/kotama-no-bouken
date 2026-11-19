# 第6層 BotW風の木 — 法線・表裏透過光・葉群AOの追加研究 (2026-11-19)

## 今回の重要な発見（公開一次資料／独立制作資料を区別）

### 1. 法線転写だけでは裏側が不自然になり得る
- 出典: [Polycount 原著 Obscura 2019](https://polycount.com/discussion/209623/smooth-foliage-like-in-breath-of-the-wild-europa-by-helder-pinto-mini-tutorial)。
- 葉面の回転ごとの明暗の分断を半球の法線転写で減らす。作者はUnrealの両面材質と TwoSidedSign を用いて、裏面の光も制御している。
- コタマ初回試験 run 44453628951 では、法線混合率 **0.82** で正面暗すぎ／下面明るすぎ。**0.82は未採用**。
- 改善案: 25%,45%,65%の独立混合率試験。AOは混ぜずに法線だけ切り分ける。実装用独立枝 `feature/f6-foliage-normal-strength-sweep-20261119`、GitHub Actions `f6-foliage-normal-strength.yml`（実行結果はその都度確認）。

### 2. glTFの両面法線仕様を軽視しない
- [Khronos glTF 2.0仕様 HTML](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html): マテリアルdoubleSidedは背面カリングを止めるだけでなく、背面の法線を**ライティング前に反転**させることを規定している。
- 従って、Blender/UnrealのTwoSidedSign補正をそのままGLBへベイクしてもThree.jsの描画と一致するとは限らない。Three.jsで実際にFrontSide/DoubleSideを比較し、必要なら専用の葉マテリアルで制御。最初からゲームの共通GLTFLoaderを破壊しない。
- 立体感と裏面の自然光を一致させるため、「法線の投影」と「葉の透過光（transmission / back-light color）」を分離する。

### 3. 「裏側を表と同じ明るさにする」が自然なゴールではない
- [NVIDIA GPU Gems 3, SpeedTree chapter 4.4](https://developer.nvidia.com/gpugems/gpugems3/part-i-geometry/chapter-4-next-generation-speedtree-rendering): 葉の逆光は鏡面反射より透過光が支配的。逆光側に暖色味をわずかに加え、裏面のspecularを抑える。遠景ではspecularのちらつきを防ぐため粗いV型の法線情報と低周波反射を使う。
- これは任天堂のBotW実装の説明ではなく、公開された別エンジン技術の**応用候補**。
- コタマへの試験値案: 葉群の表側は深緑～中緑の滑らかなグラデーション、光源を背にする葉のみ+5～12%程度の暖色成分と弱い透過感を付与。数値は未検証の初期候補であり確定値ではない。

### 4. 「先に葉群の体積を作ってから葉を載せる」
- [80 Level: Meadows Creating Stylized Nature in UE4](https://80.lv/articles/meadows-creating-stylized-nature-in-ue4/) の作者による制作手順: 主枝の上に粗い球状樹冠の造形を置き、その形の表面へ葉カードを散布し、球体の法線を葉へ転写。シェーダで裏面の法線反転も調整。
- 現行のコタマは1万枚級の個葉を持つため、葉群を後からまとめる方式で粒状感が残っている。まず既存V25の採用済み外周を形の制約として固定し、その内部を3～8の大小に分けた形状制御の「葉の塊」を作る。
- 無秩序なランダム散布より枝・小枝への接続、葉群の体積、空隙の疎密を優先。目標数の「3～8」はモデリング試験用の提案値でありBotW内部データではない。

### 5. AOの実体と輸出形式
- PolycountのAOはコメント投稿者Mark Dygertの**頂点カラーAOベイク**の提案。作者の中心から暗くする簡易方法は別。
- Blender glTF exporterは通常のNode出力に専用のAOソケットを直結するだけでは正規のocclusionTextureにならない場合がある。公式のglTF Material Output/Occlusion構成、またはベースカラー乗算/頂点カラーによる焼き込みを比較する。
- Cの試験はCOLOR_0属性を持つことまでは確認済みだが、Three.jsでのそのままの色調・AO分離までは未検証。AOの「描画上の効果」と「正しい書き出し」を別検査する。
- [Blender glTF exporter docs](https://docs.blender.org/manual/en/5.0/addons/import_export/scene_gltf2.html)、[glTF Blender IO official exporter docs](https://github.com/KhronosGroup/glTF-Blender-IO/blob/main/docs/blender_docs/scene_gltf2.rst)。

## 次の実装試験順（美術品質優先）
1. 同一V27の葉140枚から混合率25/45/65%の3方向＋接写をレンダリング（実際のA/B/C比較から一部最良値を選ぶ）。
2. 選定値の固定後、裏面について「未調整」「法線補正」「薄い暖色透過光」を分離検証。Three.js実画面を含める。
3. AOを0 / 弱 / 中で比べる。3項目を一度に変更しない。
4. 枝に接続した葉群と樹冠内側のまとまりにこの法線技術を適用。**V25の広がりは維持**。
5. ゲーム表示QA・本人の美術承認まで未採用。モデルを軽量化するのは承認後。

## 既存成果との整合性
- 共有済み [A/B/C試験と失敗要因](F6_FOLIAGE_NORMALS_POLYCOUNT_TEST_20261119.md) へ追記。プログラム／ゲーム本体は研究PRとは別で扱う。
- 技術の出典、ライセンス確認、検証ログ、原本と正式モデルの区別を保持。任天堂の未公開樹木のシェーダー内部構造について断定しない。
