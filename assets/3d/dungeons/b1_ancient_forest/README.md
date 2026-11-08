# B1F「深淵に眠る樹海」3D素材パック

## 方針
- 方向性：ダークファンタジー。巨木に侵食された古代遺跡、苔、青白い発光、薄い霧。
- 品質目標：現代JRPG級。まず素材数と世界観の統一を確保し、後続で造形・テクスチャを磨く。
- 形式：GLB（glTF 2.0）。Blenderで生成し、PBRマテリアルを付与する。
- 運用：近景は高密度モデル、遠景は簡略モデルへ差し替える。iPhone実機で負荷確認する。

## 生成方法
Blender 4.x を用意し、リポジトリのルートで実行する。

```bash
blender -b -P tools/blender/generate_b1_assets.py
```

生成先：
`assets/3d/dungeons/b1_ancient_forest/props/`

## 収録予定（19点）
| ファイル名 | 用途 |
|---|---|
| ancient_giant_tree.glb | 巨木・ランドマーク |
| spreading_root_cluster.glb | 床面を這う根 |
| fallen_ancient_trunk.glb | 倒木・通路障害物 |
| moss_boulder_cluster.glb | 苔むした岩 |
| ruined_stone_pillar.glb | 遺跡の柱 |
| mossed_ruin_wall.glb | 石壁 |
| ruin_archway.glb | 遺跡アーチ |
| ancient_stone_floor_tile.glb | 石畳タイル |
| bioluminescent_crystal_cluster.glb | 発光結晶 |
| glow_mushroom_cluster.glb | 発光キノコ |
| sealed_treasure_chest.glb | 宝箱 |
| ancient_wooden_door.glb | 古代の扉 |
| forest_shrine_altar.glb | 祭壇・ギミック |
| blue_wisp_torch.glb | 青白い灯火 |
| broken_stone_stairs.glb | 崩れた階段 |
| ruin_rubble_pile.glb | 石材の瓦礫 |
| hanging_glow_vines.glb | 発光する垂れ蔓 |
| ancient_sarcophagus.glb | 石棺・遺跡装飾 |
| hollow_tree_stump.glb | 切り株・遮蔽物 |

## 重要な状態
このブランチに保存されているのは**素材を一括生成するBlenderスクリプトとカタログ**です。GLB実体はBlender 4.xでスクリプトを実行した時点で生成されます。生成後はGLBもGitに追加し、実機で表示・負荷を確認してください。

## 次の品質向上工程
1. 巨木・遺跡のシルエットと寸法をB1Fマップの通路幅に合わせる。
2. 近景用の法線・粗さ・色テクスチャを作成し、PBRを強化する。
3. 巨木の根、蔓、灯火、発光キノコに簡易アニメーション／発光演出を追加する。
4. FOE専用の大型シルエット、足跡、出現演出素材を追加する。
5. GLBのポリゴン数・テクスチャ容量を計測し、LODを作る。

## 注意
- この素材はB1Fの独立試作向け。通常ゲームへの接続は別途レビュー後に行う。
- 既存のゲームコード、セーブデータ、戦闘ロジック、マップデータは変更しない。
- Blender未実行の状態で「GLB生成済み」「ゲーム実装済み」と報告しない。
