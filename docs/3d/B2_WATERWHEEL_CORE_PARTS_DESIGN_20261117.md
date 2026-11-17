# 第2層・凍結水車：既存形状の継承と独立パーツ造形計画

更新: 2026-11-17 / 状態: 設計・未着手の新モデル / NOT_APPROVED

## 既存状況の調査
- 現在の`development`には`field/assets/b2-frozen-waterwheel-scene.js`、`tools/b2-waterwheel-render/export.mjs`、`.github/workflows/b2-frozen-waterwheel-render.yml`が存在する。旧版ブランチ`feature/b2-waterwheel-geometry-pass2-20261112`〜`feature/b2-waterwheel-topology-pass8-20261112`は`development`よりbehindで、旧修正の一部が既に統合されている。
- 水車全景は車輪半径2.55、14本のスポーク、木製軸・羽板、凍結部、岩・遺構・水路を1つのシーンで定義した既存モデル。最初の本体を作り直して消すのではなく、**本体と接続する独立追加ジオメトリ**を設計する。
- `feature/gpt-b2-waterwheel-render-recovery-20261116`は旧レンダラーの復旧に関する未マージの作業分岐。これに上書きしない。
- Claude現在の第2層v4担当設計 `docs/3d/B2_V4_FEEDBACK_DESIGN.md`（`feature/ai-claude-b2-v4-w-20261117`）では、**見せ場班Sが水車中庭・背景モニュメントの位置・向き・表示を担当**。GPTは`field/b2-setpieces.js`、`field/field-3d-b2-water.js`、配置・地形のゲームランタイムを変更しない。

## 対象の分割
1. **車輪だけの本体**（最優先）：厚みのある2重木製輪縁、加工された継ぎ目、各木材の繊維方向、局所的な割れ。現行輪郭と直径を維持。
2. **羽根・受水槽**：単純な長方形の板ではなく、湾曲した斜めの受水面と左右の側板。羽根の一部は摩耗・破断し、欠け位置は不均一。現行14スポーク構成に合わせて独立生成。
3. **中心軸・接合金具**：木製角軸の加工痕、鍛鉄のバンド・ボルト、軸受け周辺の錆。現行軸の位置を変えずディテール追加。
4. **凍結の層**：上面の積雪、不規則な氷晶、落水側の長短混在する氷柱、縁に付着した透明感のある氷。全面の同じ形の塊を避け、濡れた木肌との対比をつくる。
5. **水路と支持台との接続**はClaude側で背景配置が確定した後に別モデルとして設計。Claudeの配置ロジックを触らない。

## 実物参考
- Pinterest検索候補（高解像度拡大画像を直接確認できたとは主張しない）：
  - https://www.pinterest.com/pin/420312577694339168/ 氷結した水車、氷柱と木材の取り合いの候補
  - https://www.pinterest.com/pin/510595676475160748/ Frozen water wheel
  - https://www.pinterest.com/pin/998814023643733554/ 積雪した木造水車と水路
- 学術・現物資料候補：米国公園局 Historic Waterwheel資料、現物の受水羽根・スポーク・接合部分の分解構造。現物写真の無断テクスチャ転用はしない。
- 木目と氷のPBRはCC0/商用可の出典・マップ組み合わせを個別検証する。現時点で実ファイル取得・適用を実証していない。

## 作業の必須順序
A. 既存水車`development`のGLB（現行`export.mjs`から）と3方向PNGを正しく生成し、外観・寸法・メッシュ数の基準を取る。既存レンダラーはBlender import時の軸変換とカメラ向きを確認し、旧修復版を参考にする。
B. まず**羽根1枚だけ**を独立GLBで制作。正面・側面・斜め・裏をレンダリング。木板厚・凹面・木目・縁の摩耗・ボルトと氷の接触を見直す。
C. 合格した羽根の形状差を14周位置へ広げるが、既存ジオメトリは削除・上書きせず、追加装飾と対比を行う。重複面とZ-fightingに注意。
D. 車輪の輪縁・金具・雪の別パーツへ。GLB・Blend・PNG・manifest・SHA256を生成し、モデルの形状を4方向から確認。
E. 完成承認後にのみ`assets/models/floor2/`へ正式保存候補PR。CLAUDEはGLB/PNG/manifestを読み込んでゲーム側接続を検証。原則`development`向け独立PR、`main`変更なし。

