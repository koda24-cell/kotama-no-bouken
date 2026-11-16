# 一層後半・個別アセット実画像レビュー

2026-11-16 JST。候補素材であり、ユーザー承認は未取得。最高峰品質やゲーム統合済みを意味しない。

## 検証方法

個別の制作scriptを1点ずつBlender 5.3.0で起動し、GLB出力後に元シーンを破棄してGLBを再import。CPU Cycles 16 samples / 640px、AREA powerは初回の0.18倍・world0.25・exposure−0.2へ校正、front・side・angle・topを実レンダ。次のアセットの起動前にangle/top画像を目視し、形状・接地・欠け・トーン・技術予算を確認。全sceneの一括生成で置き換えない。

サイズとポリゴン等は `assets/3d/dungeons/b1_sacred_forest_candidates/metrics/` のJSONが機械測定値。原点・開口・床継ぎ目・GLTFLoaderの実行検証は全景検証でも確認する。レビューの「確認」は最終承認ではない。

## 個別レビュー

### 01 mod_sacred_stone_floor_4m

- GLB再import実レンダのangle/topを確認。
- 4×4mの平面、欠損した石板角、沈んだ土目地、外縁のフラットな接続面を視認。中心歩行帯の障害物はない。
- 実測: 1,003,784 bytes / 3,380 triangles / 3 draw calls、footprint 4×4m。植物部最高約2cmは側部に限定。外縁面Z=0、裏厚0.21m。
- 中立照明では明るい暖灰色。湿った森の全景照明でもトーンを再評価する。写真の苔斑が均質に現れる傾向があり、全景で同じ床のみを連続させない。
- 判定: 単体技術確認、全景・継ぎ目・ユーザー品質レビュー待ち。

### 02 mod_root_soil_floor_4m（初回、要調整）

- GLB再importのangle/topを目視。4×4mの境界、幅1.7m以上の平坦な中央歩行帯、左右に寄せた接地根、半埋没の参道石板を確認。
- 実測: 2,444,772 bytes / 1,992 triangles / 5 draw calls。footprint4×4m、裏厚0.22m、根の最高約0.159mは左右端。
- 問題: 初回中立レンダが淡いベージュに寄り、湿った林床として明度が高すぎる。写真原画像は緑/茶色であり、写真自体の破損ではない。共通レンダ照明・材質変換を確認中。
- 容量は基本1MB目安を超える。石/土/樹皮写真PBR＋葉/苔の5材を利用しており、容量最適化または理由を明記した予算例外が必要。
- 判定: 形状一次確認。色/容量の調整と再レンダが必要、ユーザー承認待ち。

#### 共通照明の校正

土床の写真原画像とGLBを比較し、初回スタジオ照明の過照明を確認。写真自体の色変更は行わず、AREA energyを初回の0.18倍、world0.25、AgX exposure−0.2へ統一。既存土床GLBからangleのみ再撮影し、緑茶の林床・茶の根・暖灰石の分離が回復したことを実見。最終納品の全方向画像は新しい照明で再レンダする。

土床の二次素材（石・樹皮）の画像のみ512→256pxへ縮小し、主林床512pxと造形は保持する。CC0原画像・変換・hashはtexture-sources.jsonに記録。最終容量は再build後の計測値を採用。

#### 01 最終候補再確認（affaa55）

写真派生wet-gradeを利用して再buildし、新しい照明で4方向を撮影。angle/topを実見し、石の暖灰と苔の低彩度オリーブが分かれ、初回の過剰な白さを解消。石板の輪郭と土目地は維持。実測 939220 bytes / 3380 triangles / 3 draw calls。技術一次確認・全景/ユーザーレビュー待ち。

#### 02 最終候補再確認（affaa55）

wet-grade/校正照明/副材256pxで再buildし、angle/topを実見。林床の緑茶色と埋没した石板、細い葉、側方の根が読め、初回の白さは解消。4m境界は維持、中央への根の侵入なし。実測1,224,048 bytes / 1,992 triangles / 5 draw calls。1MB目安を約0.22MB超えるが、1.5MB以下の個別目標を達成。主林床512pxを維持した複合床として予算例外を記録。全景の実使用密度と読みやすさは別途確認。

