# 一層・閉鎖神域 V3 素材監査

2026-11-17 JST。対象branch `feature/f1-closed-ruins-v3-20261117`。これは制作前の実体監査と提案であり、新規素材生成・最終美術承認・全GPU/FPS合格を意味しない。原本17 GLBと既存モデルは変更していない。

## 参照した実体

- `AGENTS.md`、Blender Docker/共有実行入口/昇格/即時共有ポリシー、共有台帳、`tools/f1-sacred-forest/PIPELINE.md` と `common.py`。
- 17 GLBのJSON chunkを解析し、manifestのサイズ/面数/mesh/texture metadataと全17 SHA一致を確認。
- 実PNGを確認: `renders/sacred_cedar_tree/front.png`、`forest_fern_cluster/angle.png`、`forest_shrub_cluster/angle.png`、`white_wildflower_patch/angle.png`。
- 元の閉塞感の比較基準: `assets/3d/dungeons/b1_ancient_forest/renders/scene_corridor_eye.jpg`。天井、連続アーチ、壁と柱、垂れ根、局所光、苔の塊が一体化し、遠方が細く切れる。新試験の広い土床に単独の植物を置く構成とは大きく異なる。発光色や強度のそのままの再現を必須とはしない。

## 実行環境と出力の注意

- PATHの `/usr/bin/blender` は **4.3.2**。専用 `/workspace/tools/blender-5.3.0-linux-x64/blender` は実起動して **5.3.0** を確認。過去manifestの版表記を今回の実行版としてコピーしない。新制作は専用5.3へ固定する。
- `common.py` の `Path(__file__).resolve().parents[2]` は `/workspace/work/kotama` で正しい。`OUT` は元候補フォルダへ固定なので、V3制作は出力先を別フォルダへ指定するか、importしたmoduleのOUTを変更した専用entryで行い、原本のidを再実行して上書きしない。
- `finish()` はmodifier適用→材質単位結合→画像pack→Blend保存→GLB export→tangent修復→metrics→GLBを新sceneへ再import→4方向Cycles PNG。原点はBlender Z-up、glTF Y-up。runtimeのposition/rotationはglTF軸。
- `material()` は画像BaseColor/OpenGL normal/ORM。vertex colorをexportしない。画像がないと自作256pxノイズ仕上げfallbackになり、写真PBRではない。写実性の確認は実画像で行う。
- 新規の透過苔cap/草atlasはsource画像とalpha mode/cutoff/両面設定を明記。床近くのcoplanar重ねはz-fightingを起こすため、0.008〜0.02m程度の実距離を確保し、段差として目立たない実画面を確認する。
- 背景Blender起動時にread-only HOME由来のPulse/extension cache警告あり。今回の既存GLB読込は全て成功。制作ジョブでは必要に応じ `BLENDER_USER_CONFIG` 等をworkspaceへ向ける。HOMEを再定義しない。

## 原本17素材（manifestと実GLBを照合）

全て画像埋込のmetallic-roughness PBR。針葉材だけalpha MASK/cutoff≈0.45、ほかはopaque。値は原本の総量であり画面ごとのdraw/FPSではない。

| asset | tris | meshes | textures | glTFサイズm (X,Y,Z) |
|---|---:|---:|---:|---|
| `mod_sacred_stone_floor_4m` | 3,380 | 3 | 9 | 4.0 × 0.2302 × 4.0 |
| `mod_root_soil_floor_4m` | 1,992 | 5 | 15 | 4.0 × 0.3789 × 4.0 |
| `mod_sacred_wall_4m` | 5,424 | 4 | 12 | 4.0 × 4.0 × 0.806 |
| `mod_sacred_collapsed_wall_4m` | 4,164 | 4 | 12 | 4.0394 × 3.9663 × 0.778 |
| `mod_sacred_arch_4m` | 4,560 | 4 | 12 | 4.0 × 4.0 × 0.8 |
| `weathered_torii_gate` | 7,338 | 6 | 16 | 3.8 × 3.8026 × 0.4529 |
| `broken_votive_stele` | 1,433 | 4 | 12 | 1.0956 × 1.8 × 0.5872 |
| `moss_stone_lantern` | 2,366 | 4 | 12 | 0.76 × 1.6 × 0.74 |
| `ofuda_seal_cluster` | 540 | 1 | 3 | 0.6101 × 0.6005 × 0.0588 |
| `sacred_cedar_tree` | 14,712 | 3 | 9 | 5.7287 × 10.0 × 5.3498 |
| `fallen_cedar_log` | 6,420 | 4 | 12 | 4.2933 × 1.1442 × 0.9517 |
| `forest_fern_cluster` | 33,804 | 4 | 8 | 1.5532 × 0.5945 × 1.2879 |
| `forest_shrub_cluster` | 10,656 | 4 | 10 | 1.6597 × 1.1081 × 1.6488 |
| `white_wildflower_patch` | 9,632 | 6 | 16 | 0.8851 × 0.5704 × 0.9397 |
| `hanging_forest_vines` | 6,632 | 3 | 7 | 1.3232 × 2.4826 × 0.2357 |
| `mossy_granite_boulder` | 5,350 | 2 | 6 | 2.4566 × 1.4969 × 1.7734 |
| `sacred_hokora_shrine` | 18,262 | 8 | 24 | 2.11 × 2.449 × 1.8964 |

合計136,665tris / 21,305,008B。シダ1株33,804trisは全キット面数の約25%。花9,632tris、低木10,656trisも密度を数倍にする時のコストが高い。既存sourceを壊して削減するより、密度向けの別lowpoly assetを新規個別制作し、既存高精細株は近景アクセントへ限定する。

