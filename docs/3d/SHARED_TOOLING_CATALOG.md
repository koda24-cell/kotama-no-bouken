# 共有ツール・技術・アドオン台帳

本台帳は発見時点で登録し、検証後に同じ項目を更新する。運用: [TOOLING_AUTO_SHARE_POLICY.md](TOOLING_AUTO_SHARE_POLICY.md)。元の広域研究: [STYLIZED_GAME_TECH_LIBRARY.md](STYLIZED_GAME_TECH_LIBRARY.md)。

| 名称・技術 | 用途 | 情報/導入/検証状態 | 出典・実装・証拠 |
| --- | --- | --- | --- |
| Blender標準 Bevel / Weighted Normal | 建築・鉄骨エッジ | 実装済み・Actions描画検証済み（高架V1） | PR #353 / run 43601312291 |
| Blender標準 Noise / Bump / 画像マテリアル | コンクリート・錆・表面凹凸 | V2実装済み・結果要確認 | PR #353 / `tools/floor3/elevated_bridge/build_v2.py` |
| Poly Haven CC0 texture API | concrete/rust 画像取得 | 自動取得コード実装済み・実取得成否要確認 | https://polyhaven.com/ / PR #353 / `fetch_textures.py` |
| Blender標準 Icosphere/Boolean/Geometry Nodes | 破損・瓦礫・侵食の自動造形 | Icosphere/付加メッシュは実装済み。Boolean/Geometry Nodesは候補 | PR #344, #353 / Blender公式ドキュメント |
| Blender標準 Python錆・摩耗・欠け追加 | 工業素材の表面劣化 | V3実装済み・Actions成功。品質は別途評価 | PR #344 / run 43487499572 |
| Blender Docker on GitHub Actions | GLB/3方向PNG出力 | 高架V1成功。環境依存に注意 | run 43601312291 / `floor3-elevated-bridge-render.yml` |
| MaterialCreator | ノード型PBR作成 | 情報のみ・導入未確認・ライセンス要確認 | https://github.com/Calla-Ji/materialcreator |
| BlendAtlas damage nodes | 破損ノード素材 | 情報のみ・未導入・ライセンス要確認 | https://blendatlas.com/products/damage |
| Procedural Damage & Wear | 破損/摩耗自動化 | 商用アドオンの情報のみ・未購入 | https://www.strayspark.studio/docs/procedural-damage |
| Awesome 3D Blender Addons | アドオン探索索引 | 情報のみ・個別審査必須 | https://github.com/naranyala/awesome-3d-blender-addons |
| Stylized game rendering references | PBR+NPR/ライティング/面処理 | 参考資料整理済み・個別実装未検証 | STYLIZED_GAME_TECH_LIBRARY.md / 元PR #343 |
| Quaternius animations / Rokoko / Mixamo / DeepMotion | 歩行・戦闘アニメ/リターゲット | 別作業の調査・保存が進行中。原本Git保存は要再確認 | 関連アニメーションPR #328。素材の再配布条件を確認 |
| Pinterest/Tailwind | 画像リファレンス・GPT/Claude共有 | 共有ルール確認済み。今回の画像取得は未実施 | https://github.com/koda24-cell/pinterest-reference-library |

## 最新の検証待ち
- 高架V2: Actions run 43603580270 等の最新結果を確認し、**Poly Havenの実取得成否とGLB 8点/PNG 24枚の検証、実画像の目視評価**を記録する。
- 破損・摩耗 V3: 画像品質と物理的な欠け（Boolean等）を区別。表面付加パーツだけを本当の欠損と記述しない。
- 未検証アドオンはインストール・安全性・互換性・ライセンスが確認されるまで「使用可能」と断定しない。

## 新規登録テンプレート
```md
### [名称]
- 公式URL:
- 対象分野/目的:
- ライセンス/商用・再配布条件:
- 登録日時・担当:
- 情報状態: 調査中 / 確認済み
- 導入状態: 未導入 / コード追加 / 導入済み
- 検証状態: 未検証 / 失敗 / 成功
- 導入手順・バージョン:
- 検証日時・環境・コマンド:
- 実行ログ・PR・Actions・レンダリング:
- 既知問題/次の作業:
```

