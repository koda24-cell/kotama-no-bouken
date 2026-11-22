# 第4層「竜炎の迷宮／焦土の溶岩洞窟」GPT制作3Dモデル 棚卸し

- 作成: 2026-11-19 Claude（調査のみ。ゲームコードは変更していない）
- 調べた範囲: `origin/development`（`5cefade`）、B4関係の未マージPR 75件（`pulls?state=open` 全308件のうち、タイトルかブランチ名で抽出したもの。地図UIの #66 #76 #91 は "cart" で引っかかっただけなので対象外）。各PRの本文・変更ファイル・Issueコメント（どのPRもコメントは0件）・ブランチのファイル一覧（git trees API）・Actionsのrunと成果物（Artifact）を確認した。
- 取り込み先: `assets/models/floor4/gpt-import/`（出典・sha256 は同じフォルダの README に記載）
- **承認の扱い**: ユーザーの承認は、PR本文、`docs/3d/FLOOR4_COMPLETED_ASSETS.md`、各 manifest に書かれた記録だけで判断した。PRコメントでの承認は1件もなかった。

## 0. まとめ（推奨して取り込む版）

| # | ファミリー | 推奨する版 | 承認 | 入手方法 | ゲームでの使用 |
| --- | --- | --- | --- | --- | --- |
| 1 | 岩壁＋溶岩の筋（岩壁パネル） | **V33**（PR #381／制作 #379） | ユーザー承認 2026-11-15 | PRブランチ → **取り込み済み** `gpt-import/rockwall-magma/` | 未使用 |
| 2 | 溶岩の川・岩盤・溶岩滝の複合セット | **V16**（PR #477 でマージ済み） | ユーザー承認 2026-11-17 | development `assets/models/floor4/b4-magma-river-v16.glb` | 未使用 |
| 3 | 岸・支流・分岐・段差（V16から派生） | **P1 V4／P2 V4／P3 V5**（PR #478 でマージ済み） | ユーザー承認 2026-11-17 | development `b4-magma-river-p1-v4/p2-v4/p3-v5.glb` | 未使用 |
| 4 | 溶岩単体モジュール（池） | **C 溶岩溜まり V3**（制作 #454） | ユーザー承認（Cだけ）2026-11-17 | development `b4-lava-pool-v3.glb` | 未使用 |
| 5 | トロッコ | **V32**（PR #443 でマージ済み、制作 #431） | ユーザー承認 2026-11-17 | development `b4-minecart-v32.glb` | 未使用（今のゲームは手続き生成のトロッコ） |
| 6 | レール・枕木・継ぎ目 | V11（#273）が最新のGLB。V1 新規版（#480）は設計だけ | 未承認 | Artifactだけ（期限 2026-11-26） | 未使用 |
| 7 | 巻上機（hoist） | V1（#265） | 未承認 | Artifactだけ（期限 2026-11-25） | 未使用 |
| 8 | 火山石碑 | V11（#483） | 未承認 | Artifactだけ（期限 2026-12-03） | 未使用 |
| 9 | 溶岩シェーダー | #505（Three.js ShaderMaterial、GLBなし） | NOT_APPROVED | PRブランチのコード | 未使用 |
| 10 | 柱状節理／天井の層状岩盤／溶岩の岸／浮いた冷えた岩／溶岩の照明 | #164 #172 #167 #178 #174（ランタイムのコード差分、GLBなし） | 未承認 | PRブランチのコード | 未使用（development に未マージ） |
| 11 | 城塞・尖塔・環境キット（v1キット） | `floor4_gothic_fortress_addon_v1` ／ `floor4_dragonfire_environment_v1` ／ `floor4_lavafall_ember_fx_seed_v1` | 承認記録なし（v1試作） | development | 未使用（遠景の城塞は手続き生成） |
| 12 | 竜のボス・障壁 | `floor4_dragon_boss_v1` ／ `floor4_corrupted_barrier_v1` | 承認記録なし（v1試作） | development | **使用中** |

**ファミリーは12**。ユーザー承認済みは7モデル（V33、V16、P1、P2、P3、溶岩溜まりC、トロッコV32）。このうち development に入っていないのは **V33 だけ**で、今回 gpt-import に取り込んだ。

## 1. ファミリーごとの詳細