## 完成の基準
- 既存水車が大きく見えるシルエットを維持。遠景で輪が読め、近景で木組み・木目・腐食・氷の付き方がわかる。
- 水車羽根に実用的な厚みと受水形状があり、同一の機械的な連続に見えない。
- 透明氷・雪・金具に法線/粗さの差があり、上下逆転や板の浮きがない。テクスチャ権利・元データの検証も必須。
- 既存のゲーム・他の第2層素材と衝突しない。見た目承認と実機統合承認を区別する。

**この文書は開始時の仕様・対象分離を記録したもの。新しい羽根GLBやBlenderレンダー、完成承認を意味しない。**

## 2026-11-17: Blenderネイティブ制作導線の実装
- ユーザー指定: 「ブレンダーでやってね、画像はいらないよ」。以後**画像生成ツールの概念画像を実GLB/Blenderレンダーと混同しない**。ユーザーに画像を示さず実ファイルを優先。
- `tools/b2-waterwheel-paddle/build_paddle.py` を新規追加。**羽根板1枚のみ**をBlenderのネイティブメッシュ、木材の実厚/反り/欠け、木材PBRノード、局所裂け目、鍛鉄の固定帯・鋲、雪と氷の別メッシュで制作。V1と破損を強めたV2を各別`.blend`/`.glb`に出力し、内部QA用4方向PNG・manifest SHA256を出すコード。既存水車ゲームコードは変更なし。
- `.github/workflows/b2-waterwheel-single-paddle-blender.yml` を追加。対象作業ブランチへのpushでBlender入りDockerを起動し、2BLEND/2GLB/8PNG/2manifestを校正してArtifactを出す設計。Artifactsは一時保存であり正式素材には該当しない。
- このチャットのローカル環境にBlender executable/bpyが存在しない。ローカルPython構文検査は済ませたが、**実Blender実行/GLB・Blendの成果物/Actions run IDはまだ確認できていない**。Actionsのcommit紐づけ検索ではランは取得できず、これを失敗・成功の断定に使わない。
- 造形は未承認。新しい羽根の実ファイルが出力された後、正面/側面/斜め/裏を内部確認して追加修正する。ユーザーにレビュー画像を表示する必要はない。

## 2026-11-18 — Blender実行、実レンダリング、段階的修正の検証

