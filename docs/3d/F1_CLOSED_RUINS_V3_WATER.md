# 一層3F・閉鎖遺跡V3の水場設計

状態: 制作前設計。2026-11-17 JST。担当: water_design_v3。実装・新規テクスチャ生成・ブラウザ描画は未着手。

## 目標と現状

単色青の四角い面を、崩れた地下遺跡に溜まった暗緑の水へ変える。苔の多い一層の湿気を引き継ぎ、整備された境内の池に見せない。全面を植物で覆うことや、大きな波で水面を騒がせることは避ける。短い見通しの中で、水際・水面・浅瀬・水底の順に情報が読める構成を作る。

現行 `field/field-3d-view.js` の `addWater` は4m正方形のPlaneGeometry、y=-0.15、共有MeshStandardMaterial（color0x0b2a36、roughness0.08、emissiveIntensity0.35）。動的normal・底・岸の厚み・漂流物がなく、低品質設定の照明では単色に見える。共有材への直接変更は他層へ影響するため行わない。

## 保存するゲーム条件

- map、通行判定、水セル、固定ID、NPC、宝箱、戦闘を変更しない。
- 水セルは11個: (14,7),(15,7),(16,7),(14,8),(15,8),(16,8),(17,8),(18,8),(15,9),(16,9),(17,9)。tile中心は(x*4,z*4)。水面はy=-0.15。
- この11セルの境界は16辺。隣接セル間は岸を置かず、内部の正方形の継ぎ目を見せない。
- native水mesh11個は維持し、そのgeometryを破棄・置換しない。trialのみ専用materialへ差し替える。`waterMeshCount`は11を保つ。
- 岸の視覚的張り出しは、歩行中心と既存移動線から離れた縁に限定。水を跨ぐ装飾で、実際に歩ける橋に見える物を作らない。

## 水面の方式

第一案はThree r180のMeshPhysicalMaterialを元にした専用材。roughness0.20〜0.30、metalness0、色は深緑〜暗い青緑、過剰な自己発光なし。透過0.68〜0.82の範囲を実画面で調整し、浅瀬の石が読める明るさを確保する。通常の照明・霧・tone mappingを保持する。

独自の `onBeforeCompile` でworld XZ座標による2層の微細normalを異なる方向へ動かす。画像normalのtile-local UVを使うと4m境界が再出現するため、世界座標から共通samplingする。法線強度は0.08〜0.18から調整し、色面が不自然に明滅する強さは避ける。元画像を使う場合は独自生成の小さな周期normalまたは一次配布でCC0確認した画像に限定し、source/hashを残す。まだどちらも取得・生成していない。

揺らぎは水面の法線が主体。11枚のPlaneに頂点波を別々に追加して継ぎ目を生むことはしない。微弱な干渉波は同じworldXZ/timeから算出し、岸付近だけ少し強める。`customProgramCacheKey`を固定版にしてshader差分を明示する。

水底には土・沈んだ石材・小岩を置く。浅瀬y=-0.32〜-0.5、中央y=-0.8〜-1.1。透過の濃さと底の暗さで深度を示す。平面色だけで深度を描くこと、実際に存在しない空の反射画像を貼ることはしない。水底textureは既存Poly Haven土/石を再利用できるが、派生色調は新規manifestに記録する。

## 岸の構成

16境界辺の各4mを同じ石で敷き詰めない。大きな割れ岩1個・半水没した石材・細い礫・堆積した泥・苔・根を非対称に組み合わせ、元の直線境界の一部だけを見せる。

- 根元の大岩: 長さ0.65〜1.4m、半分程度水没、岸に接して斜めに置く。
- 岸辺の礫: 直径0.08〜0.28m。全周均等でなく、崩落位置に密集。
- 侵食段: 石床の端を0.05〜0.18mの不揃いな欠けと泥/苔で覆う。歩行面の中心は保つ。
- 水中岩: 岸の岩の形と位置が水下へ連続し、別々の物が浮いて見えない。
- 垂れ根: 崩落穴側の湿った岸に集中。水面の前で切れずに水中へ続く。

