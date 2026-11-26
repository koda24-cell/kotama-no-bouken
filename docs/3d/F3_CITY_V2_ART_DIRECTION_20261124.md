# 第3層 遺跡都市 V2 — 美術再設計と制作前の判断

2026-11-24 JST。ユーザーは前回の品質を不合格とし、巨大な廃都市・高架・侵食した植生を含む参考7枚を提示。これを新しい品質基準とする。機能検査の合格やパーツ数を美術品質の代わりにしない。元候補と旧固定SHAプレビューは比較用に保持する。

## 実画像の比較所見

前回実公開画像 docs/reviews/f3-industrial-public/public.png は、4mごとの平坦な壁が画面の大部分を占め、奥に小物が点在している。梁・建物を高さ5–8mへ潰して配置しており、巨大建築の荷重・階床・用途が読めない。明るい環境光が凹凸と接地を弱くし、床と壁の素材スケールも揃わない。白い霧だけでは廃都市の密度にならない。

第一層3Fの実比較 docs/reviews/f1-v7/after-3f-0.png には、手前の岩と草、苔の面積差、天井の根、壁の凹凸、遠方の霧が連続する。V2ではこの近景の密度・接地・素材の統一を最低条件とし、別テーマだから密度が低くてよいとは扱わない。

ユーザー参考から抽出: 人物との大きなスケール差、複数の高さの構造、厚い開口と暗い室内、破断した床スラブと露出鉄骨、近景の足元→中景の橋→奥の塔という階層、縁から垂れる植生、明るい曇天と読める暗部。参考作品の形状・ロゴ・画像はコピーしない。断崖や超高層へのゲームマップ移動を意味しない。

## Pinterest再調査

公開Pin72件/9題材の実サムネイルを確認。全URLと選定20件の所見はresearch/F3_CITY_V2_PINTEREST_20261124.json。巨大工業遺構、コンクリート集合住宅、NieRの構図、トラス接合、植生と路面、石造都市のアーチ、デュースブルクの製鉄所、軍艦島、プリピャチ周辺を比較。Pinは参考資料であり未保存、再配布素材ではない。見た目が魅力的な生成画像・非現実構造は構図の比較だけに留め、支持関係は実物の工業写真を優先する。

優先: https://www.pinterest.com/pin/536983955551701648/ （中庭と露出階床）、https://www.pinterest.com/pin/10836855323987320/ （高炉の作業床）、https://www.pinterest.com/pin/118430665251307445/ （鋼材接合）、https://www.pinterest.com/pin/678847343866388354/ （侵食した床と植物）。

## 使える素材の調査（実取得とは区別）

公式ページとライセンス https://polyhaven.com/license を確認。以下5候補はCC0、商用利用/再配布可。元ページのプレビューをBlender素材として扱わず、APIで取得した実ファイルだけを取り込み前にClamAV検査する。解像度はまず1K–2K、近景を落とさず材質/画像を共有する。

| 候補 | 公式ページ / API | 部位と採用判断 | 状態 |
|---|---|---|---|
| Concrete Slab Wall | https://polyhaven.com/a/concrete_slab_wall / https://api.polyhaven.com/files/concrete_slab_wall | 階床・梁・柱の粗いコンクリート。壁全面を同じ傷模様で埋めない | ページ/CC0確認、実取込未確認 |
| Cracked Concrete Wall | https://polyhaven.com/a/cracked_concrete_wall / https://api.polyhaven.com/files/cracked_concrete_wall | 旧塗膜と雨筋。新築の均一な灰色を避ける | 同上 |
| Cracked Concrete | https://polyhaven.com/a/cracked_concrete / https://api.polyhaven.com/files/cracked_concrete | 路面の大きな亀裂と皿状の欠落 | 同上 |
| Concrete Debris | https://polyhaven.com/a/concrete_debris / https://api.polyhaven.com/files/concrete_debris | 建物根元の骨材/小片。独立岩を散らすだけにしない | 同上 |
| Fern 02 | https://polyhaven.com/a/fern_02 / https://api.polyhaven.com/files/fern_02 | 既存草より高密度の近景群落。元モデル/alphaを保持し用途別の負荷監査 | ページ/CC0確認、未取得。既存first-layer草も併用 |