### 03 mod_sacred_wall_4m（初回、修正中）

- angle/topを実見し、上部笠石と裏芯の同一面が重なって黒帯を生む不具合を発見。
- 裏芯上端を4.00→3.98m、側面/奥面を1cm内へ退避。外形4×4m/最大厚0.8mは笠石と本体石で維持する。同じ構造のarchも予防修正。
- 初回実測: 1,722,188 bytes / 5,424 triangles / 4 draw calls。石と樹皮の実写真PBRを含むため基本1MB目安を超える。後述の最終再build値を正とする。
- 材色は新照明で暖灰・低彩度苔に統一され、1個の石角の実欠損と雨水が残る継ぎ目が読めた。黒帯修正後の再撮影が必要。

#### 03 最終候補再確認（8ab87e1）

裏芯の退避後に再build/4方向レンダを実施。angle/topで黒い帯の消失、笠石の連続面、4m幅と4m高さを確認。タンジェント/明示三角形を追加した最終実測2,069,064 bytes / 5,424 triangles / 4 draw calls。1MB目安を超えるため容量例外（石/根の複合PBR壁）として記録し、全景の反復配置ではGLB共有・drawcall/メモリ計測が必要。

### 04 mod_sacred_collapsed_wall_4m（初回、修正中）

- angle/topで、実際に欠落した非対称の冠と、残存する石積みを確認。
- 問題: 裏芯の破断輪郭が表石を最大約25cm上回る場所があり、無地の板状リムに見えた。破断石の輪郭に追従し5cm低い24頂点の裏芯へ再設計。背面材も石写真へ統一し、8mmの摩耗を加える。
- この修正を反映した再build/4方向再撮影が必要。旧画像を完成根拠にしない。

#### 04 最終候補再確認（44caff1）

裏芯を破断石へ沿わせた再build/4方向レンダのangle/topを実見。灰色の板状リムが解消し、実欠損の冠・低い中央部・湿った石の断面として読める。最終実測4,164triangles/約1.88MB、写真PBRの複合壁として1MB目安超過を記録。接続外縁と全景での隣壁との継ぎ目は引き続き確認対象。

### 05 mod_sacred_arch_4m

angle/topを実見。4mの外枠、個別の迫石、2×3m以上の実開口、床に接する左右の柱脚を確認。上面の黒帯はなく、壁と同じ石の粒度/暖灰色が一致。実測1,936,680 bytes / 4,560 triangles / 4 draw calls / 4×4×0.8m。複合PBR建築として1MB目安超過、全体40MB予算内で利用密度を計測する。ゲームの格子通行判定をこのアーチ内で新設するものではない。

### 06 weathered_torii_gate（初回、材質改善待ち）

angle/topを実見。笠木の反り、貫/楔、柱脚の腐朽欠け、しめ縄/紙垂、接地と2×3m通行空間を確認。初回497,200 bytes / 7,338 triangles / 6 draw calls。問題: 木塗装と露出木が平滑/単色に見え、経年感が不足。別担当が方向性木目・微細な亀裂・少面積の塗膜剥離・雨筋/粗さ差を同scriptへ追加中。完成後に改めて1点の本build/4方向実レンダを行い、最終候補として評価する。

### 07 broken_votive_stele

angle/topを実見。1.8mの石碑、上肩/側面の実欠損、台座への接地、足元の破片、架空の角形紋様を確認。実測780,440 bytes / 887 triangles / 4 draw calls。紋様は暗い細い付加形状であり、Booleanで彫った溝そのものではないため「実彫刻済み」とは扱わない。少量の苔と露出破断面を持ち、石の写真粒度は建築と3m基準で一致。近接プレイカメラでの読みやすさと、文字としての見え方は全景でも確認する。

### 08 moss_stone_lantern（初回、苔改善待ち）

