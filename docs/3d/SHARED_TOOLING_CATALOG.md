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

## B4トロッコ・オリジナルPBR画像をGLBへパックする手順（2026-11-16 検証済み）
- 名称: Blender Python / bpy による自作wood/oxidized-iron画像マップ生成・埋込GLB再エクスポート。
- 公式ツール: Blender https://www.blender.org/ （GPL。B4用Pythonコードはこのリポジトリ内の新規自作コード。第三者画像なし）。
- 対象分野: 第4層トロッコの木目、金属、法線マップ、粗さ・色情報のゲーム用GLBへの埋込。
- 技術: Blender Image.pixels foreach_set、pack、ShaderNodeTexImage、ShaderNodeNormalMap、UV補完、export_scene.gltf(export_format='GLB')。外部PBR画像・Pinterest画像は直接流用しない。
- 導入状況: `feature/gpt-b4-cart-structural-v20-20261116` / `tools/b4-render/bake-cart-pbr-v22.py`、`bake-cart-pbr-v23.py`。開発ブランチへの本体導入は**未承認**。
- 実検証: 2026-11-16 GitHub Actions run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43824911258 および https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43825499744 成功。実ダウンロードしたGLBを解析して各6枚の埋込画像を確認、GLB再読み込みBlender/Cycles正面・側面・斜めPNGを目視。実ゲームThree.js性能・操作、GLTF validator、全メッシュのUV品質は未検証。
- 制限: 手続き的な自作PBRはフォトグラメトリではない。古い鉱石形状・元の転倒ポーズは別課題。正式素材フォルダへの昇格はユーザー承認後のみ。参考画像候補リンクは `koda24-cell/pinterest-reference-library` に別管理。

### B5朽ちた騎士像: Blender 4.0 glTFエクスポートと手作りNormal Map（2026-11-16）
- 対象: `tools/b5-knights/build_sentinel_v1.py`〜`build_sentinel_v6.py`。制作PR #424（未承認）。
- Ubuntu 24.04 Actions apt Blender 4.0.2に標準glTF exporterを使用。aptの `python3-numpy` を追加しなければ `ModuleNotFoundError: No module named numpy` で失敗。最初の失敗run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43824065595 。
- CyclesでOpenImageDenoiserが利用不可な環境では `scene.cycles.use_denoising=False`、各view_layerのcycles denoisingを無効化して描画可能。修正版V1 run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43824415204 成功。
- 独自生成のBlender ImageのNormal MapをGLB埋込後に調査したところ、V3/V4の PNG RGB各チャネル平均0（黒一色）。結果、モデルが黒く見えた。**有効なNormal Map接続は未検証**、V5/V6ではノーマルノードを未接続にしてモデル法線を使う。元の素材形状を残す。
- カラーテクスチャのGLB埋込みは画像bufferViewのPNGを開いてRGB平均がゼロでないことを確認済み。法線テクスチャの有効性をGLB輸出前後で検証するゲートを今後設ける。
- V6成功: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43826564411 。ArtifactsにGLB、Blend、front/side/angle、manifest。技術テストの成功は美観承認ではない。
- 外部アドオン・外部有料APIの新規導入なし。Blender標準機能とPythonによる自作画像のみ。