既存chipped_concrete/concrete_moss/rusty_iron/asphalt_02は検査済み原本を維持して再利用する。新規取得の失敗を架空の成功として置き換えない。

## 空間構造

既存7–9Fの歩行・階段・イベント・ボス配置を維持。地上の壁奥/隣の通路は引き続き遮蔽。上方は12–18mの建物の外壁・露出階床・機械塔を見せ、2–3段の高さを持つ橋梁で上下を繋ぐ。遠くの街路を透かすことと、頭上の大きな建築が見えることを分ける。プレイヤーが歩くのは元マップの通路、装飾の橋/断面へ誤って誘導しない。

近景0–6m: 目地の泥、割れた縁、コンクリート破片の大小、根、草3種以上・シダ・低木・蔦、湿りの粗さ。中央1.8mと旋回カメラを守る。中景6–22m: 建築の窓/庇/梁/床断面/配管支持、1箇所の明確なランドマーク。奥22–44m: 低コントラストの塔や高架の輪郭。霧は近景を白く塗りつぶさず高さと奥行きを出す。

単純な壁パネルを建物として引き伸ばさない。新作の立体ファサードを実寸で作り、窓のくぼみ・床裏・側面・支持構造が横向きでも読めるようにする。4m幅の建築bayを連続させる際は欠損階/窓/外廊下の差を使い、同じ輪郭を90度回転して反復するだけにしない。

## 直列制作と品質の合格条件

1. **v2_courtyard_facade**: 4m幅/約3.6m奥行/15m高。露出した階床、暗い室内、欠損した上階、窓の奥行き、雨筋、露出鉄筋、外部配管と根付いた蔦。まず一体を実GLB再取込5方向で見直す。
2. その一体を使う代表街路を実ゲームで確認。足元の密度/明暗/壁奥遮蔽/上下のスケールが第一層3Fより弱い間は全域へ量産しない。
3. 機械塔、破損したトラス高架、崩落路面、群落を1点ずつ制作・実画像確認。既存25候補は再評価し、用途が読める寸法/支持/材質へ改修、V1は比較用に保持。
4. 7F旧市街→8F製鉄/作業床→9F交通結節点へ空間の個性を展開。全フロアを同じ装飾組合せで埋めない。
5. 固定位置の実画面と元版/第一層3Fを比較。明るさ/近景の形/材質の大きさ/左右の繋がり/上方の構造/床の群落を目視評価し、失敗を記録。モデル数・画像差分・CI成功だけで美術合格にしない。

Blender5.3固定共有Actions、入力/出力ClamAV、原本保存、1点ずつのチェックポイント/独立進捗登録、NOT_APPROVEDを維持。近景を失う一括decimationなし。完成モデルと検査の状態を混同しない。


## 追加の直接利用候補（公式の実プレビュー確認）

2026-11-24 JSTに https://polyhaven.com/a/modular_factory_facade 、https://polyhaven.com/a/modular_urban_apartments_facade 、https://polyhaven.com/a/shrub_01 の公式画像を実ブラウザで確認。いずれも公式CC0。工場キットは窓枠/煉瓦/荷捌き口/庇、住宅キットは扉/柱/窓/設備の整った近景部品。新品の見え方をそのまま採用せず、元のUVとNormal/AOを保持して用途が合う部品のみを風化改修する候補。原本パック全体を一つの完成アセットとして都市へ一括挿入しない。Shrub01は約282Ktriと高密度なので大量配置しない。まず6Ktri級のFern02を近景の群落として検証する。これら追加3件は公式ページ/プレビュー/ライセンス確認のみで、実バイナリの取込は未実施。

作者の一からの単純造形に固執せず、適合する専門家のCC0部品や写真素材を優先比較する。原本/元URL/検査/採用範囲は別に残す。