## 音楽参考解析（2026-11-15）
- 担当: GPT。ユーザー提供録画をFFmpegで全デコードし、librosaでonset/beat/chroma解析を実行済み。主観的聴取・厳密採譜・楽器同定は未検証。
- FFmpeg https://ffmpeg.org/ : 導入済み。198秒/48kHz stereo AACのデコード成功。ビルドの個別ライセンス構成は未確認。
- librosa https://librosa.org/ : 1.0.1 / ISC、ローカル隔離先へ導入。テンポ候補95.7/143.6 BPM、G minor仮説を区間別にクロスチェック。相関は確率ではない。SoundFile 0.14.0 / BSD-3-Clause、NumPy 2.5.4併用。パッケージメタデータで確認。
- yt-dlp https://github.com/yt-dlp/yt-dlp : メタデータ取得は成功したが、YouTube音声は無効195byte応答で失敗。取得成功と記録しない。ライセンス個別確認未了、コードの再配布なし。
- ACE-Step 1.5: 既存CPU BF16成功経路を再利用し、新しい寂しさのある探索BGMを別branchで生成。今回の生成成否はActionsで別途確認。参考曲そのものをモデルへ送信せず、Gitにも収録しない。
- 詳細/実行スクリプト/数値: https://github.com/koda24-cell/music-ai-studio/pull/4 、docs/F1_REFERENCE_ANALYSIS_20261115.md と docs/F1_REFERENCE_MEASUREMENTS_20261115.json。
- Actions: https://github.com/koda24-cell/music-ai-studio/actions/runs/43726183372 （開始確認済み、完成は未確認）。

### 音楽CPU生成の実動作追記（2026-11-16 JST）
- ACE-Step CPU BF16 60秒新版を実生成: https://github.com/koda24-cell/music-ai-studio/actions/runs/43728689924 。Artifact 14167877749のZIP hash/CRC、WAV hash・60秒/48kHz stereo PCM16・finite/非無音をローカルで確認。再解析95.7 BPM / G minor候補。聴感・楽器・歌声・音楽的ループは未確認。
- runnerで実際のディスク不足を確認し、使い捨て環境の未使用SDK削除＋uv cache整理で対処。swap追加。公式コードの ACESTEP_GENERATION_TIMEOUT=1800 をCPU用に指定。関連失敗runと修正根拠は music-ai-studio PR #4 の最新版状態記録へ保存。
- ループ端は5ms raised-cosineのデクリック。速度・音程の変更なし。元の65秒生成/5秒重ね合わせ案は採用せず、既存成功と同じ60秒負荷を採用。波形連続性は音楽的品質の承認と別。

## 追加候補: 一層後半の自然神域・PBR素材の公式調査 (2026-11-16 JST)

- 担当: GPT / environment_art_plan。
- 新規外部アドオンの導入なし。下記はライセンス/メタデータを確認したテクスチャ候補情報であり、取得/Blender描画/GLB実装は未実施。
- 既存Poly Haven台帳エントリへの追記対象。新しくAPI実行を検証したとは記載しない。

### Poly Haven Mossy Rock / Forest Leaves 02
- 公式URL: https://polyhaven.com/a/mossy_rock / https://polyhaven.com/a/forest_leaves_02
- 目的: 一層後半の岩/湿潤な林床の素材候補。既存stage3遺跡都市やstage5深淵城との美術的な区別を維持。
- ライセンス: 公式 https://polyhaven.com/license を2026-11-16 JSTに確認。配布アセットはCC0、商用/改変/再配布可。サイト一般コンテンツ・例示レンダーを同じ許諾と扱わない。
- 確認状態: Mossy Rock公式本文で3m幅、Diffuse/Normal GL・DX/Rough/AO/Height/ARMの一覧を確認。Forest Leaves 02は公式検索情報の候補発見まで。
- 導入状態: 未導入。実ファイル/画像目視/レンダリング未検証。
- 次の作業: 正規配布ファイルを個別取得、作者/日付/ファイルhashを記録、中立光とThree.js ACES露出1.3で比較。苔入り画像は方向が固定されるので別苔マスクと使い分ける。
- 証拠/関連資料: `docs/3d/` に採用される設計書/本タスク共有PRを追記する。Actionsなし。