angle/topを実見。火袋の実開口、笠角の実欠損、台座と落ちた破片の接地、1.6m高を確認。初回923,708 bytes / 2,202 triangles / 4 draw calls。問題: 笠の苔が球状/粒状の小石に見えるため、屋根面に沿う薄い不規則patchへ修正依頼。改良版を最後に再build/4方向レンダし、旧画像を最終の品質根拠にしない。

### 09 ofuda_seal_cluster

angle/topを実見。5枚の架空のお札、幾何学的な墨跡、紙の折れ/下端の反り/欠け角を確認。実測154,196 bytes / 540 triangles / 1 draw call / 幅0.610m×高さ0.601m。これは壁貼り用であり、単体スタジオで宙に見えるのは取付壁が含まれないため。正面はGLB+Z、背面を壁へ貼る。画像はオリジナル紋様で実宗教の札の複製ではない。風のanimationは未収録で、静止材としての確認。

### 10 sacred_cedar_tree（初回、樹冠の評価保留）

angle/topを実見。10mの樹高、根張り・幹の裂け・接地・枝の階層を確認。実測1,992,840 bytes / 24,720 triangles / 4 draw calls。問題: 樹冠がかなり疎く、topで針葉のscale sprayより大きな羽状/披針形の葉に見える。枯損古木としての表現と、緑豊かな樹海の主役としての杉は区別する。植物の形態と樹冠密度の再設計を依頼し、初回を「リアルな完成古杉」と扱わない。

### 11 fallen_cedar_log

初回angle/topで、空洞端・不連続年輪・放射割れ・折れ枝・接地は確認した一方、苔が平らな緑の紙片に見える問題を検出。倒木scriptだけを修正し、実樹皮のBVHへ追従する32点×2ringの薄膜（縁0.7mm/中3mm）と3〜6mmの短細毛へ置換。commit3a0725cで再build/4方向レンダ。

再撮影angle/topで、苔が幹から浮く平面片ではなく曲面へ貼りつくこと、木口/枝形状の維持を確認。実測1,000,656 bytes / 6,420 triangles / 4 draw calls / 長さ4.293m、高さ1.144m。苔の微細な繊維の最終見え方は接写/全景で継続評価する。

### 12 forest_fern_cluster

angle/topを実見。大小3株、放射する羽状葉、主軸の弧、若い巻き芽を確認。葉面winding/UV修正後のbuildで、表裏の暗転破綻や極端な葉脈のずれは見えない。実測566,928 bytes / 10,704 triangles / 4 draw calls / 幅1.554m、高さ0.595m。最下点は基準面より7.4mm上（接地調整の実装側許容/表土への埋込みで確認）。全景で大株の等間隔反復を避ける。

### 13 forest_shrub_cluster

angle/topを実見。木質主枝、葉柄、大小の反り葉、新葉の色差、間を抜ける枝構造を確認。実測965,744 bytes / 5,728 triangles / 4 draw calls / 幅1.654m、高さ1.114m、最下点0.8mm。輪郭と枝は読めるが、640px単体では葉の微細葉脈の説得力は限定的。ゲーム距離の階層密度/近接時の葉面detailは継続評価対象。通行帯に同じ密度で連続配置しない。

### 14 white_wildflower_patch（初回、花弁改善待ち）

angle/topを実見。五弁花・萼・雄しべ・蕾・種房の混在、茎の接地、白花のアクセントは確認。初回338,972 bytes / 3,744 triangles / 6 draw calls / 幅約0.88m、高さ0.57m。問題: 8点輪郭の花弁が直線的な紙細工に見えた。commit4fce0aeで花弁だけを滑らかなteardrop輪郭・12長手/4横断分割の浅いcupへ変更、重複tip頂点を作らずUVを維持。自然の共通葉改良完成後に最終再buildする。

### 15 hanging_forest_vines（初回、共通葉改善待ち）

angle/topを実見。上端取付原点、長さ差のある垂れ茎、節/分岐/巻きひげを確認。初回253,360 bytes / 4,504 triangles / 3 draw calls / 垂下長2.48m、幅1.32m。上端は基準より2.4mmの茎半径分だけ上へ出る。葉の角張りが残るため、自然共通leafの滑らかな輪郭/杯状面/PBR改良後に再build。風animationは未収録、静止の壁/梁添え材。