### 1-1. 岩壁＋溶岩の筋（岩壁パネル） — V1〜V33
| 版 | PR | ブランチ | GLBのある場所 | 承認 | メモ |
| --- | --- | --- | --- | --- | --- |
| **V33（推奨）** | #381（保存用）／#379（制作） | `assets/b4-v33-approved-20261115` @ `e705ed2c` | ブランチ `assets/models/floor4/b4-v33-magma-rockwall.glb` → **取り込み済み** | **ユーザー承認 2026-11-15** | 15.1MB、三角形 約40万、メッシュ99、マテリアル6、**画像0**。溶岩の筋は3本。分かっている課題: 下の岩塊が浮いている、背面に格子模様、火の粉が下に集中。Poly Haven CC0 を参照 |
| V32〜V18 | #378 #377 #375 #372 #368 #367 #365 #361 #356 #355 #352 #351 #349 #348 #345 #342 | `feature/b4-v*-…` | Artifactだけ（例: V18 run 43477585292 は 2026-11-27 期限） | 未承認（V33 に置き換えられた） | 取り込み不要 |
| V17〜V3 | #341〜#280 | 同上 | Artifactだけ | 未承認 | 取り込み不要 |
| V2 | #276（保存用）／#274 | `feature/b4-lava-rockwall-v2-archive-20261112` @ `73ea8741` | ブランチ `assets/models/floor4/lava-rockwall-v2.glb` → **参考として取り込み** | 未承認（自己評価 4.5/10） | 0.37MB、三角形 2,692。使わない前提の保存 |
| V1 | #271 | — | Artifactだけ（2026-11-25 期限） | 未承認 | — |
- CC0の参考資料（GPTが作ったものではない）: #330 Kenney cliff GLB 8点、#332 Poly Haven rock_face_02（3.4MB）。どちらも各ブランチの `assets/reference/cc0/` にある。V33 の素材の元になっているので、クレジット記載のときに参照する。今回は取り込んでいない。

### 1-2. 溶岩の川・岩盤・溶岩滝の複合セット — V1〜V17
| 版 | PR | 場所 | 承認 | サイズ／三角形 |
| --- | --- | --- | --- | --- |
| **V16（推奨）** | #477（マージ済み）、制作 run 44027612542（#472 のブランチ） | development `assets/models/floor4/b4-magma-river-v16.glb` ＋ `reviews/b4-magma-river-v16/` | **ユーザー承認 2026-11-17**（承認範囲は「static visual quality only」） | 12.3MB／約24.2万／メッシュ390／マテリアル7／画像9 |
| V17 | #475 | Artifactだけ: run 44028204063 → `b4-magma-river-v17-review`（19MB、期限 2026-12-01） | 未承認（ユーザー承認の**後**に作られた試作） | — |
| V16候補 V15 V14 V13 V10 V1〜V9 | #474 #473 #472 #470 #468 #458 #450 | Artifactだけ | 未承認 | — |
- 作り直す方法: `tools/floor4/magma_river/build_magma_river.py` ＋ `.github/workflows/b4-magma-river-iterative-render.yml`（PRブランチ側）。development には `b4-magma-bank-v16-derived-render.yml` がある（Blender 5.3 への移行を確認済み）。

### 1-3. 岸・支流・分岐・段差（P1〜P3）
| 版 | 場所 | 承認 | サイズ／三角形 |
| --- | --- | --- | --- |
| **P1 V4** 細い支流と岩の岸 | development `b4-magma-river-p1-v4.glb` | ユーザー承認 2026-11-17 | 13.1MB／約28.3万／メッシュ456 |
| **P2 V4** 分かれ道になった玄武岩の岸 | development `b4-magma-river-p2-v4.glb` | 同上 | 13.1MB／約28.4万／メッシュ447 |
| **P3 V5** 玄武岩の段差と2本目の溶岩滝 | development `b4-magma-river-p3-v5.glb` | 同上 | 15.0MB／約37.8万／メッシュ538 |
- 床とつなぐタイルの設計: `docs/3d/B4_MAGMA_RIVER_TRANSITION_DESIGN_20261117.md`、`B4_MAGMA_BANK_MODULES_P1_P3_DESIGN_20261117.md`。引継ぎ: `B4_MAGMA_BANK_P1_P2_P3_CLAUDE_HANDOFF.{md,json}`。