### ambientCG PBR textures (Bark014 / Rock059 / Ground024)
- 公式URL: https://ambientcg.com/view?id=Bark014 / https://ambientcg.com/view?id=Rock059 / https://ambientcg.com/view?id=Ground024
- 対象: 樹皮/崖岩/林床。マテリアルの粒度と実寸比較の候補。
- ライセンス: 公式 https://docs.ambientcg.com/license/ を2026-11-16 JSTに確認。CC0 1.0、商用・改変・再配布・ゲームへの元ファイル同梱を許可。
- 情報状態: Bark014の公式本文から約1.2m四方、フォトグラメトリ、Firタグを確認。Rock059/Ground024は公式検索メタデータによる候補発見まで。
- 導入状態: 未導入。画像目視/ダウンロード/Blender/GLB動作は未検証。
- 導入手順: 採用時のみ公式個別ページから必要解像度を取得。元ファイルと採用マップを台帳登録。全アセット8K化はしない。
- 注意: 樹種の形状資料と樹皮テクスチャの素材候補を区別。Blender proceduralノードのままGLBに渡ると仮定せず、必要マップへベイクする。
- PR/Actions/実行ログ: 本タスク情報共有PRに紐付け予定。Actions未実施。

### 実取得の検証追記 (2026-11-16 JST)
- Poly Haven API `https://api.polyhaven.com/files/mossy_rock` / forest_leaves_02 はHTTP403で失敗。API利用成功とは記載しない。
- Mossy Rock 4K PNGのdiff/nor_gl/roughは公式直配布URLから取得成功。Pillow13.0.0で4096x4096を全デコード、512/1024 JPEGへLanczos縮小し、全派生画像を再オープン/verify成功。URL/hash/変換条件は正式素材フォルダ `assets/3d/dungeons/b1_sacred_forest_candidates/textures/texture-sources.json` を参照。
- ambientCG Bark014 / Ground024のgetリンクおよびBark014公式CDNリンクはHTTP403。導入失敗として保持。代わりにPoly Haven Bark Brown01 / Forest Ground01を候補登録して実取得を試行中。
- 代替候補公式URL: https://polyhaven.com/a/bark_brown_01 / https://polyhaven.com/a/forrest_ground_01 。CC0確認。前者は深い縦溝樹皮、後者は落葉/小枝を含む林床。導入完了はまだこの段階では未確認。
- 取得スクリプトはscratch側 `/workspace/work/research/fetch-textures.py` と `fetch-texture-fallbacks.py` 。ゲーム実装や実レンダリングはまだ検証していない。

### Blender Lab official MCP / Blender 5.3 cloud workspace
- 公式: https://www.blender.org/lab/mcp-server/ / https://projects.blender.org/lab/blender_mcp
- 用途: 一層後半候補を一素材ずつ制作・検査。既存b1原本を変更しない。
- ライセンス: Blender GPL、official add-on GPL-3.0-or-later(source SPDX確認)。MCP repo取得済み。第三者サイトの絵はテクスチャへ転用しない。
- 状態: cloud環境更新で前セッションの設置が消失。5.3.0公式tarのSHA256照合後再展開済み、server1.0.2を専用venvへ再インストール成功。今回の接続/レンダ検証は未実施。
- 設置: /workspace/tools。プロセス/ローカルファイルの永続性は環境寿命に依存。完了候補はGitブランチ保存予定。
- 制作方式: geometry実欠損＋埋込画像MR/normal、GLB再読込レンダ、メートル/4mセル/目高1.6m。common.pyは実装中で未検証。
- 実取得: Poly Haven mossy_rockのcolor/normal/roughness画像を取得して512/1024JPEG化、Pillowデコード成功。Blender画質は未検証。ambientCG Bark014/Ground024は403失敗、使用済みと扱わない。
- 調査: Tailwind接続確認、公開Pinterest候補20件、10画像目視。保存/投稿なし。画像再配布許諾未確認のため参照URL/観察文のみ共有。
- 担当/日付: GPT team / 2026-11-16 JST。関連実装は別candidate PRで検証後追記。

