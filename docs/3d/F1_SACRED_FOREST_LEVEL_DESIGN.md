# 第1階層後半「鎮守の根庭」構造設計・既存実装監査

調査日: 2026-11-16 JST。担当: level_design。基準: development `ae7995ae9ab7c36a547c6dbd7a5d601d3fc4bea5`。
状態: **制作前の設計案**。本担当によるゲームコード変更、統合、GLB制作、性能計測は未実施。未マージPR #382は取り込まない。

## 1. 読了した制約

`AGENTS.md`, `docs/3d/BLENDER_DOCKER_HANDOFF.md`, `docs/3d/TOOLING_AUTO_SHARE_POLICY.md`, `docs/3d/SHARED_TOOLING_CATALOG.md`, `docs/field-and-story/FIELD_3D_ASSET_GUIDE.md`, `docs/field-and-story/FIELD_3D_SPEC.md`。

- 既存のゲーム機能・素材・戦闘・セーブを保持する。制作実験のため共有runtimeを変更しない。
- 実際にGLBを再読込してレンダリングする。制作コードの存在だけでは完成判定しない。
- 一素材一GLB、単位m、glTF上+Y/正面+Z、底面中央pivot。Blender正面−Y。
- 4mセル。床の継ぎ目y=0、壁高4m、既存扉幅2m/高3m。垂れ物は上端pivot。
- 頂点カラー不可。POSITION/NORMAL/TEXCOORD_0必須。standard MR/法線OpenGL +Y/ORM、GLB埋込。
- 画像サイズ256/512/1024。基本1MB、巨木等4MB以下、従来一層約40MB目安。
- 既存b1ファイルは上書き・改名・削除しない。新後半候補は独立フォルダへ。
- user approvalなしに「承認済み」「本番統合済み」と記載しない。

## 2. 実装から確認した事実

### セルと行動

| 対象 | 現状と根拠 |
|---|---|
| 三層構造 | 第一階層内に1F/2F/3F。`data/field-maps.js:20–107` |
| map寸法 | 1F=27×21、2F=27×21、3F=28×18。Node vmで全行幅を検査、一致 |
| 3Dグリッド | CELL=4m、EYE=1.6m、BACK=1.1m。`field/field-3d-view.js:30` |
| world座標 | x=tx*4、z=ty*4。`field/field-3d-view.js:239`付近 |
| ルール座標 | FIELD_TILE=32px。3D worldと区別。`field.js:16` |
| 歩行判定 | `fieldCanEnter`→既存文字mapと扉フラグ。GLB meshはcollision sourceでない。`field.js:113–129` |
| 操作 | 一歩一ターン。FOE接触→FOE移動→接触→エンカウント。`field/field-movement-foe.js:104–124` |
| 歩行高さ | logical stateにheightなし。視点は一定高。階段は別フロアへのトリガー。真の多層歩行/ジャンプ/傾斜歩行未対応 |
| 草と安全地帯 | `*`は歩数蓄積1.5倍、FIELD_SAFE上はエンカウント蓄積なし。`field/field-movement-foe.js:137–149` |
| セーブ | mapの探索bit配列は幅×高に依存。位置、checkpoint、object ID、flagsを保存。`field/field-persistence.js:21–48` |

### 描画と読み込み

- `field/field-3d-view.js:19,25,133–136`: GLTFLoader＋Promise cache。既存BASEは `assets/3d/dungeons/b1_ancient_forest/`。
- `field/field-3d-view.js:39–49`: 同じFILESを1F–3Fで利用。別後半テーマは未実装。
- `field/field-3d-view.js:254–262`: 全非壁セルへ床を置き、**例外なくy=4に天井を置く**。草や開けた3Fも低天井となる。反復の主因はディテール不足だけでなく、この組立規則。
- `field/field-3d-view.js:263–279`: 四方の壁境界へ壁部品、deterministic hashにより崩壁/苔壁/蔓を配置。
- `field/field-3d-view.js:284–305`: 階段/宝箱/採集/灯/NPC/門などを同じworldへ配置。後半テーマに置換するならこれらのentry/sync契約を維持する必要がある。
- `field/field-3d-view.js:321–355`: 開閉・採集枯渇・扉持ち上げ・イベント完了の見た目をsync。new sceneだけではこれを代替しない。
- 同ファイル:29,96,98,143: fog density=0.042、far=48m、FOV=68°、ACES exposure=1.3。現行のまま50m以上の遠景や空の抜けを期待しない。
- point lightはhigh14/low6のpool、extras.b1.lights。glTF lights extension禁止。
- READMEやmanifestには「一層だけ」「未接続」といった古い文言あり。実行コードを正とする。

### 見た画像

