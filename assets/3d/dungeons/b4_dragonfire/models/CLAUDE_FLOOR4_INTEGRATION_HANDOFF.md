# Floor 4「竜炎の魔都」素材統合メモ

## 方針
溶岩の海に浮かぶ火山城塞都市。既存の3D迷宮システムを維持し、2Dマップ化しない。

## 同梱モデル
- `floor4_dragonfire_environment_v1.glb`: 火山岩の島基礎、石床タイル、溶岩帯、橋、尖塔、門、ドラゴン祭壇、溶岩滝の試作環境キット。
- `floor4_corrupted_barrier_v1.glb`: ボス前通路を塞ぐ歪な塊。独立オブジェクトとしてイベントで非表示・破壊・消滅させられる。

## 画像テクスチャ
`textures/` に以下4枚を収録。GLB側にもマテリアルのベースカラー画像として埋め込み。
- volcanic_basalt_albedo.png: 火山岩
- ashen_stone_albedo.png: 灰色の石床
- molten_lava_albedo.png: 溶岩
- blackened_bronze_albedo.png: 黒ずんだ青銅

## Claude統合時の注意
- 既存のFloor 1〜3のデータ、移動、衝突、セーブ仕様を変更しない。
- GLBは既存3Dレンダラーで読み込む。2Dマップへの置換は禁止。
- `floor4_corrupted_barrier_v1.glb` は通常通路とは独立したイベントオブジェクトとして配置。
- 溶岩の発光・流動アニメーション、熱揺らぎ、煙、火の粉、環境光はランタイム側で追加。
- 衝突判定と歩行可能領域は、視覚モデルと分離して設定。
- 本キットはv1試作。実機スクリーンショットでスケール・視認性・描画負荷を検証し、必要なら分割・最適化する。


## Dragon boss asset
- `floor4_dragon_boss_v1.glb`: stylized large dragon with textured obsidian scales, horn/claw material, wings, tail, dorsal spikes and magma emissive details.
- Static prototype only; rigging and walk/fly/roar/breath animation are not included.


## Architecture and effects add-on
- `floor4_gothic_fortress_addon_v1.glb`: bridge arches, fortress walls, lancet windows, dragon gate, flame pylons and relief details.
- `floor4_lavafall_ember_fx_seed_v1.glb`: lavafall stream strips and ember seed positions. Runtime should animate particles/flow; these are static placement guides.
- `textures/` includes normal and roughness maps for all four base materials, plus a molten-lava emissive map. Wire these maps only if the current renderer supports the relevant PBR slots; do not break existing material loading.