## Actual structural review checkpoint
- Tower: source4149167e, run45415404490; five actual images reviewed. Supported I-sections, vessel, four platforms and alternating stairs read in silhouette, but dark studio metal cannot establish in-game near-surface acceptance.43,208tri; 15.451m. Source AO import compatibility retry preserved source geometry and AO.
- Courtyard: source677b99c, run45407771986; actual street image still too white/regular. Weathering revision uses official worn_mossy_plasterwall after visual comparison with concrete_layers_02 and chipped_concrete. Bake macro rain at sill corners, downpipe streak and moist ledges into photographic atlases inside pinned Blender, preserving modeled damage and room depth. Pending render; not accepted.
- Truss crossing design:8m span,7.2m high,5.3m deck, bearing piers x±3.25m inside solid wall cells, central walkway clear. Actual I-section chords/Warren diagonals/hex gusset bolts/open grating/attached broken rails. Individually authored source prepared; not rendered.
- Fern: official Poly Haven fern_02 four source meshes and original UV retained, official separate alpha applied; per-download scan before import. Run45416559718 pending; must inspect final MASK GLB, not assume exporter alpha correctness.


## Additional direct-use source comparison and actual foliage checkpoint
- Fern run45416559718, source3d4b0011 succeeded;6,232tri/one material, official source four mesh UV/vertices preserved. Final MASK GLB reimport front/back/side/angle/top inspected: real leaf silhouettes, no opaque rectangular card bounds. Input per-download and complete-folder scans clean; output86files/infected0, packed authoring source reopened. Gallery c04eeab. This is a part checkpoint, not city approval.
- Official periwinkle_plant (Amal Kumar, CC0, official page/license and actual primary preview inspected) offers6 prebuilt plant variants, source glTF34,350tri,1K bundle~2.91MB. Consider sparse sheltered flower pockets, not rows across the walking line. Metadata read only; binary import/render pending.
- tree_small_02 official1K glTF is one LOD0 mesh2,062,487tri/~101MB included source. pine_sapling_small official glTF includes3 meshes398,144tri/~21.9MB. Primary previews/metadata examined; reject mass placement of these high-density originals. No unreviewed arbitrary foliage decimation and no claim of imported tree models.
- Actual all-street software browser screenshot timed out120s after live scene/ray data. Preserve failure log rather than report a visual pass. Trial revision caches static sun shadow maps until camera/visibility changes, adds conservative per-instance frustum filtering (retain12m nearby shadow casters), then checks again. A2fps software inspection cap is explicit test-only, not a device-performance result or a shipped game framerate.
- Auto-review workflow: prior startup_failure45416584369; nested reusable requires packages:read that caller had omitted. Feature fix grants read only and guards empty selection. Run45417850533 now completed as intentionally skipped for this serial production feature. Does not establish successful general all-floor rigid review; new V2 actual sources still need their own shared audit.