### 1-4. 溶岩単体モジュール（蛇行・合流・溜まり・滝・冷却地帯）
| 版 | 場所 | 承認 |
| --- | --- | --- |
| **C 溶岩溜まり V3** | development `b4-lava-pool-v3.glb`（7.8MB／三角形 約1.4万／画像7） | ユーザー承認（Cだけ） |
| A 蛇行・B 合流・D 滝・E 冷却地帯 V3 | Artifactだけ: run 43998531627 → `b4-lava-five-modules-v3-review`（59MB、期限 2026-12-01） | **ユーザーが不採用**（取り込まない） |
- 作り直す方法: `tools/floor4/lava_modules/build_lava_modules.py` ＋ `.github/workflows/b4-lava-modules-review.yml`（#454 のブランチ）。

### 1-5. トロッコ — V3〜V32
| 版 | PR | 場所 | 承認 |
| --- | --- | --- | --- |
| **V32（推奨）** | #443（マージ済み）／制作 #431、run 43893048261 | development `b4-minecart-v32.glb`（1.4MB／三角形 約1.4万／メッシュ192／マテリアル36／画像9） | **ユーザー承認 2026-11-17** |
| V29〜V31 | #431 | Artifact `b4-cart-v29-detail-review`（期限 2026-11-30） | 未承認（V32 に置き換えられた） |
| V20〜V28 | #423 | Artifact（例: run 43829654982、期限 2026-11-30） | NOT APPROVED |
| V18／V19 | #419／#420 | Artifact（期限 2026-11-30） | NOT_APPROVED |
| V11〜V13 | #403／#413 | Artifact（期限 2026-11-30） | NOT_APPROVED |
| V3〜V9（Three.js 生成） | #257 #263 #264 | Artifact `b4-blender-docker-batch`（期限 2026-11-25） | 未承認 |
- 注意: マテリアルが36個あるので描画の呼び出し回数が増えやすい。統合するときはマテリアルをまとめるかどうか検討する。

### 1-6. レール・枕木・継ぎ目 — V3〜V11、新しい V1
| 版 | PR | 場所 | 承認 |
| --- | --- | --- | --- |
| V11（GLBとして最新） 破断した縁・ささくれ・端の固定具 | #273 | Artifactだけ: run 43124861592 → `b4-blender-docker-batch`（20MB、**期限 2026-11-26**） | 未承認 |
| V10 継ぎ目板・曲線の補強 | #269 | Artifactだけ: run 43118064638 | 未承認 |
| V4〜V7 | #259 #260 #261 #262 | Artifactだけ | 未承認 |
| トロッコとV11レールの基準レンダー | #403 | run 43799125605／43799297476（`b4-cart-rail-v11-baseline`、期限 2026-11-30） | 未承認 |
| 新しい V1（トロッコ V32 の軌間に合わせる） | #480 | **設計書だけ**（`docs/3d/B4_MINE_RAILS_V1_DESIGN_20261117.md`）。runなし | — |
- 作り直す方法: レールは Three.js のコード（`field/b4-detailed-rails.js`、`field/b4-rail-v11-additions.js`）を `tools/b4-render/export-batch.mjs` でGLBに書き出し、`.github/workflows/b4-docker-batch-render.yml`（development にあり、共有コンテナへ移行済み #554）でレンダーする。コードは #273 のブランチにある。
- 推奨: 承認された版がない。GPTが作業中の #480（V32 の軌間に合わせた新規作成）を待つ。V11 は参考として、Artifact の期限（11/26）が切れる前に GPT 側でブランチへ保存してもらうのがよい。

### 1-7. 巻上機（hoist）
| 版 | PR | 場所 | 承認 |
| --- | --- | --- | --- |
| V1 | #265 | Artifactだけ: run 43111313020 → `b4-blender-docker-batch`（17MB、**期限 2026-11-25**） | 未承認 |
- 作り直す方法: `field/b4-mine-hoist.js`（#265 のブランチ）→ `tools/b4-render/export-batch.mjs` → `b4-docker-batch-render.yml`。
- 関連: development の `field/b4-mine-rig-props.js` には、手続き生成の滑車・吊り桶があり、ゲームで使われている。

### 1-8. 火山石碑 — V1〜V11
| 版 | PR | 場所 | 承認 |
| --- | --- | --- | --- |
| V11（最新で成功したもの） | #483 | Artifactだけ: run 44463761830 → `b4-volcanic-stele-v11-review`（7MB、期限 2026-12-03）／run 44455557929 | 未承認 |
| V11 Bright | #483 | run 44463767051 **失敗** | — |
| V4／V5 | #483 | 最新のrunが失敗 | — |
- 作り直す方法: `tools/floor4/volcanic_stele/build_v11.py` ＋ `.github/workflows/b4-volcanic-stele-v11-review.yml`（#483 のブランチ）。
- 品質メモ: V1 の記録によると、文字は表面に貼った曲線メッシュで、彫り込みではない。

