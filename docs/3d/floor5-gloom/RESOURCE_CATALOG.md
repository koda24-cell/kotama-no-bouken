# 第5階層：黒い瘴気・奈落汚染 VFX — 制作素材とツール調査
更新: 2026-11-14 / ステータス: 調査・制作準備（未実装）

## コンセプト
『ブレス オブ ザ ワイルド』の怨念や『ティアーズ オブ ザ キングダム』の瘴気は**雰囲気の参考のみ**。任天堂の画像・メッシュ・テクスチャ・シェーダーを複製・再配布しない。独自の黒紫色の粘性汚染、暗赤色の亀裂発光、立ち上る粒子と触手で第5階層の「奈落・魔王城・廃神殿」を演出する。

## 利用候補（一次配布元のライセンスを確認）
|候補|用途|ライセンス|入手先|導入状況|
|---|---|---|---|---|
|Kenney Particle Pack|煙、ソフト円形、火花、発光マスク|CC0|https://kenney.nl/assets/particle-pack|未取得|
|Kenney Smoke Particles|地面を這う煙、上昇する煙|CC0（個別配布ページ・同梱LICENSEも確認）|https://kenney.nl/assets/smoke-particles|未取得|
|Poly Haven|石畳・岩盤のroughness/normal、背景HDRI|CC0|https://polyhaven.com/license|未取得|
|Calinou/kenney-particle-pack|Gitから取得できるKenney PNGとライセンス|CC0|https://github.com/Calinou/kenney-particle-pack|未取得|
|Three.js ShaderMaterial|流動する黒い表面・縁発光の独自GLSL|ライブラリ依存関係として管理|https://threejs.org/docs/#api/en/materials/ShaderMaterial|既存Three.jsを活用|
|Three.js InstancedMesh / Points|煙や小粒子の描画負荷軽減|同上|https://threejs.org/docs/#api/en/objects/InstancedMesh|実装候補|

## 制作リスト（マス単位・独立オブジェクト）
1. `gloom-floor-patch`: 黒紫の液状床パッチ。1マス内に収まる基本形
2. `gloom-floor-edge`: 左右前後の継ぎ目・端用。ランダムマップの接続対応
3. `gloom-tendril`: 地面から生える歪んだ触手、2〜4形状
4. `gloom-smoke`: 黒煙と紫の霧。板ポリ＋透明テクスチャ／GPU粒子
5. `gloom-vein`: 石壁・柱・階段に這う赤紫の脈動する亀裂
6. `gloom-core`: 小型の脈動する汚染核
7. `gloom-burst`: 汚染核が破裂する短時間の演出
8. `gloom-pool-large`: 2×2以上の広域パッチ（各マスに分割）
9. `gloom-drip`: 天井から垂れる滴・液柱
10. `gloom-light`: 低照度の赤紫点光と発光マテリアル

## 優先順位
まず床パッチ・接続エッジ・触手を**造形とGLBで検証**。煙・発光はGLB単体では時間変化するThree.jsシェーダーを完全再現できないため、**GLB（静的形状）＋JS（動的VFX）**を別々に管理する。

## Gitでの保管案
- `docs/3d/floor5-gloom/RESOURCE_CATALOG.md`（この文書）
- `field/assets/b5-gloom-vfx.js`（ClaudeがBlenderなしで使うThree.js生成器）
- `assets/vfx/floor5/gloom/`（ライセンス確認後に導入するCC0 PNG）
- `assets/models/floor5/`（品質承認後のGLB）
- `assets/models/floor5/reviews/`（Blender正面・側面・斜めPNG）
- `docs/3d/floor5-gloom/THIRD_PARTY_LICENSES.md`（配布元URL、取得日、ライセンス、利用ファイル）

## 重要な制約
- 今回はライセンス・ツールの**調査と候補登録のみ**。外部PNG・GLBはまだ取得していない。
- GLB/PNGは実際の生成・レンダリング・ユーザー承認後に正式保存する。
- 既存ゴシック門・直立柱の完成形状を変更しない。
- ゲーム本体への統合・重さの最適化は別作業。まず造形品質を優先する。


## V5 production research — 2026-11-14
- **Implemented:** Replaced outer cylindrical TubeGeometry creeping roots and offshoots with 3-column, tapered, asymmetrical low-profile mesh ribbons. Existing central pool, tendrils, smoke and particles retained. Pending actual render review.
- **Blender Geometry Nodes / Displace Geometry:** Procedural displacement on a subdivided mesh for irregular shoreline; official reference https://docs.staging.blender.org/manual/en/latest/modeling/geometry_nodes/geometry/operations/displace_geometry.html . Research only, not installed or run.
- **Blender Displacement and Bump:** Large-scale silhouette displacement combined with subtle bump for fine breakup; official https://docs.staging.blender.org/manual/en/latest/render/materials/components/displacement.html . Research only.
- **Blender SDF Grid Boolean:** Smooth union of spreading lobes before mesh extraction, possible future organic shoreline generator; official https://docs.staging.blender.org/manual/en/latest/modeling/geometry_nodes/volume/operations/sdf_grid_boolean.html . Research only, Blender-version dependent.
- **Three.js alphaMap:** Fade outer boundary via grayscale texture and alphaTest rather than raised piping; official https://threejs.org/docs/pages/MeshStandardMaterial.html . Research only; requires UV/texture integration and GLB compatibility tests.
- **Decision:** First verify mesh ribbons in Blender from three angles, then consider noise displacement and alpha fading. Do not add untested addons or claim them installed. Maintain original model and approved asset promotion policy.
