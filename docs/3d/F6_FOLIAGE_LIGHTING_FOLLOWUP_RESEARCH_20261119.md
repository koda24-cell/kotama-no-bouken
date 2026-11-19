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


## 2026-11-19 法線混合率 25/45/65 実Blender試験 — 成功
- GitHub Actions: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44455505332
- 一時成果物: 14497846421 `f6-foliage-strength-25-45-65-NOT-APPROVED`（6 PNG、GLB、Blend、manifest、ClamAV検査）。
- V27実GLBの葉140枚を同じメッシュ/配置/緑材質/照明で3組に配置し、半球法線との混合率だけを変えた（A:0.25、B:0.45、C:0.65）。AOは**無効**、頂点カラー影響も除外。
- カスタム法線変更 **10,080ループ**、Blender4.0.2、3つの中心はx方向各2.45m離れていることを検証。3方向＋接写3枚＝計6 PNG、GLB/Blend/SHA検証、取得前後のClamAV実スキャン成功、ジョブの結論success。
- 接写から明瞭な緑画素のみを抜き出したおおまかな**画像輝度（0〜1）**：0.25 → 平均0.782、0.45 → 平均0.650、0.65 → 平均0.374。単なるJPEG/PNG画像解析上の明度でありPBR物理量ではない。前景の緑色閾値に依存するため、目視と併用。
- **目視**: 25%は白く明るい個葉が散り、45%は明暗がある程度まとまり、65%は暗く平板。下面は65%でも反対側が不均一に明るくなる。45%を**次の試験中心候補**とし、**美術的にはまだ未合格**。
- 裏面問題の改善には、glTF規定のdoubleSided背面法線反転とシェーダ側の薄い透過光の制御を分けて試す必要あり。通常の法線投影のみでは解決しない。
- V25の採用済み樹冠の広がりは変更していない。独立モデル用の候補であり本番GLB・ゲームへ未統合。


## 2026-11-19：裏面ライティングA/B/C試験を開始

