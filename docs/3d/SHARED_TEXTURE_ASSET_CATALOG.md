# 共通テクスチャ資産台帳（全階層）

更新: 2026-11-19。担当: GPT。**テクスチャの説明・実ファイルの保存・承認・ゲーム適用は別管理**。この台帳が存在するだけで画像ファイルがGitHubへ保存されたことにはならない。

## 制作ルール
- 平面・床・壁面・柱の側面など、画質を保てる箇所は既存の承認済み画像テクスチャを優先して再利用する。
- 輪郭、断面の段差、欠損の奥行き、露出鉄筋など、視点で形が変わる部分はメッシュ造形。正面画像の影を本物の奥行きと混同しない。
- 生成画像から切り出したマップは光・影を含む可能性がある。アルベド近似と明記し、PBR完全版と主張しない。推定Normalは測定Normalではない。
- 素材IDは `F<floor>_<subject>_<type>_<serial>`、派生は `_V2` 等。画像サイズ、色空間、タイル可否、元画像、ライセンス、SHA-256、ダウンロード/保存状態、利用GLB/PR、承認、作成手順を記録。
- 新規素材はここへ追記し、同一IDを上書きしない。確認済みバイナリは承認後に正式素材フォルダへ配置。GitHub Actions Artifacts/ChatGPT添付は一時保管。
- GLB・Blend・画像はウイルススキャンとファイル形式/サイズ/ハッシュを個別検証し、実スキャン未実行を必ず明示する。

## 既存素材一覧

| ID | 内容・用途 | 解像度 / 色空間 | 再利用/タイル | 元画像/作り方 | SHA-256 | 保存/検証/承認 |
| --- | --- | --- | --- | --- | --- | --- |
| `F3_WALL_CONCRETE_CRACKED_01` | 第3層壁01・ひび割れたコンクリートの色テクスチャ | 1024×1024 PNG / sRGB | 壁面向け。シームレス未検証、他モデル再利用は要評価 | この会話で生成した「風化したコンクリート壁スラブ三面図」の正面部分を切り出し補正。ローカル生成 `make_floor3_wall_texture.py` | `bb8dd23fc08dd384a5e2789cb8d7b84da2d4e90972c61627560fb94ce341c941` | チャット成果物 `floor3_wall_textured_trial/wall01_color_1024.png`。**GitHubへのPNG原本保存未実施**。壁01 V4造形はユーザー承認、色画像単独の正式素材承認/ウイルススキャンは未実施 |
| `F3_WALL_CONCRETE_NORMAL_EST_01` | 同じ壁の画像勾配から推定した微細凹凸Normal | 1024×1024 PNG / non-color data | 上記と同じUVで試作。シームレス未確認 | カラー画像の輝度勾配から計算（本当の幾何Normalではない） | `59cee4a12733291cf90cb98f1bd7823add3c1c12a364e0b47c026c7f2ec365ef` | チャット成果物 `floor3_wall_textured_trial/wall01_normal_estimate_1024.png`。**GitHubバイナリ保存未実施**。Normal品質/ウイルススキャン未検証 |
| `F3_REBAR_RUST_01` | 第3層の露出鉄筋01用・酸化鉄カラーPNG（画像テクスチャ） | 256×256 PNG / sRGB | 鉄筋のUV円筒に再利用可能。非シームレスの実画質評価は未完了 | 自作手続き生成コード `tools/floor3/rebar01/build.py`（PR #536、実行 #44446358240） | `a8dbebaf09ca7e3d53608d4859088ece9cd460c2fbb38298a02b21c684435c58` | Actions Artifact ID `14493312525` の画像実体とSHA-256確認済み。**GitHubには生成コードのみあり、PNG原本は未昇格**。素材/ゲーム未承認、実ウイルススキャン未実施 |