### 1-9. 溶岩シェーダー
- #505 `feature/gpt-b4-lava-flow-shader-prototype-20261118`: `tools/floor4/lava/b4-lava-material-prototype.js`、`b4-lava-river-geometry.js`（テストつき）。GLBはない。NOT_APPROVED。WebGLでの動作は試されていない。V16／P1〜P3 の発光面に後からかけるシェーダーの候補。

### 1-10. 天井・柱状節理・岸などのランタイム差分（GLBなし）
| PR | 内容 | 状態 |
| --- | --- | --- |
| #164 | 壁沿いの玄武岩の柱状節理（六角柱） | ドラフトではない、未マージ |
| #172 | 天井の層状岩盤と断層（`magmaCeilingGeo`） | ドラフトではない、未マージ（development にはまだない） |
| #167 | 溶岩の縁に冷えた玄武岩と赤く光る線 | ドラフトではない、未マージ |
| #178 | 溶岩の上に浮く冷えた岩の板 | ドラフト |
| #174 | 溶岩の局所照明と揺らぎ | ドラフト |
- どれも `field/field-3d-b4-b5-map.js` だけを変更していて、お互いに競合する。2026-11-09 の古い development が土台なので、取り込むならリベースが必要。モデルのファイルではない。

### 1-11. 城塞・尖塔・環境キット（v1キット、2026-11-09 ユーザーがアップロード／PR #124 で整理）
| GLB（development `assets/3d/dungeons/b4_dragonfire/models/`） | サイズ | 三角形 | 画像 | 使用 |
| --- | --- | --- | --- | --- |
| `floor4_dragonfire_environment_v1.glb` | 4.75MB | 7,036 | 4 | 未使用 |
| `floor4_gothic_fortress_addon_v1.glb` | 4.63MB | 1,604 | 4 | 未使用 |
| `floor4_lavafall_ember_fx_seed_v1.glb` | 0.04MB | 3,456 | 0 | 未使用 |
- 同じフォルダの `floor4_Part1_Models.zip`（16.4MB）に入っているのは、上の5つのGLB、`ASSET_MANIFEST.json`、引継ぎMD、`floor4_texture_preview.png` だけで、展開済みのファイルと同じもの（`unzip -l` で確認）。
- #179 は景観計画の文書だけ。今のゲームの遠景（`b4-citadel-backdrop.js`、`b4-fortress-skyline.js`）は手続き生成。

### 1-12. 竜のボス・障壁
| GLB | サイズ | 三角形 | 使用 |
| --- | --- | --- | --- |
| `floor4_dragon_boss_v1.glb` | 3.29MB | 11,146（画像3、リグなし） | **使用中**（`field/field-3d-b4-b5-map.js:289`、名前 `b4:dragon-boss-static`） |
| `floor4_corrupted_barrier_v1.glb` | 2.78MB | 5,844 | **使用中**（`field/field-3d-b4-b5-map.js:269`、`b4_boss_barrier`） |
- この2つより新しい版を作っている未マージPRはなかった。

## 2. 今のゲームでの使用状況
- `field/field-3d-b4-b5-map.js` がGLBを読み込んでいるのは **`floor4_corrupted_barrier_v1.glb` と `floor4_dragon_boss_v1.glb` の2つだけ**。
- `field/b4-*.js`（abandoned-mine、cart-detail-additions、citadel-backdrop、fortress-skyline、fractured-rock-ore、furnace-detail-additions、game-scenery、mine-rig-props、placement、surface-library、volcanic-detail）はすべて Three.js の手続き生成で、GLBは読み込んでいない。`b4-surface-library.js` は `assets/3d/dungeons/b4_dragonfire/textures/` の画像を使っている。
- ユーザー承認済みの7モデル（V33、V16、P1、P2、P3、溶岩溜まりC、トロッコV32）は**どれもゲームに入っていない**。