### 一層神域: 実取得・接続・PBR葉脈の検証追記 (2026-11-16 JST)
- Poly Haven Mossy Rock / Bark Brown 01 / Forrest Ground 01: 写真color/OpenGLnormal/roughnessを取得し、全画像をPillowデコード/目視確認、512/1024JPEGとhash/原URL/CC0記録を作成。ambientCG403失敗は残し、利用していない。
- 16bit roughnessを8bitへ変換する際の飽和を検出しdivide257で正規化。normal/roughnessはNon-Color、元losslessは作業領域に保持。派生だけをゲーム候補へ同梱予定。
- 色調派生: 原写真保持、sRGB→linear→Rec709彩度/湿り露出factor→sRGBの再現可能な派生画像。stone .80/.72、bark .70/.72、soil .65/.73 (exposure/saturation)。metadataにhashと変換を記録。モデル承認とは別。
- 独自葉脈画像: UV中央主脈/斜行二次脈/弱い黄化/微細斑点のオリジナル256px PBR。3色+共有normal/ORMの5JPEG。数値finite/normal正規化とsyntax確認済み、Blenderでの実生成はまだ。外部参照写真を転用しない。
- Blender Lab official MCP1.0.2→localhost:9876→Blender5.3.0再接続成功、execute_blender_codeからversion/objects取得。今回クラウド環境での事実でありチャットのツールパレットへ自動登録したとの意味ではない。
- 実GLB再import＋4方向Cycles画像: 敷石/林床で試験成功。白化を検出しstudio照明とThree中立光を調整。古い照明での試験画像は最終証拠にしない。全16素材は未完了。
- Three r180/Chromium SwiftShader: 暫定2素材の実読込/UV/normal/embedded texture/tri/bytes/bbox/床4辺height0と2×2接続成功、console errors0。実GPUや携帯FPSの保証ではない。
- 追跡先: feature/ai-gpt-f1-sacred-forest-20261116、tools/f1-sacred-forest/、候補フォルダb1_sacred_forest_candidates。未承認/ゲーム未統合。実装や資産は本情報共有PRへ含めない。

### Khronos glTF-Validator (一層候補の形式検査)
- 公式: https://github.com/KhronosGroup/glTF-Validator 、npm gltf-validator 2.0.0-dev.3.10 / Apache-2.0 (npm metadata実確認)。
- 導入: 専用作業領域/workspace/work/browser/node_modulesのみ。ゲーム依存関係は追加していない。
- 実検証: 初期敷石/林床GLBをvalidateBytesで検査、error0。normal map使用時のtangent未収録warning3/5を検出。
- 対応: Blender exporterにexport_tangents=True、n-gon/Boolean capsを明示triangulateする修正コードを制作ブランチ8ab87e1へ。新GLBでのwarning解消確認と全17点検査はまだ。形式検査をアート品質・性能承認の代用にしない。
- 担当/日付: GPT / 2026-11-16 JST。tools/f1-sacred-forest/validate_glbs.cjs。

### 一層自然素材: 独自針葉カード/曲面葉と実画像QA (2026-11-16 JST)
- Blender5.3 official exporterのsearch_node_tree.py detect_alpha_clipをソース確認。image Alpha→Math GREATER_THAN(.45)→Principled Alphaで標準glTF MASK/cutoffを出力する実装を制作。blend設定だけのBLEND化を避ける。
- 古杉: 自作512px針葉spray PNG/normal/ORM、湾曲カード498枚・30主枝/240副枝。画像の針葉silhouetteを実視認、script静的確認済。新GLBのMASK/密度は最終再build待ち。旧広葉/疎冠を完成版にしない。
- その他の葉: 256px独自葉脈PBR v2＋1葉36triの滑らかなカップ。単一pole/明示UV/正しい表面normal。共通helper7171fa4でfreeze、全自然6点を最終再buildする。
- 実GLB画像QAで石碑Boolean後の本体消失を発見。Khronos形式合格だけでは造形成立を保証しない。outward winding＋直線凸cutter＋stroke毎のvolume guardで修正し、1.8m本体/実陰刻を4方向実画像で再確認成功。
- 製品GLBのsource commitと現在のscript/common/helperを照合し、古いモデル/画像の混在を拒否するmanifest gateを追加。PNGから実寸/サンプル数、GLB/blend/画像hashを記録する。
- Blender5.3 blendは標準Zstandard圧縮containerを利用するため、先頭BLENDER文字だけで形式を否定しない。編集ソースとゲームGLBは分離。
- 出典/権利: 針葉/葉脈/木塗膜は独自画像。写真は既存記録のCC0。参照Pinterest画像の再配布なし。制作PR https://github.com/koda24-cell/kotama-no-bouken/pull/391 。最終全景/全17点検査/ゲーム統合はまだ。


