# 共有ツール・技術・アドオン台帳

本台帳は発見時点で登録し、検証後に同じ項目を更新する。運用: [TOOLING_AUTO_SHARE_POLICY.md](TOOLING_AUTO_SHARE_POLICY.md)。元の広域研究: [STYLIZED_GAME_TECH_LIBRARY.md](STYLIZED_GAME_TECH_LIBRARY.md)。

| 名称・技術 | 用途 | 情報/導入/検証状態 | 出典・実装・証拠 |
| --- | --- | --- | --- |
| Wikimedia Commons CC0/PD 写真の ClamAV ゲート取得（`wikimedia` 収集元） | 実写の夜景ビル写真を遠景テクスチャに使うため、Commons API の extmetadata で CC0/Public domain を再確認してから 2 回スキャンして保存 | **2026-11-26 実行成功**：3d-asset-studio [run #45734660627](https://github.com/koda24-cell/3d-asset-studio/actions/runs/45734660627)、写真 3 枚＋ambientCG Facade009/010/020C を SAFETY_CHECK_OK で保存（ブランチ `claude/asset-harvest-20261126-b5`、main 未統合） | `tools/harvest/harvest.py` の `wikimedia`・`ambientcg-ids` / [B5 V6 設計書](B5_ABYSS_TEMPLE_V6_DESIGN.md) |
| B5 V6 アセット検証ラボ（Three.js 単体撮影） | 手続き生成の Three.js アセットを、ゲームと同じ ACES・露出 1.3・ブルームで 1 つずつ撮影して確認 | **2026-11-26 Claude の作業環境で実撮影**（Chrome＋SwiftShader、three r180 を GitHub から取得してローカル配信）。ゲーム実機での体感は未確認 | `preview/b5v6-asset-lab.html?asset=gallery&props=brazier,wallTorch&mods=b5v6-war-props` |
| F6成木・画像生成枝付き葉束透過PNG6種＋CC0 Bark015樹皮アルベド改良 | V25承認済み樹冠の広がりを保ちつつ葉の粒状感と幹の写真調を改善するためのテクスチャ素材／Blender画像カード試作 | **2026-11-19 PNG6個+樹皮派生色/元PBRとSHA準備済み、Blender5.3の貼付実レンダリング未検証**。元GLBとスクリプトのsource gate [#44524342517]成功。画像バイナリは会話内配布キット、GitHub正式素材には未登録。美術未承認 | [設計・事実記録](F6_PAINTED_SPRITE_TEXTURE_RESEARCH_20261119.md) / [試験Draft PR #631](https://github.com/koda24-cell/kotama-no-bouken/pull/631) / [ambientCG Bark015](https://ambientcg.com/view?id=Bark015) |
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

### Three.js インスタンス連番ビルボード（B4 12F、2026-11-22、Claude）
- 実装: `field/b4-fx12.js` の `flipbook(sites, {sheet, cols, rows, fps})`。InstancedBufferGeometry 1 つで複数の炎を描き、時間＋インスタンスごとの seed でコマを選ぶ。縦軸固定のビルボード、カメラ 1.6 m 以内でフェード。
- 素材: OpenGameArt の CC0 連番（Mikodrak fire 1b/1f、animated flame sheet、tauran flame）を Actions で取得し、Pillow で 1 枚のアトラスに詰め直した `assets/vfx/flipbooks/`（出典・ライセンスは manifest.json）。
- 検証: ローカル SwiftShader 撮影と `tools/b4-3d/game-test.cjs`（GPU 資源の増加なし・dispose 1 回）。実機での見た目は未確認。**NOT_APPROVED**。

### 一層閉鎖神域V3: 最終ゲーム・実天井・共通監査の完了追記
- 制作PR #465。固定入力で実ゲームfresh3条件/18項目がpass、実画像16枚（初回9画像は入力/PNG SHA一致で再利用、機能はfreshから再実行）。水の固定250ms待ち誤判定は実frame時計を待つハーネスへ修正し、失敗履歴も保存。page/console errors0、WebGL upload警告0。通常preloadや外部font接続問題は別記録。
- development2572845とのマージ後もfresh3条件/18項目pass、追加実画面2枚。元17GLB・新5GLBの形状と画像不変。証跡はPR465の docs/reviews/f1-closed-v3-current-development/ と f1-closed-ruins-v3-game/。
- 天井は実GLB三角形rayで274歩行床×9=2466点全hit、指定3開口の中心/周辺は非hit。配置数だけの屋根主張ではない。proof: docs/reviews/f1-closed-ruins-v3/roof-ray-coverage.json。壁/木/alpha/実画面の美術承認は別。
- 共有Blender5.3+ClamAV/security/reimportと構造監査の両jobが成功: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/45051036648 。既存出力の再import/packed画像decodeと原本/従来20PNGのhash不変archiveを行うrunで、新規20レンダーではない。入力/出力scanの各step成功をGitHub API receiptへ記録。rawログdownloadは環境からHTTP403で、artifact内容を取得したとは扱わない。
- 同構造監査のローカル結果は5GLB/6694tri/14primitive instances、全てfoliage-or-transparency review分類。汎用Auto Review run45051033409はstartup_failure、そこからのLOD生成成功やゲーム自動最適化は未実証。元GLBを自動decimate/置換しない。実機FPS/全GPU/長期進行/最終美術承認/通常main公開は範囲外。

### 第一層V4: 単独逐次制作・反射と採光の改修計画
- PR728。ユーザーが並行チームを避け一つずつ制作するよう指定。3Fは見た目の圧縮だけでなく実mapを手設計の一本道/分岐/行き止まりへ変更する。固定ID/報酬/保存形式は保持し、既存loadの壁内位置検査/fallbackを確認。制作前設計: docs/3d/F1_LAYER_V4_DESIGN.md。
- 一つ目は既存正面を保持した両面石組アーチ。左右の控え柱と背面に石/根を加える。共有Blender5.3+ClamAVで単体→書出GLB再import正面/裏/横/斜め/上を撮影し、hash確認済みNOT_APPROVED候補だけを同branchへ恒久archiveする。run45144416128は実行中、成功/美術合格は未確認。新有料API/アドオンなし。
- 次段階の技法候補: Three.js公式Reflector（https://threejs.org/docs/#examples/en/objects/Reflector 、MIT）を連結11水面で一つだけ共有し、低彩度の動的水面へ天井/柱を反射。画面外や静止時の更新を抑え11回reflectionpassを避ける。崩落孔にはSpotLightと自作のsoft light-volume/塵。まだV4で実装/実GPU未検証。既存共通VFX資料を参照し外部画像を転用しない。
- 1F→2F→3Fは同じ素材を段階的に増やし、元の1F/2Fのmapとゲーム進行を維持。技術QAと芸術承認/実機FPS/通常main公開を区別する。


### 第一層V4・両面アーチ1点の逐次制作: 実出力確認（2026-11-23）
- ユーザー指定により同時agent/複数モデル生成を使わず、既存アーチ正面を保持した両面接続アーチ1点を制作。共通Blender5.3+ClamAV [run45147327732](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/45147327732) 成功。生成GLB再importの正面/背面/側面/斜め/上面5PNGを実際に目視。最初のcoplanar黒面を検出・不採用とし、石ごとのBoolean EXACT UNIONで修正・撮り直した。
- 原本GLB/Blend/5PNG/scan receiptはPR728の `assets/3d/dungeons/b1_layer_v4_candidates/` に永続保存、NOT_APPROVED。GLB SHA256 `0a2bbcf4b0b470f3b615e771dfdc2034a8bc68fc5224cd8d44c0cdf5eaaa3dca`、11784tri/4primitive/2673540bytes。Khronos形式検査errors/warnings/infos/hints全0。共通性能監査 [run45149374790](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/45149374790) 成功。元品質を落とす自動decimationは未適用、実機FPS/最終美術承認は別。
- 失敗を隠さない: 初回run45144416128はBlender Python例外でもprocess exit0で共通jobだけgreenとなった。タスクwrapperでtraceback保存・os._exit(1)・GLB/5PNGの実在検査を追加。Git ownership対処は一時container内の対象checkoutだけsafe.directory指定。jobのgreenだけを画像完成とみなさない。
- 水/光/3階層の実ゲームQAはPR728側で継続中。この情報のみの追記はゲームコードやモデルの承認・本番適用ではない。


### 第一層V4・反射/採光/段階石材の実ブラウザー検証（2026-11-23）
- PR728/source95e4dc35a7dd80583fde592882cb815c6e063387。Three.js r180 Reflectorの単一256px targetを11水面で共有。localXYの結合平面を水平回転し、world座標へtextureMatrixを変換。移動時2frame/静止時6frameの更新間隔。実ゲーム画面で天井の反射/低彩度水/水底を確認。3開口にdepth-testedの光の筋とSpotLight、水場1か所だけ512px shadow。
- 独立WebGL実行で水/採光2回dispose後、native material/geometryとrenderer.shadow設定を復元、GPU geometry1/texture0がbaselineと一致、GL error/shader警告0。これは全GPU/実機FPSの保証ではない。
- 1F/2Fの元の石形状/UVを保持したclone材へ38%→68%の同じ石肌/normal/roughnessを追加、3Fへ段階移行。prototype材を直接変更せず復元/解放。実画面を撮影、fresh3条件の実ゲームQA、別freshで実階段/会話/回復/戦闘帰還pass。
- 実マップ106歩行/11行き止まり/11分岐、固定7物不変。実形状757硬配置×106移動帯の衝突0、天井945/954hit（残りは指定穴）。旧歩行位置182点の既存save fallbackとflags保持pass。通常保存領域に置いたsentinelを保持し、iframeが独立Mapを使うwrapperも実ブラウザーpass。
- 原本・失敗画像・誤った検査条件（wrapperメモリー保存もnullと仮定した初回）を隠さず、docs/reviews/f1-v4*/ と docs/3d/F1_LAYER_V4_REVIEW_HANDOFF.md に保存。通常main公開/実機FPS/最終美術承認なし、NOT_APPROVEDを保持。汎用Auto Reviewのstartup_failureをLOD成功としない。


### 第一層V5: 光源円盤の除去・局所木漏れ日VFX調査（2026-11-23）
- ユーザー実画面の白い円盤はV4のvisible-sky-aperture mesh。V5はこの発光形状を作らず、見える光源なしの局所的な光の筋へ改修中。制作はroot単独・逐次、元モデルを保持。
- 調査: [pmndrs/drei SpotLight](https://github.com/pmndrs/drei/blob/master/src/core/SpotLight.tsx)、[MIT](https://github.com/pmndrs/drei/blob/master/LICENSE)をGitHub APIで確認。React依存の追加/コード転用はせず、局所volume設計の参考。[three-good-godrays](https://github.com/Ameobea/three-good-godrays) READMEも確認。postprocessing依存とライセンスNOASSERTIONのため導入/再配布しない。既存のThree ShaderMaterial/SpotLight(MIT)で独自実装。
- 試作は各開口の小さなbox内10sample積分・柔らかいray/noise移流と、独自生成の葉影cookieを使う。SpotLight.mapはThree r180 WebGLLights実装で影なしでもmap投影行列を更新することを確認。外部画像取得/texture転用なし。実ブラウザー描画/資源解放はこれから検証。
- 天井と壁の隙間を上部石帯/裏側の連続した石面で閉鎖。F3は191歩行セル・31分岐に増やし既存7固定物/11水セルを保持、既存の苔石/草花/蔓を壁際に群配置。新規GLB造形/自動decimationなし。既存候補はNOT_APPROVEDの試遊表示のみ、mainは変更しない。


### 第一層V5: 木漏れ日・閉鎖屋根・視線の実検証追記（2026-11-23）
- 制作PR733、source15a7060/0f62345。光源CircleGeometryを生成せず、10sample局所volume/移流する筋/独自葉影cookieを実装。石の光井戸の内壁まで白くしていた旧PointLight補助灯も撤去。下向きSpotLight3、shadow map1。水を固定して光だけ進めた実PNGが異なり、時間変化を確認。外部VFX package/画像の導入なし、Three.js r180上の独自実装。
- 上部石帯/背面屋根/中心が開いた光井戸で天井と壁の隙間を閉じる。独立WebGLの実geometry5方向ray hit、穴中心は非hit・縁はhit。2回dispose後のgeometry1/texture0はbaselineと一致、native材とshadow設定を復元、GL error/警告0。
- 実GLB三角形の視線検査で、通行不可のNPC/箱など5物を壁で隠していた問題を発見。通行と描画を分離し、旧2/7→7/7に遮られない接近方向を確認。原本モデルは保持。
- 3Fは191歩行/31分岐、旧106歩行位置と固定7物/11水セルを保持。苔石65/下草205/草花43/シダ30/蔓98/倒木8などの群配置。実GLB984硬配置×181移動帯（幅1.8m）の衝突0。柔らかい葉/紙と頭上のruntime閉鎖geometryを区別する。
- 最終fresh3条件の表示/移動/壁/宝箱一回/hash不一致fallback、別freshの実階段/会話/回復/戦闘帰還、保存領域sentinel不変のwrapperをpass。page/console errors0、入力52件のSHAが実行後も一致。証跡 docs/reviews/f1-v5*/、説明 docs/3d/F1_NATURE_LIGHT_V5_REVIEW.md。
- 実画面を見た岩の単体感・内壁過露出の不採用、実行中の美術変更を検出した入力guardの失敗もiterationとして保存。候補はNOT_APPROVED、原本GLBの変更/新規一括生成/並行agent/汎用decimationなし。実機FPS/長期進行/最終美術承認/main公開は別。


#### V5追加確認: 低い崩落壁の裏当て（2026-11-23）
- 既存壁は一律4m高ではなく、1F/2Fの崩落壁では上端帯だけだと低い隙間が残る。PR733の閉鎖helperへfullBackingを追加し、元の崩落形状を残したまま背面の石組みを床から天井まで連続させた。native hidden doorの開閉は既存doorSigによる再buildを維持し、通行/固定物を変えない。
- 独立実WebGLのrayを5本から9本へ拡張（低い隙間の高さ4本を追加）し全hit。開口中心は開放・縁はhit、2回dispose後baselineのgeometry1/texture0と影設定へ復元、GL error/警告0。最新のfresh3条件、別freshの実階段/会話/回復/戦闘帰還もpass。
- 実画面の1F/2Fと補助構造の有効数を保存。1F508/2F504の壁背面と各567の屋根裏当て。表示中の壁/天井接続の補修であり、新規GLB生成・元assetの置換・美術承認/実機FPS承認ではない。証跡はPR733 docs/reviews/f1-v5-game/ と f1-v5-water/、説明はF1_NATURE_LIGHT_V5_REVIEW.md。

### F1 V6 一体ずつの直列制作とカメラ退避域（2026-11-24）
- 作業PR736 / feature/f1-sightline-flora-v6-20261124。自作Python、既存共有Blender5.3/ClamAV、既存自作葉脈・石PBRを再利用。外部新規素材なし。
- 提案: shared gatewayへ省略可能artifact_suffixを追加（空なら旧名保持）。matrix max-parallel:1で一つのモデルの造形→GLB再取込5方向PNG→検査→ハッシュ照合→候補保存が終わってから次へ。初回はsedge一体のみ。実行45204260835開始、実PNG/GLBは未確認。実行コードの承認・導入済みとの主張ではない。
- 視界診断: 2m開口アーチを歩行マス中央へ置くと1.1m後退するカメラが横向き時に柱へ入る。マス境界への移設と旋回範囲の実画面確認を予定。体幅だけのclearanceでは不十分。現時点で修正・検証未完了。
- 草3種、岩3種、移行壁3種を各一体ずつ制作予定。NOT_APPROVEDを維持。main/正式素材昇格なし。参考: https://github.com/koda24-cell/kotama-no-bouken/pull/736 。

#### V6利用者修正: 密集草は透過カード（2026-11-24）
- 利用者から「草は画像を貼る方が軽い」と指摘。原本4320triのsedgeを各所に大量配置する計画を変更。実行45205382187は直列キューの最初の草の段階で中止（完了扱いにしない）。
- 自作原本GLBを再取込し、照明を焼き込まないbasecolor+透過の3方向512px画像を自作。1枚1536×512アトラスへまとめ、3交差板/6tri/1材質の候補を作る。既存multi-view impostor実装の考え方を近い草向けに限定利用。原本は別GLB/Blendとして保持。板も実GLB再取込5方向、alpha MASK/閾値/黒縁/斜め上からの薄さ/被覆率mipを確認予定。
- 新しいgrass_cards.pyと試験組込みは未検証。既存foliage coverage helperを再利用する予定。枝・岩・壁を画像板へ一括置換しない。画像の権利は自作造形/自作葉脈からの焼出しのみ。

#### V6透過草の初回実証と裏面照明（2026-11-24）
- run45206056039成功、候補archive829a30d。原本sedge GLB4320tri/3材質を保持し、別v6_sedge_cards.glbを実生成。6tri/1材質/1透過アトラス1536×512、alpha MASK .35、両面。GLB再取込5PNGを実確認。上からは縦板が薄くなる制約あり、固定目高のダンジョン用候補であって全視点向けの原本代替ではない。
- 独立実WebGLで同じ25株比較: 草のみ108000→150tri、3→1draw、5→1texture。床込み108002/152tri、4/2draw。glTF-validator errors0、GL errors0。CPU送出時間は揺れるため実FPS改善率に読み替えない。元GLB229KBに対しカードGLB567KBであり、ダウンロード容量の削減とは主張しない。
- 初回比較で裏面の上向きnormalがThreeのDOUBLE_SIDEDによって下へ反転し、交差板の一部が黒く見えた。草限定のclone材質でnormal_fragment_beginのfaceDirection反転だけ除き、両面を同じ葉冠として照明。MSAA alphaToCoverageを追加し、既存coverage mipを保持。元材質/GLB/alpha閾値は変更しない。独立WebGLで再比較し黒い面を補修したPNGを確認。ゲーム組込み・全草種・実機FPSはまだ未検証。
- 実装候補field/f1-grass-cutout-lighting-v6.js、証跡docs/reviews/f1-v6-grass/。原本と軽量候補の双方NOT_APPROVED。後続8assetはmax-parallel1のrun45207192804で順次生成中、全完了とはしない。

#### V6途中の追加検証と不採用（2026-11-24）
- 全721歩行セル×4方向=2884視点を、最終3草GLBの実UV/実RGBA alphaに対して投影。足元領域に不透明サンプルが全視点で残った（最小147、148、148）。これは幾何投影であり、全画面の美術・遮蔽・実FPS合格ではない。
- アーチを境界へ移すだけでは横移動の途中でカメラが柱へ寄る。自作f1-camera-clearance-v6.jsがレビューアーチ近傍だけ眼の横ずれを滑らかに制限する（プレイヤー移動/当たり判定変更なし）。実GLBへの1008眼位置のray検査で旧78交差→修正0、90度回転同値も確認。ゲーム全画面検証は未完了。
- 岩試作schistは苔が面ごとの緑色になり、実PNGで三角形の塗り分けに見えたため不採用。run45208952908は草3種と旧schistまで保存後、中止。連続した石のPBR/彫刻と、実表面ray上に座る小さな苔の厚みへ改修し、run45212714189でschist一体を再検証中。後続岩/壁の完了・美術承認とはしない。
- GitHub job metadataのBlender5.3/入力検査/出力検査/保存成功は確認したが、CloudからAzureに転送されるjobログの直接取得が403。ログを取得済みとは主張しない。最終候補全部に共有Performance Auditと追加ClamAVを実行し、ログとハッシュをGitへ保存する予定。候補NOT_APPROVEDを維持。


#### 第一層V6: 透過画像植生と最終検証（2026-11-24）
- PR #736、試験コード b3f86ba5bfebe7c96414999941d6b529ff614d0b。既存V6登録（PR737–740）の最終追記。共有Blender5.3+ClamAVで9種類を順番に制作、並行agentなし。草3種は原本を残し、自作アルベドatlas・3枚交差カード（1株6tri/1材質）を別候補として生成。MASK .35/両面法線補正/MSAA alphaToCoverage、16mインスタンス/距離カリングを試験。汎用decimation/外部画像転用なし。
- 個別制作run45206056039、45208952908（草2種の個別job成功後に後続岩を中止）、45214438865、45215795705、45220723124。共有最終監査 [45267597594](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/45267597594) 成功。12GLB/62410triは原本を含む単体合計、ゲームFPSではない。ClamAV1.5.4:296ファイル/検出0、glTF-validator12点errors0/warnings0、60方向PNG/Blend/ハッシュをGitへ恒久保存。
- 実ゲーム15PNG・会話/回復/宝箱一回/階段4リンク/戦闘帰還/通常表示/hash不一致fallback pass、page/console errors0。721セル×4方向の草投影、1008移動眼位置のアーチ交差0、追加硬物1221配置の通路干渉0。別起動の試験iframeで通常セーブsentinel不変を確認。起動前診断のnullガード補修後もfresh wrapper pass。
- 原本と候補GLB/PNGはNOT_APPROVED。試験表示だけで、正式美術昇格/main変更/全端末FPS認定なし。草カードの容量は一部原本より増加、真上から薄い制限あり。詳細・再現スクリプト・実画像は feature の docs/3d/F1_SIGHTLINE_NATURE_V6_REVIEW.md と docs/reviews/f1-v6*/。
- 固定SHA試遊URL: https://raw.githack.com/koda24-cell/kotama-no-bouken/b3f86ba5bfebe7c96414999941d6b529ff614d0b/preview/f1-sacred-playtest.html （未マージの試験版）。


### 第一層試遊の配信障害対策（2026-11-24）
- 対象: PR736のV6試験URL。ユーザーの起動停止報告を受け、raw.githackのHTML/JSに403を実測。jsDelivrでも一部JS取得失敗/ORBを実ブラウザで再現。世界共通の障害とは断定しない。
- 新規packageなし。既存の固定SHA b3f86ba5bfebe7c96414999941d6b529ff614d0bのコードのみを、Fastly jsDelivr/CDN jsDelivr/raw.githubusercontentからCORS fetchで順次取得。成功したコードを同一originのJS Blobにし、defer順序/モジュールmapを維持。import.meta.urlは元の固定SHA URLへ解決して実GLB/テクスチャ参照を維持する。自前コードの配信回復helperで、第三者ライブラリの新規転用/素材制作なし。
- 通常保存の隔離スクリプトは先に取得し、iframeの全ゲームコードより前にinline配置。隔離ファイルが取得できなければゲームを起動しない。HTTP/起動失敗と長時間待機をヘッダーへ表示。ゲーム本体/マップ/承認状態を変更しない。
- 現時点: 実ネット経由の3FでsourceHashesVerifiedと試験表示中へ到達。別の全階リンク・失敗時の保存保護を検証中。クラウド検査用Chromiumのみ管理proxyの証明書例外を使用し、配布ページではTLS検査を無効化しない。最終結果は追記する。

- 最終検査追記: fix/f1-preview-delivery-20261124 / ca532ed66f518627c5bdf1272310261c5934b147。実ネットの3F/1F/2F起動・描画・素材ハッシュをpass、page errors0。保存sentinel不変/子のメモリsaveVersion12を確認。隔離entryの全3配信先503注入でiframe空/通常保存不変をpass。証跡 docs/reviews/f1-v6-delivery/live-verification.json と3枚の実PNG。直接raw.githack HTMLはクラウドから403のため配信先自体の表示確認とは区別。
- 新しい固定SHA試遊URL: https://raw.githack.com/koda24-cell/kotama-no-bouken/ca532ed66f518627c5bdf1272310261c5934b147/preview/f1-sacred-playtest.html 。旧SHAのURLは内容を更新できないため、この入口を使用。


### 第一層V7: 明視性と2F後半の石組み推移（2026-11-24）
- ユーザー修正: 暗くて見にくい、2F入口で壁の品質が急変。新規ツール/package/外部素材/モデル制作なし。既存9候補を保持し、経路距離による推移helper f1-transition-v7.jsで2F前半のnative壁を残し、後半だけnative→中間A/B/C→実3F壁へ隣接段階で分配する。1F同等の石表面処理から後半だけ詳細度を上げ、苔/下草の配置密度も同じ経路に沿って推移。
- 既存Three.js r180のHemisphereLight/低強度AmbientLight/exposureのみで足元の明視性を調整。試験表示のみ、通常表示の露出1.3/追加fill0を保持。天井/霧/マップ/保存/原本GLBを変更せず、NOT_APPROVEDを維持。
- ソースbranch fix/f1-light-and-f2-transition-20261124。実画面の同位置before/afterと全壁の保持条件・実通路干渉を検証中。前半の歩行148セルでnative、後半にA26/B63/C20/3F7セル（全264）という実マップの方針検査はpass。美術承認や全端末FPS評価とは別。


#### V7 実画面・通路の検証と配信モデル回復（2026-11-24）
- runtime checkpoint2744ad727f3b44140b8438e5d663db1f4affce9b。実index/GLBの同位置before/after14PNGと通常表示をpass。66入力がcheckpointと一致、前後SHA不変。2F504壁は元壁291/A52/B104/C42/実3F壁15。7組の8bit平均輝度は2.20–3.01倍で、測光/FPSではない。通常表示は露出1.3/hemi1.7/追加fill0を確認。岩/置換壁930配置・675経路の幅1.8m干渉0。説明F1_LIGHT_TRANSITION_V7_REVIEW.md、証跡docs/reviews/f1-v7/。
- 新しい配信SHAを実ネットで確認中、Fastly側のgather_logging_point.glbに403を実測し起動停止を再現。失敗JSONはf1-v7-delivery/iterations/initial-model-403.json。preview専用installAssetRecoveryで固定repo/SHA内GETのみ、Fastly→CDN jsDelivr→raw.githubusercontentへfetchを再試行する。Request設定・abortを維持し、他URL/非GETは元fetchへ委譲。第三者packageなし、ゲーム本体/素材byteを変更しない。元のhash検証も継続する。
- スクリプト取得/保存隔離の先行配置は前回の回復helperを維持。モデルの初回503を故障注入し、成功するGLBは実ネットの別経路から取得して検査中。2Fは試験表示中/素材hash確認へ到達、2F/3F・通常保存保護の最終結果は追記予定。検査用proxy証明書例外だけを使用し、配布ページのTLS検査は無効化しない。

- 最終実ネット結果: 2F/3Fをpass。Fastly採集GLBの503注入2回を実CDNの代替GLBで回復、各floorの素材hash・露出1.48/fill.32・通常保存sentinel不変/子memory saveVersion12を確認。隔離entryを全3経路503にした時はiframe空/通常保存不変、page errors0。成功応答のローカルGLB/Three差し替えは行わない。f1-v7-delivery/live-verification.json/実PNG/source-hashes.jsonへ恒久保存。
- 完成した試験入口（2F開始・正式昇格前）: https://raw.githack.com/koda24-cell/kotama-no-bouken/f14eb3f2d1a72ca048db07d25a1f4f71ecf4eb78/preview/f1-sacred-playtest.html?floor=1 。runtime/modelsは2744ad7に固定、loaderだけに配信回復を追加。NOT_APPROVED/main不変更を維持。

### 第3層・工業遺跡都市の個別制作（2026-11-24）
- ユーザー訂正: 当初4層と記載されたが、対象はarea3遺跡都市の強化であり階層移動なし。Pinterest接続の公開候補24件を検索し、実サムネイル確認。画像は参考のみ、ボード保存/ゲームへの転用なし。資料はpinterest-reference-library/references/f3-industrial-ruins-20261124.md、公開設計F3_INDUSTRIAL_RUINS_DESIGN_20261124.md。
- 新規CLI/packageなし。既存のcommon.py、実GLB再import renderer、Blender5.3+ClamAV gatewayを使い、1プロセスで1個別アセットを制作するcallerをfeature/f3-industrial-ruins-20261124へ追加。20補完パーツを準備し、既存素材も強化する。候補はNOT_APPROVED。並行agentなし。
- 材質はCC0 https://polyhaven.com/license 。既存chipped_concrete / concrete_mossのdiffuse/normal/roughnessを元SHAと照合して再利用。追加rusty_iron / asphalt_02は公式公開API→1K JPGを取得直後ClamAV、画像処理/Blender前に入力全体を再スキャン。初回run45324735177はGit所有権チェックで失敗、成功扱いにしない。safe.directoryを固定作業checkoutへ設定した再実行 [45325426373](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/45325426373) は成功。壁GLB/Blend/5方向PNG、5材質/2358tri、出力48ファイル/検出0を実確認。材質の導入と美術的完成を区別し、壁V1はさらなる風化改善予定。
- 旧ブランチの未統合 buildingV3/wallV5/glassV10/rubbleV29/rebarV4の元モデルを既存Artifactsから復旧。新規の純データrecovery helperは認証ヘッダーを外部redirectへ渡さず、ZIPをClamAV→サイズ/パス/リンク制限で展開→展開後スキャン、コード/Blendを実行せずNOT_APPROVEDの原本として保存。run45326058433成功、元run/Artifact ID/ZIP SHA/全ファイルSHAをrecovery.jsonに記録。未承認の旧制作PRを丸ごとマージしない。
- 進捗サイト https://github.com/koda24-cell/kotama-3d-progress のAGENTSに従い、検査済み壁V1を安定ID f3-industrial-retaining-wall / 制作中として登録。data branch commit1168de5で既存14エントリーを保持し5PNG追加を確認。正式素材承認/ゲーム採用とは別。設計図PNGは未作成・未登録。

### F3: shared-image runtime pack and official database seed (2026-11-24)
- Branch `feature/f3-industrial-ruins-20261124`, source checkpoints 99e5ca4 / c8d1693. `tools/f3-industrial/pack_runtime.py` keeps original embedded GLBs and externalizes exact image bytes by SHA256 into a shared runtime folder, checking geometry/material descriptions and accessor buffer bytes for equivalence. Intended to avoid repeated four-set PBR downloads across 20 individual parts; actual packed output and browser validation still pending. No package or lossy geometry transform introduced.
- Run45328168466 successfully rendered the weathered retaining-wall revision in pinned Blender5.3; side-face UV striping identified in actual PNG, next revision authored but not yet successfully rendered. Not artistic acceptance.
- Run45329487870 failed closed before Blender: official ClamAV CDN429 and missing daily database. No remaining parts rendered by that run. Do not disable scanning or rotate runners to evade cooldown.
- Official ClamAV Docker documentation https://docs.clamav.net/manual/Installing/Docker.html recommends preloaded signature images to reduce full downloads. Docker Hub stable metadata on 2026-11-24 resolved amd64 `clamav/clamav@sha256:9b2f34be1f8be02f58edb1c8868dca99d6e04f8f8daf191f8448c762f563dde3` (tag updated2026-11-23). Task-local seed job copies main/daily/bytecode CVD files from that pinned official image once per serial production run. Optional gateway input downloads that same-run seed, verifies SHA256 and sigtool signatures before installation, then retains mandatory freshclam and input/output scans in the unchanged pinned Blender5.3 container. This approach is **under verification**, not a successful recovery claim. No unofficial database mirror and no scan bypass.
- Original sources remain immutable candidates. All new models remain NOT_APPROVED, trial only; game map/stage identity unchanged.

#### F3 signed database recovery and thin bundle: actual verification
- [Run45331023029](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/45331023029), wall job138232184040: pinned Blender5.3.0; official image seed plus **versioned detached signatures** (`daily-28191.cvd.sign`, main/bytecode equivalents) installed. Omitting those signatures failed closed in45330612296; the initial unversioned filename assumption failed in45330858211. Retain those failure distinctions.
- Required freshclam then successfully applied the signed incremental update to daily28192 (355843sigs). Real source, existing CC0 maps, generated output scans all passed; output56files/0infected/0errors, engine1.5.4. No CDN/IP rotation or security bypass. The model container remains pinned to sha256:5ce601f79b1ab09405b3ebc36b1a596be76cb8b105b1524fcbafcb186ebf7e99. Recovery is technically verified for this job, not a guarantee of future service availability.
- Actual retaining-wall thin runtime310632bytes + exact4880202shared image bytes; original embedded5190488bytes retained. glTF-validator actual external-image bundle:0errors/0warnings. Individual-model size does not drop when counted together with its shared images; the saving comes from sharing repeated maps across subsequent parts. Browser pool/resource lifecycle verification remains pending.
- Verified wall and column PNG checkpoints registered to independent `kotama-3d-progress`, data2048cf5, own models/CC0 materials only. Status制作中, no game promotion. Helper `tools/f3-industrial/publish_checkpoints.py` checks actual receipt image hashes and nonempty zero-infection output scan logs before invoking the existing independent registry tool. Initial wrapper path misuse failed before any registration; corrected invocation registered successfully. Do not claim unattended gallery publication is installed.
- Optional sparse checkout of task-required sources/texture directories is being prepared to reduce unrelated repository transfer. It does not relax scan requirements; execution on sparse checkout still pending. Original ivy vein-atlas helper and pure grid-supercover visibility helper are authored review techniques, actual image/game QA pending. Sightline tests cover intervening walls, visible own facades, sealed diagonal corners, range and quarter-turn invariance. Do not treat these tests as aesthetic approval.

#### F3 scene checkpoints, material grouping and original foliage reuse
- Feature `feature/f3-industrial-ruins-20261124`; source checkpoints41c836e/7f8774f/e5770b5 (2026-11-24). Actual ongoing serial run45332418931 has individually saved wall/steel/utility candidates; hollow-pipe revisions are separately queued in45335192544, not yet rendered. Every normal saved candidate is registered by stable ID in independent progress data; no parallel modeling agents.
- Real browser scene checkpoints are saved under `docs/reviews/f3-industrial-wip-five`, `...-wip-eight`, `...-wip-eleven`. Partial catalogs explicitly contain only completed assets; these are composition tests, not complete20-part acceptance. On the eight-candidate 3-floor snapshot: source hashes passed, reserved scenery overlaps0, measured150–187calls/134979–199056triangles. SwiftShader FPS is not device performance. One external Google Fonts certificate failure, no application JS error; do not report all network requests clean.
- Original first-layer sedge/fern/trifoliate6-triangle cutout GLBs/atlases are reused via existing hash-pinned source cache and `grassCutoutMaterialV6`; no Pinterest image used as a game texture. Source geometry and normal saves remain unchanged. Broader F3 gameplay/body-lane/lifecycle checks are pending.
- Two existing user-approved stair sources are consumed unchanged, separately from20 new parts and5 native upgrades. Actual glTF-validator: new8 sources0errors/0warnings; approved V8/V10 have0errors but9/46 existing warnings (unused objects/runtime-generated tangent space). Preserve those limits rather than claiming every source warning-free.
- New runtime helper uses existing Three.js BufferGeometryUtils material grouping for those static stairs, baking node transforms and preserving triangles. Mirrored transforms reverse winding/handedness. Embedded originals remain untouched. Ten-model browser test explicitly rendered every model twice: allocated GPU geometries311 before grouping→32 after grouping, textures31; each release returned geometry0/texture0, errors0. This is a partial-bundle lifecycle result, not a whole-game FPS claim or full visual equivalence approval. ImageBitmaps are closed on bundle disposal when global Three.Cache is disabled; independent source caches are not closed.
- A hash-corruption fault in the real game restored legacy city mode, far80,12events,one city root, cleared build key, pageerrors0. Review mode uses a separate factory and leaves the ordinary display path intact. The new overlay's soft overcast PMREM reflection (existing Three core, own cloud shader, no external HDRI) and4.7–5.2m parapet composition are under actual screen review; no artistic acceptance claimed.
- Prepared LOD workflow calls the existing shared opaque-rigid review one asset at a time after production. Glass, ivy and native foliage combinations are excluded from generic decimation. It is not yet run. This branch's generic PR auto-model review is excluded only to avoid simultaneous Blender jobs; shared structural audit and task-specific serial review remain required. Do not describe pending executable helpers as deployed to development.


#### F3 final source portability, resource ownership and serial review (2026-11-24)
- Feature branch `feature/f3-industrial-ruins-20261124`, complete opt-in game source `860feb7f883f3655923f07695513c76d3e6602c5`. New20 individual props +5 native upgrades, plus2 unchanged previously approved stair sources; no stage relocation or production promotion. Real GLB/Blend/5-angle PNG, source/output scan logs and hashes are permanently committed. Refinement runs45335192544 (open pipe interiors),45363706593 (organic ivy),45367160754 (rubble contact details/native anchored bars and leaf UV) succeeded. Sparse gateway checkout was actually used; original inputs remain immutable.
- Portable authoring run [45371292917](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/45371292917) succeeded for all25. `make_portable.py` saves separate packed editable `.blend` sources, reopens every output and verifies packed image bytes and original vertex counts. Original GLB/PNG/Blend files are not overwritten. Missing image paths are recovered only from the hash-verified embedded source bytes; input/output AV retained. Files: `portable_sources/` per candidate and shared root `portable_authoring_qa/`.
- Actual complete27-model browser loader test renders every model twice, pools canonical texture/material bytes and closes duplicate ImageBitmaps only when not owned by global Three.Cache. 34materials/58textures/50shared images, approximately111542272 decoded RGBA bytes. Geometry returns to0 after bundle release; one persistent renderer transmission texture cache remains after glass, stable across both loads, not an accumulating model leak. Shared image requests are limited to3 concurrent workers and all workers settle before failure cleanup. Exact image bytes retained, no downsampling/near-model decimation.
- Grid-supercover visibility and per-instance compaction hide other streets; reserved hard props are checked against1.8m movement lanes. Overhead catwalks have explicit piers and3.55m clearance. Own procedural soft contact shadows/overcast PMREM use existing Three core, no external VFX/HDRI/package. The backing is behind facade recesses rather than filling windows/doors. First-layer6-triangle cutout plants reuse original approved cache ownership and source bytes.
- Actual PC7–9F visual tests: all27 model hashes verified, no new scenery/body-lane overlaps, failures[]. Full controls/checkpoint-save roundtrip/puzzle/gather/chest/stairs and repeated area1↔3 lifecycle passed. A preexisting checkpoint deserialization omission was fixed only on this feature branch; valid restoration and malformed-coordinate rejection tested. One Google Fonts proxy-certificate request failure remains recorded. SwiftShader measurements are not physical-device FPS or artistic acceptance.
- Real CDN delivery7/8/9F passed through the isolated launcher with no successful-response resource mocks, pageerrors0. Injected first-host image503 recovered through actual alternate CDN bytes; isolation-entry503 at all hosts left iframe empty and normal storage unchanged. Test-only managed-proxy certificate exception; shipped page does not disable TLS checks. Actual public raw.githack HTML returned200; full direct-public browser test still in progress at this checkpoint.
- [Serial LOD/shared audit run45372771290](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/45372771290) is IN PROGRESS, not all18 complete. Shared25-GLB structural audit succeeded (106559triangle equivalent,101primitive instances; source statistics, not frame performance). Wall/column individual3-LOD/12-PNG comparisons succeeded and were published independently in progress data `b74c468`; originals unchanged, all variants NOT_APPROVED and not adopted. The existing rigid review gets an optional export-tangents flag (default unchanged) and proven zero-tangent repair; foliage/glass/native mixed plant assemblies are excluded from generic decimation. `publish_lod_checkpoints.py` checks receipt hashes, original SHA, every GLB/PNG SHA and nonempty clean scan before independent registry registration. It is manually run, not an unattended integration claim.


#### F3 public delivery and completed source review checkpoint
- Draft art/runtime PR785; all20 new individual parts +5 native upgrades are permanently saved and available in an opt-in trial. Main and normal display are unchanged. Complete fixed game source f2645ec8e619940464d7072a308338e75ac63d66; only inspection startup was improved after860feb7 (original spawn retained, camera faces an existing walkable street, opening narration skipped in inspection, ordinary battle-mode introduction retained). Public wrapper: https://raw.githack.com/koda24-cell/kotama-no-bouken/cdf79cddbc45bd077ce13a1f9fa4ea6e6ed47270/preview/f3-industrial-playtest.html .
- Real raw.githack browser first returned200 with title **External Content Notice**, not the game. Initial automatic wait timed out and is retained as a failure observation; clicking its actual **Open the page** button reached the real trial. Final actual public URL verification:200,27 model hashes,source mode3-0,normal storage isolated,pageerrors0. No successful-response resource mocks. This is a hosting-service notice, not a game-loading fault; communicate the click to users rather than falsely claiming a broken script or silently bypassing the service.
- Final f264 source's real-CDN7/8/9F run also passed: original start position, forward walkable direction, startup lockfalse, source hashes, first image-host503 recovery and all-isolation-host503 fail-closed. Evidence feature docs/reviews/f3-industrial-final-delivery/ and f3-industrial-public/. Test-only managed proxy certificate exception, shipped TLS untouched. The githack advertising request can be blocked by browser origin policy; this is recorded separately from application JS errors.
- Mobile7–9F visual checks and actual touch/control/puzzle-gate/stairs/save/lifecycle passed. A fixed500ms puzzle-frame expectation failed initially under slow software rendering; waiting for the real gate-open state passed, failure retained. No collision or gate behavior change was made for that timing observation. Actual checkpoint deserialization recovery is a separate real feature-branch fix, not a comparison-ignore workaround.
- Serial technical LOD run45372771290 is still ongoing:4/18 actual completed comparisons (retaining wall,column,I-girder,buckled portal),12GLBs errors0/warnings0,48PNGs and clean scans archived; progress data efbe4bc. Remaining14 are not reported as completed or published. All variants remain NOT_APPROVED and absent from the runtime. Whole-image fixed-camera RGB differences are review signals including background/shadow, not silhouette accuracy or artistic acceptance. Original near meshes remain in use; no need to promote a lossy candidate to view the complete authored city.

#### F3 V2: user-rejected composition, structural facade and photographic material research
- User rejected PR785 trial's art quality against seven monumental overgrown-city images and the existing layer1 floor3. Do not cite the previous successful technical checks as artistic acceptance. The 18 serial rigid reviews in45372771290 did complete technically; all54 archived variants were validated and remaining14 comparisons registered to progress data cb7f49b. They remain unapproved and unused.
- Before V2 modeling:72 public Pinterest thumbnails actually inspected across9 subjects,20 selected with individual decisions. New source research/design: feature docs/3d/F3_CITY_V2_ART_DIRECTION_20261124.md and research/F3_CITY_V2_PINTEREST_20261124.json. Pin photos/art are reference-only, not texture licenses. Actual first-layer3F and previous city screenshots were inspected. No board mutation or parallel agents.
- Five official CC0 candidates checked: Poly Haven concrete_slab_wall,cracked_concrete_wall,cracked_concrete,concrete_debris,fern_02. Official pages /a/<id>, metadata https://api.polyhaven.com/files/<id>, license https://polyhaven.com/license. These are candidate-page/license checks, not a successful download/import claim. Already verified concrete_moss/chipped_concrete/rusty_iron/asphalt_02 retained.
- First V2 individual authoring:4m structural building bay, approximately16m high, recessed actual rooms/windows, exposed floor undersides, missing upper floor edges, ribbed rebar, supported drainage/ladder/guards, ivy rooted on ledges. Existing scripts/material joining/source hashes/scanned gateway reused; no third-party code/add-on introduced. New materials downloaded inside pinned Blender5.3/ClamAV gateway and scanned before metadata parse/image decode; outcome still pending. Future authoring files now pack every used image (including unloaded normal/roughness maps), reopen the saved source and verify packed bytes/vertex count. Old sources are not overwritten. Source a7eddb8; first single-asset render requested, successful render and artistic quality are not yet claimed.


#### F3 V2 actual structure and import checkpoint (2026-11-24)
- Serial production only. Courtyard facade run45407771986 (source677b99c) succeeded after archive-only retry; five GLB-reimport PNGs, packed authoring-file reopen and clean output scans verified. 29,106tri; originals retained. Object matrix update before ivy transforms fixed the first render's oversized root chips. Actual street review still rejects the pale/repetitive exterior as unfinished art.
- Service tower run45415404490 (source4149167e) generated a 15.451m supported tower: stair flights, grating platforms, I sections, bolted gussets, process vessel and original control cabinet reuse;43,208tri/14 primitives. Five actual PNGs, clean scans, original SHA and packed-source reopen proof saved. Independent gallery data c787e31; NOT_APPROVED. No claim of final city/art acceptance or physical-device FPS.
- First tower run45413986510 failed on Blender5.3 glTF importer settings socket Iridescence Factor: the local authoring helper had created a partial glTF Material Output group. New branch-local gltf_import_compat.py preserves existing AO inputs/links while allowing the official importer to create its complete group. Retry45415404490 succeeded without dropping AO or modifying original GLB. Executable helper remains feature-only.
- Real street ray probes identified legacy green cube facade posts covering new window recesses. Pilot omits those posts and old backing, fits opposing bays to 1.70m depth, keeps full height and 1.8m movement lane. Actual screenshot/source fixture28 inputs retained in docs/reviews/f3-city-v2-street/. 48 pilot bays, no hard lane overlaps; ~704 calls/2.9M triangles includes shadows/postpasses in one forced software frame, not measured device FPS. Floor8/9 and full visual acceptance remain pending.
- Public CC0 sources inspected at official pages/primary previews: https://polyhaven.com/a/modular_factory_facade , /a/modular_urban_apartments_facade , /a/shrub_01 . Selective kit reuse is under consideration; not imported or installed. Mossy plaster https://polyhaven.com/a/worn_mossy_plasterwall and concrete_layers_02 compared with chipped_concrete; exterior weathering revision pending. License https://polyhaven.com/license . Reference images not redistributed.
- Next individual asset fern_02 uses official glTF plus separate official Alpha map; immediate per-download ClamAV/metadata checks, source geometry/UV retained. Run queued, actual alpha silhouettes not yet verified. No generic foliage decimation.


#### F3 V2 photographic materials / source-reuse checkpoint
- Mossy plaster facade: run45417826812/sourcef125a444 succeeded,29,106tri, five final GLB-reimport views, packed source reopen and clean output scan. New facade_weathering_v2.py bakes actual licensed photos with metre-scaled normal/roughness and macro rain at the authored sill corners/downpipe/ledges. Raw Pin/reference pixels never enter textures. Gallery0daa559. Actual street comparison remains work in progress; constant hemisphere washing out room recesses prompted a trial material/light revision, not art approval.
- Photographic fern run45416559718/source3d4b0011:6,232tri/one MASK material, original4 mesh vertices/UV retained, official separate Alpha combined with diffuse by Blender export. All5 final views inspected; no rectangular opaque bounds. Input scans before each parse/import; output86files/infected0, packed authoring source reopened. Galleryc04eeab; NOT_APPROVED.
- Supported bridge run45419450512/source015c86c2:8m crossing, real I-section/Warren trusses/gussets/grating/attached broken rails, piers outside center lane; all5 actual views inspected, clean scan and packed source reopen. Galleryfc32a6f. Next one individually queued fractured-road asset is pending; original city surfaces retained.
- Licensed direct-use research: https://polyhaven.com/a/periwinkle_plant (Amal Kumar/CC0, actual primary preview +official1K glTF metadata6 variants34,350tri/~2.91MB); candidate sparse flowering pockets, 3D import pending. tree_small_02 official glTF2,062,487tri/~101MB and pine_sapling_small398,144tri/~21.9MB are unsuitable for unreviewed mass placement. No imported tree assets or arbitrary foliage decimation claimed.
- New branch-local licensed_gltf_v2.py/factory_bay_v2.py under preparation: official modular_factory_facade1K glTF selected components, per-file ClamAV +official size/MD5 and ownSHA checks, full raw kit preserved, UV preserved; author James Ray Cock/CC0. Derivative removes glass faces in two window variants, adds load-bearing rooms/roof decay and material tint. Not yet run or accepted; do not claim stock kit already integrated.
- Whole-street software render initially screenshot-timeout120s; failure retained. Static sun shadows now update on visibility/camera change, conservative per-instance frustum filtering retains nearby12m shadow casters. Retry actual PNG30 source models,1.8m hard-lane overlaps0. Inspection2fps cap explicitly test-only; sampled4s frame count0 is unavailable FPS, not device measurement.
- Generic auto-review caller lacked packages:read required by nested rigid container workflow. Feature correction grants read only and guards empty outputs; run45417850533 changed from startup_failure to expected feature skip. New V2 source audit still pending. Executable/asset/game changes remain feature-only; this entry shares information only.


#### F3 V2 proposed structural ambient-occlusion bake (pending execution)
- Branch-local geometry_ao_v2.py prepared for the original courtyard derivative only. Inside pinned Blender: material-group original meshes are joined temporarily, separate CityAO UV is smart-unwrapped, original photographic UV array equality is asserted, CPU Cycles32-sample AO is baked1024x2048, then glTF Occlusion is assigned to UV1. Final GLB must expose occlusionTexture.texCoord1 for every used material. Packed authoring source includes the baked image.
- Purpose: stop constant hemisphere lighting from making closed rooms and slab bearings appear uniformly lit, without darkening the whole walkable street or repainting reference images. Raw photos/original previous deliveries retained. Derivative AO socket changes only; no source-kit remesh/foliage decimation.
- This helper has only static Python compilation, not an actual bake/render at this checkpoint. Blender CPU availability, UV/export correctness, actual before/after PNG, hashes/scans and runtime appearance remain to be verified in one serial candidate run; do not treat source code as successful integration or artistic acceptance.


#### F3 V2 verified licensed sources and structural AO continuation
- Structural AO experiment is now actually executed: run45425172072/source7f50b334, original UV array unchanged, CityAO UV1, CPU Cycles32sample1024x2048;29,106tri retained. All material AO.texCoord1 assertions passed;139 output files scanned/infected0 and packed authoring file reopened. Five final GLB geometry renders inspected; actual Three.js street screenshot shows contact/interior shading. Studio render alone is not an AO-lighting proof. Candidate remains NOT_APPROVED.
- Selected CC0 factory components actual run45423622575:33,700tri, four storeys, original detailed windows/UV; final glass MASK uses official windows_alpha. Full original kit, per-file scans, publisher size/MD5 and ownSHA retained. Author James Ray Cock; https://polyhaven.com/a/modular_factory_facade / https://polyhaven.com/license . Own floors/returns/backing/damaged roof/pipe/ivy complete the building volume.
- New licensed statue source: https://polyhaven.com/a/gothic_statue , Benny Weimer/CC0, official primary preview inspected before intake. Actual run45429934515: original2K sculpt vertices/UV unchanged, new chipped plinth only,28,007tri/3materials,1.53x1.7421x1.443m; five final views and clean output receipt verified. Existing area3 NPC tile/dialogue/gate logic unchanged. Draft appearance only, not promotion. licensed_gltf_v2.py now supports resolution selection, immediate scan before JSON/import and complete original-source preservation.
- Wildflowers: periwinkle_plant official source6 variants34,350tri retained. First run45428149216 formed an artificial line; revised45432034546/source69c2c50c uses a staggered pocket1.4112x.423x.6623m, final alpha-MASK5views inspected. Road45426982715 removes scene-identified chip rows and matches border heights; previous narrow-jagged-road45422753105 preserved. Progress IDs stable; original/intermediate files remain in Git.
- Actual intermediate mobile7–9F passed SHA checks and all1.8m hard-lane tests. Bridge helper clips transformed low triangles at3.5m, verifies a2.2m central strip, separates support envelopes; source scale remains metres. Existing map vegetation* becomes earth/soft foliage instead of paving; no navigation mutation. A first-layer14,712tri cedar candidate is borrowed with exactSHA in a closed2x2 plot, not shrunk into a passage, and not represented as formally approved. Courtyard owner-cell exemption keeps physical rear closures visible without revealing other streets; added pure sightline assertions pass.
- All35 complete current review GLBs validate with0 errors; new/revised sources0 warnings, unchanged approved stairs retain9/46 historical warnings. Runtime dependency plan loads only actual floor users and declared SHA-verified image dependencies. Root originals remain in review catalog; physical-device FPS not measured. Final PC/mobile controls, public delivery and repeated loader/disposal tests pending.
- New shared actual-source audit and one opaque-statue rigid LOD review run45793054822: shared audit succeeded, LOD rendering in progress. Far variants remain review-only; near original unchanged. No automatic foliage decimation or game/main promotion.

#### F3 V2 actual-source audit and runtime verification update (2026-11-26)
- Run45793054822 is completed/success: eight retained V2 sources196491 triangle equivalents/50 primitive instances. Statue LOD0/1/2:28007/15403/7001tri,12 actual views checked,3 GLBs0errors/0warnings, original SHA unchanged. Lowest plinth contour loses detail, so none is adopted. Normal eight final model revisions and statue LOD comparison are directly published in the independent progress registry (data ab8b75e/4276bb4); no automatic art approval.
- Actual35-model loader test renders all sources twice:159 geometry/106 textures before disposal,0 geometry/1 renderer transmission-cache texture after both cycles, no growth. Decoded image estimate355336192bytes belongs to all-source review, not the selected-floor memory or device FPS. Runtime loads28/28/29 models, verifies model bytes first and only their declared image dependencies.
- PC7–9F validates all hashes and1.8m hard-lane overlaps0. Mobile real tap advances one tile/one turn, chest/gather/puzzle gate/stairs/save roundtrip/lifecycle pass. Existing procedural-detail14 LOD batches switch correctly (4200 retained vs1680 far triangles), not a claim of all-source LOD adoption. Initial10s software touch timeout and a camera-compacted LOD counter failure are preserved; corrected tests wait for dialog completion and count allocated instances. Browser tests use actual model/image bytes.
- Normal flag-off city fetches0 candidate resources. Deliberately corrupt image SHA restores legacy city/far80/root1 without page errors. Final actual-CDN7–9F verifies hashes/original spawn/forward walkability/lockfalse and keeps normal-save sentinels unchanged. First-host image503 recovers from a real alternate CDN; blocking the isolation entry on every host keeps iframe empty/game unstarted/save unchanged. Proxy-certificate exception is confined to managed test Chromium; shipped TLS checks remain enabled.
- Extra entry/court viewpoints revealed missing terrain under solid map cells. Candidate runtime bf178b2d adds an opaque ground bed and low photo-textured foundations within solid cells; closed architectural bays replace bare court back panels. Ground primitives reuse existing textures and do not change the navigation/event map. Actual browser PNGs are documented separately from Blender renders; formal game asset/main promotion remains forbidden without review. Source Draft PR785.