- **ユーザー方針:** 調査/試行を継続し、毎回具体的な技術メモ・比較結果・失敗をGitHubに残す。完成と言えるまで正式素材として保存しない。
- **確定保持:** V25で承認された樹冠の横方向の広がり。幹・葉の見た目は引き続き未承認。
- **前回の実証:** run [44455505332](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44455505332)、葉140枚の法線25/45/65%比較。45%が最良の次回候補だが、裏面で不自然な光が残るため未合格。
- **新規試験:** [Draft PR #571](https://github.com/koda24-cell/kotama-no-bouken/pull/571)、GitHub Actions [run #44456579971](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44456579971)。V27 GLBの同じ葉140枚、**法線混合率45%固定**で A: Blender標準の両面材質、B: Geometry Backfacingで裏面のみ控えめなDiffuseに置換、C: Bに非常に弱い暖緑のEmissionを追加。正面・斜め・下側と各候補接写の計6PNG、GLB、Blend、manifestを予定。
- **設計上の区別:** Cは *見た目のための近似的な逆光表現* であり、物理的な葉のSSSや透過光を証明するものではない。Blender Geometry Backfacingのマテリアルノード構成がGLB/Three.jsへそのまま輸出可能と仮定しない。GLB出力と実機表示は別の合格条件にする。
- **検査:** 元V27のSHA256照合、既存Blender+ClamAVの固定digestを使用し、スクリプト/元GLB/出力の実ウイルス検査、3案の中心座標とファイルハッシュを検証。素材が取得できない/ジョブ失敗時は成功と報告しない。
- **未完了:** このメモを書いた時点で新規runは未完了。実行後、**ジョブ結論・画像の目視・裏面明度差・失敗点**を追記すること。


## 2026-11-19 45%法線固定・葉裏面A/B/C 実Blender検証結果

- **成功run**: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44456579971
- **Artifact ID**: 14497969054、名前 f6-foliage-backface-abc-NOT-APPROVED。GLB / Blend / PNG×6 / manifest / qa/security/。
- V27の元GLBのSHA256を照合し、葉140枚を同じ形・位置・照明で3案に複製。半球法線45%で固定し、カスタム法線10,080コーナーを出力。BLENDER 4.0.2。各案のセンター間隔2.45mを自動検証。
- A: 標準Principled BSDFの表裏。B: Geometry Backfacingにより裏側を暗めのDiffuseへ分岐しSpecularを抑制。C: Bへ緑暖色の非常に弱いEmission(強度0.035)を加えた非物理的逆光近似。
- **実画像目視:** 正面/接写でAは葉が非常に明るく散在、BとCは緑が落ち着き葉群の明暗がまとまる。Bの抑制が最も直接的に改善。CはBとの違いが僅か。裏面ではBとCの明るさは低下するが、まだ形状・重なりの粒状感があり、正式採用できない。
- **重要な実装制限:** Blenderの Backfacing→MixShader/Emission はglTF標準PBRへ同じノード構造で書き出せるとは限らない。GLB形式の出力成功はThree.jsでの同等表現を証明しない。実際にゲームのGLTFLoader/Three.jsで表示するまでは互換性未確認とする。
- **安全:** GHCR固定Blender+ClamAV、ソースGLB SHA照合・ClamAV 1 source GLB / 1 python script / output各ファイルのスキャン成功、感染検出0（ログはartifact）。
- **結論:** 45%の法線転写と裏面の過剰な光を抑える方向は有望。ただし現在の形状・Blenderの材質は**NOT_APPROVED**。V25で採用済みの樹冠の広がりと元の樹木は無変更。
- **次:** まずBlenderからGLBへ輸出した葉のDoubleSide/背面の見た目をThree.jsに読み込んで比較（標準/カスタム）し、B相当の暗さを実ゲームでも得られるか検証。並行して葉束そのもののシルエット/枝接続を改善する別モデル実験。


## 2026-11-19 重要: Blenderの裏面分岐がGLBで消失（実ファイル検証）

- 検証元: [Blender実レンダリングrun #44456579971](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44456579971)、artifact 14497969054 内の `foliage_normal_test_NOT_APPROVED.glb`。ZIP内のGLB JSON chunkをバイナリ解析。
- glTFの材質3件（A:45%標準、B:45%裏面Diffuse、C:B+逆光）を実際に読んだ結果、**AとBのglTF `pbrMetallicRoughness` が完全一致**。双方とも `baseColorFactor=[0.21,0.39,0.20,1]` / `roughnessFactor=0.92` / `doubleSided=true` / `KHR_materials_specular.specularFactor≈0.26`。Blenderの`Geometry.Backfacing -> MixShader` 分岐はglTF標準材質に保存されていない。
- Cでは `emissiveFactor≈[0.00455,0.0084,0.0028]` を確認。ただし**背面限定ではなく材質全体に適用**される。そのためBlenderのB/C画像をそのままThree.jsの互換性根拠にしてはいけない。
- Khronos glTF材質仕様では `doubleSided=true` の背面は光計算前に法線が反転する。通常のglTF材質では独自の`gl_FrontFacing`を使った裏面分岐を表せないので、Three.js側の`onBeforeCompile`等で実装した候補を**独立のブラウザ描画**で比較する。
- 試験Draft PR: https://github.com/koda24-cell/kotama-no-bouken/pull/585 、HTML/JSは独立 `tools/floor6/threejs-backface-review/` に隔離。Three.js v0.181.2 + Playwright Chrome。ゲーム本体のローダーは変更しない。
- 本項は**GLBフォーマットの実物検証**であり、ブラウザの成功や美術品質を意味しない。検証ジョブと3方向のスクリーンショットは成功確認後に追記する。


## 2026-11-19 Chrome Three.js実レンダリングと裏面診断（追加）

- 最終診断: [GitHub Actions #44461527435](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44461527435) **success**。Chrome + Three.js r181 + Playwright; artifact 14499569196; 独立試作 Draft PR #585。
- GLB由来の葉メッシュ420個、マテリアルA/B/C、WebGLドローコール420を読み込み検証。3方向全体＋6枚の葉接写、追加で赤／青の可視面診断2枚の合計11 PNG。PNGハッシュ・画像サイズはワークフローで検証。
- **GLB材質の書き出し欠落**: Blender BのGeometry Backfacing→MixShader裏面分岐はglTFの標準PBRマテリアルに存在しない。AとBのPBR値は完全一致。CのわずかなEmissiveは裏面限定でなく素材全体に付与。
- Three.jsでonBeforeCompileを使いBの裏面Albedoを0.58倍、Cを0.56倍＋淡い暖色にする試験を実施。シェーダー2件のコンパイル成功。ただし実画像A/B/Cの葉群は**ほぼ同一**。グリーン前景に限定したA/BのRGB平均差はfront約0.00035/255、underside約0.00016/255。
- **切り分け診断**: Bの色を裏面条件なしで強制赤色にすると前景約60,769pxが赤になりGLSLの書き換えは実際に効いている。一方Cを裏面だけ青くする診断はundersideカメラでも青色0px。可視面は実際の描画上ほぼすべてgl_FrontFacing=trueであり、裏面条件付きシェーダーだけでは画質改善ができないと判断。
- 失敗→修正ログ: 初回workflowのstep名にあるコロンを引用せずYAML不正、次にGLSL改行の二重エスケープでcompile失敗、次にfaviconの404を異常扱いしてジョブ失敗。すべて修正後にWebGL実描画成功。
- **次の技術選択**: 裏面の色だけを操作するのではなく、採用済みのV25樹冠幅を固定して枝につながる立体的な葉束と葉群体積を再設計し、約45%の半球法線+柔らかい内側AO/頂点カラーを独立実証。葉と幹の形も並行して調整。真正のThree.js画像が変わることを確認できるまではモデルを正式承認しない。
- これはゲームローダーへ未統合の独立ブラウザ検証。任天堂の内部実装と混同しない。