## 玉座V2のチェックポイント復旧・視覚AI評価 (2026-11-16 追加)
- 名称: B5 Throne Checkpoint Resume Integration Test + optional image VLM review
- 担当: GPT。用途: Blender Actionsの2ジョブ間チェックポイント復元検証および正面・側面・斜めの画像評価を造形パラメータへ反映する安全な補助機能。
- 公式技術: GitHub Actions https://docs.github.com/en/actions ; Blender https://www.blender.org/ ; Pillow https://python-pillow.github.io/ ; REST HTTPS chat/completions （接続先ごとの提供条件・料金・画像送信取扱は未確認）。
- ライセンス: GitHub Actionsホステッドランナーの利用条件に従う。Blender GPL、Pillow HPND。利用する外部AIサービスは未選択・ライセンス/料金未確認。
- 情報状態: コード保存確認。検証状態: **新規Actionsテストは結果未確認、実AI通信未検証**。
- 導入手順: `feature/gpt-b5-throne-recovery-vision-20261116` の `tools/b5-throne/vision_review.py` と `.github/workflows/b5-throne-resume-test.yml` を参照。視覚AIは初期OFF。明示的な使用許可とHTTPS推論API設定が必要。
- GitHub Models推論APIは2026-07-30に終了済みのため使用しない: https://docs.github.com/en/github-models
- 関連PR: 玉座V1 #383、玉座V2 #395。新規実装PRは別途公開後記録。
- 注意: 画像の数値検査は美観評価ではない。AI評価が成功しても原形状破壊防止・人間の最終承認必須。ジョブ異常終了時のArtifact保全は無保証。接続先の従量課金を勝手に発生させない。


### 玉座Work設定の検証追記（2026-11-16 JST）
- PR #404: Work以外のActions/CLI実行手順、通信なし設定チェック、非有限数の無効化、子BlenderへのVISION_*非継承、各反復の未承認manifestを追加。実装はDraftで未統合。
- run 43794997803の両ジョブsuccess、resume-passログの1→2再開・NOT_APPROVED、Artifact 14194068097の存在を今回再確認。ZIP自体のローカル取得はCLI未認証で未完了。
- ローカルBlender4.3.2: 旧use_auto_smooth属性で失敗し互換修正後、現行/改善版の3方向PNG・GLB書出し成功、実画像目視済み。支持台・背面厚み・曲線組石を追加、原メッシュ保持。6件のoffline vision tests成功。
- 石材のNoise/BumpはBlenderプレビューのみでGLB未ベイク。美観未承認、正式素材・ゲーム統合なし。
- VISION_API_URL/KEY/MODELの値は未提供、登録も実AI通信も未実施。有料API利用なし。GitHub連携ツールにSecrets/Variables更新機能がなく、利用先と費用条件の決定が必要。GitHub Models不使用。
- 詳細: PR #404内 docs/3d/B5_THRONE_WORK_SETUP_20261116.md。新規Actions実行の成功は未確認、ローカル検証と区別する。

### 一層神域候補: 全17素材・形式/ブラウザ/MCP/編集ソースの実検証追記（2026-11-16 JST）