## 3. 取り込んだファイル（このブランチ）
`assets/models/floor4/gpt-import/rockwall-magma/`
- `b4-v33-magma-rockwall.glb`（承認済み）、`b4-v33-front-lit.png`、`b4-v33-angle-lit.png`、`source-manifest.json`
- `lava-rockwall-v2-unapproved.glb`（未承認、参考）、`lava-rockwall-v2-angle.png`
- 出典・コミット・sha256 は `assets/models/floor4/gpt-import/README.md` に記載。
- 20MBを超えるGLBは、ブランチ上には1つもなかった（最大は V33 の 15.1MB）。

## 4. 取り込めなかったもの（Artifactだけ）と作り直し方
この環境では Actions の Artifact をダウンロードできない。期限が近い順に並べる。**期限が切れると作り直すしかなくなる**ので、GPT側で `Promote approved B4 3D asset` か、各 archive workflow を使ってブランチに保存してもらうのがよい（未承認のものは参考として保存するだけ）。

| ファミリー | 版 | run／Artifact | 期限 | 作り直し方（スクリプト／workflow） | ブランチ |
| --- | --- | --- | --- | --- | --- |
| 巻上機 | V1 | 43111313020／13897051348 | 2026-11-25 | `field/b4-mine-hoist.js` → `tools/b4-render/export-batch.mjs`／`b4-docker-batch-render.yml` | `feature/b4-mine-hoist-v1-20261112` |
| 岩壁 | V1 | 43119767432／13899603876 | 2026-11-25 | `b4-lava-rockwall-render.yml` | `feature/b4-lava-rockwall-v1-20261112` |
| レール | V11 | 43124861592／13902017905 | 2026-11-26 | `field/b4-rail-v11-additions.js` → `export-batch.mjs`／`b4-docker-batch-render.yml` | `feature/b4-rail-fracture-v11-20261112` |
| 岩壁 | V4 / V18 | 43337348031 / 43477585292 | 2026-11-27 | `b4-lava-rockwall-v4-render.yml` / `b4-v18-stylized-rockwall.yml` | 各PRのブランチ |
| トロッコ | V11〜V31 | 43799125605、43809835096、43812072655、43813248483、43829654982、43893048261 | 2026-11-30 | `b4-cart-*.yml`、`tools/b4-render/*.py` | #403 #413 #419 #420 #423 #431 |
| 溶岩の川 | V17 | 44028204063／14304097614 | 2026-12-01 | `tools/floor4/magma_river/build_magma_river.py`／`b4-magma-river-iterative-render.yml` | `feature/gpt-b4-viscous-lava-v17-20261117` |
| 溶岩単体 | A/B/D/E | 43998531627／14290673461 | 2026-12-01 | `tools/floor4/lava_modules/build_lava_modules.py`／`b4-lava-modules-review.yml` | `feature/gpt-b4-lava-modules-v1-20261117`（不採用なので取り込まない） |
| 火山石碑 | V11 | 44463761830／14501891206 | 2026-12-03 | `tools/floor4/volcanic_stele/build_v11.py`／`b4-volcanic-stele-v11-review.yml` | `feature/gpt-b4-volcanic-stele-v1-20261117` |

## 5. 品質・統合の注意
1. **容量が大きい**: V16＋P1〜P3＋V33 を合わせると約68MB、三角形は約170万。全部を一度に読み込むのは現実的でない。必要な区画だけ読み込む、LODを使う、Draco／meshopt で圧縮する、といった対策が必要（`GLOBAL_3D_LOD_PERFORMANCE_POLICY.md`）。統合する前に `Shared 3D GLB Performance Audit` を実行する。
2. **V33 には埋め込み画像がない**（マテリアル6つだけ）。ゲームで Blender のレンダーと同じ見た目にはならないので、Claude 側で `b4-surface-library` の玄武岩PBRをかけ直すことを前提にする。承認時に残っていた課題（浮いた岩塊、背面の格子模様）もそのまま。
3. **メッシュ数・マテリアル数が多い**: P3 はメッシュ538、トロッコ V32 はマテリアル36。読み込んだあと、マテリアルごとにまとめる必要がある。
4. 承認の範囲: V16 の manifest には `scope: static visual quality only` と書かれている。接続、衝突判定、性能は承認の対象外。
5. ランタイムPR（#164 #167 #172 #174 #178）は古い development が土台で、同じファイルを変更し合っている。モデルではないので、今回の取り込みの対象外。
6. 実機での描画・FPSテストは**行っていない**（今回は棚卸しだけ）。