| `F3_WINDOW_AGED_PAINT_RUST_01` | 第3層・廃ビル金属窓枠縦材の塗装剥離・錆カラー | 256×512 PNG / sRGB | 縦長の金属面用、シームレスではない。現状は縦縞が強く改善要 | 自作Blender生成スクリプト `tools/floor3/window_mullion01/build_v4.py`、[PR #540](https://github.com/koda24-cell/kotama-no-bouken/pull/540)、[run #44448888071](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44448888071) | `3ecfab0e24a56aed12b6cd1ddd5b1aa7bf5e7a13222458d1c2f74c082ee6cfee` | 実PNG/GLB/Blend/4方向PNGのSHA256一致。Artifact ID `14494134047`。**PNG本体はGitHub正式素材フォルダには未保存**。美術品質未承認、ウイルススキャン未実施 |

| `F3_WINDOW_ENAMEL_RUST_V5` | 第3層窓枠縦材01 V5の塗装・局所酸化・露出金属アルベド | 256×512 PNG / sRGB | 単体縦材用。無限タイル不適。V4より面の変化を局所化 | 自作コード `tools/floor3/window_mullion01/build_v5.py`（PR #540）、[成功run #44450317443](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44450317443) | `e1e76aa48c6a55fe1d1e7bfb2919148bc3c63d5b72a7dbf30d8330579a0c3628` | Artifact #14495033109 実体とSHA一致。画像バイナリ正式Git保存未実施、未承認。実ClamAVスキャン未確認 |
| `F3_WINDOW_ROUGHNESS_V5` | 上記塗装・錆・露出金属を識別する粗さデータ | 256×512 PNG / non-color | V5カラーと同UV専用。タイル不可 | 同一V5自作コード・run #44450317443 | `9dcb8e20ad4bbeb39a2369366c0479023fad435a900cf4e0be8e665e91f1da58` | Artifact #14495033109 実体とSHA一致。画像バイナリ正式Git保存未実施、未承認。実ClamAVスキャン未確認 |

| `F3_WINDOW_CROSSBAR_PAINT_V1` | 第3層窓枠横材01 塗装と錆のカラー（V1） | 256×512 PNG / sRGB | 横材専用UV、シームレス未検証 | 自作Blender生成 `tools/floor3/window_crossbar01/build.py`、PR #551、run #44451653102 | `6fafb4e963aedd7cac3a75fd9d3b215577f8f0388981f841409ef0bdecf43635` | Artifact 14494619940でSHA-256一致確認。PNG本体の正式Git保存なし。未承認、ClamAV実スキャン未確認 |
| `F3_WINDOW_CROSSBAR_PAINT_V2` | 第3層窓枠横材01 塗装と錆のカラー（V2） | 256×512 PNG / sRGB | 横材専用UV、シームレス未検証 | 自作Blender生成 `tools/floor3/window_crossbar01/build.py`、PR #551、run #44451653102 | `2cb498d9c9e4508dab8eba59ab34ebe789192ebb1dc651a1416b6fae32f3e6cf` | Artifact 14494619940でSHA-256一致確認。PNG本体の正式Git保存なし。未承認、ClamAV実スキャン未確認 |
| `F3_WINDOW_CROSSBAR_PAINT_V3` | 第3層窓枠横材01 塗装と錆のカラー（V3） | 256×512 PNG / sRGB | 横材専用UV、シームレス未検証 | 自作Blender生成 `tools/floor3/window_crossbar01/build.py`、PR #551、run #44451653102 | `56a0476cc367afad88eadcb3ee7c67638d48171610462cdb49bd92f76f8fa49e` | Artifact 14494619940でSHA-256一致確認。PNG本体の正式Git保存なし。未承認、ClamAV実スキャン未確認 |
| `F3_WINDOW_CROSSBAR_ROUGH_V1` | 第3層窓枠横材01 粗さの非カラー（V1） | 256×512 PNG / non-color | 横材専用UV、シームレス未検証 | 自作Blender生成 `tools/floor3/window_crossbar01/build.py`、PR #551、run #44451653102 | `b2506d7aca416d9cd5215da94818b6507c63680b8081375b2b935166be6b2fe8` | Artifact 14494619940でSHA-256一致確認。PNG本体の正式Git保存なし。未承認、ClamAV実スキャン未確認 |
| `F3_WINDOW_CROSSBAR_ROUGH_V2` | 第3層窓枠横材01 粗さの非カラー（V2） | 256×512 PNG / non-color | 横材専用UV、シームレス未検証 | 自作Blender生成 `tools/floor3/window_crossbar01/build.py`、PR #551、run #44451653102 | `052d99d933b3e809b753e10606834f877e9001cd43b8ff9de4114136a66bf6a7` | Artifact 14494619940でSHA-256一致確認。PNG本体の正式Git保存なし。未承認、ClamAV実スキャン未確認 |
| `F3_WINDOW_CROSSBAR_ROUGH_V3` | 第3層窓枠横材01 粗さの非カラー（V3） | 256×512 PNG / non-color | 横材専用UV、シームレス未検証 | 自作Blender生成 `tools/floor3/window_crossbar01/build.py`、PR #551、run #44451653102 | `0afaa323f8b6b07f09e0f98afddf24835baba4e8bf15192a8b67af9c1e1fadf3` | Artifact 14494619940でSHA-256一致確認。PNG本体の正式Git保存なし。未承認、ClamAV実スキャン未確認 |

| `F3_WINDOW_DIRT_MASK_01` | 第3層・割れた窓ガラス01用の汚れ/曇りマスク（V3、V4） | 256×256 PNG / non-color mask | ガラス面用。シームレス未検証。光透過と粗さの調整用 | 自作手続き生成コード `tools/floor3/broken_glass01/build.py`、PR #565、[run #44455660695](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44455660695) | `e1df204118e4b6c47bf191008adb4aa433edf0039378fdadb9fcb3b48fc73fc1` | Artifact ID `14498525631` のPNG本体とSHA-256確認。正式Git PNG保存は未実施。美術未承認、ClamAV実スキャン未確認 |

| `F3_GLASS_WEATHERING_ROUGHNESS_A_V5` | 第3層の廃墟窓ガラスA型中央大欠損用、枠沿いの埃/雨筋による粗さ | 256×256 PNG / non-color | V5/V6/V7で同一自作マップを再利用、UVベース。シームレス未検証 | 自作生成 `tools/floor3/broken_glass01/build_type_a_v5.py`、PR #565、[V7成功run #44465494696](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44465494696) | `431a4468faa0b6e64f3e166268c6239d4a9ec3d90dbf94136e011d79511c7c77` | Artifact #14502345703のPNG実体・SHA確認。バイナリのGit正式保存なし、アート未承認、ClamAV未実施 |

| `F3_GENERATED_GLASS_DIRT_V10` | 第3層・ガラス破片01の汚れ・曇り／指紋・雨筋を含む画像生成テクスチャの軽量化版 | 128×128 PNG / non-color data（Base ColorとRoughnessに使用） | 小さな独立破片のUV投影、シームレスは未検証 | チャット生成元1254×1254 PNG SHA256 `c8937570b1be8541811a62cc0213584c085dc2276afbe5efa850f1c2d0babbd6` を縮小・16階調化。`tools/floor3/broken_glass01/build_detached_shard_dirt_v10.py`、PR #565、run #44644156219 | `c215878a23c6bfae3b96a77301c1599addd0566424bf544994cc082af716f185` | Artifact #14587893097から実PNG・GLB内埋込み確認。正式素材フォルダへ未昇格、ユーザー未承認、V10個別ClamAV未検証 |

| `F3_GLAZING_CLIP_PAINT_RUST_01` | 第3層窓ガラス押さえ金具01 塗膜剥離/局所錆のカラー画像 | 256×256 PNG / sRGB | 金属金具用UV、単独利用、タイル検証なし | Blender自作 `tools/floor3/glazing_clip01/build_v1.py`、PR #637、[run #44645562340](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44645562340) | `df8b1b5001f181a132ada7f75eb4576a5bb9df7275bbfe756dfcc31964a32080` | Artifact #14587778798で実PNGのSHA確認。正式GitのPNG未保存。造形未承認、固有ClamAV実検査なし |
| `F3_GLAZING_CLIP_ROUGHNESS_01` | 第3層窓ガラス押さえ金具01 表面の荒れと酸化の非カラー粗さ画像 | 256×256 PNG / non-color | 金属金具用UV、カラーと同位置、タイル検証なし | Blender自作 `tools/floor3/glazing_clip01/build_v1.py`、PR #637、[run #44645562340](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44645562340) | `236d3d13eef346a9d5ec879f878dc35a74118cc17ab9379ea687c19abb70c7ad` | Artifact #14587778798で実PNGのSHA確認。正式GitのPNG未保存。造形未承認、固有ClamAV実検査なし |

## モデルとの関係・承認境界

- 第3層の壁01 V4（段差剥離）はユーザーが造形を了承済み。候補GLBの検証時SHA-256: `44e995b1ee843ad3bffba078c532158011effef6d6245cd0bced9f25082a8981`。
- 壁01の現行生成コードは [PR #504](https://github.com/koda24-cell/kotama-no-bouken/pull/504) にあり、**V4バイナリが正式保存されたことは確認されていない**。無断で同PRを完成・マージしたりゲームに適用しない。
- テクスチャ自体をGitに永続保存するには、元PNGの実体・ライセンス/再配布権・形式/ウイルススキャン・承認を確認し、実ファイルを昇格用PRへ追加する。ChatGPT添付の一時ファイルパスだけでは第三者が再取得できない。