実際に目視したのは `docs/reviews/b3-quality-20261110/b1-reference.png`。最新のライブ実行ではなく保存済みbaseline。
現画像は青緑の強い発光、低い繰り返し天井、規則的石積み、直線廊下。後半を区別するには石の高精細化だけでなく、空間断面・光の入り方・silhouetteの変化が必要。

## 3. 保持すべき座標と意味

| フロア | 保存すべきobject/座標 |
|---|---|
| 1F（f=0） | E(1,19)、下り(19,3)、G(1,1)/(9,17)、T(13,13)/(25,17)、レバーe(10,18)、扉f(19,18)、cache g(19,15)、stump c(25,1)。FOE path(25,14)↔(25,9) |
| 2F（f=1） | 上り(1,19)、下り(25,1)、S(7,7)、G(13,7)/(23,11)、T(17,1)/(9,13)、root cache d(23,17)。FOE bear(19,14)↔(17,16)、goblin pack(22,19)↔(23,19) |
| 3F（f=2） | 上り(1,16)、P(2,15)、NPC a(3,14)、b(23,12)、T(10,6)、看板?(22,9)、S(24,3)、B(22,1)。FOE crystal guardian(22,9)↔(23,10) |

「後半」の安全な制作上の定義: 1Fを完全保持、2Fで進行に応じた前兆を設け、3Fを新しい神域の主空間として設計する。ユーザーへの未確認部分はこの範囲の解釈であり、mapを書き換える承認待ちという意味ではない。今は候補scene制作で進める。

## 4. 新空間のコンセプト

**鎮守の根庭 — 祀るために切り開かれ、再び森に覆われた古い神域**。

中心は「寺社風の飾りを置いた石迷路」ではなく、自然の地形に沿って人が作った参道・境界・小さな祭祀の跡。その下に封じられた回廊が見え隠れする。

- 第3階層は都市廃墟。本作は住宅/道路/塔の林立を避け、苔の土留め・石段・板根・祭祀の痕跡を主体にする。
- 第5階層は深淵の城/神殿。ゴシック尖塔、黒紫、巨大玉座を使わない。
- 一層らしい明るさの兆しを残し、地下密閉→半開放→空の見える根庭へ進む。
- palette案: 暖灰の砂岩/花崗岩、低彩度オリーブ苔、湿った黒褐色土、銀灰の樹皮。退色朱はtoriiと少数の紐だけ。小花は淡象牙/藤紫を少量。

## 5. 空間の五つのビート

| 区間 | 空間断面と道の形 | 主役 | 視線と進行 |
|---|---|---|---|
| A 根の狭間 | 4m幅/4m天井を一部残す、2回曲がる短い道 | 割れた参道敷石、根が入り込んだ石積み | 前方の光と朱を先に見せる。新空間をすぐ全景で見せない |
| B 斜めの鳥居 | 8–12m幅の半開放前庭、左右非対称 | 退色鳥居、石碑、垂れたお札 | 鳥居の中心から次の石碑が見える。必須進行路の有効幅2m以上 |
| C 祈りの中庭 | 高さ10–16mの空の抜け、道が左右に分岐し再合流 | 板根の古木、崩れた石基壇、低い花群 | 一見の広がりと安全な周回。外縁に探索報酬、中心は歩けないroot island |
| D 地下の封印回廊 | 中庭に見える開口から再び4m高へ圧縮 | 欠損石門、石碑列、紙札の封じ目 | 乾いた祀り側→濡れた崩壊側の材質遷移。直線反復は最大3セルで折る |
| E 奥社の根庭 | 開放→静かな小さな祭祀庭。地面は平坦、周辺に低い落差 | 中心石碑、崩れた祠の基壇、古木silhouette | ボス門を既存Bとして保つ。最終目印は1つ。low qualityでも読める明暗 |

重要: 既存エンジンの平面移動に合わせ、**実際に歩くpathの高さは0**。見せる階段は低い段差の装飾か通行域外。周囲の排水溝・窪地・崩れた地下開口で高低差を表現する。垂直移動を新規実装したことにしない。

## 6. アセット制作前のhero scene配置案

この表は独立candidate sceneの設計座標。既存tile mapへの自動統合座標ではない。
Blender XYを床、Z上。glTF変換後X/Z床、Y上。入口方向はBlender y=-側（glTF+Z）。

