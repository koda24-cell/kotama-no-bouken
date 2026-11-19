# 共有ツール・技術・アドオン台帳

本台帳は発見時点で登録し、検証後に同じ項目を更新する。運用: [TOOLING_AUTO_SHARE_POLICY.md](TOOLING_AUTO_SHARE_POLICY.md)。元の広域研究: [STYLIZED_GAME_TECH_LIBRARY.md](STYLIZED_GAME_TECH_LIBRARY.md)。

| 名称・技術 | 用途 | 情報/導入/検証状態 | 出典・実装・証拠 |
| --- | --- | --- | --- |
| Blender 5.3.0 正式版の専用Docker＋ClamAV評価 | 公式Linux x64 tar.xzをSHA256照合し、旧Blender4/5環境を保持して独立イメージで実GLB/PNGと第4層マグマの互換性を検証 | **2026-11-19 実Dockerビルド・ClamAV・実レンダリング成功**：[run #44466267564](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44466267564)、Blender 5.3.0を正確に確認。公式＋固定SHA256一致、展開後5,597ファイル実スキャン感染0、EICAR検出、B4マグマP1のGLB/Blend/4PNG成功。B2水面16GLB/3PNGも[run #44467090675](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44467090675)実成功。**既存5ワークフローの5.3移行も実成功・development統合済み**：B2水面[run #44467617635](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44467617635)、B4マグマP1〜P3[run #44467661876](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44467661876)、F6葉群[run #44467921230](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44467921230)、B4 P3V5[run #44468240248](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44468240248)、B4 V16派生[run #44468247441](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44468247441)。全てGLB/PNG等の実生成・ClamAV感染0。未移行の旧Blender4/5は保持 | [Blender公式5.3](https://www.blender.org/releases/5-3/) / [公式SHA256](https://download.blender.org/release/Blender5.3/blender-5.3.0.sha256) / [評価手順](BLENDER_53_UPGRADE_EVALUATION_20261119.md) |
| F2浅瀬透明水の物理系シェーダー / IOR・微細波・Fresnel・疑似causticsの分離 | 水V9で曇りガラス、V10で水面消失となる原因を一次資料と実3方向PNGから整理。V11は屈折低減、川底カースティクスを独立試験 | **V9/V10実画像・Actions成功検証済、V11美術効果未検証**。本実装や正式素材採用は未承認 | [研究メモ](research/F2_CLEAR_WATER_PHYSICAL_SHADING_RESEARCH_20261119.md) / [水制作PR #517](https://github.com/koda24-cell/kotama-no-bouken/pull/517) / [GPU Gems](https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-1-effective-water-simulation-physical-models) |
| B5 ambientCG ZIP取得直後のClamAV＋展開後画像の再スキャン | 外部配布ZIPをアーカイブ解析前に隔離スキャンし、展開したemission画像もPillowデコード前に再スキャンする。ZIP展開サイズ・圧縮率制限、検査エラーは処理停止 | **2026-11-19 実検証成功・developmentへマージ済み**：[run #44460460622](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44460460622)。外部ZIP3件・展開画像3件をそれぞれ読み込み前に実スキャン感染0、npm511件・Pillow wheel1件も実行/導入前に感染0、ソース3件・出力8件など全検査感染0。B5の実ブラウザ3方向PNG・アニメも成功。初回run #44460321738はhost freshclamログ権限で失敗し修正済み。Playwright Dockerイメージ自体のClamAV検査は未実装 | [PR #586](https://github.com/koda24-cell/kotama-no-bouken/pull/586) / [ZIP安全対策](https://docs.python.org/3/library/zipfile.html) / [ClamAV](https://www.clamav.net/) / [移行台帳](SHARED_CONTAINER_REMAINING_SECURITY_INVENTORY_20261119.md) |
| Python wheel先行ClamAV検査＋オフライン導入（第2層滝のtrimesh依存） | pipから取得した外部Pythonホイールを実行・インストール前にスキャンし、確認済みローカルwheelのみからインストールする | **2026-11-19 実検証成功・developmentへマージ済み**：[run #44457029320](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44457029320)でソース2/取得wheel2/入力GLB1/出力5件を実スキャン、感染0。130 geometries、GLB1/PNG3の実生成と署名検査合格。`pip download --only-binary=:all:` → `clamav_scan_gate.sh scan qa/wheels` → `pip install --no-index --find-links qa/wheels`。freshclamと生成GLB/PNGスキャンも別途必須。ClamAVだけで安全保証にはならない | [PR #575](https://github.com/koda24-cell/kotama-no-bouken/pull/575) / [pip公式](https://pip.pypa.io/en/stable/cli/pip_download/) / [ClamAV](https://www.clamav.net/) / [手順](SHARED_BLENDER_CLAMAV_CONTAINER_HANDOFF.md) |
| 第6層 葉の表裏透過光・低周波specular・glTF doubleSided・葉群の体積造形の追加研究 | BotW風の葉群で暗い正面/明るい裏面と粒状感を抑えるため、法線混合率・透過光・葉群体積・AOを独立検証 | **追加の法線混合率A/B/C実Blender成功**：25/45/65%を140葉×3案、6PNG+GLB+Blend+ClamAVで検証 run #44455505332。45%が中間候補、25%白く65%暗い。裏面透過光・AO・全樹冠統合は未検証。SpeedTreeやKhronos/80Levelの技術を参考としてBotW未公開実装と区別 | [研究メモ](F6_FOLIAGE_LIGHTING_FOLLOWUP_RESEARCH_20261119.md) / [SpeedTree GPU Gems 3](https://developer.nvidia.com/gpugems/gpugems3/part-i/geometry/chapter-4-next-generation-speedtree-rendering) / [glTF仕様](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html) / [80Level](https://80.lv/articles/meadows-creating-stylized-nature-in-ue4) |
| Assassin V18 元VRoid Body形状再利用＋耳周辺の法線・局所エッジ解析 | 元Shibu後頭部の丸みを保持して耳後ろの2点（Face 2071 / 1506）を修正対象とする。Face/Bodyの面間距離・法線角・UV/スキンウェイトを切り分け、必要時のみ局所補修 | **2026-11-19 技術文献調査済、Blenderでの局所法線転写・改造・アニメ変形試験は未実施**。元Body頭蓋レンダリング成功 run #44446328687、34/36がBody面まで1mm以内 run #44447509958。全A–F後頭部生成は美術不合格。技術の新規実装・CC0確認なし | [Blender Secrets講座](https://blender-secrets-school.teachable.com/p/anime-character-modeling-in-blender) / [VRoid Face+Bodyの接合とウェイト](https://note.com/melvina/n/n9540605adf51) / [VRM顔法線の転写実例](https://note.com/mizupyon/n/nc9a36d368b78) / [公式法線仕様](https://docs.blender.org/manual/en/latest/modeling/meshes/editing/mesh/normals.html) / [調査書](research/ASSASSIN_V18_EAR_SEAM_MODELING_BLOG_RESEARCH_20261119.md) |
| 第6層・葉群の半球法線転写／裏面法線補正／頂点カラーAO（Polycount） | 採用したV25樹冠幅を変えず、葉の散在する陰影を柔らかい葉束の光として整える | **2026-11-19 Blender・GLB・ClamAV実検証成功**：run #44453628951、V27葉140枚×A/B/C、6方向PNG、法線6,720ループ変更、GLBにNORMALとCOLOR_0あり。半球法線で光の粒状差は減ったが暗すぎ、裏面は明るくなりすぎる。AO差は小さく美術品質**未合格**。本番統合なし | [技術原文](https://polycount.com/discussion/209623/smooth-foliage-like-in-breath-of-the-wild-europa-by-helder-pinto-mini-tutorial) / [Blender Mesh API](https://docs.blender.org/api/5.0/bpy.types.Mesh.html) / [研究・試験計画](F6_FOLIAGE_NORMALS_POLYCOUNT_TEST_20261119.md) |
| Blender 5 + ClamAV 共有コンテナ（Ubuntu 26.04、別イメージ） | Blender 5.0.1で保存された第6層V14成木の `.blend` を安全に読み込み、旧Blender4環境を破壊せずレンダー・最適化する | **2026-11-19 構築・実スモーク検証成功**：[run #44452374577](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44452374577)。Ubuntu26.04/Blender5.0.1、freshclam、EICAR検出、ソース1件/生成2件感染0、実PNG+GLB生成・形式検査成功。GHCR digest `sha256:05f93bdd5c2c0dc541c34b6f30e488f0c21a53c403c50311f26fd43357ce8047`。F6葉バッチも[run #44452794170](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44452794170)で成功（元9108→145 mesh nodes、ソース7件/生成7件感染0）。8方向Impostorも[run #44453189534](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44453189534)で最終digestにて実成功（8方向PNG・2080×1040アトラス、source15/checkpoint7/output10件感染0）。B4 V16派生マグマのBlender4 Cycles BVHクラッシュ(exit 139)は、同じ造形・素材をBlender5環境で再実行して[run #44460403769](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44460403769)でGLB3/Blend3/PNG12とClamAV感染0を実確認（[PR #581](https://github.com/koda24-cell/kotama-no-bouken/pull/581)統合済）。B2/F3/F6/剛体LODの7ワークフローは[PR #550](https://github.com/koda24-cell/kotama-no-bouken/pull/550)でdevelopmentへマージ済み。旧Blender4.0.2はV14原本を `not a blend file` で拒否（run #44451546843 / #44451552377）。元Blender5.0.1では葉バッチ・Impostor実成功（run #44059729505 / #44061467370）。Dockerfileと独立Build/SmokeをPR #555からdevelopmentへマージ済み。ゲーム内本番適用・美術承認は未実施 | [PR #555](https://github.com/koda24-cell/kotama-no-bouken/pull/555) / `.github/docker/blender5-clamav/Dockerfile` / `.github/workflows/build-shared-blender5-clamav-image.yml` / [Blender公式](https://www.blender.org/) / [ClamAV公式](https://www.clamav.net/) |
| Shared Blender + ClamAV GHCR image (Ubuntu 24.04) | Blender/ClamAVを共通コンテナに事前導入し、全階層のActionsでapt再インストールを省く。freshclam定義更新・取得直後/生成後の実スキャンは毎ジョブ必須 | **2026-11-19 実検証成功**：run #44446614148。GHCR digest固定でpull、freshclam更新、source 1件/生成GLB・PNG 2件の実スキャン感染0、EICAR検出、Blender実PNG/GLB出力。Draco圧縮は未利用。B5瘴気QA・共通素材安全監査・B2橋小物・B2石造遺跡V4へ切替済み。B2橋小物・石造遺跡V4に加え、B2旧橋バリエーション・石造遺跡V2/V3・氷岸左右の4系統も[PR #557](https://github.com/koda24-cell/kotama-no-bouken/pull/557)で実検証後developmentへマージ済み。B4バッチ[PR #554](https://github.com/koda24-cell/kotama-no-bouken/pull/554)も6GLB/18PNG・npm955件スキャン成功。その他の階層ワークフローは一部未移行 | [公式GHCR](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry) / [引き継ぎ](SHARED_BLENDER_CLAMAV_CONTAINER_HANDOFF.md) / `tools/security/clamav_scan_gate.sh` / [実検証](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44446614148) / `build-shared-blender-clamav-image.yml` |
| F6 成木 CC0葉素材自動取得 + Blender V19/V20 並列比較 | ambientCG Leaf001 1K-PNGを公式URLから取得・ZIP/PNG/SHAを検証して葉材質へ適用。原本と候補の4視点PNG/GLB/Blend/manifest比較 | **2026-11-19 Actions 3回実成功**（V22 run 44439923529、V23 run 44440715441、V24 run 44441728229）。4方向PNG/GLB/BlendとSHA manifestを検証。V24で過度な白反射を低減、葉形状・樹冠品質はまだ改善途中で未承認。Leaf001は配布元分類 Approximation で写真そのものではない。ゲーム未統合 / NOT_APPROVED | [PR #501](https://github.com/koda24-cell/kotama-no-bouken/pull/501) / [手順](F6_AUTO_CC0_LEAF_RENDER_HANDOFF.md)（PRブランチ側） / [ambientCG](https://ambientcg.com/view?id=Leaf001) |
| CEDEC2024 BotW 二次元四分木・距離別ロード | 全階層のセルストリーミング/LOD設計 | 任天堂講演の公表内容を確認・コタマ未実装 | [公式講演レポート](https://gamemakers.jp/article/2024_09_04_78145/) / [共通方針](GLOBAL_3D_LOD_PERFORMANCE_POLICY.md) |
| Cemu BotW tree billboard / grass density解析 | 遠景樹木・植生の表示距離を別管理する根拠 | コミュニティ解析コード確認・コタマ未実装・任天堂公式コードではない | [Cemuパッチ](https://github.com/cemu-project/cemu_graphic_packs/blob/master/src/BreathOfTheWild/Mods/DrawDistance/patch_DrawDistance.asm) / [調査文書](F6_TREE_BOTW_PERFORMANCE_RESEARCH_20261117.md) |
| SpeedTree葉束LOD・Alpha to Coverage・葉アトラス | 樹冠を高品質に保ちつつメッシュ/ドローコール削減 | GPU Gems文献確認・コタマ実動作未検証 | [GPU Gems 2](https://developer.nvidia.cn/gpugems/gpugems2/part-i-geometric-complexity/chapter-1-toward-photorealism-virtual-botany) / [GPU Gems 3](https://developer.nvidia.com/gpugems/gpugems3/part-i-geometry/chapter-4-next-generation-speedtree-rendering) |
| 既存F1 16m InstancedMesh + 3D統計 | 計測基盤と繰返し配置バッチの再利用 | development実装コード確認・全階層共通LODは未実装 | `field/field-3d-b1-sacred-trial.js` / `field/field-3d-view.js` / [共通方針](GLOBAL_3D_LOD_PERFORMANCE_POLICY.md) |
| 全階層 GLB Performance Audit Action / stdlib GLB構造解析 | GLB内のシーンmesh nodes・推定primitive instances・三角形・材質を継続分析 | **Actions実行成功** #44058467063（第1層48GLB、227推定primitive instances、339,474 tris）。GPU draw calls/FPS実測ではない。実装PR #488をdevelopmentにマージ済み（2026-11-17、SHA 39e0ca2）。ランタイムGPU draw calls/FPSは未測定 | [Action試験](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44058467063) / [PR #488](https://github.com/koda24-cell/kotama-no-bouken/pull/488) / [全階層方針](GLOBAL_3D_LOD_PERFORMANCE_POLICY.md) |
| Blender葉メッシュ材質別統合＋4視点QA Action | 第6層成木V14の元GLB/Blend保持、葉統合・レンダリング差の自動比較 | **全工程成功** #44059729505：元GLB9108→145メッシュ、42930tris維持、GLB6.49→1.59MB、正面/側面/斜め/真上PNG差ほぼ0。ゲームFPS未測定、NOT_APPROVED | [実装PR #488](https://github.com/koda24-cell/kotama-no-bouken/pull/488) / [全工程成功](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44059729505) |
| 可視LODヒステリシス・2Dセル先読みの独立テスト | 画面占有サイズに応じたLOD切替と前方セル先読みの意思決定 | Node自動テストを共有Actionに追加・実行成功 #44059157751。**ゲーム接続は未実施**、数値は仮の試験値 | [試験PR #488](https://github.com/koda24-cell/kotama-no-bouken/pull/488) / [Action検証](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44059157751) |
| Blender不透明岩・建築GLBの3段階形状LOD + 4方向レンダリング | LOD0/1/2のGLB3種＋PNG12枚＋SHA検証、自動原本維持 | **実生成成功** #44061002394。第1層苔岩：3806→2093→951三角形。初期LOD2は苔欠落。苔材質保護版 #44062318352成功（3806→2431→1459 tris）、4方向PNGで灰色露出改善。品質未承認 | [実験PR #488](https://github.com/koda24-cell/kotama-no-bouken/pull/488) / [苔保護修正版成功](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44062318352) |
| 8方向樹木Impostor RGBAアトラス | 遠景用樹木を8方向から透明レンダー、角度付き4×2アトラス生成 | **BlenderとPNGアルファ検査成功** #44061467370、2080×1040 RGBA。方向選択・UVのNodeテストは実装済み。Three.jsの距離切替/画質検証は未実装。未承認 | [実験PR #488](https://github.com/koda24-cell/kotama-no-bouken/pull/488) / [成功Action](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44061467370) |
| **3D共通 Actions 機能群（検証済み2026-11-17）** | GLB負荷監査・葉の材質別結合と4視点比較・静的不透明GLBの3段階LOD/12視点・樹木8方向透過Impostor | Actions #44059729505 (樹木葉バッチ **success**) / #44061002394 (岩3段階LOD **success**) / #44061467370 (8方向Impostor **success**) / #44058467063 (GLB監査 **success**) 。**正式保存やゲーム適用は未実施** | [PR #488](https://github.com/koda24-cell/kotama-no-bouken/pull/488) / [運用・検証](SHARED_3D_ACTIONS_OPTIMIZATION_PLAYBOOK.md) |
| 8方向Impostor yaw→atlas UV選択の純粋関数とNode検証 | 角度0/360の循環選択、タイルUVの4px余白をテスト | **Actionsテスト成功** #44063296917。Three.js本番には未接続 | [共通Action](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44063296917) / `tools/3d-performance/impostor_views.mjs` |
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

### 一層神域 coverage mip・近景の実行結果（2026-11-17 JST）
- 前節の試験を実Three r180/Chromium SwiftShaderで完了。元17GLB・source alphaCutoff不変、3目高ビューの壁遮蔽なし、9不一致拒否、274床/177背景土床/129propsを再確認しerror/warning0。実レポート・比較画像は[PR #391](https://github.com/koda24-cell/kotama-no-bouken/pull/391)の `docs/reviews/f1-sacred-forest-game-layout/` へ保存。
- 針葉の基準被覆率約0.1511に対し、8×8 mipはraw0.0625→補正0.1406、4×4はraw0→0.125。実DataTexture uploadとraw/補正のスクリーンショット比較を完了。全LOD/端末FPS/美術水準の合格ではない。source画像へ焼き込まず任意のviewer sampling補助として残す。runtimeで採用する場合はtexture lifetimeとGPU依存動作を別途確認する。
- ソフトウェアGPUの比較readbackで既定30秒のscreenshot timeoutが一度発生。既存の全景撮影と同じ180秒へ揃えた再実行は成功。timeoutをFPS評価へ転用しない。
- 5全景写真・17GLB/編集source・68個別PNG・新3F候補hash・viewer/helper code hash・近景/補正レポートを最終delivery gateで照合しpass。ゲームは未統合、芸術承認はpending_user_review。地形起伏や一部の背景の抜けなどの美術留意点を保持。最終scene GLBは20,939,944B（途中組立値から更新）。

### 一層神域: 実ゲーム試験ロード・保存分離・SVG GPU upload（2026-11-17 JST）
- 担当: GPT制作チーム。関連: [試験組込みPR #447](https://github.com/koda24-cell/kotama-no-bouken/pull/447)。新規外部配布物/購入なし。Three.js（MIT）公式 https://threejs.org/docs/ 、Playwright（Apache-2.0）公式 https://playwright.dev/ 。追加コードはリポジトリ内自作、元GLB/画像の条件は制作manifestを維持。
- 手法: 実map/固定identityと18 GLBのSHA256を照合し、全成功後だけ静的環境をworldへ追加するtransactional loader。16m空間bucketのInstancedMeshは775配置を652batch/2092 mesh instanceへ集約。batch数は実draw/FPS合格の代用ではない。失敗時は旧F1経路へ戻す。導入先 `field/field-3d-b1-sacred-trial.js`、通常表示は変更せず一層3Fのopt-in限定。
- 試遊入口: 実index.htmlをiframe.srcdocへ読み込み、ゲームscriptより前にそのrealmのStorage APIをmemory Mapへ切替。通常の保存を読み書きせず3Fから開始する。`preview/f1-sacred-playtest.html`。`node tools/f1-sacred-forest/verify-playtest-page.cjs` で親の保存sentinel不変、試遊側から不可視、固定7/水11/source hash検証を実確認済み。
- 発見した不具合: 既存FOE dragon.svgをHTMLImageElementのままWebGL2へ送るとSwiftShaderでINVALID_VALUE/immutable texture警告。最小再現ではSVG直接uploadがGLerror1281、描画前に512px canvasへ同期rasterizeすると0。DataTexture明示mip単独も0で、針葉mipを原因と断定しない。SVG原本を変えずTextureLoader callback内で初回upload前にcanvas化する修正を試験branchへ追加。
- 現在の検証状態: Chromium/Three r180/SwiftShaderで保存分離と最小再現は完了。修正後の全フロア往復/戦闘帰還QAは実行中。実行コマンド `node tools/f1-sacred-forest/verify-game-trial.cjs`。証拠はPR #447の `docs/reviews/` へ保存する。失敗履歴は削除しない。
- 制限: 実機FPS/全GPU/美術承認は未完了。main公開・既定表示への昇格を含まない。第三者参考画像の再配布なし。

### 一層試験GPU・保存分離の実行結果追記（2026-11-17 JST）
- 前節のSVG対策を実index.htmlで完走。1F→3F→祠→水際→2F→3F→戦闘→3F帰還の全8段階、820 uploads / GLerrors0 / GPU警告0。FOEは512角canvas upload。修正前の同条件はSVG直接uploadのGLerror1281が1回と警告2件。独立3比較でもSVG直接だけ失敗、canvasとDataTexture mipは成功。原本SVG・17候補GLB不変。
- 保存分離ページも修正後に再実行pass。親Storage sentinel不変、試遊側から不可視、実3F/固定7/水11/source hash成功。証跡: PR #447の `docs/reviews/f1-sacred-forest-gpu-upload/` と `docs/reviews/f1-sacred-forest-playtest-page/`。Chromium/Three r180/SwiftShaderのみ、実機FPS・全GPU・美術承認には拡張しない。全機能QAの最終記録は同PRへ別保存する。

## 第3層折返し階段で実証したCC0写真PBR（2026-11-17）
- 技術: Poly Haven Concrete Moss 1K/2K画像（Diffuse、Normal OpenGL、Roughness）。ゲームの自然侵食した古いコンクリートに利用。
- 正式出典: https://polyhaven.com/a/concrete_moss / Rob Tuytel / Poly HavenのCC0 1.0。
- 取得実装: `tools/floor3/switchback/fetch_cc0_pbr.py`（制作PR https://github.com/koda24-cell/kotama-no-bouken/pull/449）。GitHub Actions runnerの `out/source_textures` に保存してBlenderコンテナへ共有し、画像をGLB埋め込み。
- **実動作確認**: V5 https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43988036966 （全3マップ取得・Blenderロード・GLB/3方向PNG・Blend成功）。2K版V8 https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43990198620 （描画と形式検査成功、Artifacts保存）。
- 1K公式Diffuse SHA-256 `7a3f88bcdf20c2b6b1851549594611c0c24677d4f42c669a21d4367b8f5aeacc`、Normal GL `ead99715fadfd3b1b037b6219a9ed97342701732bffee5b05084da4c99b7467b`、Roughness `ca41216de508cf2afd619e2e617bbb620082b22f20e75dd80c6c415ce1e6d95c`。
- 失敗と修正: ホスト側の `/work` 書込みでPermissionError→相対パス `out/` へ修正。PBRマップ取得不能時は生成テクスチャにフォールバックし、成功とは報告しない。
- 留意: 完成品質判定と技術検査は別。参考画像の著作権不明な画像は素材化しない。現モデルはユーザー承認前、正式フォルダへの保存・ゲーム統合はしていない。

## 第4層・独立溶岩モジュールのBlender PBR書出し手法（2026-11-17）
- 名称: 手続き型512px熱分布ベイク＋既存PBR Normal/Roughness＋個別GLB/4方向レンダー。
- 目的: 蛇行流・合流・溜まり・落下・冷却の5つを、周辺地形を含まない再利用可能な溶岩モデルとして制作する。
- 公式技術: Blender Python API https://docs.blender.org/api/current/ 、glTF 2.0 https://www.khronos.org/gltf/ 。Blender標準API・独自Pythonコード。画像ベイクはオリジナル生成、既存のプロジェクト内PBR画像は利用条件を正式採用前に再確認。
- 導入: `tools/floor4/lava_modules/build_lava_modules.py` と `.github/workflows/b4-lava-modules-review.yml`（PR #454、未承認）。
- 検証: ソース/ワークフロー作成済み。Actions run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43996896778 を実行中。**この記録時点では実レンダー成功・GLB出力・ゲーム内描画・アニメーション未検証**。確認後にrun結果を追記する。
- 担当: GPT（Blender/GLB/PNG）、Claude（承認後のブラウザ組込み）。未承認GLBを本番ゲームへ統合しない。

### Poly Haven Fern 02 — 写実的なシダのCC0基準モデル (2026-11-17)
- 公式URL: https://polyhaven.com/a/fern_02 ; ライセンス: https://polyhaven.com/license (CC0, 改変・商用利用可)。
- 用途: 第2層水源の独立型植物3Dにおける葉の形・マテリアル・シルエット・モデル密度の**品質比較基準**。植物を単独GLBとして岩/遺跡/橋へシードで組み合わせる案。
- 内容: 4株のシダモデル、約6,232三角面、Diffuse / Normal (GL) / Roughness / Alphaなどの実写真由来マップを公式サイトで案内。造形作者 Rico Cilliers、スキャン Rob Tuytel。
- 登録/担当: 2026-11-17 GPT。ソース・ライセンス・仕様の公開情報を確認済み。
- **実導入/検証: 未導入/未実行。** GLBを実際に取得/読み込み/撮影/ゲーム内組合せしたわけではない。別チャットのPinterest参照（画像CDNがDNSエラー）はこれと区別。
- 制作先: PR #451、`feature/gpt-b2-modular-wet-fern-20261117`。V01原型とV02手続き造形は保持。Fern 02を実参照/採用する場合はダウンロードURL・出典・ハッシュ・Blender実レンダー/GLB上の材質と当たり判定・タイル密度を検証し、承認を得る。

### 溶岩単体5種の実行結果（2026-11-17、上記PBR技術の追記）
- GitHub Actions V1 https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43996896778 、V2 https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43997817577 、V3 https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43998531627 はいずれも**成功**。
- V3実体確認: 独立GLB 5、Blend 5、PNG 20（各4視点）、manifest 5。GLBには7画像内包、全30ファイルのSHA256がmanifestと一致。ソース `tools/floor4/lava_modules/build_lava_modules.py`、制作PR #454。
- 具体的な改善: 合流点の非対称化、滝の厚み追加、冷却亀裂の不規則化と発光抑制。静止モデルのみ。GLBのブラウザ実描画・流動VFX・FPS・ゲーム内接続は**未検証**。
- 状態: 技術的なGLB/PNG/Blend生成は検証済み。**美術承認なし、正式保存なし**。GitHub Actions Artifactは一時保管、ユーザー承認後に正式保存PRを作る。

### B4玄武岩・層理破断メッシュ（2026-11-17）
- 名称: 不規則多角形の押し出し破断岩盤＋背面崖の侵食地層＋埋没瓦礫（Blender標準Python API）。
- 目的: 溶岩河川の岩が丸い粘土塊の集合に見える問題を改善し、元のV9メッシュを保持して実地質的な角張った破断面・岩盤の重なりを追加する。
- 公式: https://docs.blender.org/api/current/ （Blender標準API）。自作コードで第三者アドオン不要。PBRは既存のvolcanic_basalt/ashen_stone画像を再利用（元画像のライセンスは正式採用前に確認）。
- 導入: PR https://github.com/koda24-cell/kotama-no-bouken/pull/458 、tools/floor4/magma_river/build_magma_river.py（親PR #450の作業ブランチから派生）。Blender 5.x Actionsで試験。
- 検証: V9元モデルの4方向実レンダーrun https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43994456829 は成功。V10追加地質メッシュの実レンダーrun https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44003753769 は**結果確認待ち**。品質・GLB・ゲーム実装未承認。
- 注意: 既存の岩/溶岩メッシュを消さない。形状追加は破断面・段差の質感改善であり、地質学的な実測再現ではない。実PNG目視後に修正し、承認までは本番へ移さない。

### 一層試験組込み: 最終機能QA完了（2026-11-17 JST）
- `node tools/f1-sacred-forest/verify-game-trial.cjs` を修正後runtime SHA `6f3e5d432221b44211a8f0409602bccf79ba3b82e0391d641d2a9fb60f7903b1` で再実行しpass。通常/opt-in/SHA不一致の3 sessions、16 checks、実ゲーム画像13枚。移動/壁衝突/宝箱報酬一回とモデル交換/NPC/看板/灯/階段往復/戦闘帰還/旧表示fallbackを確認。page/console errors0、positive trial WebGL警告0。入力source hash不変をassert。
- [PR #447](https://github.com/koda24-cell/kotama-no-bouken/pull/447) の `docs/reviews/f1-sacred-forest-game-trial/game-trial-verification.json` が最終記録、修正前警告/初期fixture失敗も別保存。通常preload警告・外部font接続問題は削除せず残す。保存分離/全GPU診断は前節通り。ユーザー認可は試験組込みのみ、main公開/既定表示/美術承認/実機FPSには昇格しない。

### B4玄武岩の地層・破断メッシュ実検証（2026-11-17）
- V10 Blender https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44003753769、V11 https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44004361611、V12 https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44004825512 は全て**success**。各runでGLB/Blend/4方向PNG/manifestを生成。
- V12 Artifact 14294645385 をダウンロードし、6ファイルのSHA256一致、GLB 361メッシュ・画像10内包を実確認。画像を目視し、後方崖の地層/破断面と岩色の改善を確認。
- V11で既存プロジェクト自作の assets/textures/floor4/basalt-charcoal-01/ を追加利用。原本生成コード tools/b4-render/generate-basalt-pbr.py、READMEに第三者依存なしと明記。既存岩の頂点は削除せず、地層状変位と破断キャップを追加。
- 残課題: 大きな岩の丸い輪郭・薄い岩盤の板状感は未解消。**美術承認なし**、正式保存なし、ゲーム統合/FPS未検証。制作PR #458（親PR #450）。

### 一層・閉鎖神域V3: 連続水面と個別低負荷植生の試作方針（2026-11-17 JST）
- 名称/担当: Three r180 MeshPhysicalMaterial＋world-XZ二層normalによる水面試作、Blender 5.3個別asset出力。GPT制作チーム。対象は一層3Fの閉鎖神域改修 [PR #465](https://github.com/koda24-cell/kotama-no-bouken/pull/465) / `feature/f1-closed-ruins-v3-20261117`。
- 公式: Three.js docs https://threejs.org/docs/ 、比較用Water実装 https://github.com/mrdoob/three.js/blob/r180/examples/jsm/objects/Water.js （Three.jsはMIT。既存依存を利用し、新規第三者コードの丸ごと転用は計画していない）。Blender公式 https://docs.blender.org/api/current/ 。既存Poly Haven画像は元manifestの公式出典/CC0条件を維持して再利用する方針。Pinterest画像は参考のみでテクスチャへ転用しない。
- 目的/導入手順案: 既存11水meshの通行・水位・identityを保ち、同じworld-XZ座標に基づく異なる速度/向きの二層normalを `onBeforeCompile` で合成し、マス境界で波模様を途切れさせない。MeshPhysicalMaterialで水の濃淡/粗さ/反射応答を調整する。Water.jsのmeshごとの反射renderを11枚へ導入せず、追加reflection render target数は0を設計目標とする。これはリアルタイム平面反射の実装済みという意味ではない。
- lifecycle方針: 元水材を保持し、試験終了/他階へ移る際に元材へ戻す。共有元texture/materialのdisposeを避け、試作用のmaterial/uniform/textureだけ所有関係を定めて解放する。実装後は水面連続性、time変化、shader compile、フロア往復、戦闘帰還、resource解放と正常fallbackを実ゲームで別検証する。
- 個別素材方針: 専用 `/workspace/tools/blender-5.3.0-linux-x64/blender` を固定して一assetずつBlend/GLB/実再import PNG/metricsを出力。原本17GLBは保持しV3を別出力先へ。既存33,804trisのシダを大量複製せず、密度用lowpoly草花/不定形苔capを別制作する。画像埋込PBR/原点/4mセル/1.6m目高を記録し、各assetから実画面へ段階確認する。
- 導入/検証状態: **計画・実装中。実GPUの水面描画、reflection target数、lifetime、FPSは未検証**。専用Blender5.3の起動と既存6構造GLBの実import/bbox確認、原本17SHA一致のみ監査済み。これらを新規asset生成完了や美術品質合格と扱わない。実行日時/コマンド/画像/JSONによる結果は実行担当が後続追記する。
- 注意: 既存map/固定7対象/FOE/戦闘/セーブは保持。通常表示・main公開・美術承認・実機FPSへの昇格を含まない。本項は情報共有のみで、未検証runtime・モデル・画像をdevelopmentへ導入する変更ではない。

### 一層・閉鎖神域V3: 個別素材・苔MASK・独立水面の実行結果（2026-11-17 JST）
- 前節PR #466の計画に対する実測追記。制作 [PR #465](https://github.com/koda24-cell/kotama-no-bouken/pull/465) で専用Blender5.3を使い、新規5assetを**各1個ずつ順次生成**。GLBを別sceneへ再importして4方向計20PNGを作成し、制作rootが全contactを実確認。苔cap652 / 低草1520 / 根瓦礫1556 / 崩落穴縁2004 / 水際962、合計6,694tris。原本17GLBは全SHA不変。新規5GLBのKhronos validator errors/warnings0、5Blend全FILE画像packed・再open/decode pass。これは最終美術承認ではない。
- 新技法: 既存CC0土RGBの緑色調派生と、自作seeded multiscale Gaussian alpha＋端のfeatherを組み合わせた不定形苔cap。既存画像の出典/CC0条件は元manifestを継承し、Pinterest画像を転用しない。alpha MASK threshold0.45、vertex colorsなし、同一UVの一枚面で床格子を跨ぐ。原本素材は変更せず、別V3出力。capは2,540→652trisへ削減して密度用途へ調整したが、実機FPS合格を意味しない。公式/ライセンスは前節のBlender/Three.js（MIT）と既存Poly Haven（CC0）を参照。
- 独立水面試験: 青緑色調とclearcoat normalの追従を調整後、shader/GPU errors0・warnings0、同cameraで時刻0→5秒だけを変えた画像差183,741px。既存11水meshの連続world-XZ normal、追加reflection render target0、dispose後の元材復元とresource baseline復帰を確認。証拠 `docs/reviews/f1-closed-water-v3/water-verification.json`、PNG2枚と修正前履歴。**独立WebGL試験であり、実ゲーム統合や実機FPSの合格ではない**。
- 最終map guard/clearance: 25source hash一致、932 hard placementsと104 cardinal sweepsで干渉0。高さ帯0.12〜2.1m、経路幅1.8mの保守的三角形AABB検査。薄い苔/紙/植生などsoft1,377配置は理由付き別扱いで、全geometryの無条件通過保証へ拡張しない。`docs/reviews/f1-closed-ruins-v3/clearance.json` に実体、修正前結果も保存。
- 再現/証拠: `assets/3d/dungeons/b1_closed_ruins_v3/manifest.json` と `verification/khronos-validation.json` / `source-portability.json`、`tools/f1-closed-ruins-v3/assets/build_*.py` を各単体で専用Blenderに渡す制作手順。**実ゲーム全suiteはこの記録時点で実行中、まだpassと扱わない**。主担当が完走後にruntime source hashと結果を追記する。通常表示/main公開/美術承認への昇格は含まない。

### 第4層：粘性溶岩の閉じたメッシュ・岩壁密着・冷却殻（2026-11-17）
- 名称: Blender Pythonによる前後・側面を持つ厚い溶岩滝メッシュ、岩壁接触パス、熱画像PBRと冷却殻の追加造形。
- 目的: 旧V13の薄い浮遊シートが水のように見える問題を修正。岩壁から離れた落下流のz位置を崖へ近づけ、着地点で粘性溶岩塊を形成する。
- 技術: Blender標準Mesh APIとPrincipled BSDF/UV/PBR。公式 https://docs.blender.org/api/current/ および https://docs.blender.org/manual/en/latest/render/shader_nodes/shader/principled.html 。新規第三者アドオン・有料素材なし。既存プロジェクト内の溶岩テクスチャと玄武岩PBRを再利用。
- 導入先: https://github.com/koda24-cell/kotama-no-bouken/pull/470 、tools/floor4/magma_river/build_magma_river.py 。元の地形/河川/岩は保持し、滝の厚みと岸の冷却縁、短い発光亀裂を追加。
- 実行: GitHub Actions https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44026524892 （**結果確認前**）。美術承認なし、正式保存なし、ゲーム内VFX動作未実装。
- 注意: 静止GLBは実際に流動する流体ではない。横からの接触/浮遊判定、GLBメッシュ・PNG実体、ゲーム性能は実レンダー/ブラウザ確認後に評価する。

### B4粘性溶岩・岩壁密着V14–V17の実検証（2026-11-17）
- V14 https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44026524892 、V15 https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44027091713 、V16 https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44027581364 、V17 https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44028204063 は全てBlender Actions **success**。
- V17 Artifact 14304097614 のGLB/Blend/4方向PNG/manifestをダウンロード。SHA256が6ファイル一致、GLB 400 meshes/9 imagesを実確認。
- V14は滝が岩に隠れ、V16は下流端が発光団子列になったため採用せず。V17で厚い岩盤支持体と一体型冷却縁を維持し、側面の浮遊感を軽減。
- **未検証/未承認**: ゲーム内GLTFLoader、動的熱ゆらぎ、火の粉の時間変化、FPS、タイル接続、ユーザー美術承認。実行コードとGLBは未マージのPR #475上にある。

### BotW 公式公開技術の全階層向け設計登録 (2026-11-18)
- 出典: https://cedec.cesa.or.jp/2017/session/VA/s58eed7182c81b.html （近/中/遠景、時間・空間レイヤー） / https://cedec.cesa.or.jp/2017/session/VA/s58eed8209ffce.html （データ駆動VFX） / https://www.youtube.com/watch?v=QyMsF31NdNc （相互作用ルール） / https://cedec.cesa.or.jp/2017/session/ （制作/QA/UI/サウンド）。
- 用途: 全階層の空気遠近・植生・水/溶岩・瘴気・LOD・制作QAを共通原則で設計。既存研究と重複する部分は再利用。
- 状態: 公式公開要旨とGDC講演を調査し、採用計画を文書化。実ゲーム導入・レンダリング・GPU実測は未実施。
- 権利: 技術的知見のみ参照。任天堂のコード/画像/ゲームデータはコピーしない。講演資料の公開制限に注意。
- 手順/優先順位/検証: [BOTW_ALL_FLOORS_TECH_ADOPTION_20261118.md](BOTW_ALL_FLOORS_TECH_ADOPTION_20261118.md)。


## B5 BotW 怨念 / TotK 瘴気の技術研究（2026-11-19）

- **公式資料**: [CEDEC 2017 BotWエフェクト](https://cedec.cesa.or.jp/2017/session/VA/s58eed8209ffce.html)、[CEDEC 2017 レイヤー描画](https://cedec.cesa.or.jp/2017/session/VA/s58eed7182c81b.html)、[Nintendo DREAM講演取材（ひも）](https://www.ndw.jp/post-1121/)、[任天堂VFX職種解説](https://www.nintendo.co.jp/jobs/introduction/design/work04.html)。講演概要/取材確認済み、怨念固有の内部実装は非公開・未確認。
- **第三者研究**: [MiasmaSharp](https://github.com/BladesawStudios/MiasmaSharp) はTotKの領域指定・合成・ノイズの研究。**AGPL-3.0のためソースをコタマへコピーしない**。BotWの怨念と混同しない。
- **応用候補**: Blender Curve→Meshによる不規則な紐/根、world-space/domain-warp侵食膜、黒紫の表面と局所的な脈動emission、深度付き薄霧、遠景レイヤー。**研究のみ / 未導入 / 実レンダ未検証 / NOT_APPROVED**。
- **技術・出典・検証状況の詳細**: [B5 BotW/TotK瘴気技術調査](research/B5_BOTW_MALICE_VFX_TECHNICAL_RESEARCH_20261119.md)。既存岩・VFXの原本保持、独立候補で比較。

### B2 共通Blender+ClamAV環境の実導入（2026-11-19）
- 対象: `.github/workflows/b2-bridge-props-render.yml`, `.github/workflows/b2-stone-ruins-v4-render.yml`。PR [#542](https://github.com/koda24-cell/kotama-no-bouken/pull/542) を `development` にマージ。
- [橋小物 run #44448963669](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44448963669): success。ClamAV source 1件・出力18件、感染0。GLB4点/3方向PNG12枚を実生成しヘッダとSHA256検証。
- [石造遺跡 run #44448970296](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44448970296): success。ClamAV source script 1件・source GLB 1件・出力18件、感染0。GLB4点/3方向PNG12枚を実生成しヘッダとSHA256検証。
- 両ワークフローでBlender/ClamAVのaptインストールを除去し、検証済みGHCR digest固定・freshclam毎ジョブ更新・取得/読み込み前と生成後の実スキャンを使用。
- 画像の**目視評価は未実施**。素材は未承認で、GitHub Actions Artifactsの14日間一時保存のみ。Draco圧縮なしのGLB出力。

### B4小物：手続き劣化材質の単一アトラス・ベイク＋Poly Haven公式API取得（Claude、2026-11-19）
- 名称: `tools/b4-props/common.py`（Claudeチーム用ハーネス）＋ `.github/workflows/b4-props-render.yml`。ブランチ `feature/ai-claude-b4-props-20261119`（未マージ）。設計: `docs/3d/B4_PROPS_DESIGN.md`（同ブランチ）。
- 内容: Blenderの手続き材質（Bevelノードによる角の摩耗、AOによる凹みの灰、高さ・熱源距離による煤と熱変色、ボロノイの炭化割れ、割れ目だけの発光）を、1オブジェクトに結合→Smart UV→Cycles EMIT/NORMAL/AOベイクで **BaseColor（AO乗算）／ORM／Normal／Emissive の1枚アトラス・1マテリアル** に焼き、JPEGテクスチャ埋め込みGLBに書き出す。ベイク後の見た目を「暗い溶岩洞（溶岩の照り返し＋ゲーム内でも置く点光源）」とstudioでレンダー。点光源は manifest の `game_lights` としてゲーム側に渡す。
- 素材取得: Poly Haven公式API `https://api.polyhaven.com/files/<id>` から1K JPG（Diffuse/Rough/nor_gl）を取得。ライセンス CC0（https://polyhaven.com/license）。使用ID: rusty_metal_03、rust_coarse_01、wood_planks、raw_plank_wall、rock_face_02。SHA-256はrunログに出力し、各アセット manifest の `cc0_textures` に記録。
- 環境: GitHub Actions ubuntu-latest、公式tarball Blender 4.2.3 LTS（キャッシュ）、Cycles CPU。**共有のBlender 5.3＋ClamAVコンテナには未移行**（外部画像の取得後ClamAV検査はまだ入っていない。移行は今後の課題）。
- 実動作確認: 火鉢 `b4p_brazier_cage` run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44534782085 （v1、成功）、https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44539842585 （v3、成功）。GLB 1.3MB（PNG埋め込み時は3.7MB→JPEG化で削減）、約9,770三角形、1マテリアル、レンダー9枚をブランチへコミット。
- 失敗と修正: 半径計算の負数べき乗で complex 例外（clamp で修正）。灰の板は地面と馴染まないため廃止。照明が強すぎて錆が橙一色に見えた→溶岩照り返しを約1/4に。
- 状態: **NOT_APPROVED**（ユーザー未承認）。ゲームへの統合・Three.jsでの実描画は未検証。