### 16 mossy_granite_boulder（初回、苔境界の評価保留）

angle/topを実見。連続した岩塊の輪郭、肩の実欠損、足元の小破片、石の写真PBRを確認。初回964,612 bytes / 5,342 triangles / 4 draw calls / 幅2.405m、高さ1.481m。問題: 上面のmoss/lichen面material割当が大きな緑の三角形/多角形に見える箇所があり、自然な境界の改善が必要。岩本体の彫刻と写真は保持して局所材境界の調整を検討。

### 17 sacred_hokora_shrine

angle/topを実見。2.449m高の小祠、流れの長い屋根、葺板の重なり、独立する柱/床組/格子戸、壁板の実欠損、石基壇と前段の接地を確認。材質は暖灰石/銀化した木/濡れた暗色葺板へ整理され、他の神域素材とトーンが共存。実測2,963,824 bytes / 18,262 triangles / 8 draw calls / 幅2.11m×奥行1.90m。大きな目印の4MB予算内。左右の格子や内部祭壇は存在するが、開閉animation/調べるイベントの実装は含まない。

## 最終freeze版の再build確認

- 01石床: tangent収録版で再build/4方向再撮影、angle/top再確認。1,151,380 bytes / 3,380tri、zero tangent fallback0。追加接線による容量増を含むため、旧939KB値を最終値に使わない。
- 02土床: 同様に再build/4方向再撮影、angle/top再確認。1,335,328 bytes / 1,992tri / 5calls、zero tangent fallback0。1.5MB個別目標内、主512/副256の質感を維持。
- 06鳥居: 方向性木目・少面積の剥離・雨筋/粗さ差の改良版を再buildし、angle/topを実見。朱塗りの単色感が抑えられ、縦方向の風化した露出木と貫の木目が読めた。590,244 bytes / 7,338tri / 6calls、zero tangent fallback0。形状/2×3mクリアランスは維持。
- 07石碑: Boolean陰刻初回で本体消失を画像から検出。石碑slabの内向きwindingを修正し、鋭角の折れ線tube cutterの自己交差を毎strokeの独立した凸diamond prismへ変更（02945e6→8360ac6）。陰刻各回の残存volume>0.15m³ guardで消失時は出力前停止する。最終8360ac6再build/4viewのangle/topで1.8m本体と沈んだ紋様/縁溝、欠損肩、台座を再確認。825,896 bytes / 1,433tri / 4calls。旧「台座だけ」の失敗GLBは成功版で上書き済み。
- 08灯籠: 薄い屋根面追従の不規則苔patchへ更新した最終版を再build/4view撮影、angle/top実見。大きな球状粒が消え、笠の輪郭と欠損角/火袋の実開口を保持。997,728 bytes / 2,366tri / 4calls、zero tangent fallback0。苔の表面繊維の細密感は全景/接写でも継続評価する。
- 03石壁: freeze後commonと完全整合する本再build/4viewを実施、angle/topで黒帯の再発なし。2,069,064 bytes / 5,424tri / 4calls。UV退化箇所3頂点のゼロ接線だけ、法線に直交する単位接線へfallbackして記録（他の接線/形状/UVは維持）。
- 10古杉: 512px針葉spray/alpha MASKの湾曲card群と30主枝へ改良した版を再build/4view撮影、angle/topを実見。大きな広葉状の初回から細い針葉の樹冠へ変わり、根幹の裂け/根張りを保持。1,822,596 bytes / 14,712tri / 3calls / 高さ10m。葉群の平板矩形は目立たず、枝越しの抜けが読める。alphaModeMASK・cutoff0.45・両面設定を親がJSON確認。全景で樹冠を重ねた密度/透過負荷を評価する。
- 11倒木: 最終natural helper freeze後に再build/4viewを実施し、angle/topで幹/空洞/割れ/曲面追従苔の形状を再確認。葉非使用でも共有helperのsource依存が最終版に一致する出力へ更新。
- 12シダ: 最終共通leafの滑らかな外周/浅い杯状面/穏当な葉脈PBRへ更新した版を再build/4view撮影、angle/topを実見。紙的な角が減り、羽片の連続曲線と中肋が読める。1,547,392 bytes / 33,804tri / 4calls。葉の実曲面と大小3株の密度保持を優先したため基本1MB目安超過、全景配置数の性能評価が必要。
- 13低木: 最終共通leaf版を再build/4view撮影、angle/topを実見。直線折れの葉輪郭が連続した丸み/軽いカップへ変わり、葉脈/色の穏当な変化が見える。木質枝と葉柄・新葉/旧葉の配分を保持。1,181,524 bytes / 10,656tri / 4calls、zero tangent fallback0。葉の実曲面維持により基本1MBを約0.18MB超える。
- 14白花: 滑らかなpetal cupと最終共通leaf版で再build/4view撮影、angle/topを実見。五弁の丸い輪郭と浅いカップが読め、初回の紙細工的な直線角を解消。蕾/種房/萼/雄しべを保持。573,968 bytes / 9,632tri / 6calls、zero tangent fallback0。
- 15つる: 最終共通leaf版を再build/4view撮影、angle/topを実見。葉の丸い連続輪郭/軽い曲面へ変わり、節・巻きひげ・先細りの垂下長と吊元原点は維持。351,536 bytes / 6,632tri / 3calls、zero tangent fallback0。静止材であることは変わらない。