### 一層神域: 第2改訂の開始と検証境界
- 上記5視点とgate完了は第1版の検証結果。実画像で見えた土床反復・背景の開き・回廊出口の見通しを受け、[第2改訂PR #428](https://github.com/koda24-cell/kotama-no-bouken/pull/428)で配置/部分引用を改訂中。個別17GLBは保持、改訂後の全景成功はまだ未確認。
- 既存GLBの部分利用はsource SHA・node/material名・祖先transformの保持を明示する。実3F配置候補schema2は全274床に明示profile（石187/soil-only87）、未対応・不一致で拒否しfullGLBへ暗黙fallbackしない。土壌ノード選択の実GLB構造検証と候補生成は成功、runtime consumerは未実装・ゲーム未統合。
- MCP再読込の証拠を強化するため、actualMCP内で開いたblendのSHA256を返し、最終gateで一致を要求する実装を追加。新レシートは改訂後に取り直す。新外部ツール・有料API導入なし。低解像Cyclesの構図確認を先に行い、最終1600×1000/48samplesの実写真と区別する。

### 一層神域 第2改訂: 実検証とCLI/MCPの注意点
- [PR #428](https://github.com/koda24-cell/kotama-no-bouken/pull/428): 個別17GLB不変、改訂全景263配置/4,480,724tri/1,012draw calls（旧1,475）。GLB20,934,320B。18Khronos errors/warnings 0、Three errors0、officialMCP内で開いたblend SHAと実ファイル一致、中央2×3m/Y−14..+22 clearance通過。最終1600×1000/48samplesの5視点は撮影中で、完了とは扱わない。実機FPS/美術承認/ゲーム統合は未完了。
- 土壌専用メッシュ利用で反復する敷石/根の全面配置をやめた。回廊上の細い明点は実ray_castで空へ抜ける点を確認し、既存屋根を6mm段差の重ねで伸ばした後、同じ7pixel rayが形状へ当たることと実Cycles previewで消失を確認。局所検査であり全画像品質保証ではない。
- Blender5.3 CLIはPython例外でも既定exit code 0となる例を実確認（clearance未通過時）。gate用は `--python-exit-code 1` を付け、receiptのpassed・source hashも確認する。低解像previewのpersistent cacheは `scene.render.use_persistent_data` が正しく、`scene.cycles.use_persistent_data` はAttributeErrorとなったため修正。修正後の実preview成功。
- official MCP execute_blender_codeの `result` はdictが必要。listではstructuredContent.status=errorだがisError=falseの場合を実確認。クライアントは両方を検査し、片方だけで成功判定しない。既存mcp-call helperはこの例を失敗として検出した。
- 各最終写真にscene blend SHA/loaded source commit/cameraを記録し、撮影前後のsource不変を確認するgateを追加。改訂版の最終5枚照合はまだ未実行。外部ツール/有料API導入なし、実行コードや資産はこの情報共有変更へ含めない。

### 第2層石造アーチ・写真PBR / Photo-PBR pipeline (2026-11-16)
- 技術: [Poly Haven Public API](https://polyhaven.com/our-api) / [Rock Surface](https://polyhaven.com/a/rock_surface) のCC0写真ベースのPBRセットを取得し、Blender画像テクスチャ（Color/Normal GL/Roughness）からGLBへ渡す方式。
- 公式公開API: https://api.polyhaven.com/files/rock_surface 。APIでの利用条件/クレジットは公式 https://github.com/Poly-Haven/Public-API を確認。著作権上の素材の利用条件は CC0。
- 目的: 第2層の崩れた石造アーチを三角形の陰影が目立つローポリから、風化・ひび割れ・石材の粒子を持った石造物へ段階的に品質改善。
- 実装: PR #401 `tools/b2-render/fetch-stone-photo-pbr.py` がPoly Haven公式APIのレスポンスから画像URLを取り、PNG/JPEGシグネチャとSHA256を確認してArtifactへ保存。Blender側`build-ruined-stone-arch-v1.py`がBase Color/Normal/Roughnessへ接続し、UVを保持。Blender環境では追加メッシュ表面細分化も適用。
- 情報確認: 2026-11-16、Poly Haven公式サイトでRock Surfaceの写真素材・CC0ライセンス・各PBRマップを確認。APIは一般利用可能。
- **実導入/検証状態: コード追加のみ / 未検証。** このチャットのコンテナは素材CDNへのDNSアクセス不能。GitHub Actions側でのダウンロード・Blenderレンダー・GLB材質・3方向PNG・写真テクスチャの見え方は未確認。Actions側では写真が得られない場合にエラー停止させ、手続きテクスチャを成功扱いにしない。
- 関連: `feature/b2-ruined-stone-arch-20261116` / PR #401。承認前のGLB/PNGは正式素材ではない。画像ライセンスとダウンロード元URL・SHA256はsource_manifestへ記録する。
- 他候補: [Mossy Stone Wall](https://polyhaven.com/a/mossy_stone_wall)（人工物の経年劣化）、[ambientCG Rock059](https://ambientcg.com/view?id=Rock059)（灰緑の湿り岩）。CC0だが**未取得・未適用**。

### 第5階層朽ちた騎士像 / CC0写真測量素材の導入検証（2026-11-16）
- 外部素材: ambientCG **Rock063**（公式 https://ambientcg.com/view?id=Rock063 ）。2026-02-22公開・写真測量・CC0ライセンス。原本Color/Roughness/NormalGL 1K JPGを公式配布から実取得。PR #424、Run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43890338792 。
- 取得スクリプト: `tools/b5-knights/fetch_photo.py`、zip内JPGマジック・サイズ・SHA256を検証し、`photo_source/source.json`へ出典/ライセンス/各ハッシュを保存。失敗時は明示したprocedural fallback。
- V12実行ではColorとRoughnessをBlenderに実適用、glTFのためのUV smart projectionを実行。実PNGは黄緑色が強く、美術的に不採用。
- 色調補正: `tools/b5-knights/tone_photo.py`。原本写真は保持し、Pillowでグレースケールから冷灰紫色にマッピングした新しいJPEGを生成。派生画像SHA256=`1d6adcab3189cf25afbd402df6a3465c75d5a70d05f2dc32788d68f6f3adbc12`。
- V13成功run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43891093819、V14成功run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43891804429 。Blender/GLB/3方向PNG/manifest・ハッシュ照合成功。写真は実適用確認済み、ただし**NormalGLは取得のみ・GLB内の正しい法線マップ動作は未検証**。
- V10〜14で実メッシュの7頭身比率は6.886を確認。数値QAは美術品質・人体解剖学品質を保証しない。**モデルは未承認、ゲーム正式保存・マージ未実施**。

### 一層神域: 目高レビューと針葉coverage mip試験（2026-11-17 JST）
- 第2改訂の1600×1000/48samples・実景5枚とdelivery gateは完了。個別17GLBは不変、ゲーム未統合/美術承認待ち。[PR #428](https://github.com/koda24-cell/kotama-no-bouken/pull/428)。実3F独立viewerは274床/178壁/129props（杉25）/非歩行土床177を実読込し、9不一致拒否・source pin・上面/変換を確認。
- 目高1.6mの近景で祠が壁に隠れる問題を発見し、既存崩壊壁2面を低い囲いとしてinstance縦scale0.32で利用。位置/厚み/map/blocked状態を保ち、実画像とwall rayで3近景の見通しを再確認。原本GLBへの形状変更なし。
- 新規試験: 元のalphaMASK/alphaCutoffを変えず、縮小mipごとのcutout被覆率を元画像へ近づける `preview/f1-foliage-coverage.js`。Three.js標準DataTextureの明示mipを用い、RGBはlinear/premultiplied alphaで縮小、alphaだけcoverage補正する。source画像/GLB不変、独立viewerだけのsampling補助。新外部ツール/有料APIなし、構文確認済み、実GPU upload/ブラウザ比較は進行中で成功扱いにしない。実機FPS・遠景LOD全般の承認ではない。
- 最新developmentとの比較ではmap等6sourceは同一だが共有rendererの統計/B2 cache更新を確認。全7source一致とは呼ばず、承認後の統合時に完全SHAを `F1_LAYOUT_BASELINE` で指定してsource一致を再検証する。