| アセット | Blender床位置m | 役割/寸法枠 |
|---|---|---|
| 主参道 | x=-1.5…1.5, y=-12…10 | 幅3m、全歩行面z=0。破損は縁で作り、路上の大穴なし |
| 鳥居 | (0,-6,0)、正面−Y | 全幅5–6m、高4–4.8m。通行開口2.8–3.2m幅/3m以上高。両脚は通行枠外 |
| 石碑主役 | (-4,1,0) | 高1.8–2.4m。90°近く回っても読める欠けsilhouette |
| 古木 | (5,4,0) | 高10–14m。板根は中心通行帯へ侵入しない。必要に応じ別scene上限 |
| 崩れた回廊口 | (0,9,0) | 4m moduleを2枚、開口2m×3m。奥は次のroomを示す |
| 茂み | x=±2…±6, y=-9…7 | 0.35–1.1m、0.8–1.8m群落を大小混在。連続等間隔配置しない |
| 岩 | x=±4…±8, y=-7…10 | 0.3–2.8m。3サイズ比、同じpatternに回転だけしない |
| 花 | 中庭の陽の当たる縁 | 0.1–0.4m、5–12株群落、道の中央へ撒かない |
| 蔓 | 門上/石壁/古木根元 | 重力下向き、付着点を明確にし、宙に浮かせない |
| 札 | 鳥居横木の片隅、石碑側面、封印門 | 0.08–0.16m幅/0.25–0.4m高。裏面/反り/汚れと取り付けを作る |

Scene minimum base footprint案: 20×28m、構図のため奥に追加した非歩行背景を含め28×36mまで。上記は専用candidateに限った制作枠。既存の4m module寸法契約は維持。

## 7. 必須の個別制作順序

一括手続きで全assetを完成扱いにしない。各段階で保存・export・GLB再読込・front/side/angle・寸法/材質チェックを行う。

1. 基準石一個: 欠けた角、異なる方向の岩面、roughnessとnormal、苔の分布。これを全石材の材質基準にする。
2. 敷石module: 境界0mとUV密度、隣接2枚の継ぎ目を確認。
3. 石碑: 真のgeometry欠損/下部の土染み/摩耗した刻線。読めない疑似日本語で情報伝達しない。独自の記号なら独自記号と明記。
4. 鳥居: 木口/継手/木目方向、部分的朱塗り剥落、根元の腐朽。主役としてhero cutを確認。
5. 古木: 幹の量感→板根→主枝→細枝→葉群。シルエットを先に確認。
6. 茂み、シダ: それぞれ独立asset、葉の向き/節/低い草群との接続。
7. 花: 単株→群落asset、花弁裏/葉脈/茎曲がり、彩度の上限。
8. 蔓: 主茎/側枝/付着点、薄いleaf cardのみでvolumeを埋めない。
9. お札: 切れ、紙の反り、釘や糊の取り付け、インクの掠れ。実在の御札をtexture転用しない。
10. 石積みと崩門: 小さなchipを密集させず、力が掛かった方向の大きな破断を作る。
11. 最後にsceneへassemble。各assetにasset_id、pivot、寸法、LOD、使用textureとlicenseを記録。

## 8. runtimeに入れる場合の最小統合境界（未実施）

- `field/field-3d-b1-sacred.js`等の独立module案。shared rendererやmovementやsaveをasset制作の都合で書き換えない。
- `field-3d-view.js`へ後半theme用の薄い選択フックを足すなら、限定feature flagか専用preview URLで先に検証する。
- 既存1Fの`FILES`/`BASE`と前半組立ルートはそのまま。
- 後半は`roomId`と`ceilingMode`をstatic配置manifestへ記録。単なるhashに任せず、roomごとの壁とceilingあり/なしを設計する。
- game mapの壁を見た目だけ消すと「見えない壁」になる。wall meshの代わりに根壁/岩/崖/土留め等の通行不可が明確な物を必ず配置。
- 通行できるmapセルに石碑やtree trunkを立てて通行を塞がない。装飾collisionに頼らず既存gridを守る。
- zone切替を`tx>13`等で決めない。2Fは曲折mapなので、通行graphの入口からの到達距離と手で指定したportal/roomを使ってmaskを固定する。objectセル/FOE/隣接操作セルをmaskから除外。
- topological map変更をする場合は旧saveの位置/checkpoint/探索bit移行が必要。**今の設計段階ではmap文字配列を変更しない**。

## 9. 受け入れ基準

| 分類 | 合格条件 |
|---|---|
| ゲーム | 既存レバー/扉/宝箱/採集/灯/NPC/看板/ボス/階段/FOE/セーブ再開が保たれる |
| 通行 | 4mセル中心と移動軌跡が見た目の障害物を貫通しない。有効2m以上/頭上3m以上 |
| 接続 | 4m床2×2の継ぎ目、壁端、開口、隅がfirst-personで破綻しない |
| 構造 | 狭窄→鳥居前庭→根庭→封印回廊→奥社の5ビートが画像でも区別できる |
| 質感 | 退色と湿度と苔の方向が全assetで一貫。欠けはsilhouette/geometryで確認可能 |
| 視認 | 主進行路、操作対象、FOEが低画質でも見える。花/紙札の白がゲームUIのfocusと競合しない |
| 輸出 | glTF2.0/standard MR/UV/法線/埋込画像/適正pivot/size/hash検査 |
| evidence | 実GLBのfront/side/angle＋hero eyeheight view＋top plan。生成コンセプト画像を証拠にしない |
| 性能 | high/lowでFPS、draw calls、tris、texture memoryを実測し既存baselineと併記。未測定値を合格にしない |
| 保存 | source.blend/個別GLB/preview PNG/manifest/creditsをreview可能な独立branch/PRへ。ユーザー承認前はcandidate |