- ユーザー要求: `development`の `AGENTS.md` と `BLENDER_SHARED_EXECUTION_ENTRYPOINT.md` を参照、Blender Actions/内部画像QA/途中保存を使用し、既存モデルを保持して承認前は正式保存しない。
- **実行環境**: GitHub Actions / Docker `lscr.io/linuxserver/blender:latest` / **Blender 5.3.0**。チャット内ローカルにはbpy/Blenderなし。Blender MCPの自動接続・VLM審美評価の実通信は未実証。
- 初回run [#44126767260](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44126767260): V1/V2の各 `.blend`、`.glb`、正面/側面/斜め/裏の計8PNG生成成功。しかしCIの `.blend` 固定ヘッダー検査が失敗。Blender 5.3の保存ファイル先頭はZstd `28 b5 2f fd`。失敗時もArtifact **#14348610987** とV1/V2の段階manifest/チェックポイントを保持。レビューZIPをダウンロードしSHA256全件一致を確認。
- 修正run [#44127236886](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44127236886): ZIP/GLB/PNG/Blend SHA256・PNG/GLB形式・サイズ検証が**success**、run-IDおよびチェックポイント状態を作業ブランチの `docs/3d/b2-waterwheel-paddle-run/latest.json` に記録。画像の美術承認とは別。
- 改良run [#44127972415](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44127972415): V1/V2保全＋V3（UV画像木目PBRと曲面に沿う鋼帯・裏面・氷柱）を実Blender生成、3GLB/3Blend/12PNGと各manifest、全てSHA256成功、Artifact **#14347913398**。実画像でV3木面がほぼ黒になる重大材質問題を発見。GLB内埋込NormalテクスチャのRGBが全0、Roughnessがマゼンタに異常出力。V3は採用不可、原本として保持。
- 修正版run [#44128907333](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44128907333): V4で異常Normal/Roughness接続を無効化し、GLB内に正常な木目color画像を埋込。V1〜V4の4GLB/4Blend/16PNGが生成され、全ファイルのSHA256一致・Actions**success**、Artifact **#14348857576**。Blender画像を目視して明度・輪郭復元を確認。ただし木目が等間隔の波状で不自然、金具や氷柱が簡素。V4は未承認の試作。
- GLBのローカル構造監査: V1=62 meshes / 11844 tris、V2=88 / 13212、V3=31 / 14822、V4=31 / 14822。バッチ化でメッシュ削減方向だが、ゲーム内GPU draw callsとFPSは未測定、共有GLB Performance Audit Actionsもこの水車版では未実行。各GLB約0.4〜0.7 MB。
- V5は `tools/b2-waterwheel-paddle/build_paddle_v05.py` に木目歪みの抑制・含水色差を独立実装し、`b2-waterwheel-single-paddle-blender.yml`に追加。**この設計書更新時点ではV5実レンダー結果を未確認**。先行V1〜V4を削除せず、再実行で5段階のモデルを独立したArtifactに保存する。
- workflowは各バージョン終了直後 `.blend/.glb/4PNGs/manifest`および`progress.json`の独立チェックポイントを作る。途中失敗しても `if: always()`で存在する成果物をArtifactへ一時保存する設計。**ジョブ間でArtifactから自動的に復元して続きの段階を実施する機能は当水車ワークフローでは未実証**（共有Blender入口での他素材の復元検証例とは区別）。
- **すべてNOT_APPROVED**。既存 `field/assets/b2-frozen-waterwheel-scene.js` は未変更、Claudeの見せ場配置を触っていない。承認前のGLB/PNGを正式素材フォルダへ昇格・`development`にマージしていない。V5の美術確認、glTFValidator、Three.js実機、LOD/負荷計測、木目PBRの外部写真素材適用は未完了。

## 2026-11-18 — V05/V06 結果の実証とV07の独立再開試験

- **V05** run [#44129933072](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44129933072): Blender V1〜V5造形・4方向×5枚組・manifest SHA256は全件成功。メタデータをbranchへpushする最終段階のみ、同時進行の文書コミットによるnon-fast-forwardで失敗。Artifact **#14348144378**は保存され、ダウンロードし全ハッシュ一致を確認。見た目は均一な木目の波模様が残るため未承認。
- **V06** run [#44131102651](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44131102651): **Actions全工程success**。Poly Havenの商用・改変利用可能なCC0 `wood_planks`（https://polyhaven.com/a/wood_planks）の**1K写真Diffuse画像を取得・実Blenderシェーダーへ適用しGLBへ埋込**。写真SHA256 `3b0669f683e4bf10f5a55a381cfa9669a7b8dfd921901829daa3b35acc2bbdec`。受水板形状と独立の金具/氷を保持。
- Artifact **#14349903645**（run 44131102651）を実ダウンロード、6個のGLB、6個のBlend、24枚の4方向PNG、それぞれのmanifestを展開、**全ファイルの実SHA256一致**をローカル確認。V06モデル: 31 mesh程度、約1,032,412バイトGLB、約1,169,825バイトBlend（各manifest参照）。写真を使った木材の模様はV05より自然になったが、明るい茶色が第2層の冷たい遺構環境とまだ合わず、金具・雪・小さな割れはさらなる造形が必要。
- V06原本の編集用Blend SHA256 `632fcb47afdf5fecb6f44f88e61a24911bc845d8b0a329c042375c95d548b199`、GLB SHA256 `044f03e6621e86addbb03adabf06ea9b57c1a34d82742142d37433621d7d4585`。**次のジョブ間再開はこのハッシュ以外の原本を拒否する**。
- **V07独立続編PR [#498](https://github.com/koda24-cell/kotama-no-bouken/pull/498)**：`development`から独立ブランチを作成し、成功runのArtifactをGH Actionsでrestore→ハッシュ検証→Blenderで`.blend`再読込→写真マテリアルの寒色化とCC0 Normal/Roughness追加→新GLB/Blend/4方向PNG出力を試行。V06の形状は変更しない。**実際のジョブ間restoreが成功したと断定するのはrun #44132575418の結果確認後のみ**。現段階はダウンロードステップ待ち。
- すべて`NOT_APPROVED`、ゲーム未統合。Artifacts一時保管、正式素材への保存・development/mainマージなし。Claude向け恒久データの正式保存は承認後。