## 旧キットから再利用できる構造

専用Blender5.3で6 GLBを実importし、world bboxを確認。以下はBlender Z-up値（runtimeはYが高さ）。原本は変更しない。

| asset | local範囲m (X/Y/Z) | 用途と注意 |
|---|---|---|
| `mod_ceiling_vault_4m` | ±2.24 / ±2.24 / -1.099〜0.900 | 4m格子を覆う既存穹窿。runtime高さ4で最低部は約2.90m。宣言上のunderside4mと実底面は同一でない |
| `mod_ceiling_roots_4m` | -2.807〜3.188 / -3.198〜3.146 / -1.813〜0.907 | 根が格子外へ張り出す。runtime高さ4では最下部約2.19m。プレイヤー視界と頭上を実確認 |
| `mod_pillar_corner` | ±0.587 / ±0.584 / 0〜4.294 | 壁際の支持柱。通路中央へ出さず、天井荷重の位置関係を作る |
| `ruin_archway` | ±2.692 / ±1.820 / 0〜4.783 | 奥行のあるアーチ/トンネル的区間。幅5.38mは4m一マスを超え、隣壁と接続して空隙を隠す必要 |
| `living_root_arch` | ±3.393 / ±1.011 / -0.359〜4.428 | 根のくぐり。幅6.79m、床下根を含む。壁体と接続させる |
| `ruined_stone_pillar` | ±1.773 / ±1.478 / 0〜3.456 | 大きい柱周辺瓦礫。単独で中央に置かず、壁/支持構造と一体の崩落pocketへ |

現在trial JSONの天井は17枚でsealed_corridorのみ、旧穹窿を採用。`assemble_scene.py`の以前の全景は床を反転したsoffitも利用していた。新trialの全面空は素材不足だけでなく、garden zoneで意図して天井を省いている配置方針が主因。旧構造を見直さず新天井assetを増やすだけでは解消しない。

## 見た目と配置に関する監査

- 杉は10m高で樹冠が疎らな規則的段状。幹下部/根は使えるが、閉鎖4m天井の下へ杉全体を縮小配置するとミニチュア感が出る。高木は限定された崩落穴へ配置、通路では根/倒木/低木を主役にする。
- シダは枝葉の実形状を持つが、各小葉が均一で低色差。大量の同scale/向き/株数では園芸的に見える。群れの端・陰・岩陰・湿潤域へ分け、微小な低草と落葉で株元をつなぐ。
- 花は背の揃った細い茎と白花の孤立patch。花を均一に増やすより開口からの光の帯や湿った亀裂に少数群生させ、足元を苔/下草へ連続させる。
- 現石床は4m外周にflush境界を持ち、土surfaceと交互に置くことでmacro格子が露呈。石目地の細かさだけを改善せず、4m境界をまたぐ不定形苔/堆積capを配置し、土床の大きな四角い切替自体を減らす。

## 必要最小の個別asset制作順（設計/参考調査合流後に着手）

| 順 | 個別asset案 | 寸法/目安上限 | 解決すること |
|---|---|---|---|
| 1 | 不定形苔・湿土の地表cap | 幅2.0〜3.4m、高0.015〜0.06m、奥行1.5〜2.6m、300〜900tris/1〜2材質 | 原本床を残し格子境界と土色を隠す。縁を不均一な薄い葉/土塊へ |
| 2 | 低草と小シダの密度株 | 幅0.9〜1.5m、高0.18〜0.45m、500〜1,800tris/1〜2材質 | 大量配置用。既存33kシダと異なる細かな下層植生 |
| 3 | 根が巻く崩落石塊pocket | 幅1.8〜2.8m、高0.35〜1.1m、奥行0.7〜1.4m、1,500〜3,500tris | 既存壁際・柱際・石碑足元を接地。独立した角形破断石を非対称に |
| 4 | 頭上を横切る根/蔓segment | 長3〜5m、太根半径0.08〜0.24m、葉の垂下0.5〜1.5m、1,200〜3,000tris | 天井と壁をつなぐ。既存吊り蔓と接続して強い閉塞感 |
| 5 | 崩落天井の穴縁 | 外径5〜7m、開口径1.6〜2.6m、厚0.6〜1.0m、2,000〜5,000tris | 全面空をやめ局所穴へ。断面石/土/根を実形状で露出。旧穹窿との接続を設計で決定 |
| 6 | 水際の侵食岩/石段segment | 長2.5〜4m、幅0.8〜1.5m、高0.4〜0.9m、1,500〜3,000tris | グリッド水境界を視覚的に崩す。水下0.3〜0.5mまで形状を持つ |
| 7 | 小さな藻/浮葉群 | 幅0.6〜1.2m、20〜250tris、独自画像/1材質 | 水面の溜まりを表現。均等散布せず岸/陰へ限定 |

柱/トンネル/社/鳥居/大岩/大株/高木はまず既存を再利用し、必要な局所追加を1assetずつ制作する。新規full dungeon一括生成は行わない。水面の揺らぎ/濃淡/深さ/反射は別runtime表現であり、静止GLB生成を完了しても成功とは呼べない。

## 個別完成とゲーム内確認の基準

各assetでBlend・埋込GLB・front/side/angle/top PNG・metrics/hashを保存して実PNGを確認。さらに実ゲームで足元/近景/中景、通路の通過、FOE/固定7対象、階段/戦闘帰還を確認する。新しい草や瓦礫が通れる中央帯へ視覚的に塞がると衝突ルールと矛盾するため、中央の既存歩行帯を残し、壁際の厚みで視線を切る。最終位置/天井高さ/開口数は空間設計担当の座標案に従う。
