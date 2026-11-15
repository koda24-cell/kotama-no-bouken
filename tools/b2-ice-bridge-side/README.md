# 第2層 氷橋 左右接続モジュール — 試作

- 各モデルは2m×2mを基準にした独立GLB。X方向の両端を隣の橋タイルとの接続方向として設計。
- 左岸 `ice_bridge_left_bank.glb` / 右岸 `ice_bridge_right_bank.glb` は別ファイル。
- 氷の歩行面、下部の暗い石板、浸食岩、氷の牙、霜の縁を追加。左右で鏡像に近い構造だが配置の細部は別々に生成。
- 既存の `floor2-water-source-quality-v3.glb` や `field/field-3d-b2-water.js` は変更しない。
- Blender Actionsの正面・側面・斜めPNGを確認してから採用判断する。ゲーム内配置・通行判定への反映は未実施。
- 今回は橋本体の正式素材への置き換えではなく、ランダム迷宮用の左右接続候補。
- ClaudeはGLBを直接使用可能。Blender不要。X=±1の端面が連結方向。実ゲームのマス寸法への変換と歩行可能領域は統合時に確認。
- Blender 5のFBXトラブル記録: `docs/3d/CC0_ROCK_BLENDER_FAILURES_20261114.md`（別PR #333）。