藻は岸の凹部と岩陰に溜まりを作り、表面積10〜18%を初期上限とする。蓮に似た浮葉は小群1〜2か所だけ、全体の4〜8%程度。花を整然と並べない。腐葉や沈んだ木片を少量混ぜ、自然な停滞域を示す。植物は個別アセットを順に制作・確認し、全景生成で代替しない。

## runtime API案と寿命

専用モジュール予定: `field/f1-closed-water-v3.js`。既存共有水材・他層テーマは編集しない。

```js
const water = createClosedWater({ root, nativeMeshes, map, texture, seed });
water.tick(dt, nowMs, cameraPosition);
water.info();
water.dispose();
```

`nativeMeshes`は元の11meshをcallerから明示的に渡し、内部world探索で不明なmaterialを差し替えない。作成時にmesh→元materialをMapへ保存する。専用material/textureのロード・検証が終わってからまとめて差し替える。失敗時は何も変更しない。

`tick`はuniform時間の更新のみで、CPUで頂点/textureを毎フレーム生成しない。`nowMs`を秒へ変換し、離席/戦闘後にも時間が飛んで激しい波を生まない。低品質設定はnormal強度と植物数を抑えるが、水の濃淡は保つ。視界外の更新はcallerが止められる。

`dispose`は冪等。自分のmaterialがまだmeshへ割り当てられている場合だけ元materialへ戻す。shared waterGeo/shared waterMatをdisposeしない。自分が作ったtexture/geometry/materialだけを一度破棄する。trial全体のdisposeから呼び、nativeフロアへ戻る前に復元する。

`field-3d-view.js`のframeには既存theme.tickと同様の `g.sacredTrial?.tick?.(dt, now, g.camera.position)` が必要。trial静的生成の時点ではnative水が未生成なので、固定物/水の構築後に `attachNativeWater(meshes)` を呼ぶ二段階APIが安全。rootが共有hookとtrial統合を担当し、この水モジュールだけが専用材を所有する。

## 公式資料と選定理由

- Three.js r180 Water実装: https://github.com/mrdoob/three.js/blob/r180/examples/jsm/objects/Water.js 。ローカル同版でも `onBeforeRender` → `renderer.setRenderTarget` → `renderer.render(scene, mirrorCamera)` を確認した。水meshごとに追加scene renderが発生するため、11個導入は今回の第一案にしない。採用するとしても同一連結域1passにまとめる必要がある。MIT。Waterコードの無断の別ライセンス引用は行わない。
- Three.js ShaderMaterial/Material API: https://threejs.org/docs/ 。既存r180標準材に限定したshader補助で照明/霧を引き継ぐ案。独自shaderは自作であり、WebGL描画未検証。
- Poly Haven公式ライセンス: https://polyhaven.com/license 。textures/models/HDRIsはCC0、商用利用・再配布可能。既存 `textures/texture-sources.json` のmossy_rock等にURL/hash/CC0記録あり。Pinterest画像は参考だけに留め、normal/color mapへ転用しない。

追加反射passなしの方式は、構造物が実際に鏡面反射して映る保証を持たない。閉鎖遺跡の暗い湿潤水として、岸と底、微細normal、照明の変化で質感を作る。高度な反射が必要になった場合は、実ゲーム負荷を測定した後に連結域単位の1pass反射を別評価する。

## 検証条件

1. map~11・固定ID・通常セーブ不変。native水mesh11維持。
2. 水セル内部4m境界でnormal/色/水位が連続する。
3. 同じカメラを時刻0/2/4秒で撮影し、微細な揺らぎを実確認する。静止画だけでアニメーション成功とは呼ばない。
4. 岸南・西・祠側から実ゲーム目高1.6mで撮影し、直線境界が装飾でなじむか確認。
5. 3F→2F→3F、戦闘帰還、連続dispose/rebuildで材とGPUresourceが適切に復元される。
6. page/console/WebGL errors0。反射用追加render target0、11個の反射scene renderを生まない。
7. 低/高品質で水底・表面・藻の判別を確認。実機FPSはSwiftShaderと分けて扱う。

Pinterestの水際/地下遺跡参考は別担当の調査と全体設計の確定後に具体配置へ反映する。ここでは技術方式と安全条件だけを定め、生成前の承認待ちとする。