- 16岩: 面単位の緑material割当を廃止し元写真PBRの連続した地衣/苔へ統合した版を再build/4view撮影、angle/topを実見。緑の三角形境界が消え、岩塊の輪郭/肩の実欠損/破片は維持。919,316 bytes / 5,350tri / 2calls、zero tangent fallback0。

## 最終単体確認一覧

全17点を個別build→GLB再import→4方向実レンダ→angle/top実画像確認の順で検証した。以下は最後のGLBの測定値。ユーザー承認とゲーム統合・実機性能の確認は別段階。

| Asset | Bytes | Triangles | Draw calls | Source commit |
|---|---:|---:|---:|---|
| broken_votive_stele | 825896 | 1433 | 4 | 8360ac6 |
| fallen_cedar_log | 1000656 | 6420 | 4 | 8360ac6 |
| forest_fern_cluster | 1547392 | 33804 | 4 | 8360ac6 |
| forest_shrub_cluster | 1181524 | 10656 | 4 | 8360ac6 |
| hanging_forest_vines | 351536 | 6632 | 3 | 5fa16d7 |
| mod_root_soil_floor_4m | 1335328 | 1992 | 5 | 2507adf |
| mod_sacred_arch_4m | 1936680 | 4560 | 4 | f4e9d70 |
| mod_sacred_collapsed_wall_4m | 1883680 | 4164 | 4 | 44caff1 |
| mod_sacred_stone_floor_4m | 1151380 | 3380 | 3 | 2507adf |
| mod_sacred_wall_4m | 2069064 | 5424 | 4 | 8360ac6 |
| moss_stone_lantern | 997728 | 2366 | 4 | 8360ac6 |
| mossy_granite_boulder | 919316 | 5350 | 2 | 6bb1c3d |
| ofuda_seal_cluster | 154196 | 540 | 1 | 78d9f8b |
| sacred_cedar_tree | 1822596 | 14712 | 3 | 8360ac6 |
| sacred_hokora_shrine | 2963824 | 18262 | 8 | 7171fa4 |
| weathered_torii_gate | 590244 | 7338 | 6 | 2507adf |
| white_wildflower_patch | 573968 | 9632 | 6 | fb665c8 |

個別GLB合計 21305008 bytes / 136665 triangles。2026-11-16 JST、ソース本体/再帰local helper/commonのgit保存時点と現在の一致、GLB SHA-256、4方向再import evidenceを17点で読取検査。差異 0 件。portable blend画像pack、Khronos/Three.js、全景/継ぎ目/目線/性能の統合検証は親担当へ引継ぎ。