## Whole-floor composition and preserved gameplay
- 7F: tall five-storey courtyard bays, occasional industrial bays,3 low cutout ground species plus photographic fern banks. Road services group at bends/dead ends; low natural dressing on long straight walls. Supported truss crossings frame the entry street.
- 8F: factory-bay proportion65% by coherent3x3 block hash, work towers/visible connected platforms and crossings. Four-storey factory window kit keeps professional UV/detail, own walls/floors/roof damage completes the volume.
- 9F: existing map vegetation symbols* become reclaimed earth/moss/short groundcover instead of universal paving. Photo ferns and sparse flower pockets use outer margins; central movement strips and reserved interaction cells remain readable. Approved double-flight stairs are reused uniformly inside an existing2x2 solid block as a closed ruin court; rear/side closures prevent seeing the next street. No map/event/FOE/encounter/save relocation.
- All enclosed rooms remain physical volumes. Normal-depth fit1.70m lets opposing bays fit a four-metre solid cell; model originals remain4.1106m deep. Near geometry detail is retained. Factory and courtyard selection differs by floor without changing region numbering.
- Runtime dependency plan skips seven unused native/stair background prototypes;9F explicitly loads the one approved stair when reused. All originals remain in the review catalog. Images are fetched only after parsing SHA-verified selected model headers and matching every referenced URI to the declared image hashes. All-source review mode remains available for loader/disposal QA.
- Structural AO run45425172072/source7f50b334 succeeded: original photographic UV array unchanged, new CityAO UV1/CPU Cycles32sample1024x2048; all final materials export AO.texCoord1.29,106tri retained; output139files/infected0 and packed authoring source reopen. All5 geometry comparison PNG reviewed; actual AO appearance must be judged in Three.js because glTF AO metadata alone is not a Blender studio-lighting proof.
- Road render45422753105 is a preserved intermediate. Final scene review found rotated gutter chips highlighting four-metre borders, so run queued to remove chip rows/darken cut faces/match all border elevations. Do not present the intermediate as final art.
- Geometry support validation clips each transformed bridge triangle below3.5m, rejects intrusion into the central2.2m strip, records two true bearing envelopes and upper structure separately. This replaces the loose full-height AABB false positives; actual retry pending.

## 2026-11-26 verification checkpoint
- The latest road45426982715 removes rotated white gutter rows and darkens fractures; latest wildflower45432034546 makes an irregular six-source pocket rather than a planted row. The new CC0 photographic statue45429934515 retains its original sculpt and UVs, with a chipped mossy plinth. All five final reimported PNGs per asset were inspected and independently registered.
- Complete catalog:35 models, partial=false. Actual runtime GLBs:0 validation errors; all new/revised sources0 warnings, unchanged approved stair warnings9/46 retained separately. The reused first-layer cedar also validates0 errors/0 warnings. Model/image hashes are retained; no new unverified dense tree is introduced.
- Shared actual-source audit45793054822 succeeded for8 V2 models:196491 triangle equivalents,50 primitive instances. Original-source count is not gameplay FPS. Statue LOD comparison28007/15403/7001tri:12 views inspected,3 GLBs0errors/0warnings, original SHA unchanged. Lowest candidate has visible plinth contour loss; all variants remain unadopted NOT_APPROVED.
- First full PC pass verified controls, chest/gather/puzzle gate, stairs, save roundtrip and stable warm geometry/texture counts. Its LOD shape counter used camera-compacted draw counts and reported0 despite14 correct switches; the corrected allocation counter rerun passes. Original failed JSON is preserved. This does not silently relabel a failed test.
- Extra court views exposed large bare green closure panels. Runtime812f343e replaces these with closed architectural bays facing both court and street, inside the same nonwalkable cells. Current final mobile/PC visual and remote delivery verification must use this revised source. Old flat-panel screenshots are intermediate evidence.
- Final review and evidence index: F3_CITY_V2_REVIEW_20261126.md. No main/development art promotion; no automatic art acceptance or claim of reference-game equivalence.

## Final delivery checkpoint
- Runtime bf178b2d seals terrain beneath every solid block and adds low foundations after the original public spawn exposed white sky strips. Actual final representative7–9F PNGs and original public-entry image are in docs/3d/f3-city-v2-review-20261126/, image commit8b2777a2. Final hard-lane overlaps0/hash checks pass. Older court/white-strip photos remain explicitly intermediate.
- New fixed wrapper dad994710c9ed1068680d730241a38771ad8cc14 is verified through the public notice to real V2 rendering/28 verified models/isolated normal saves/pageerrors0. Actual CDN7–9F, alternate-host503 recovery and isolation-entry failure protection pass.35-source repeated render/disposal and normal/failure fallbacks also pass; physical FPS remains unmeasured.
- Documentation-only PR848 is merged into development. Creator directly published four source-pinned scene images through independent galleryPR21, merged at8522467e; PR browser test45801370261 and the actual public gallery decode/zoom test pass. All retained originals remain NOT_APPROVED; Draft gamePR785 is not merged.