- 担当: GPT team。一層神域の上記「未完了」「再build待ち」は各追記時点の記録。本節は今回実行済みの範囲を更新し、アート承認やゲーム統合の完了を意味しない。
- 証拠・実装追跡: [制作候補PR #391](https://github.com/koda24-cell/kotama-no-bouken/pull/391)。検査記録は同PRの `assets/3d/dungeons/b1_sacred_forest_candidates/verification/`、個別結果は `metrics/`、レビューは `docs/3d/F1_SACRED_FOREST_ASSET_REVIEW.md`。本情報共有変更には実コード・GLB・blend・画像を含めない。
- 個別制作: 全17個別GLB、合計 **21,305,008 bytes / 136,665 triangles**。各GLBを再importした4方向の実Cycles PNG計68枚。script/common/再帰helperの保存時点とGLB・blend・画像hashを照合するmanifest gateを通過。コンセプト画像を実モデル検査の証拠にしていない。
- Khronos glTF-Validator 2.0.0-dev.3.10: `validate_glbs.cjs` により個別17＋全景1の**18GLBすべて errors 0 / warnings 0**。結果 `verification/khronos-validation.json`。初期検査でのtangent警告は最終GLBで解消を確認した。形式合格は美観・実機性能承認と別。
- Three.js r180 GLTFLoader / Chromium SwiftShader: 個別17素材、床2種類の2×2継ぎ目、全景を実読込して **errors 0**。床4辺の上端高さ0、UV/normal/埋込画像/寸法を検査。個別読込後、全景更新時にも全素材hashを再照合。結果 `verification/browser-verification.json` と `verification/browser/`。ゲームの実装画面や実機GPUのFPS検証ではない。
- 全景の負荷診断: SwiftShaderで **4,432,376 triangles / 1,475 draw calls**。これはレビュー用全景の測定であり、実機FPSや携帯向け性能の承認値ではない。ゲームへの配置/カリング/表示予算は統合時の別検証が必要。
- Official Blender Lab MCP 1.0.2 → localhost:9876 → Blender 5.3.0: `mcp_inspect_scene.py` から全景の**17 asset IDs・5カメラ・195 packed images**を実取得し、外部画像依存なしを確認。結果 `verification/mcp-scene-readback.json`。チャットのツールパレットへの自動登録を意味しない。
- 編集ソースの画像埋込: `pack_sources.py` はBlender画像の遅延読込を考慮し、未読込状態の `has_data` だけで失敗扱いにせず、実ファイルをreload/packする。全17 `.blend` を保存後に再openし、**外部に存在しない相対画像パスからpacked bytesで全保持画像をデコード**、全メッシュ参照画像の埋込、geometry fingerprint不変を確認。GLBやモデル形状を再生成する工程ではない。結果 `verification/source-packaging.json`。
- 権利/導入境界: Blender/MCP/Validatorのライセンス・写真CC0・独自葉/針葉/木塗膜画像の既存記録を維持。新しい外部素材・有料APIの導入なし。元Pinterest画像は参考に限り、再配布・テクスチャ流用なし。
- **進行中**: 5カメラの全景写真は記録時点で入口/中庭の2枚が完了、残り3枚はレンダリング進行中。5枚すべて完了とは記載しない。
- **未完了/未承認**: 美観の最終承認、ゲーム本体への統合、実機性能・操作動線の承認。候補は `pending_user_review`、既存 `b1_ancient_forest` とゲームランタイムを置換していない。

### 一層神域候補: 全景5方向と最終delivery gateの完了追記（2026-11-16 JST）
- 前節の「全景2枚完了/3枚進行中」はその時点の履歴。以後、入口・中庭・封印回廊・祠詳細・俯瞰の**全5枚を1600×1000px / Cycles 48 samplesで実レンダリング完了**し、制作担当が実画像を確認した。
- `verify_delivery.py` の最終gateはpass。[delivery-summary.json](https://github.com/koda24-cell/kotama-no-bouken/blob/feature/ai-gpt-f1-sacred-forest-20261116/assets/3d/dungeons/b1_sacred_forest_candidates/verification/delivery-summary.json) の17個別GLB・68個別証拠PNG・5全景画像、全18GLBのKhronos errors/warnings 0、browser errors 0、編集ソース画像埋込/再open、中央経路clearance、各証拠hashを照合。公開証拠は引き続き[制作候補PR #391](https://github.com/koda24-cell/kotama-no-bouken/pull/391)。
- 到達状態は `candidate_verified_pending_user_review`。**ゲーム未統合・美術承認待ち・実機性能未承認**は維持。既知の美術留意点は回廊の見通し、天井の細い明線、祠背景の包囲感。全景の計算負荷を実機FPS承認へ読み替えない。
- 本追記は検証情報のみ。コード・素材・画像をdevelopmentへ統合する変更ではない。

## キャラクター5領域品質抽出（2026-11-17）
- 名称: Blender標準Python APIを使った頭部境界・部位寸法・髪断面概算・材質ノード・ボーン/シェイプキー解析。
- 目的: コタマ暗殺者V16の独立造形に向け、参考モデルから再現可能な**一般的造形指標**を集計。
- 導入: PR #412 `tools/character-mesh-research/extract_character_quality.py`、`.github/workflows/character-mesh-research.yml`。外部アドオン不要。Blenderと許諾済みモデルが必要。
- ライセンス: Blender標準APIを利用。参照モデルは個別の許諾確認が必要で、原本をGitに保存しない。
- 検証状態: コード追加済み、**新規5領域抽出の実行・JSON中身・レンダー目視は未確認**。既存のVRoid6体レンダー成功は別検証。
- 設計・制約: `docs/3d/research/CHARACTER_QUALITY_EXTRACTION_SPEC_20261117.md`。部位名判定はヒューリスティック、髪束の厳密断面や顔ランドマーク・変形品質は未実装。