## 10. 検証入口

既存通し確認: `tools/b1-3d/game-test.js`（node, playwright-core, Chrome, local three r180）。
既存testの対象は1F〜3Fの移動・旋回・横移動・壁衝突・採集・宝箱・レバー/扉・階段・灯・NPC/看板/水/ボス・戦闘切替・2D/3D。

この調査ではテストを実行していない。ゲーム起動や最新developmentのライブ画面確認は親の制作/検証担当に引き継ぐ。

## 11. 実3F候補の植生密度改善・制作前追補（2026-11-16 JST）

対象は `scene/game-layout-candidate.json` と独立した `preview/f1-game-layout-candidate.html`。完成デモの `assemble_scene.py`、`.blend`、17個別GLB、実レンダPNGとその検証記録は凍結する。ゲーム本体へ適用しない。

### 配置の意図

現候補は112×72m相当の実3Fマップに杉5本・小物66点で、森の神域より石の迷路の印象が強い。マップを変更せず、以下の手設計した局所ポケットと外周樹帯で、実測判定に通った杉の合計20〜30本を目指す。

- **根の参道**: 既存鳥居の軸は空け、南側・西側のblocked islandと外周に杉の前後層を作る。NPC・階段の隣接操作マス、FOE巡回と通行中心は触らない。
- **祭祀庭**: 小祠・石碑の背後に樹冠を置き、手前は灯籠・小さいシダ・少量の白花で静かな拝所を示す。幹と大岩を進行路へ置いて視線を塞がない。
- **水際の根庭**: 元の水マスを完全保持。乾いた岸のcornerとblocked islandだけにシダ・低木・岩・花をまとめ、倒木は陸側の非通行域へ。水の上に床や根元を置かない。
- **封印回廊の外縁**: 入口の判読を優先し、背後と外周に杉、壁の取り付け位置にだけ垂れ蔓を加える。既存vault ceilingを新候補17素材と混同しない。

全域のuniform/hash scatterで密度を埋めない。既存87枚のsoil-only床と187枚の石床はそのまま。新しい杉は自然な0.85〜1.30程度のscaleを基本とし、衝突した物を極端に縮小して数だけ合格させず省略する。既存にあった小物配置と2件の危険配置の省略記録は保持する。

### 地面と検証

blocked island・外周ポケットの根元には、同じ既存土床GLBからsoil専用ノードだけを選んだ4m地面を局所再利用する。`dressingGroundPlacements` として274歩行床と分離し、`gameTraversable:false`・`navigationSolidUnchanged:true` を記録する。元の水・歩行セルにはこの追加地面を重ねず、地形の生成やマップ範囲の拡張として扱わない。

追加した全instanceは実GLBの祖先変換込みtriangle-AABBを、全歩行セル/辺の幅2m×高さ3mの既存sweepへ照合する。地面の選択ノードも同じ検査に含め、衝突配置はJSONの省略配列へ理由付きで残す。床・固定object identity7点・FOE・source runtime fingerprint・17GLB hash・水マスの一致を改めて確認する。

全マップとzone別に、instance数・杉本数・triangle量・material primitive由来の概算draw call・unique source容量を記録し、独立viewerにも確認欄を設ける。これは全域を同時表示する場合のコスト見積であり、culling/LODや実機FPSの承認ではない。実Three.jsでsource pin・soil選択・UV/法線・2×2高さ・表示切替・エラー0を再確認する。

### 密度追補の実行結果

生成source checkpoint `1991a91` から実候補を再生成。杉25本・小物129点・非歩行soil支持床177枚が判定を通過し、計8件（従来の2件を含む）を省略した。新しい植生を縮小して合格させる修正は行っていない。全域のtriangle/material primitive概算3,911,334/2,092は、独立Three.jsでロードした全instanceの集計と一致した。元の274床、water、fixed object identity、FOE、map/save関連sourceは不変。

[実ブラウザQAと制約](../reviews/f1-sacred-forest-game-layout/README.md)に、SHA照合・soil抽出・祖先変換・2×2床・9種の拒否動作・実画面を保存。俯瞰での針葉minification、実機FPS、ゲーム本体の回帰・統合は未承認のまま。
